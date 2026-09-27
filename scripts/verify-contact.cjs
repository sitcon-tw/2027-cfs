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

	async function checkLinks() {
		const subject = await page.locator("#inquiry-subject").inputValue();
		const body = await page.locator("#inquiry-text").inputValue();
		const email = new URL(await page.locator("[data-sponsor-email]").getAttribute("href"));
		const gmail = new URL(await page.locator("[data-sponsor-gmail]").getAttribute("href"));
		assert.equal(email.protocol, "mailto:");
		assert.equal(email.pathname, "contact@sitcon.org");
		assert.equal(email.searchParams.get("subject"), subject);
		assert.equal(email.searchParams.get("body"), body);
		assert.equal(gmail.origin, "https://mail.google.com");
		assert.equal(gmail.searchParams.get("to"), "contact@sitcon.org");
		assert.equal(gmail.searchParams.get("su"), subject);
		assert.equal(gmail.searchParams.get("body"), body);
		assert.notEqual(await page.locator("[data-sponsor-email]").getAttribute("target"), "_blank");
	}

	for (const lang of ["", "en/"]) {
		for (const width of [320, 390, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(base + lang, { waitUntil: "networkidle" });
			await page.evaluate(() => {
				localStorage.removeItem("interestItems");
				window.dispatchEvent(new CustomEvent("itemsChange"));
			});
			assert.ok(await page.locator("#inquiry-subject").isEditable());
			assert.ok(await page.locator("#inquiry-text").isEditable());
			assert.equal(await page.locator("#form .email-actions a").count(), 2);
			assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
			await checkLinks();
			if (output && width !== 320) {
				await page.locator("#form").screenshot({ path: `${output}/contact-${lang ? "en" : "zh"}-${width}.png` });
				await page.locator("#time").screenshot({ path: `${output}/event-${lang ? "en" : "zh"}-${width}.png` });
			}
			const customSubject = "SITCON 合作 & R&D + 2027? #洽詢";
			await page.locator("#inquiry-subject").fill(customSubject);
			await page.locator("#inquiry-text").fill((await page.locator("#inquiry-text").inputValue()) + "\n測試公司 & R&D + 50%\n期待合作！");
			await page.locator("#plans .tier-interest-button").first().click();
			let body = await page.locator("#inquiry-text").inputValue();
			assert.ok(body.includes("179,000"), "Adding a plan updates the draft");
			assert.ok(body.includes("測試公司 & R&D + 50%"), "Keep the edited message");
			assert.equal(await page.locator("#inquiry-subject").inputValue(), customSubject);
			await checkLinks();
			await page.locator("#plans .tier-interest-button").first().click();
			assert.ok(!(await page.locator("#inquiry-text").inputValue()).includes("179,000"), "Removing a plan updates the draft");
			await page.locator("#inquiry-text").fill("完全自行撰寫\nHello & 你好 + #? %");
			await page.locator("#plans .tier-interest-button").first().click();
			assert.equal(await page.locator("#inquiry-text").inputValue(), "完全自行撰寫\nHello & 你好 + #? %");
			await checkLinks();
			await page.evaluate(() => window.popupCtrl("place-staff-popup", "open"));
			assert.ok(await page.locator("#place-staff-popup + .popup-bg").evaluate(el => el.classList.contains("show")));
			assert.ok(await page.locator(".timeline").evaluate(el => el.scrollWidth <= el.clientWidth + 1));
			await page.keyboard.press("Escape");
			console.log(`PASS ${lang || "zh/"} ${width}px: editable draft, email/Gmail links, selection sync, layout and event popup`);
		}
	}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(error => {
	console.error(error);
	process.exit(1);
});
