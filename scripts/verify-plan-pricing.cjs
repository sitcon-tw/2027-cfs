const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require(require.resolve("typescript", { paths: [fs.realpathSync("node_modules/@astrojs/check")] }));

function loadUtility(path, dependencies = {}) {
	const module = { exports: {} };
	const javascript = ts.transpileModule(fs.readFileSync(path, "utf8"), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true }
	}).outputText;
	vm.runInNewContext(javascript, {
		module,
		exports: module.exports,
		URL,
		require: name => {
			assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
			return dependencies[name];
		}
	});
	return module.exports;
}

// Rule tests use fixed fixtures so legitimate Sheet edits do not block publication.
const plans = Object.fromEntries(
	[
		{ id: "navigator", price: "NT$179,000", booths: "2", schedule: "O" },
		{ id: "deep_cultivation", price: "NT$109,000", booths: "1", schedule: "O" },
		{ id: "visionary", price: "NT$79,000", booths: "1", schedule: "O" },
		{ id: "new_sprout", price: "NT$35,000", booths: "", schedule: "" }
	].map((plan, index) => [
		plan.id,
		{
			id: plan.id,
			name_zh: `方案 ${index + 1}`,
			name_en: `Tier ${index + 1}`,
			price: plan.price,
			order: index + 1,
			benefits: [
				{ item_id: "27", item_name: "電視輪播", quantity: "O" },
				{ item_id: "28", item_name: "會場攤位", quantity: plan.booths },
				{ item_id: "19", item_name: "議程表置入", quantity: plan.schedule },
				{ item_id: "40", item_name: "網頁 Logo", quantity: "O" },
				{ item_id: "", item_name: "Facebook 貼文", quantity: "1" },
				{ item_id: "", item_name: "Instagram 精選動態", quantity: "1" }
			]
		}
	])
);
const items = {
	27: { name_zh: "電視輪播", name_en: "TV rotation", price: "$4,000", deadline: "", sub: [] },
	28: { name_zh: "會場攤位", name_en: "Booth", price: "", deadline: "", sub: [] },
	19: { name_zh: "議程表置入", name_en: "Schedule placement", price: "$8,000", deadline: "", sub: [] },
	40: { name_zh: "網頁 Logo", name_en: "Website logo", price: "", deadline: "", sub: [] },
	12: {
		name_zh: "社群宣傳",
		name_en: "Social promotion",
		price: "",
		deadline: "",
		sub: [
			{ name_zh: "Facebook 貼文", name_en: "Facebook post", price: "$4,000" },
			{ name_zh: "Instagram 精選動態", name_en: "Instagram highlight", price: "$4,000" },
			{ name_zh: "Instagram 貼文", name_en: "Instagram post", price: "$5,000" }
		]
	}
};
const translations = {
	"zh-Hant": {
		opendream: {
			plans: [
				{ id: "opendream-5", name: "支持 5 位學生", price: "NT$30,000" },
				{ id: "opendream-10", name: "支持 10 位學生", price: "NT$50,000" }
			]
		}
	},
	en: {
		opendream: {
			plans: [
				{ id: "opendream-5", name: "Support 5 students", price: "NT$30,000" },
				{ id: "opendream-10", name: "Support 10 students", price: "NT$50,000" }
			]
		}
	}
};
const itemPrice = loadUtility("src/utils/item-price.ts");
const helper = loadUtility("src/utils/plan-helper.ts", {
	"./item-price.js": itemPrice,
	"@data/plan.json": plans,
	"@data/item.json": items,
	"@i18n/zh-Hant.json": translations["zh-Hant"],
	"@i18n/en.json": translations.en
});

assert.equal(helper.findMinimalPlanForItem("28").id, "visionary", "An empty comparison cell does not include a booth");
assert.equal(helper.findMinimalPlanForItem("19").id, "visionary");
assert.equal(helper.findMinimalPlanForItem("12-sub-0").id, "new_sprout", "Named sub-item benefits must resolve to their exact option");
assert.equal(helper.isItemInAnyPlan("12-sub-2"), false, "An included Facebook post does not include all social options");
assert.equal(helper.isItemInAnyPlan("unknown"), false);
for (const quantity of ["", " ", "0"]) assert.equal(helper.isBenefitIncluded({ quantity }), false);
for (const quantity of ["O", "2", "logo"]) assert.equal(helper.isBenefitIncluded({ quantity }), true);

const selection = (...ids) => ids.map(id => ({ id, title: "Old title", price: "方案包含項目", deadline: "2020/01/01" }));
const prices = (ids, lang) => helper.localizeInterestedItems(selection(...ids), lang).map(item => item.price);
const total = items => items.reduce((sum, item) => sum + (Number(item.price.replace(/^NT\$/, "").replaceAll(",", "")) || 0), 0);
for (const lang of ["zh-Hant", "en"]) {
	const included = lang === "en" ? "Plan Included Item" : "方案包含項目";
	assert.equal(prices(["27"], lang)[0], "NT$4,000", "Standalone TV must recover its price even from an old saved inclusion label");
	for (const plan of Object.values(plans)) {
		const items = helper.localizeInterestedItems(selection("27", `tier-${plan.id}`), lang);
		assert.equal(items[0].price, included);
		assert.equal(total(items), Number(plan.price.replace(/[NT$,]/g, "")), "TV included in a tier must not be charged twice");
		assert.equal(items[1].deadline, "", "Old benefit deadlines must not close a whole tier");
	}
	assert.equal(prices(["19", "tier-new_sprout"], lang)[0], "NT$8,000", "New Sprout does not include the schedule placement");
	assert.equal(prices(["19", "tier-visionary"], lang)[0], included);
	assert.equal(prices(["12-sub-0", "tier-new_sprout"], lang)[0], included);
	assert.equal(prices(["12-sub-2", "tier-new_sprout"], lang)[0], "NT$5,000");
	assert.equal(prices(["40"], lang)[0], included, "An unpriced benefit must not acquire a fabricated standalone price");
	assert.equal(prices(["opendream-5"], lang)[0], "NT$30,000");
	assert.equal(prices(["opendream-10"], lang)[0], "NT$50,000");
	assert.equal(prices(["27", "opendream-5"], lang)[0], "NT$4,000", "Independent Open Dream is not one of the four tiered packages");
}
const original = selection("27", "tier-new_sprout");
const saved = JSON.stringify(original);
helper.localizeInterestedItems(original);
assert.equal(JSON.stringify(original), saved, "Rendering must not mutate saved selections");
assert.equal(helper.getItemDisplayPrice("unknown", "$70,000 起", "en"), "From $70,000");

const previousPrice = plans.new_sprout.price;
plans.new_sprout.price = "NT$36,000";
assert.equal(prices(["tier-new_sprout"], "zh-Hant")[0], "NT$36,000", "Selection prices follow updated input data");
plans.new_sprout.price = previousPrice;

console.log("PASS: actual tier benefits, standalone TV and conditional pricing agree in both languages");
