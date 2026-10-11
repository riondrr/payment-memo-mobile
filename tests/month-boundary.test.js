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

const context = vm.createContext({ Date, String, Number, Boolean });
vm.runInContext(
  [
    "normalizeDebitDay",
    "normalizeMonthStartDay",
    "normalizeDateValue",
    "dateFromMonthAndDay",
    "addDaysToDate",
    "offsetMonthId",
    "monthPeriodRange",
    "isDateInMonthPeriod"
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

assert.match(html, /id="monthStartDayInput"[^>]*min="1"[^>]*max="31"/);
assert.match(html, /state\.monthStartDay = value/);
assert.match(html, /entriesForMonthPeriod\(month\.id\)/);
assert.match(html, /集計期間/);

console.log("month boundary tests passed");
