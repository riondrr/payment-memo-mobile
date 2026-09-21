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

const context = vm.createContext({ Intl });
vm.runInContext(
  ["toNumber", "formatAmount", "formatOptionalAmount", "calculateUnpaidAmount"]
    .map(functionSource)
    .join("\n"),
  context
);

assert.equal(vm.runInContext('formatOptionalAmount("")', context), "－");
assert.equal(vm.runInContext('formatOptionalAmount("   ")', context), "－");
assert.equal(vm.runInContext('formatOptionalAmount("0")', context), "¥0");
assert.equal(vm.runInContext('formatOptionalAmount("12000")', context), "￥12,000");

context.items = [
  { amount: "12000", paid: false },
  { amount: "3000", paid: true },
  { amount: "", paid: false },
  { amount: "500", paid: false }
];
assert.equal(vm.runInContext("calculateUnpaidAmount(items)", context), 12500);

assert.match(html, /<span>引落合計<\/span>\s*<strong id="totalAmount">/);
assert.match(html, /<span>未払い額<\/span>\s*<strong id="unpaidAmount">/);
assert.doesNotMatch(html, /id="paidCount"/);

console.log("payment summary tests passed");
