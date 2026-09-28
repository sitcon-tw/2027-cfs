const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4322/2027-cfs/";
const output = process.env.REVIEW_OUTPUT;

(async () => {
	const browser = await chromium.connectOverCDP(process.env.CDP_URL || "http://127.0.0.1:9334");
	const context = await browser.newContext();
	await context.route(/googletagmanager|google-analytics/, route => route.abort());
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", error => errors.push(String(error)));
	if (output) fs.mkdirSync(output, { recursive: true });
	for (const lang of ["", "en/"]) {
		for (const width of [320, 390, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(base + lang + "#stat-popup", { waitUntil: "networkidle" });
			await page.evaluate(() => document.fonts.ready);
			await page.waitForFunction(() => document.querySelector("#stat-popup + .popup-bg").classList.contains("show"));
			await page.waitForTimeout(400);
			const popup = page.locator("#stat-popup + .popup-bg");
			assert.equal(await popup.locator("details#schools-text-container, details.social-media-section").count(), 0);
			for (const selector of ["#schools-text", ".social-media-section .stats-cards-wrapper"]) {
				assert.ok(await popup.locator(selector).first().isVisible(), `${selector} visible without expanding`);
			}
			assert.ok(await popup.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Stats fit the popup");
			if (width <= 768) assert.ok(await popup.locator(".social-media-section .mobile-stat-tables").first().isVisible());
			else assert.ok(await popup.locator("#fb-age-chart canvas").isVisible());
			if (output && width === 390) {
				for (const selector of ["#schools-text-container", ".social-media-section"]) {
					await popup.locator(selector).evaluate(el => {
						const scroller = el.closest(".popup-bg");
						scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
					});
					await page.waitForTimeout(200);
					await page.screenshot({ path: `${output}/${lang ? "en" : "zh"}-${selector.replace(/[#.]/g, "")}.png` });
				}
			}
			await page.keyboard.press("Escape");
			await page.waitForTimeout(400);
			const button = page.locator("#expandButton");
			for (const keyboard of [false, true]) {
				await button.click();
				assert.equal(await button.getAttribute("aria-expanded"), "true");
				await page.waitForTimeout(600);
				await button.evaluate(el => window.scrollPageTo(scrollY + el.getBoundingClientRect().top - 500));
				await page.waitForTimeout(200);
				const before = (await button.boundingBox()).y;
				// Sample every frame: a final-position-only check would miss transient jumps.
				await page.evaluate(() => {
					window.collapseSamples = [];
					const end = performance.now() + 900;
					const sample = () => {
						window.collapseSamples.push(document.getElementById("expandButton").getBoundingClientRect().top);
						if (performance.now() < end) requestAnimationFrame(sample);
					};
					requestAnimationFrame(sample);
				});
				if (keyboard) {
					await button.focus();
					await page.keyboard.press("Enter");
				} else await button.click();
				await page.waitForTimeout(1000);
				assert.equal(await button.getAttribute("aria-expanded"), "false");
				const samples = await page.evaluate(() => window.collapseSamples);
				assert.ok(
					samples.every(y => Math.abs(y - before) <= 2),
					`Collapse anchor moved: ${before} -> ${Math.min(...samples)}..${Math.max(...samples)}`
				);
			}
			// Changing category after a collapse must not trigger a programmatic jump.
			await page.locator("#items .tabs").evaluate(el => window.scrollPageTo(scrollY + el.getBoundingClientRect().top - 200));
			await page.waitForTimeout(200);
			const beforeCategory = await page.evaluate(() => scrollY);
			await page.locator('.tab[data-category="brand_exposure"]').click();
			await page.waitForTimeout(700);
			assert.ok(Math.abs((await page.evaluate(() => scrollY)) - beforeCategory) <= 2, "Category change preserves scroll position");
			console.log(`PASS ${lang || "zh/"} ${width}px: stats always visible; mouse/keyboard collapse anchored; category stays put`);
		}
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
