// Capture real article DOM after removing reading distractions. No generated imagery.
// PLAYWRIGHT_MODULE=/path/to/playwright-core CHROMIUM_PATH=/path/to/chrome node scripts/capture-news.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const sharp = require("sharp");
const path = require("node:path");
const targets = [
	{
		name: "president2026",
		url: "https://www.president.gov.tw/News/39930",
		root: ".pageWrap1",
		title: ".pageTitle1",
		remove: ".shareBox",
		css: ".pageWrap1,.pageWrap1 *{opacity:1!important;visibility:visible!important;transform:none!important;color:#24282e!important;animation:none!important}.pageDate1{margin:0!important;padding:0!important}.pageTitle1{display:block!important;height:auto!important} .pageTitle1{font-size:36px!important;margin:12px 0 20px!important}.pageTitle2{margin:16px 0!important}.article1{font-size:22px!important;line-height:1.65!important}.article1 p{margin:0 0 18px!important}",
		end: ".article1 p:nth-of-type(4)"
	},
	{
		name: "cna2026",
		url: "https://www.cna.com.tw/news/aipl/202603280032.aspx",
		root: "article.article",
		title: "h1",
		remove: ".btnGroup,.breadcrumb,.shareBox,.toolBox,.social,.googlePrefer,.socialLink,.paragraph .media ~ *",
		css: "h1{font-size:36px!important;margin:0 0 12px!important}.paragraph{font-size:22px!important;line-height:1.6!important}.paragraph p{margin:16px 0!important}.centralContent,.article > div,.article h1,.paragraph{width:100%!important;max-width:none!important}.article .share{display:none!important}",
		end: ".paragraph > p"
	},
	{
		name: "udn2026",
		url: "https://money.udn.com/money/story/7307/9408273",
		root: ".article-main",
		title: "h1",
		remove: ".article-body__social-bar,.social-bar,.article-body__word-count,.article-body__audio,.breadcrumb,[class*=mp__],[class*=ads],.article-length,.article-body__recommend,.article-body__word",
		css: "h1{font-size:36px!important;line-height:1.4!important;margin:0 0 16px!important}.article-body__editor{font-size:24px!important;line-height:1.7!important}.article-body__editor p{margin:0 0 18px!important}.article-body__info{margin:12px 0!important}.article-layout-wrapper,.article-main article,.article-body,.article-body__editor{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important}.article-body__editor p{font-size:24px!important}",
		end: ".article-body__editor p:nth-of-type(3)"
	},
	{
		name: "ocac2026",
		url: "https://ocacnews.net/article/423192",
		root: ".one_column",
		title: ".detail_title",
		remove: ".detail_share,#deconts > div ~ div",
		css: ".detail_title{font-size:36px!important;line-height:1.4!important;margin:0 0 12px!important}.detail_fun{margin:0 0 16px!important}.deconts{font-size:22px!important}.deconts img{width:100%!important;height:auto!important}.deconts p{margin:12px 0!important}",
		end: "#deconts figure:first-of-type"
	},
	{
		name: "line2026",
		url: "https://techblog.lycorp.co.jp/zh-hant/sitcon2026-sponsorship",
		root: "article.bui_component",
		title: "h1.title",
		remove: ".sns_area,[class*=share],.post_header ul",
		css: ".post_content_wrap,.content_inner,.content{padding:0!important;margin:0!important;width:100%!important;max-width:none!important}.post_header,article>header{padding:0 0 16px!important;margin:0!important;min-height:0!important}h1.title{font-size:36px!important;line-height:1.4!important;margin:0 0 12px!important}.content p{font-size:22px!important;line-height:1.65!important;margin:0 0 16px!important}",
		end: ".content p:nth-child(4)"
	}
];
(async () => {
	const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ["--no-sandbox"], env: { ...process.env, TMPDIR: process.env.TMPDIR || "/tmp" } });
	try {
		for (const target of targets) {
			if (process.env.NEWS_ONLY && !process.env.NEWS_ONLY.split(",").includes(target.name)) continue;
			const page = await browser.newPage({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 1 });
			await page.route(/doubleclick|googlesyndication|googletagmanager|google-analytics|adservice|taboola/, r => r.abort());
			await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60000 });
			await page.locator(target.title).first().waitFor();
			await page.waitForTimeout(2000);
			await page.evaluate(({ root, remove }) => {
				const article = document.querySelector(root);
				if (!article) throw Error("Missing article");
				document.querySelectorAll(remove).forEach(el => el.remove());
				for (const el of document.querySelectorAll("body *")) {
					if (el === article || el.contains(article) || article.contains(el)) continue;
					el.style.setProperty("display", "none", "important");
				}
				for (let el = article; el && el !== document.documentElement; el = el.parentElement) {
					for (const [p, v] of Object.entries({ display: "block", position: "static", width: "100%", maxWidth: "none", minWidth: "0", margin: "0", padding: "0", transform: "none", float: "none" }))
						el.style.setProperty(
							p.replace(/[A-Z]/g, m => "-" + m.toLowerCase()),
							v,
							"important"
						);
				}
				article.style.setProperty("width", "1000px", "important");
				article.style.setProperty("padding", "24px", "important");
				article.style.setProperty("box-sizing", "border-box", "important");
				for (const el of article.querySelectorAll("img")) {
					el.loading = "eager";
					if (el.dataset.src) el.src = el.dataset.src;
				}
				for (const el of article.querySelectorAll("*")) {
					if (["fixed", "sticky"].includes(getComputedStyle(el).position)) el.style.setProperty("position", "static", "important");
				}
			}, target);
			await page.addStyleTag({ content: `html,body{background:white!important}*{scrollbar-width:none!important} ${target.css}` });
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(1800);
			await page.evaluate(() => window.scrollTo(0, 0));
			const clip = await page.evaluate(({ root, end }) => {
				const a = document.querySelector(root).getBoundingClientRect();
				const e = document.querySelector(end)?.getBoundingClientRect();
				return { x: a.x, y: a.y + scrollY, width: a.width, height: Math.min(1350, Math.max(500, e ? e.bottom - a.top + 24 : 1000)) };
			}, target);
			const png = await page.screenshot({ clip });
			await sharp(png)
				.webp({ quality: 88 })
				.toFile(path.resolve("src/assets/img/news", target.name + ".webp"));
			console.log(target.name, clip);
			await page.close();
		}
	} finally {
		await browser.close();
	}
})().catch(e => {
	console.error(e);
	process.exit(1);
});
