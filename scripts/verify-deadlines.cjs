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
		console
	});
	return module.exports;
}

const deadline = loadUtility("src/utils/deadline.ts");
const { isDeadlinePassed } = loadUtility("src/utils/local-storage.ts", { "./deadline.js": deadline });

for (const value of [undefined, null, "", " ", "\t\n", "not-a-date", "NaN/NaN 截止", "NaN/NaN Deadline", "2027/02/30", "2027/13/09"]) {
	assert.equal(deadline.parseDeadline(value), null);
	assert.equal(deadline.formatDeadline(value), "");
	assert.equal(isDeadlinePassed(value), false, "An unset or invalid deadline must not disable an item");
}

for (const value of ["2027/03/09", "2027-03-09", " 2027/03/09 "]) {
	assert.equal(deadline.formatDeadline(value), "3/9");
	const parsed = deadline.parseDeadline(value);
	assert.equal(parsed.getFullYear(), 2027);
	assert.equal(parsed.getMonth(), 2);
	assert.equal(parsed.getDate(), 9);
}

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const sourceDate = date => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
assert.equal(isDeadlinePassed(sourceDate(yesterday)), true);
assert.equal(isDeadlinePassed(sourceDate(today)), false, "The deadline remains available through the end of its day");
assert.equal(isDeadlinePassed(sourceDate(tomorrow)), false);

console.log("PASS: blank and invalid deadlines are hidden; valid dates format correctly and expire after their final day");
