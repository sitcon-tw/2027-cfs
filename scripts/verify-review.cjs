const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4322/2027-cfs/";
const output = process.env.REVIEW_OUTPUT || "/tmp/cfs-fix-evidence";
fs.mkdirSync(output, { recursive: true });
(async () => {
	const browser = await chromium.connectOverCDP(process.env.CDP_URL || "http://127.0.0.1:9334");
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
	await context.route(/googletagmanager|google-analytics/, r => r.abort());
	const page = await context.newPage();
	let errors = [];
	page.on("pageerror", e => errors.push(String(e)));
	await page.goto(base, { waitUntil: "networkidle" });
	await page.evaluate(() => document.fonts.ready);
	assert.equal(await page.locator(".plan-comparison").isVisible(), true);
	assert.equal(await page.locator("#news .news-content a").count(), 6);
	assert.equal(await page.locator("#sponsor-form").count(), 0);
	assert.equal(await page.locator(".nav-menu a").count(), 4);
	for (const category of ["talent_recruitment", "brand_exposure", "product_promotion"]) {
		await page.locator(`[data-item-category="${category}"]`).click();
		await page.waitForTimeout(400);
		assert.equal(await page.locator("#items .tab.active").getAttribute("data-category"), category);
		const ids = await page.locator("#items .cards-grid .card").evaluateAll(els => els.map(el => el.dataset.cardId));
		await page.locator("#items .cards-grid .card").first().click();
		await page.waitForTimeout(400);
		assert.ok(page.url().includes("/item/" + ids[0] + "/"));
		await page.locator('.popup-bg.show [data-item-nav="next"]').click();
		await page.waitForTimeout(400);
		assert.ok(page.url().includes("/item/" + ids[1] + "/"), page.url() + " expected " + ids[1]);
		await page.keyboard.press("ArrowLeft");
		await page.waitForTimeout(400);
		assert.ok(page.url().includes("/item/" + ids[0] + "/"));
		await page.keyboard.press("Escape");
		await page.waitForTimeout(400);
	}
	const comparison = page.locator(".plans-table");
	assert.ok(await comparison.evaluate(el => el.scrollWidth > el.clientWidth));
	await comparison.evaluate(el => (el.scrollLeft = 200));
	assert.ok(await comparison.evaluate(el => el.scrollLeft > 0));
	await page.locator("#plans .tier-interest-button").first().click();
	const draft = await page.locator("#inquiry-selection").innerText();
	assert.ok(draft.includes("領航級") && draft.includes("179,000"));
	await page.locator("#plans").screenshot({ path: output + "/mobile-plans.png" });
	await page.evaluate(() => window.popupCtrl("place-staff-popup", "open"));
	await page.waitForTimeout(400);
	assert.ok(await page.locator(".timeline").evaluate(el => el.scrollWidth <= el.clientWidth + 1));
	await page.screenshot({ path: output + "/mobile-timeline.png" });
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);
	await page.evaluate(() => window.popupCtrl("item-popup-1", "open"));
	await page.waitForTimeout(400);
	const client = await context.newCDPSession(page);
	await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 250, y: 700 }] });
	for (let i = 1; i <= 15; i++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 250 - i * 5, y: 700 - i * 30 }] });
	await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	await page.waitForTimeout(500);
	assert.ok(page.url().includes("/item/1/"), "diagonal gesture should scroll, not navigate");
	assert.ok(await page.locator(".popup-bg.show .popup-content").evaluate(el => el.scrollTop > 0));
	await page.screenshot({ path: output + "/mobile-item-scroll.png" });
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);
	await page.evaluate(() => window.popupCtrl("stat-popup", "open"));
	await page.waitForTimeout(400);
	assert.equal(await page.locator("#stat-popup + .popup-bg .distribution-chart svg").first().isVisible(), true);
	await page.screenshot({ path: output + "/mobile-statistics.png" });
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
	await page.evaluate(() => window.popupCtrl("item-popup-22", "open"));
	await page.waitForTimeout(400);
	assert.ok((await page.locator(".popup-bg.show .venue-summary").innerText()).includes("426"));
	await page.locator(".popup-bg.show .venue-detail-action").click();
	await page.waitForTimeout(900);
	assert.ok(await page.locator("#place-staff-popup + .popup-bg").evaluate(el => el.classList.contains("show")));
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);
	await page.locator("#time").screenshot({ path: output + "/mobile-event.png" });
	await page.locator("#news").screenshot({ path: output + "/mobile-news.png" });
	await page.locator("#form").screenshot({ path: output + "/mobile-contact.png" });
	for (const lang of ["", "en/"]) {
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(base + lang, { waitUntil: "networkidle" });
			assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang} ${width} horizontal overflow`);
			assert.equal(await page.locator(".plan-comparison").isVisible(), true);
			assert.equal(await page.locator(".export-btn").getAttribute("href"), new URL(base + lang + "brochure/").pathname);
		}
	}
	await page.goto(base + "en/item/22/", { waitUntil: "networkidle" });
	await page.waitForTimeout(400);
	await page.locator('.popup-bg.show [data-item-nav="next"]').click();
	await page.waitForTimeout(400);
	assert.ok(page.url().includes("/en/item/"));
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);
	assert.equal(page.url(), base + "en/");
	const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const dp = await desktop.newPage();
	for (const lang of ["", "en/"]) {
		await dp.goto(base + lang + "brochure/", { waitUntil: "networkidle" });
		await dp.evaluate(() => document.fonts.ready);
		await dp.setViewportSize({ width: 390, height: 844 });
		assert.ok(await dp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Brochure preview must fit on a phone");
		await dp.setViewportSize({ width: 1440, height: 1000 });
		await dp.emulateMedia({ media: "print" });
		const sizes = await dp
			.locator(".page")
			.evaluateAll(els => els.map(el => ({ height: el.clientHeight, scroll: el.scrollHeight, footer: el.querySelector("footer").getBoundingClientRect().bottom - el.getBoundingClientRect().top })));
		console.log(lang || "zh", JSON.stringify(sizes));
		assert.ok(sizes.length >= 5 && sizes.length <= 10);
		assert.ok(
			sizes.every(size => size.scroll <= size.height + 1 && size.footer <= size.height - 55),
			"Every page must fit inside A4 margins"
		);
		await dp.pdf({ path: output + "/brochure-" + (lang ? "en" : "zh") + ".pdf", printBackground: true, preferCSSPageSize: true });
		await dp.emulateMedia({ media: "screen" });
		await dp
			.locator(".page")
			.first()
			.screenshot({ path: output + "/brochure-" + (lang ? "en" : "zh") + ".png" });
	}
	console.log(JSON.stringify({ errors }));
	assert.deepEqual(errors, []);
	await context.close();
	await desktop.close();
	await browser.close();
})().catch(e => {
	console.error(e);
	process.exit(1);
});
