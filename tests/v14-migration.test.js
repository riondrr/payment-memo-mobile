const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const html = fs.readFileSync("index.html", "utf8");

function functionSource(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = html.indexOf(") {", start) + 2;
  assert.notEqual(bodyStart, 1, `${name} body must exist`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return html.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const functionNames = [
  "migrateCardPaymentsV14", "mergeCardItemsForMonth", "uniqueNonEmpty",
  "unanimousNonEmptyValue", "isRecruitCardName", "normalizePaymentMethods",
  "normalizePaymentMethod", "normalizePaymentMethodDefaults", "paymentMethodDefaultsFromItem",
  "normalizePaymentMethodName", "paymentMethodNameKey", "normalizePaymentType",
  "normalizeDebitDay", "normalizeBillingCycleMonths", "normalizeBillingStartMonth",
  "normalizePaymentStartDate", "normalizeDateValue", "dayFromDate", "remapExistingTrashReferences",
  "uniqueMappedIds", "pushUnique", "itemDataScore", "toNumber"
];

const context = vm.createContext({
  console,
  crypto: webcrypto,
  structuredClone,
  unassignedAccount: "引落口座未設定",
  seed: { activeMonth: "2026-05" }
});
vm.runInContext(functionNames.map(functionSource).join("\n"), context);

const item = (id, content, amount, extras = {}) => ({
  id,
  seriesId: id,
  debitAccount: "住信SBIネット銀行",
  paymentType: "card",
  paymentMethod: "リクルートカード",
  content,
  amount,
  usedDate: "",
  debitDate: "2026-05-27",
  debitDay: 27,
  billingCycleMonths: content === "水道" ? 2 : 1,
  billingStartMonth: "2026-05",
  usagePeriodStart: "2026-04-01",
  usagePeriodEnd: "2026-04-30",
  paidDate: "",
  note: "",
  paid: false,
  ...extras
});

const methods = ["ガス代", "電気", "水道", "mineo"].map((name, index) => ({
  id: `recruit-${index}`,
  name,
  startDate: index === 0 ? "2026-04" : "2026-05",
  defaults: {
    debitAccount: "住信SBIネット銀行",
    paymentType: "card",
    paymentMethod: "リクルートカード",
    debitDay: 27,
    billingCycleMonths: index === 2 ? 2 : 1,
    billingStartMonth: "2026-05"
  }
}));

const normalized = {
  months: [{
    id: "2026-05",
    label: "2026年5月",
    items: [
      item("recruit-0", "ガス代", "3000", { note: "A", paid: true }),
      item("recruit-1", "電気", "5000", { note: "A", paid: true }),
      item("recruit-2", "水道", "2000", { note: "B", debitDate: "2026-05-28", debitDay: 28 }),
      item("recruit-3", "mineo", "1000", { paid: true })
    ]
  }],
  paymentMethods: methods,
  sortOrder: { series: methods.map(method => method.id) },
  trash: []
};

context.normalized = normalized;
vm.runInContext("migrateCardPaymentsV14(normalized)", context);

assert.equal(normalized.paymentMethods.length, 1);
assert.equal(normalized.paymentMethods[0].name, "光熱費");
assert.equal(normalized.paymentMethods[0].startDate, "2026-04");
assert.equal(normalized.paymentMethods[0].defaults.paymentMethod, "リクルートカード");
assert.equal(normalized.paymentMethods[0].defaults.billingCycleMonths, 1);
assert.equal(normalized.months[0].items.length, 1);
assert.equal(normalized.months[0].items[0].content, "光熱費");
assert.equal(normalized.months[0].items[0].amount, "11000");
assert.equal(normalized.months[0].items[0].note, "A / B");
assert.equal(normalized.months[0].items[0].paid, false);
assert.equal(normalized.months[0].items[0].debitDate, "");
assert.equal(normalized.months[0].items[0].debitDay, null);
assert.equal(normalized.months[0].items[0].usagePeriodStart, "");
assert.equal(normalized.months[0].items[0].usagePeriodEnd, "");

vm.runInContext("migrateCardPaymentsV14(normalized)", context);
assert.equal(normalized.months[0].items.length, 1);
assert.equal(normalized.months[0].items[0].amount, "11000");

const singleton = {
  months: [{
    id: "2026-05",
    label: "2026年5月",
    items: [item("other-card", "日常使い", "500", {
      paymentMethod: "テストカード",
      usagePeriodStart: "2026-04-01",
      usagePeriodEnd: "2026-04-30"
    })]
  }],
  paymentMethods: [{
    id: "other-card",
    name: "日常使い",
    startDate: "",
    defaults: {
      debitAccount: "住信SBIネット銀行",
      paymentType: "card",
      paymentMethod: "テストカード",
      debitDay: 27,
      billingCycleMonths: 1,
      billingStartMonth: "2026-05"
    }
  }],
  sortOrder: { series: ["other-card"] },
  trash: []
};
context.singleton = singleton;
vm.runInContext("migrateCardPaymentsV14(singleton)", context);
assert.equal(singleton.months[0].items[0].usagePeriodStart, "2026-04-01");
assert.equal(singleton.months[0].items[0].usagePeriodEnd, "2026-04-30");

console.log("v14 migration tests passed");
