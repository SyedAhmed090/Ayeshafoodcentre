"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { clearFails, isLocked, recordFail } from "@/lib/rate-limit";
import { clientKey, ownerDevice, signInDevice, signOutDevice } from "@/lib/staff-auth";
import { deleteUpload, savePhoto, UploadError, type PhotoKind } from "@/lib/uploads";
import { AdminError, checkbox, file, int, mobile, optionalText, pin, rupees, text } from "@/lib/admin-rules";

/** What every admin form gets back: an error to show, or a short "Saved". */
export type FormResult = { error?: string; ok?: string } | null;

const PER_CLIENT_MAX = 5;
const ALL_MAX = 20;
const ALL = "owner-pw:all";

export async function ownerLogin(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const key = await clientKey("owner-pw");
  if (isLocked(key, PER_CLIENT_MAX) || isLocked(ALL, ALL_MAX)) return { error: "Too many wrong tries. Wait 5 minutes." };
  const password = fd.get("password");
  const hash = (await getSettings()).ownerPasswordHash;
  if (!hash) return { error: "No owner password is set yet. Set SEED_OWNER_PASSWORD and run the seed." };
  if (typeof password !== "string" || password.length > 200 || !(await bcrypt.compare(password, hash))) {
    recordFail(key, PER_CLIENT_MAX);
    recordFail(ALL, ALL_MAX);
    return { error: "Wrong password." };
  }
  clearFails(key);
  await signInDevice("OWNER");
  redirect("/admin");
}

export async function ownerLogout() {
  await signOutDevice();
  redirect("/admin/login");
}

/** Runs a form action for the owner only, turning input errors into a message instead of an error page. */
async function owner(fn: (deviceId: number) => Promise<FormResult>): Promise<FormResult> {
  const d = await ownerDevice();
  if (!d) redirect("/admin/login");
  try {
    const result = await fn(d.id);
    // React refills the form from the page after an action: reload the page data so it shows what was saved.
    revalidatePath("/admin", "layout");
    return result;
  } catch (e) {
    if (e instanceof AdminError || e instanceof UploadError) return { error: e.message };
    throw e;
  }
}

/** Save an uploaded photo if one was chosen. Returns the new path, or undefined to leave the photo as it is. */
async function newPhoto(fd: FormData, kind: PhotoKind): Promise<string | null | undefined> {
  if (checkbox(fd, "removePhoto")) return null;
  const f = file(fd, "photo");
  return f ? savePhoto(Buffer.from(await f.arrayBuffer()), kind) : undefined;
}

// ── Settings ────────────────────────────────────────────────────────

export async function saveSettings(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async () => {
    await db.settings.update({
      where: { id: 1 },
      data: {
        shopOpen: checkbox(fd, "shopOpen"),
        deliveryFee: rupees(fd, "deliveryFee", "Delivery fee", 5000),
        merchantNumber: mobile(fd, "merchantNumber", "Merchant number")!,
        shopPhone: mobile(fd, "shopPhone", "Shop phone")!,
      },
    });
    return { ok: "Saved" };
  });
}

export async function changeCounterPin(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async () => {
    // The tablet stays logged in: the PIN is only asked when a device logs in.
    await db.settings.update({ where: { id: 1 }, data: { counterPinHash: await bcrypt.hash(pin(fd, "pin")!, 10) } });
    return { ok: "Counter PIN changed" };
  });
}

export async function changeOwnerPassword(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async (deviceId) => {
    const current = fd.get("current");
    const next = text(fd, "next", "New password", 200, 8);
    const hash = (await getSettings()).ownerPasswordHash;
    if (typeof current !== "string" || !hash || !(await bcrypt.compare(current, hash))) throw new AdminError("The current password is wrong.");
    await db.settings.update({ where: { id: 1 }, data: { ownerPasswordHash: await bcrypt.hash(next, 10) } });
    // Every other place the owner was logged in has to log in again with the new password.
    await db.device.deleteMany({ where: { role: "OWNER", id: { not: deviceId } } });
    return { ok: "Password changed. Other devices are logged out." };
  });
}

// ── Menu ────────────────────────────────────────────────────────────

export async function saveCategory(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async () => {
    const id = int(fd, "id");
    const data = { name: text(fd, "name", "Category name", 40), sortOrder: int(fd, "sortOrder"), active: checkbox(fd, "active") };
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
    return { ok: "Saved" };
  });
}

export async function saveItem(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async () => {
    const id = int(fd, "id");
    const categoryId = int(fd, "categoryId");
    if (!(await db.category.count({ where: { id: categoryId } }))) throw new AdminError("Choose a category.");
    const data = {
      categoryId,
      name: text(fd, "name", "Item name", 60),
      price: rupees(fd, "price", "Price"),
      description: optionalText(fd, "description", "Description"),
      sortOrder: int(fd, "sortOrder"),
      soldOut: checkbox(fd, "soldOut"),
      active: checkbox(fd, "active"),
      featured: checkbox(fd, "featured"),
    };
    const old = id ? await db.menuItem.findUnique({ where: { id }, select: { photo: true } }) : null;
    if (id && !old) throw new AdminError("That item no longer exists.");
    const photo = await newPhoto(fd, "menu");
    const saved = await db.$transaction(async (tx) => {
      // The menu shows one "Today's deal", so picking one unpicks the rest.
      if (data.featured) await tx.menuItem.updateMany({ where: { featured: true, id: { not: id } }, data: { featured: false } });
      const row = { ...data, ...(photo !== undefined ? { photo } : {}) };
      return id ? tx.menuItem.update({ where: { id }, data: row }) : tx.menuItem.create({ data: row });
    });
    if (photo !== undefined && old?.photo) await deleteUpload(old.photo);
    if (!id) redirect(`/admin/menu/${saved.id}?saved=1`);
    return { ok: "Saved" };
  });
}

/** The quick Sold out / Back on switch in the menu list. */
export async function setSoldOut(itemId: number, soldOut: boolean) {
  if (!(await ownerDevice())) redirect("/admin/login");
  if (!Number.isInteger(itemId)) throw new Error("Bad item");
  await db.menuItem.update({ where: { id: itemId }, data: { soldOut: soldOut === true } });
}

// ── Riders ──────────────────────────────────────────────────────────

export async function saveRider(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return owner(async () => {
    const id = int(fd, "id");
    const newPin = pin(fd, "pin", !!id); // a new rider needs a PIN; on edit, empty keeps the old one
    const data = {
      name: text(fd, "name", "Rider name", 40),
      phone: mobile(fd, "phone", "Phone", true),
      active: checkbox(fd, "active"),
      ...(newPin ? { pinHash: await bcrypt.hash(newPin, 10) } : {}),
    };
    const old = id ? await db.rider.findUnique({ where: { id }, select: { photo: true, active: true } }) : null;
    if (id && !old) throw new AdminError("That rider no longer exists.");
    const photo = await newPhoto(fd, "riders");
    const row = { ...data, ...(photo !== undefined ? { photo } : {}) };
    const saved = id ? await db.rider.update({ where: { id }, data: row }) : await db.rider.create({ data: { ...row, pinHash: row.pinHash! } });
    if (photo !== undefined && old?.photo) await deleteUpload(old.photo);
    // A changed PIN or a rider taken off the list logs their phone out (a lost phone, someone who left).
    const loggedOut = id && (newPin || !data.active) ? (await db.device.deleteMany({ where: { riderId: id } })).count : 0;
    if (!id) redirect(`/admin/riders/${saved.id}?saved=1`);
    return { ok: loggedOut ? "Saved. Their phone is logged out." : "Saved" };
  });
}
