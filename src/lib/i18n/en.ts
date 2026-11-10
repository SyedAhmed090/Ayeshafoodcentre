// Every word on the counter and rider screens. Add ur.ts with the same keys for Urdu; components only read keys.
// Shared by server and client code: no imports from server-only modules here.

export const en = {
  shopName: "Ayesha Food Centre",
  rs: "Rs {n}",
  back: "Back",
  undo: "Undo",
  tapToStart: "Tap to start",
  enterPin: "Counter PIN",
  wrongPin: "Wrong PIN",
  tryLater: "Wait 5 minutes",
  deletePin: "Delete",

  // Counter board
  frontDesk: "Front desk · Orders",
  walkinOrder: "Walk-in order",
  colCheck: "Check",
  colNew: "New",
  colCooking: "Cooking",
  colReady: "Ready",
  seePayment: "See payment",
  startCooking: "Start cooking",
  foodReady: "Food ready",
  pickRider: "Pick rider",
  givenToCustomer: "Given to customer",
  paid: "Paid",
  cash: "Cash Rs {n}",
  walkin: "Walk-in",

  // Check payment
  orderNo: "Order #{n}",
  checkPayment: "Check payment",
  customersScreenshot: "Customer's screenshot",
  moneyToFind: "Money to find",
  openMerchantApp: "Open the shop's merchant app. Is this amount there?",
  moneyCame: "Money came",
  noMoney: "No money",
  switchToCash: "Cash on delivery",
  cancelOrder: "Cancel order",
  callCustomer: "Call customer",
  sameScreenshot: "Same screenshot used before",
  tapToZoom: "Tap to zoom",
  close: "Close",

  // Walk-in
  thisOrder: "This order",
  takeThisMuch: "Take this much",
  cashTaken: "Cash taken",

  // Pick a rider
  whoTakes: "Who takes order #{n}?",
  riderCollects: "Rider collects",
  free: "Free",
  outOnDelivery: "Out on delivery",

  // Rider
  newOrder: "New order",
  takeFromCustomer: "Take from customer",
  go: "Go",
  items: "{n} items",
  call: "Call",
  map: "Map",
  delivered: "Delivered",
} as const;

export type StaffKey = keyof typeof en;

/** "Order #{n}" + { n: 48 } → "Order #48" */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
