const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4322/2027-cfs/";

(async () => {
	const browser = await chromium.connectOverCDP(process.env.CDP_URL || "http://127.0.0.1:9334");
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
	await context.route(/googletagmanager|google-analytics/, route => route.abort());
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", error => errors.push(String(error)));
	const track = () => page.locator("#news .news-content");
	const position = () => track().evaluate(el => el.scrollLeft);
	async function showNews() {
		await track().evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
		await page.waitForTimeout(250);
	}
	async function stationary() {
		const before = await position();
		await page.waitForTimeout(1100);
		assert.ok(Math.abs((await position()) - before) <= 1, "News stays still while paused");
	}

	for (const lang of ["", "en/"]) {
		await page.goto(base + lang, { waitUntil: "networkidle" });
		assert.equal(await page.locator(".news-hint, .scroll-hint").count(), 0);
		assert.equal(await page.locator("#news .news-content a").count(), 6);
		await stationary(); // No movement while below the viewport.
		await showNews();
		let before = await position();
		await page.waitForTimeout(1400);
		let advance = (await position()) - before;
		assert.ok(advance >= 10 && advance <= 50, `News moves slowly to the left (${advance}px)`);

		await page.emulateMedia({ reducedMotion: "reduce" });
		await stationary();
		await page.emulateMedia({ reducedMotion: "no-preference" });
		before = await position();
		await page.waitForTimeout(1100);
		assert.ok((await position()) > before + 10);
		await page.evaluate(() => window.popupCtrl("news-popup", "open"));
		await page.waitForTimeout(350);
		await stationary();
		await page.keyboard.press("Escape");
		await page.waitForTimeout(350);

		// Pointer interaction with the track hands control to the reader and does not open a news link.
		const box = await track().boundingBox();
		await page.mouse.click(box.x + box.width / 2, box.y + box.height - 28);
		await stationary();
		await track().evaluate(el => (el.scrollLeft += 120));
		await stationary();
		assert.equal(context.pages().length, 1);

		await page.reload({ waitUntil: "networkidle" });
		await showNews();
		await track().focus();
		await stationary();
		before = await position();
		await page.keyboard.press("ArrowRight");
		await page.waitForTimeout(300);
		assert.ok((await position()) > before, "Native keyboard scrolling still works");
		await stationary();

		// At the final story, stop rather than jumping back to the first story.
		await page.reload({ waitUntil: "networkidle" });
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
		await page.waitForTimeout(200);
		await track().evaluate(el => (el.scrollLeft = el.scrollWidth - el.clientWidth - 5));
		await showNews();
		await page.waitForTimeout(600);
		assert.ok(await track().evaluate(el => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth)) <= 1));
		await stationary();
		console.log(`PASS ${lang || "zh/"}: slow auto-scroll, offscreen/modal/reduced-motion pauses, pointer and keyboard handoff, six stories, end without a jump`);
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.reload({ waitUntil: "networkidle" });
	await showNews();
	assert.equal(await track().evaluate(el => getComputedStyle(el).display), "grid");
	await stationary();
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
