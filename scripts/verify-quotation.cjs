const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const itemData = require("../src/data/item.json");
const planData = require("../src/data/plan.json");
const zh = require("../src/i18n/zh-Hant.json");
const en = require("../src/i18n/en.json");
const base = (process.env.REVIEW_BASE_URL || "http://127.0.0.1:4321/").replace(/\/?$/, "/");
const output = process.env.REVIEW_OUTPUT;
const ids = ["23", "5-sub-0", "tier-navigator", "opendream-5", "28"];
const numericPrice = price => Number(price.replace(/[^0-9]/g, ""));
const expectedTotal = numericPrice(itemData["23"].price) + numericPrice(itemData["5"].sub[0].price) + numericPrice(planData.navigator.price) + numericPrice(zh.opendream.plans[0].price);

(async () => {
	const browser = process.env.CDP_URL
		? await chromium.connectOverCDP(process.env.CDP_URL)
		: await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ["--no-sandbox"] });
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	await context.route(/googletagmanager|google-analytics/, route => route.abort());
	await context.addInitScript(() => {
		window.print = () => {
			window.quotationPrinted = true;
		};
	});
	if (output) fs.mkdirSync(output, { recursive: true });
	const errors = [];
	context.on("page", page => page.on("pageerror", error => errors.push(String(error))));
	const page = await context.newPage();

	for (const languagePath of ["", "en/"]) {
		const english = languagePath === "en/";
		const lang = english ? "en" : "zh-Hant";
		const translations = english ? en : zh;
		const t = translations.quotation;
		const sourceName = english ? "name_en" : "name_zh";
		const selectedItems = ids.map(id => ({
			id,
			title: english ? "舊的中文收藏名稱" : "Old English selection",
			category: "all",
			image: "",
			deadline: "NaN/NaN 截止",
			price: english ? "方案包含項目" : "Plan Included Item"
		}));
		const expectedTitles = [
			itemData["23"][sourceName],
			itemData["5"].sub[0][sourceName],
			planData.navigator[sourceName],
			`${translations.opendream.title}｜${translations.opendream.plans[0].name}`,
			itemData["28"][sourceName]
		];

		await page.goto(base + languagePath, { waitUntil: "networkidle" });
		await page.evaluate(items => {
			localStorage.setItem("interestItems", JSON.stringify(items));
			window.dispatchEvent(new CustomEvent("itemsChange"));
		}, selectedItems);
		await page.waitForFunction(count => document.querySelector(".interest-count")?.textContent === String(count), ids.length);
		if (!(await page.locator("#interestPopover").evaluate(el => el.classList.contains("active")))) {
			await page.locator("#interestButton").click();
		}
		const [quotation] = await Promise.all([page.waitForEvent("popup"), page.locator(".download-quote-btn").click()]);
		await quotation.waitForLoadState("networkidle");
		await quotation.locator(".items-table").waitFor();
		assert.equal(new URL(quotation.url()).pathname.replace(/\/$/, ""), new URL(base + languagePath + "quotation").pathname);
		assert.equal(await quotation.locator("html").getAttribute("lang"), lang);
		assert.equal(await quotation.title(), t.title);
		assert.equal(await quotation.locator(".quotation-container h1").innerText(), t.title);
		assert.deepEqual(await quotation.locator(".items-table th").allTextContents(), [t.number, t.item_name, t.quantity, t.unit_price, t.subtotal]);
		assert.deepEqual(await quotation.locator(".item-title").allTextContents(), expectedTitles);
		assert.ok((await quotation.locator(".summary-row.total").innerText()).includes(`NT$${expectedTotal.toLocaleString(english ? "en-US" : "zh-TW")}`));
		assert.equal(await quotation.locator(".item-deadline").count(), 1);
		assert.ok((await quotation.locator(".item-deadline").innerText()).startsWith(t.deadline));
		assert.equal(await quotation.locator(".notes li").count(), t.notes.length + 1);
		const text = await quotation.locator(".quotation-container").innerText();
		assert.ok(text.includes(t.non_numeric_note));
		assert.ok(!text.includes("NaN"));
		assert.ok(!text.includes("{count}") && !text.includes("{amount}") && !text.includes("{date}"));
		if (english) assert.ok(!/[\u3400-\u9fff]/.test(text), "The English quotation must not retain Chinese labels or saved titles");
		await quotation.waitForFunction(() => window.quotationPrinted === true);
		assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("interestItems"))), selectedItems, "Rendering a quotation must not modify the selections");
		if (output) {
			await quotation.screenshot({ path: `${output}/quotation-${english ? "en" : "zh"}.png`, fullPage: true });
			await quotation.pdf({ path: `${output}/quotation-${english ? "en" : "zh"}.pdf`, printBackground: true, preferCSSPageSize: true });
		}
		await quotation.close();
		console.log(`PASS ${lang}: download route, localized legacy selections, item/sub-item/plan/Open Dream names, totals, notes, deadlines and automatic print`);

		await page.evaluate(() => localStorage.removeItem("interestItems"));
		await page.goto(base + languagePath + "quotation", { waitUntil: "networkidle" });
		assert.equal(await page.locator(".empty-state h2").innerText(), t.empty_title);
		assert.equal(await page.locator(".empty-state p").innerText(), t.empty_description);
		assert.equal(await page.locator(".items-table").count(), 0);
		await page.waitForFunction(() => window.quotationPrinted === true);
		console.log(`PASS ${lang}: localized empty quotation`);
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
