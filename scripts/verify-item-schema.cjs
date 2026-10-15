const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require(require.resolve("typescript", { paths: [fs.realpathSync("node_modules/@astrojs/check")] }));

function loadUtility(path, dependencies = {}) {
	const module = { exports: {} };
	const javascript = ts.transpileModule(fs.readFileSync(path, "utf8"), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
	}).outputText;
	vm.runInNewContext(javascript, {
		module,
		exports: module.exports,
		require: name => {
			assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
			return dependencies[name];
		},
		Date,
		URL
	});
	return module.exports;
}

const deadline = loadUtility("src/utils/deadline.ts");
const itemPrice = loadUtility("src/utils/item-price.ts");
const items = loadUtility("src/utils/items-loader.ts", { "./item-price.js": itemPrice });
const { createItemSchema } = loadUtility("src/utils/item-schema.ts", { "./deadline.js": deadline, "./items-loader.js": items });
const itemsUrl = new URL("https://sitcon.org/2027/cfs/items/");
// Regression fixture: the lunch/snack flags have prices only on their options.
const flags = {
	name: "午餐旗、點心旗",
	price: "",
	remaining: "",
	quantity: "獨家",
	deadline: "2027/2/16",
	image: "flags.webp",
	sub: [
		{ name: "午餐旗", price: "$40,000", remaining: "1" },
		{ name: "點心旗", price: "$30,000", remaining: "1" }
	]
};
const schema = item => JSON.parse(JSON.stringify(createItemSchema(item, "Sponsorship", itemsUrl)));
const offers = schema(flags).offers;
assert.deepEqual(
	offers.map(offer => offer.price),
	[40000, 30000]
);
assert.deepEqual(
	offers.map(offer => offer.name),
	["午餐旗", "點心旗"]
);
assert.ok(offers.every(offer => offer.availability === "https://schema.org/InStock" && offer.priceValidUntil === "2027-02-16" && offer.priceCurrency === "TWD"));
assert.equal(schema(flags).image, "https://sitcon.org/2027/cfs/items/flags.webp");
const english = schema({ ...flags, name: "Lunch Flag, Snack Flag", sub: flags.sub.map((option, index) => ({ ...option, name: ["Lunch Flag", "Snack Flag"][index] })) });
assert.deepEqual(
	english.offers.map(offer => offer.price),
	[40000, 30000]
);
assert.deepEqual(
	english.offers.map(offer => offer.name),
	["Lunch Flag", "Snack Flag"]
);

const single = { ...flags, sub: [], price: "$45,000" };
assert.equal(schema(single).offers[0].price, 45000);
assert.ok(!("availability" in schema(single).offers[0]), "Unknown stock must not become a stock claim");
assert.equal(schema({ ...single, price: "NT$1,234.50" }).offers[0].price, 1234.5);
assert.equal(schema({ ...single, price: "$0" }).offers[0].price, 0, "An explicit zero is distinct from an absent price");
for (const price of ["", " ", "方案包含項目", "$70,000 起", "From $70,000", "$30,000–$40,000", "$1,00"]) {
	assert.ok(!("offers" in schema({ ...single, price })), `Do not invent an exact offer for: ${price}`);
}
assert.deepEqual(
	schema({ ...flags, price: "$70,000 起" }).offers.map(offer => offer.price),
	[40000, 30000],
	"Options take precedence over a parent starting price"
);
assert.deepEqual(
	schema({ ...flags, sub: [flags.sub[0], { ...flags.sub[1], price: "" }] }).offers.map(offer => offer.price),
	[40000]
);
assert.equal(schema({ ...single, remaining: "0", quantity: "不限" }).offers[0].availability, "https://schema.org/SoldOut");
assert.equal(schema({ ...single, quantity: "不限" }).offers[0].availability, "https://schema.org/InStock");
assert.deepEqual(
	schema({ ...flags, sub: [{ ...flags.sub[0], remaining: "0" }, flags.sub[1]] }).offers.map(offer => offer.availability),
	["https://schema.org/SoldOut", "https://schema.org/InStock"]
);
assert.ok(schema({ ...flags, remaining: "0" }).offers.every(offer => offer.availability === "https://schema.org/SoldOut"));
for (const value of ["", " ", "invalid", "2027/02/30"]) {
	assert.ok(!("priceValidUntil" in schema({ ...single, deadline: value }).offers[0]));
}
assert.equal(schema({ ...single, deadline: "2027-02-16" }).offers[0].priceValidUntil, "2027-02-16");

console.log("PASS: item schema preserves option prices, known stock and calendar dates without inventing free offers");
