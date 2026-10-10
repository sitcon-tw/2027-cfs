const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4322/2027-cfs/";
const output = process.env.REVIEW_OUTPUT;

(async () => {
	const browser = await chromium.connectOverCDP(process.env.CDP_URL || "http://127.0.0.1:9334");
	const context = await browser.newContext({ hasTouch: true });
	await context.route(/googletagmanager|google-analytics/, route => route.abort());
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", error => errors.push(String(error)));
	if (output) fs.mkdirSync(output, { recursive: true });

	async function geometry() {
		return page.locator("#plans").evaluate(section => {
			const scroller = section.querySelector(".plans-table");
			const header = section.querySelector(".plans-header-scroll");
			const heading = section.querySelector(".plans-heading").getBoundingClientRect();
			const corner = section.querySelector(".header-label").getBoundingClientRect();
			const body = scroller.getBoundingClientRect();
			const tiers = [...section.querySelectorAll(".tier-column")].map(el => el.getBoundingClientRect());
			const row = section.querySelector("[data-row-id]");
			const cells = [...row.querySelectorAll(".plan-cell")].map(el => el.getBoundingClientRect());
			return {
				left: scroller.scrollLeft,
				headerLeft: header.scrollLeft,
				labelLeft: row.querySelector(".row-label").getBoundingClientRect().left,
				cornerLeft: corner.left,
				tableLeft: body.left,
				headerTop: heading.top,
				navBottom: document.querySelector(".navbar").getBoundingClientRect().bottom,
				visibleTiers: tiers.filter(rect => rect.left >= corner.right - 1 && rect.right <= body.right + 1).length,
				aligned: tiers.every((rect, index) => Math.abs(rect.left - cells[index].left) <= 1 && Math.abs(rect.width - cells[index].width) <= 1),
				verticalOverflow: scroller.scrollHeight > scroller.clientHeight + 1,
				pageOverflow: document.documentElement.scrollWidth > innerWidth,
				clippedText: [...section.querySelectorAll(".row-label, .tier-name, .tier-price, .tier-interest-button, .cell-text")].some(el => el.scrollWidth > el.clientWidth + 1)
			};
		});
	}
	function checkGeometry(g, width) {
		assert.ok(Math.abs(g.left - g.headerLeft) <= 1, "Header and body scroll together");
		assert.ok(Math.abs(g.labelLeft - g.tableLeft) <= 1, "Left benefit labels remain pinned");
		assert.ok(Math.abs(g.cornerLeft - g.tableLeft) <= 1, "Top-left label remains pinned");
		assert.equal(g.visibleTiers, width <= 900 ? 2 : 4);
		assert.ok(g.aligned, "Values align with their plan headings");
		assert.ok(!g.verticalOverflow, "Use normal page scrolling, not a nested vertical scroller");
		assert.ok(!g.pageOverflow && !g.clippedText, "Content fits without clipped prices or labels");
	}

	for (const lang of ["", "en/"]) {
		for (const width of [320, 390, 430, 768, 1024, 1440]) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(base + lang, { waitUntil: "networkidle" });
			await page.evaluate(() => document.fonts.ready);
			assert.equal(await page.locator("#plans details, .mobile-plan-summary").count(), 0);
			checkGeometry(await geometry(), width);
			await page.locator(".plans-table").evaluate(el => (el.scrollLeft = el.scrollWidth));
			await page.waitForFunction(() => Math.abs(document.querySelector(".plans-table").scrollLeft - document.querySelector(".plans-header-scroll").scrollLeft) <= 1);
			checkGeometry(await geometry(), width);
			await page.evaluate(() => {
				const row = document.querySelector("#plans [data-row-id]:nth-child(7)");
				window.scrollTo({ top: row.getBoundingClientRect().top + scrollY - 250, behavior: "instant" });
			});
			await page.waitForTimeout(200);
			let g = await geometry();
			checkGeometry(g, width);
			assert.ok(Math.abs(g.headerTop - g.navBottom) <= 1, "Plan headings stick immediately below the navbar");
			if (output && [390, 1440].includes(width)) await page.screenshot({ path: `${output}/plans-${lang ? "en" : "zh"}-${width}-scrolled.png` });

			// Dragging the headings also updates the values, including after a resize.
			await page.locator(".plans-header-scroll").evaluate(el => (el.scrollLeft = 0));
			await page.waitForFunction(() => document.querySelector(".plans-table").scrollLeft === 0);
			checkGeometry(await geometry(), width);
			await page.locator(".tier-interest-button").first().click();
			assert.equal(await page.locator(".tier-interest-button").first().getAttribute("aria-pressed"), "true");
			assert.ok((await page.locator("#inquiry-text").inputValue()).includes("179,000"));
			await page.locator(".tier-interest-button").first().click();
			assert.equal(await page.locator(".tier-interest-button").first().getAttribute("aria-pressed"), "false");
			await page.keyboard.press("Escape");
			if (output && width === 390) await page.screenshot({ path: `${output}/plans-${lang ? "en" : "zh"}-${width}-first-pair.png` });
			const visibleRow = await page.locator("#plans").evaluate(section => {
				const bottom = section.querySelector(".plans-heading").getBoundingClientRect().bottom;
				return [...section.querySelectorAll('[data-is-available="true"]')].find(row => {
					const r = row.getBoundingClientRect();
					return r.top >= bottom && r.bottom < innerHeight;
				})?.dataset.rowId;
			});
			assert.ok(visibleRow);
			await page.locator(`#plans [data-row-id="${visibleRow}"] .row-label`).click();
			assert.equal(await page.locator(".item-popup-bg.show").evaluate(el => el.previousElementSibling.id), `item-popup-${visibleRow}`);
			await page.keyboard.press("Escape");
			assert.equal(await page.locator(".popup-bg.show").count(), 0);
			if (width === 390) {
				await page.locator(".plans-table").evaluate(el => (el.scrollLeft = el.scrollWidth));
				for (const resizedWidth of [844, 1440, 390]) {
					await page.setViewportSize({ width: resizedWidth, height: 844 });
					await page.waitForTimeout(100);
					checkGeometry(await geometry(), resizedWidth);
				}
			}

			console.log(`PASS ${lang || "zh/"} ${width}px: two-axis pinning, ${width <= 900 ? 2 : 4} visible plans, synchronized scrolling, readable labels and selection`);
		}
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
