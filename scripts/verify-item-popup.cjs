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
	const active = () => page.locator(".item-popup-bg.show");
	const currentId = () => active().evaluate(el => el.previousElementSibling.id);
	const open = id => page.evaluate(id => window.popupCtrl(id, "open"), id);

	for (const lang of ["", "en/"]) {
		for (const width of [320, 390, 768, 1440]) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(base + lang, { waitUntil: "networkidle" });
			const ids = await page.locator("#items .cards-grid .card").evaluateAll(cards => cards.map(card => `item-popup-${card.dataset.cardId}`));
			await page.locator("#items .cards-grid .card").first().click();
			assert.equal(await currentId(), ids[0]);
			assert.ok(await active().locator('[data-item-nav="prev"]').isDisabled());
			const layout = await active().evaluate(bg => {
				const panel = bg.querySelector(".popup").getBoundingClientRect();
				const content = bg.querySelector(".popup-content").getBoundingClientRect();
				const prev = bg.querySelector('[data-item-nav="prev"]').getBoundingClientRect();
				const next = bg.querySelector('[data-item-nav="next"]').getBoundingClientRect();
				return {
					topGap: content.top - panel.top,
					buttonSize: [prev.width, prev.height],
					buttonCenter: prev.y + prev.height / 2,
					fits: panel.x >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight,
					sideButtons: prev.x < panel.x && next.right > panel.right,
					overflow: bg.scrollWidth > bg.clientWidth
				};
			});
			assert.equal(layout.topGap, 0, "No header bar above the content");
			assert.equal(layout.buttonSize[0], layout.buttonSize[1]);
			assert.ok(layout.buttonSize[0] >= 40);
			assert.equal(layout.buttonCenter, 422, "Arrows stay at the viewport midpoint");
			assert.ok(layout.fits && layout.sideButtons && !layout.overflow);
			await active().locator('[data-item-nav="next"]').click();
			assert.equal(await currentId(), ids[1]);
			await page.keyboard.press("ArrowLeft");
			assert.equal(await currentId(), ids[0]);

			// Sample every rendered frame during rapid navigation, including an immediate return.
			const frames = await page.evaluate(async () => {
				const states = [];
				for (let i = 0; i < 12; i++) {
					document.querySelector(`.item-popup-bg.show [data-item-nav="${i % 2 ? "prev" : "next"}"]`).click();
					await new Promise(requestAnimationFrame);
					const visible = [...document.querySelectorAll(".item-popup-bg")].filter(bg => getComputedStyle(bg).display !== "none");
					const bg = visible[0];
					const panel = bg.querySelector(".popup");
					const rect = panel.getBoundingClientRect();
					states.push({ count: visible.length, opacity: getComputedStyle(bg).opacity, transform: getComputedStyle(panel).transform, rect: [rect.x, rect.y, rect.width, rect.height] });
				}
				return states;
			});
			for (const frame of frames) {
				assert.equal(frame.count, 1, "One visible panel throughout switching");
				assert.equal(frame.opacity, "1", "No fade between items");
				assert.equal(frame.transform, "none", "No entrance motion between items");
				assert.deepEqual(frame.rect, frames[0].rect, "Panel geometry stays stable");
			}
			await page.waitForTimeout(350);
			assert.equal(await currentId(), ids[0], "No old timer closes the reopened item");
			await active().locator('[data-item-nav="next"]').click();
			await page.goBack();
			await page.waitForFunction(id => document.querySelector(".item-popup-bg.show")?.previousElementSibling.id === id, ids[0]);
			await page.goForward();
			await page.waitForFunction(id => document.querySelector(".item-popup-bg.show")?.previousElementSibling.id === id, ids[1]);
			await open(ids.at(-1));
			assert.ok(await active().locator('[data-item-nav="next"]').isDisabled());
			await page.keyboard.press("ArrowRight");
			assert.equal(await currentId(), ids.at(-1));
			await active().locator(".close-btn").click();
			assert.equal(await active().count(), 0);

			// Category navigation uses the filtered order.
			for (const category of ["talent_recruitment", "brand_exposure", "product_promotion"]) {
				await page.locator(`#items .tab[data-category="${category}"]`).click();
				const filtered = await page.locator("#items .cards-grid .card").evaluateAll(cards => cards.map(card => `item-popup-${card.dataset.cardId}`));
				await open(filtered[0]);
				await active().locator('[data-item-nav="next"]').click();
				assert.equal(await currentId(), filtered[1]);
				await page.keyboard.press("Escape");
			}

			await open("item-popup-5");
			if (output && [390, 1440].includes(width)) await page.screenshot({ path: `${output}/item-${lang ? "en" : "zh"}-${width}.png` });
			if (width === 390) {
				await open("item-popup-1");
				const client = await context.newCDPSession(page);
				const before = await active().locator('[data-item-nav="next"]').boundingBox();
				await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 250, y: 700 }] });
				for (let i = 1; i <= 15; i++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 250 - i * 5, y: 700 - i * 30 }] });
				await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
				assert.equal(await currentId(), "item-popup-1", "Diagonal scroll does not switch items");
				assert.ok(
					await active()
						.locator(".popup-content")
						.evaluate(el => el.scrollTop > 0)
				);
				assert.deepEqual(await active().locator('[data-item-nav="next"]').boundingBox(), before);
				await client.detach();
			}
			await open("item-popup-22");
			await active().locator(".venue-detail-action").click();
			await page.waitForFunction(() => document.querySelector("#place-staff-popup + .popup-bg")?.classList.contains("show"));
			await page.keyboard.press("Escape");
			console.log(`PASS ${lang || "zh/"} ${width}px: side controls, stable frames, rapid navigation, categories, history, close and venue details`);
		}
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
