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
	page.on("pageerror", e => errors.push(String(e)));
	if (output) fs.mkdirSync(output, { recursive: true });
	for (const lang of ["", "en/"]) {
		await page.goto(base + lang + "#stat-popup", { waitUntil: "networkidle" });
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(400);
		const popup = page.locator("#stat-popup + .popup-bg");
		// Resize the open popup, including tablet widths and orientation changes.
		for (const width of [320, 390, 768, 820, 912, 1024, 1440, 390]) {
			await page.setViewportSize({ width, height: 900 });
			await page.waitForTimeout(100);
			assert.equal(await popup.locator(".distribution-chart").count(), 6);
			for (const chart of await popup.locator(".distribution-chart").all()) {
				assert.ok(await chart.locator("svg").isVisible(), "Donuts remain visible on mobile");
				assert.ok(
					await chart.evaluate(el => {
						const svg = el.querySelector("svg").getBoundingClientRect();
						const legend = el.querySelector(".chart-legend").getBoundingClientRect();
						const title = el.querySelector("figcaption").getBoundingClientRect();
						return (
							title.bottom <= svg.top + 1 &&
							svg.bottom <= legend.top + 1 &&
							[el, ...el.querySelectorAll("figcaption, li, .legend-label, .legend-value")].every(e => e.scrollWidth <= e.clientWidth + 1) &&
							[...el.querySelectorAll("li")].every(row => row.querySelector(".legend-label").getBoundingClientRect().right <= row.querySelector(".legend-value").getBoundingClientRect().left)
						);
					}),
					"Titles, donuts and complete labels occupy separate areas without clipping"
				);
			}
			assert.ok(await popup.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "No horizontal popup overflow");
			const age = await popup.locator("#fb-age-chart").boundingBox();
			const gender = await popup.locator("#fb-gender-chart").boundingBox();
			assert.ok(width <= 900 ? gender.y >= age.y + age.height : Math.abs(gender.y - age.y) <= 1, "One column on narrow screens; two on wide screens");
			if (output && [390, 912].includes(width)) {
				await popup.locator("#fb-age-chart").evaluate(el => {
					const scroller = el.closest(".popup-bg");
					scroller.scrollTop += el.getBoundingClientRect().top - 20;
				});
				await page.waitForTimeout(100);
				await page.screenshot({ path: `${output}/${lang ? "en" : "zh"}-${width}.png` });
			}
			console.log(`PASS ${lang || "zh/"} ${width}px: six visible donuts; no overlapping/clipped labels; responsive columns`);
		}
		const data = require(`../src/i18n/${lang ? "en" : "zh-Hant"}.json`).about.popup.chart;
		for (const [id, values, percentages] of [
			["role-chart", data.attender_role, false],
			["level-chart", data.programming_level, false],
			["fb-age-chart", data.social_media.facebook.age, true],
			["fb-gender-chart", data.social_media.facebook.gender, true],
			["ig-age-chart", data.social_media.instagram.age, true],
			["ig-gender-chart", data.social_media.instagram.gender, true]
		]) {
			assert.deepEqual(await page.locator(`#${id} .legend-label`).allTextContents(), Object.keys(values));
			assert.deepEqual(
				(await page.locator(`#${id} ${percentages ? ".legend-value strong" : ".legend-count"}`).allTextContents()).map(text => Number(text.replaceAll(",", "").match(/[\d.]+/)[0])),
				Object.values(values)
			);
		}
		// Reopening must preserve the charts without delayed JS initialization.
		await page.keyboard.press("Escape");
		await page.waitForTimeout(400);
		await page.evaluate(() => window.popupCtrl("stat-popup", "open"));
		assert.ok(await popup.locator("#fb-age-chart svg").isVisible());
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
