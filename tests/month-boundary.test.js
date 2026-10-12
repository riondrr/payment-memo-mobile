const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

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

const context = vm.createContext({
  Date,
  String,
  Number,
  Boolean,
  seed: { activeMonth: "2026-10" },
  unassignedAccount: "未設定",
  crypto: { randomUUID: () => "test-id" }
});
vm.runInContext(
  [
    "normalizeDebitDay",
    "normalizeMonthStartDay",
    "normalizeDateValue",
    "normalizePaymentType",
    "normalizeBillingCycleMonths",
    "normalizeBillingStartMonth",
    "dateFromMonthAndDay",
    "dayFromDate",
    "dateFromParts",
    "parseMonthDayInput",
    "debitDateFromMonthDay",
    "addDaysToDate",
    "offsetMonthId",
    "monthPeriodRange",
    "isDateInMonthPeriod",
    "monthIdForDebitDate",
    "debitMonthPreviewLabel",
    "fullMonthRange",
    "fullCycleRange",
    "copyItemForMonth"
  ].map(functionSource).join("\n"),
  context
);

function range(monthId, day) {
  return JSON.parse(vm.runInContext(`JSON.stringify(monthPeriodRange("${monthId}", ${day}))`, context));
}

assert.deepEqual(range("2026-10", 1), { start: "2026-10-01", end: "2026-10-31" });
assert.deepEqual(range("2026-10", 25), { start: "2026-09-25", end: "2026-10-24" });
assert.deepEqual(range("2026-10", 31), { start: "2026-09-30", end: "2026-10-30" });
assert.deepEqual(range("2028-03", 31), { start: "2028-02-29", end: "2028-03-30" });

assert.equal(vm.runInContext("normalizeMonthStartDay(0)", context), 1);
assert.equal(vm.runInContext("normalizeMonthStartDay(32)", context), 1);
assert.equal(vm.runInContext("normalizeMonthStartDay(25)", context), 25);

assert.equal(vm.runInContext('isDateInMonthPeriod("2026-10-01", "2026-10", 25)', context), true);
assert.equal(vm.runInContext('isDateInMonthPeriod("2026-10-30", "2026-10", 25)', context), false);
assert.equal(vm.runInContext('isDateInMonthPeriod("2026-10-30", "2026-11", 25)', context), true);

assert.equal(vm.runInContext('monthIdForDebitDate("2026-10-01", 25)', context), "2026-10");
assert.equal(vm.runInContext('monthIdForDebitDate("2026-10-30", 25)', context), "2026-11");
assert.equal(vm.runInContext('monthIdForDebitDate("2026-10-30", 1)', context), "2026-10");
assert.equal(vm.runInContext('debitMonthPreviewLabel("2026-10-30", 25, "2026-10")', context), "この明細は11月分に表示されます");

assert.equal(vm.runInContext('debitDateFromMonthDay("11/2", "2026-10")', context), "2026-11-02");
assert.equal(vm.runInContext('debitDateFromMonthDay("1/5", "2026-12")', context), "2027-01-05");
assert.equal(vm.runInContext('debitDateFromMonthDay("12/30", "2026-01")', context), "2025-12-30");
assert.equal(vm.runInContext('debitDateFromMonthDay("2/30", "2026-02")', context), null);

const copiedOverride = JSON.parse(vm.runInContext(`JSON.stringify(copyItemForMonth({
  id: "source",
  seriesId: "series",
  debitAccount: "口座",
  paymentType: "direct",
  paymentMethod: "",
  content: "家賃",
  debitDate: "2026-11-02",
  debitDay: 30,
  debitDateOverride: true,
  billingCycleMonths: 1,
  billingStartMonth: "2026-10",
  usagePeriodStart: "",
  usagePeriodEnd: "",
  paid: false
}, "2026-11", "2026-10"))`, context));
assert.equal(copiedOverride.debitDate, "2026-11-30");
assert.equal(copiedOverride.debitDay, 30);
assert.equal(copiedOverride.debitDateOverride, false);

assert.match(html, /id="monthStartDayInput"[^>]*min="1"[^>]*max="31"/);
assert.match(html, /state\.monthStartDay = value/);
assert.match(html, /entriesForMonthPeriod\(month\.id\)/);
assert.match(html, /集計期間/);
assert.match(html, /今回だけ月日を指定/);
assert.match(html, /この明細は\$\{displayMonth\}分に表示されます/);
assert.match(html, /const currentSchemaVersion = 16/);

console.log("month boundary tests passed");
