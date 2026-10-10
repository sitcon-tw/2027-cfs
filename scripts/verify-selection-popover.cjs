const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require(require.resolve("typescript", { paths: [fs.realpathSync("node_modules/@astrojs/check")] }));

// Execute the actual catalog script with its storage and DOM boundaries supplied.
const source = fs.readFileSync("src/components/section/ItemsPopup.astro", "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
const javascript = ts.transpileModule(source.replace(/^\s*import .*;$/gm, "").replaceAll("import.meta.env.BASE_URL", JSON.stringify("/2027/cfs/")), {
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
}).outputText;
let items = [];
let selecting = true;
const pending = [];
const classes = new Set();
const popover = { classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) } };
const count = { textContent: "" };
const expansion = Object.assign(new EventTarget(), {
	style: {},
	classList: { add() {}, remove() {} },
	setAttribute() {},
	querySelector: () => ({ style: {} })
});
const document = Object.assign(new EventTarget(), {
	documentElement: { lang: "zh-Hant" },
	querySelector: selector => {
		if (selector === ".interest-count") return count;
		if (selector === ".cards-container") return expansion;
		if (selector === ".item-popup-bg.show") return selecting ? {} : null;
		return null;
	},
	querySelectorAll: () => [],
	getElementById: id => (id === "interestPopover" ? popover : id === "expandButton" ? expansion : null)
});
const window = Object.assign(new EventTarget(), { innerHeight: 900 });
vm.runInNewContext(javascript, {
	document,
	window,
	console,
	Event,
	CustomEvent,
	Element: class {},
	getInterestedItems: () => items,
	localizeInterestedItem: item => item,
	removeInterestedItem: () => {},
	isItemInterested: () => false,
	isDeadlinePassed: () => false,
	initializeAddToCart: () => {},
	updateAddButtonStates: () => {},
	setTimeout: callback => pending.push(callback),
	requestAnimationFrame: () => 1,
	cancelAnimationFrame: () => {}
});
const flush = () => {
	while (pending.length) pending.shift()();
};
const update = next => {
	items = next;
	window.dispatchEvent(new CustomEvent("itemsChange", { detail: { items } }));
	flush();
};
flush();
update([{ id: "12-sub-0" }]);
assert.equal(count.textContent, "1", "Selection immediately updates the saved count");
assert.equal(classes.has("active"), false, "Selecting an option must not open the popover");
update([{ id: "12-sub-0" }, { id: "12-sub-1" }]);
assert.equal(count.textContent, "2");
assert.equal(classes.has("active"), false, "A second selection also stays quiet");
update([{ id: "12-sub-1" }]);
assert.equal(count.textContent, "1");
assert.equal(classes.has("active"), false, "Deselecting stays quiet");
// Closing the popup does not require a separate completion control.
selecting = false;
update([{ id: "12-sub-1" }, { id: "5" }]);
assert.equal(classes.has("active"), true, "Ordinary additions retain their existing automatic preview");
classes.clear();
update([{ id: "12-sub-1" }, { id: "5" }, { id: "1-sub-0" }]);
assert.equal(classes.has("active"), true, "Sub-item additions outside an open item popup still show the preview");
console.log("PASS: selections sync without interruption; additions outside an item popup open the popover");
