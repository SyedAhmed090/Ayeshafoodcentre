/**
 * Normalise a Pakistani mobile number to 03XXXXXXXXX.
 * Accepts 03XX XXXXXXX, +92 3XX XXXXXXX, 0092..., 923..., with spaces or dashes.
 * Returns null if it isn't a mobile number.
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+92")) d = "0" + d.slice(3);
  else if (d.startsWith("0092")) d = "0" + d.slice(4);
  else if (d.startsWith("92") && d.length === 12) d = "0" + d.slice(2);
  else if (d.startsWith("3") && d.length === 10) d = "0" + d;
  return /^03\d{9}$/.test(d) ? d : null;
}

/** 0300 1234567 */
export function formatPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone;
}

