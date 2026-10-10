// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || "https://sitcon.org",
	base: process.env.BASE_PATH || "/2027/cfs",
	output: "static",
	trailingSlash: "ignore",
	build: {
		format: "directory"
	},
	integrations: [
		sitemap({
			i18n: {
				defaultLocale: "zh-Hant",
				locales: {
					"zh-Hant": "zh-TW",
					en: "en-US"
				}
			},
			filter: page => {
				return !page.includes("/quotation");
			}
		})
	]
});
