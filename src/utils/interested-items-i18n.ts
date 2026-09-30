import planData from "@data/plan.json" with { type: "json" };
import itemData from "@data/item.json" with { type: "json" };
import zhHant from "@i18n/zh-Hant.json" with { type: "json" };
import en from "@i18n/en.json" with { type: "json" };
import type { ItemDataRaw } from "./items-loader.js";
import type { InterestedItem } from "./local-storage.js";
import { getItemDisplayPrice } from "./plan-helper.js";

const items = itemData as Record<string, ItemDataRaw>;
const plans = planData as Record<string, { name_zh: string; name_en: string; price: string }>;

/**
 * Current page language, taken from <html lang>
 */
export function getPageLang(): "zh-Hant" | "en" {
	if (typeof document === "undefined") return "zh-Hant";
	return document.documentElement.lang === "en" ? "en" : "zh-Hant";
}

/**
 * Interested items are stored with the title/price text of the language they
 * were added in. Look them up again by ID so they always follow the given
 * language. Items with unknown IDs keep their stored values.
 */
export function localizeInterestedItem(item: InterestedItem, lang: string = getPageLang()): InterestedItem {
	const isEn = lang === "en";
	const { id } = item;

	// Plan tier, e.g. "tier-navigator"
	if (id.startsWith("tier-")) {
		const plan = plans[id.slice("tier-".length)];
		if (!plan) return item;
		return { ...item, title: isEn ? plan.name_en : plan.name_zh, price: plan.price };
	}

	// Open Dream option, e.g. "opendream-5"
	if (id.startsWith("opendream-")) {
		const t = (isEn ? en : zhHant).opendream;
		const plan = t.plans.find(p => p.id === id);
		if (!plan) return item;
		return { ...item, title: `${t.title}｜${plan.name}`, price: plan.price };
	}

	// Sub-item, e.g. "12-sub-0"
	if (id.includes("-sub-")) {
		const [parentId, subIndex] = id.split("-sub-");
		const parent = items[parentId];
		const sub = parent?.sub?.[Number(subIndex)];
		if (!sub) return item;
		return {
			...item,
			title: isEn ? sub.name_en : sub.name_zh,
			price: getItemDisplayPrice(id, sub.price, lang),
			deadline: parent.deadline || ""
		};
	}

	const raw = items[id];
	if (!raw) return item;
	return {
		...item,
		title: isEn ? raw.name_en : raw.name_zh,
		price: getItemDisplayPrice(id, raw.price, lang),
		deadline: raw.deadline || ""
	};
}
