import planData from "@data/plan.json" with { type: "json" };
import itemData from "@data/item.json" with { type: "json" };
import { opendream as opendreamZh } from "@i18n/zh-Hant.json";
import { opendream as opendreamEn } from "@i18n/en.json";
import type { ItemDataRaw } from "./items-loader.js";
import type { InterestedItem } from "./local-storage.js";
import { getItemDisplayPrice } from "./plan-helper.js";

const items = itemData as Record<string, ItemDataRaw>;
const plans = planData as Record<string, { name_zh: string; name_en: string; price: string }>;

/**
 * Get the current page language from <html lang>
 */
export function getPageLang(): string {
	if (typeof document === "undefined") return "zh-Hant";
	return document.documentElement.lang === "en" ? "en" : "zh-Hant";
}

/**
 * Re-resolve an interested item's title and price in the given language.
 * Stored items keep the language they were added in, so the display text
 * is looked up again by ID. Unknown IDs fall back to the stored values.
 */
export function localizeInterestedItem(item: InterestedItem, lang: string = getPageLang()): InterestedItem {
	const en = lang === "en";
	const id = item.id;

	// Plan tier, e.g. "tier-navigator"
	if (id.startsWith("tier-")) {
		const plan = plans[id.slice("tier-".length)];
		if (!plan) return item;
		return { ...item, title: en ? plan.name_en : plan.name_zh, price: plan.price };
	}

	// Open Dream option, e.g. "opendream-5"
	if (id.startsWith("opendream-")) {
		const t = en ? opendreamEn : opendreamZh;
		const plan = t.plans.find(p => p.id === id);
		if (!plan) return item;
		return { ...item, title: `${t.title}｜${plan.name}`, price: plan.price };
	}

	// Sub-item, e.g. "12-sub-0"
	if (id.includes("-sub-")) {
		const [parentId, subIndexStr] = id.split("-sub-");
		const sub = items[parentId]?.sub?.[parseInt(subIndexStr, 10)];
		if (!sub) return item;
		return { ...item, title: en ? sub.name_en : sub.name_zh, price: getItemDisplayPrice(id, sub.price, lang) };
	}

	const raw = items[id];
	if (!raw) return item;
	return { ...item, title: en ? raw.name_en : raw.name_zh, price: getItemDisplayPrice(id, raw.price, lang) };
}

/**
 * Get the item's raw deadline ("YYYY/MM/DD") from item data, if any
 */
export function getInterestedItemDeadline(itemId: string): string {
	const parentId = itemId.includes("-sub-") ? itemId.split("-sub-")[0] : itemId;
	return items[parentId]?.deadline || "";
}
