// Urdu for the counter and rider screens: the same keys as en.ts. Numbers and "Rs" stay as they are.
// Shared by server and client code: no imports from server-only modules here.
import type { StaffKey } from "@/lib/i18n/en";

export const ur: Record<StaffKey, string> = {
  shopName: "عائشہ فوڈ سینٹر",
  rs: "Rs {n}",
  back: "واپس",
  undo: "واپس کریں",
  tapToStart: "شروع کرنے کے لیے دبائیں",
  enterPin: "کاؤنٹر پن",
  wrongPin: "غلط پن",
  tryLater: "5 منٹ انتظار کریں",
  deletePin: "مٹائیں",

  // Counter board
  frontDesk: "فرنٹ ڈیسک · آرڈرز",
  walkinOrder: "واک اِن آرڈر",
  colCheck: "چیک",
  colNew: "نیا",
  colCooking: "پک رہا ہے",
  colReady: "تیار",
  seePayment: "پیمنٹ دیکھیں",
  startCooking: "پکانا شروع",
  foodReady: "کھانا تیار",
  pickRider: "رائیڈر چنیں",
  givenToCustomer: "گاہک کو دے دیا",
  paid: "ادا شدہ",
  cash: "کیش Rs {n}",
  walkin: "واک اِن",
  fromDay: "{d} کا",

  // Check payment
  orderNo: "آرڈر #{n}",
  checkPayment: "پیمنٹ چیک کریں",
  customersScreenshot: "گاہک کا اسکرین شاٹ",
  moneyToFind: "یہ رقم تلاش کریں",
  openMerchantApp: "دکان کی مرچنٹ ایپ کھولیں۔ کیا یہ رقم آئی ہے؟",
  moneyCame: "پیسے آ گئے",
  noMoney: "پیسے نہیں آئے",
  switchToCash: "کیش آن ڈیلیوری",
  cancelOrder: "آرڈر کینسل کریں",
  callCustomer: "گاہک کو کال کریں",
  sameScreenshot: "یہ اسکرین شاٹ پہلے بھی استعمال ہوا ہے",
  tapToZoom: "بڑا کرنے کے لیے دبائیں",
  close: "بند کریں",

  // Walk-in
  thisOrder: "یہ آرڈر",
  takeThisMuch: "اتنے پیسے لیں",
  cashTaken: "کیش لے لیا",

  // Pick a rider
  whoTakes: "آرڈر #{n} کون لے جائے گا؟",
  riderCollects: "رائیڈر وصول کرے گا",
  free: "فارغ",
  outOnDelivery: "ڈیلیوری پر ہے",

  // Rider
  newOrder: "نیا آرڈر",
  takeFromCustomer: "گاہک سے لیں",
  go: "چلیں",
  items: "{n} چیزیں",
  call: "کال",
  map: "نقشہ",
  delivered: "پہنچا دیا",
};
