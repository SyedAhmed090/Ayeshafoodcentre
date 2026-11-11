// Android checks this file before the rider APK may open the site full screen, with no browser bar
// (a Trusted Web Activity). It names the APK and the fingerprint of the key it was signed with.

export const dynamic = "force-dynamic";

export function GET() {
  const pkg = process.env.RIDER_APP_PACKAGE;
  // Comma-separated: the upload key and, if ever used, a second signing key.
  const prints = (process.env.RIDER_APP_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body =
    pkg && prints.length
      ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: prints } }]
      : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
