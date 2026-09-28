const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4322/2027-cfs/";
(async () => {
	const browser = process.env.CDP_URL
		? await chromium.connectOverCDP(process.env.CDP_URL)
		: await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ["--no-sandbox"] });
	const context = await browser.newContext();
	await context.route(/googletagmanager|google-analytics/, r => r.abort());
	let requests = [];
	let fail = false;
	// Never submit test leads to the real Google Form.
	await context.route("https://docs.google.com/forms/**", async route => {
		requests.push(route.request().postData());
		if (fail) await route.abort("failed");
		else {
			await new Promise(r => setTimeout(r, 200));
			await route.fulfill({ status: 200, body: "mock response" });
		}
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", e => errors.push(String(e)));
	for (const lang of ["", "en/"])
		for (const width of [320, 390, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(base + lang, { waitUntil: "domcontentloaded" });
			await page.waitForFunction(() => document.querySelector("#inquiry-selection")?.textContent.length > 0);
			await page.evaluate(() => {
				localStorage.removeItem("interestItems");
				window.dispatchEvent(new CustomEvent("itemsChange"));
			});
			assert.equal(await page.locator("#contact").getAttribute("type"), "text");
			assert.equal(await page.locator("[data-sponsor-email],[data-sponsor-gmail]").count(), 0);
			assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
			await page.locator("#inquiry-text").fill("想聊聊招募 & R&D");
			await page.locator("#plans .tier-interest-button").first().click();
			assert.match(await page.locator("#inquiry-selection").innerText(), /179,000/);
			await page.locator("#plans .tier-interest-button").first().click();
			assert.doesNotMatch(await page.locator("#inquiry-selection").innerText(), /179,000/);
			assert.equal(await page.locator("#inquiry-text").inputValue(), "想聊聊招募 & R&D");
			await page.locator("#plans .tier-interest-button").first().click();
			await page.locator("#organization").fill("測試單位");
			await page.locator("#contact-name").fill("測試稱呼");
			const before = requests.length;
			await page.locator("#submit").click();
			assert.equal(requests.length, before, "Missing contact cannot submit");
			for (const contact of ["LINE ID: sitcon-test", "電話：02-1234-5678", "test@example.invalid"]) {
				await page.locator("#contact").fill(contact);
				await page.locator("#submit").click();
				await page.waitForFunction(() => document.querySelector("#form-message").textContent.length > 0);
				const payload = requests.at(-1);
				assert.ok(payload.includes(contact));
				assert.ok(payload.includes("entry.1209239304"));
				assert.ok(payload.includes("179,000"));
				assert.ok(payload.includes("想聊聊招募 & R&D"));
				assert.equal(await page.locator("#contact").inputValue(), contact, "Keep data because opaque response cannot confirm acceptance");
				assert.equal(await page.locator("#submit").isDisabled(), false);
			}
			fail = true;
			await page.locator("#submit").click();
			await page.waitForFunction(() => document.querySelector("#form-message").textContent.length > 0);
			assert.match(await page.locator("#form-message").innerText(), /發生錯誤|Something went wrong/);
			assert.equal(await page.locator("#contact-name").inputValue(), "測試稱呼");
			fail = false;
			console.log(`PASS ${lang || "zh/"} ${width}px: selection sync, arbitrary contact, required validation, mocked submit and retry`);
		}
	assert.deepEqual(errors, []);
	await context.close();
	await browser.close();
})().catch(e => {
	console.error(e);
	process.exit(1);
});
