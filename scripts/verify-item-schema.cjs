const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require(require.resolve("typescript", { paths: [fs.realpathSync("node_modules/@astrojs/check")] }));

let now = new Date(2027, 1, 16, 12).getTime();
class TestDate extends Date {
	constructor(...args) {
		super(...(args.length ? args : [now]));
	}
}

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
		Date: TestDate,
		URL
	});
	return module.exports;
}

const deadline = loadUtility("src/utils/deadline.ts");
const itemPrice = loadUtility("src/utils/item-price.ts");
const items = loadUtility("src/utils/items-loader.ts", { "./item-price.js": itemPrice });
const localStorage = loadUtility("src/utils/local-storage.ts", { "./deadline.js": deadline });
const { createItemSchema } = loadUtility("src/utils/item-schema.ts", { "./deadline.js": deadline, "./items-loader.js": items, "./local-storage.js": localStorage, "./item-price.js": itemPrice });
const itemsUrl = new URL("https://sitcon.org/2027/cfs/items/");
const single = {
	id: "27",
	name: "會場電視輪播",
	price: "$4,000",
	remaining: "",
	quantity: "不限",
	deadline: "",
	image: "tv.webp",
	sub: []
};
const schema = item => JSON.parse(JSON.stringify(createItemSchema(item, "Sponsorship", itemsUrl)));
for (const name of ["會場電視輪播", "TV Screen Loop Exposure"]) {
	const product = schema({ ...single, name });
	assert.equal(product.name, name);
	assert.equal(product.image, "https://sitcon.org/2027/cfs/items/tv.webp");
	assert.equal(product.offers[0].price, 4000);
	assert.equal(product.offers[0].priceCurrency, "TWD");
	assert.equal(product.offers[0].availability, "https://schema.org/InStock");
}

// Exact add-on prices are not standalone offers: all items except 27 require a tier.
for (const id of ["16", "17", "41", "99"]) {
	assert.equal(schema({ ...single, id }), null, `Item ${id} must not advertise a standalone offer`);
}
const flags = {
	...single,
	id: "1",
	name: "午餐旗、點心旗",
	price: "",
	sub: [
		{ name: "午餐旗", price: "$40,000", remaining: "1" },
		{ name: "點心旗", price: "$30,000", remaining: "1" }
	]
};
assert.equal(schema(flags), null, "Priced sub-options do not remove the tier prerequisite");
for (const name of ["網頁 Logo 曝光", "Website Logo Exposure"]) {
	assert.equal(schema({ ...single, id: "40", name, quantity: "打包專屬", price: "" }), null);
}

assert.equal(schema({ ...single, price: "NT$1,234.50" }).offers[0].price, 1234.5);
assert.equal(schema({ ...single, price: "$0" }).offers[0].price, 0, "An explicit zero is distinct from an absent price");
for (const price of ["", " ", "方案包含項目", "Plan Included Item", "$70,000 起", "From $70,000", "$30,000–$40,000", "$1,00"]) {
	assert.equal(schema({ ...single, price }), null, `Do not emit a Product without an exact offer for: ${price}`);
}
const variants = {
	...single,
	sub: [
		{ name: "A", price: "$4,000", remaining: "" },
		{ name: "B", price: "$6,000", remaining: "1" }
	]
};
assert.equal(schema({ ...variants, sub: variants.sub.map(option => ({ ...option, price: "" })) }), null);
assert.deepEqual(
	schema({ ...variants, price: "$4,000 起" }).offers.map(offer => offer.price),
	[4000, 6000],
	"Options take precedence over a parent starting price"
);
assert.deepEqual(
	schema({ ...variants, sub: [variants.sub[0], { ...variants.sub[1], price: "" }] }).offers.map(offer => offer.price),
	[4000]
);
assert.equal(schema({ ...single, remaining: "0", quantity: "不限" }).offers[0].availability, "https://schema.org/SoldOut");
for (const remaining of ["", " ", "2"]) {
	assert.equal(schema({ ...single, remaining, quantity: "" }).offers[0].availability, "https://schema.org/InStock", "Blank remaining means open for sponsorship");
}
assert.deepEqual(
	schema({ ...variants, sub: [{ ...variants.sub[0], remaining: "0" }, variants.sub[1]] }).offers.map(offer => offer.availability),
	["https://schema.org/SoldOut", "https://schema.org/InStock"]
);
assert.ok(schema({ ...variants, remaining: "0" }).offers.every(offer => offer.availability === "https://schema.org/SoldOut"));
for (const value of ["", " ", "invalid", "2027/02/30"]) {
	assert.ok(!("priceValidUntil" in schema({ ...single, deadline: value }).offers[0]));
}
assert.equal(schema({ ...single, deadline: "2027-02-16" }).offers[0].priceValidUntil, "2027-02-16");
now = new Date(2027, 1, 16, 23, 59, 59, 999).getTime();
assert.ok(schema({ ...single, deadline: "2027/2/16" }), "Sponsorship remains open through its final day");
now += 1;
assert.equal(schema({ ...single, deadline: "2027/2/16" }), null, "Expired sponsorship must not advertise an active offer");

console.log("PASS: only standalone sponsorship has Product offers; prices, open/sold-out stock and deadlines stay accurate");
