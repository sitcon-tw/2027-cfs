import { localizeItemPrice } from "./item-price.js";

import planData from "@data/plan.json" with { type: "json" };
import itemData from "@data/item.json" with { type: "json" };
import { opendream as zhOpendream } from "@i18n/zh-Hant.json";
import { opendream as enOpendream } from "@i18n/en.json";
import type { ItemDataRaw } from "./items-loader.js";

interface Plan {
	id: string;
	name_zh: string;
	name_en: string;
	price: string;
	order: number;
	benefits: Array<{
		item_id: string;
		item_name: string;
		quantity: string;
	}>;
}

const plans: Plan[] = Object.values(planData);

// Item data is now statically imported at build time
const items: Record<string, ItemDataRaw> = itemData as Record<string, ItemDataRaw>;

/**
 * Find an item by Chinese name (name_zh) or by ID
 * @param itemNameOrId The Chinese name or ID to search for
 * @returns Object with itemId and itemData (or subItemData for sub-items), or null if not found
 */
export function findItemByNameOrId(itemNameOrId: string): { itemId: string; itemData: ItemDataRaw; subItemData?: ItemDataRaw["sub"][0] } | null {
	// First try direct ID match
	if (items[itemNameOrId]) {
		return { itemId: itemNameOrId, itemData: items[itemNameOrId] };
	}

	// Check for sub-item ID format (e.g., "12-sub-0")
	if (itemNameOrId.includes("-sub-")) {
		const [parentId, , subIndexStr] = itemNameOrId.split("-");
		const subIndex = parseInt(subIndexStr, 10);

		// Validate that subIndex is a valid number
		if (isNaN(subIndex) || subIndex < 0) {
			return null;
		}

		const item = items[parentId];
		if (item && item.sub && item.sub[subIndex]) {
			return {
				itemId: itemNameOrId,
				itemData: item,
				subItemData: item.sub[subIndex]
			};
		}
	}

	// Then try matching by name_zh
	for (const [id, item] of Object.entries(items)) {
		if (item.name_zh === itemNameOrId) {
			return { itemId: id, itemData: item };
		}

		// Also check sub-items
		if (item.sub && Array.isArray(item.sub)) {
			for (let i = 0; i < item.sub.length; i++) {
				if (item.sub[i].name_zh === itemNameOrId) {
					return {
						itemId: `${id}-sub-${i}`,
						itemData: item,
						subItemData: item.sub[i]
					};
				}
			}
		}
	}

	return null;
}

type PlanBenefit = Plan["benefits"][number];

/** Resolve both main items and sub-items, including benefits without an ID. */
export function resolveBenefitItem(benefit: PlanBenefit) {
	return (benefit.item_id ? findItemByNameOrId(benefit.item_id) : null) || findItemByNameOrId(benefit.item_name);
}

/** Get the localized name from the same item resolution used for interactions. */
export function getBenefitLocalizedName(benefit: PlanBenefit, lang: string = "zh-Hant"): string {
	const result = resolveBenefitItem(benefit);
	const item = result?.subItemData || result?.itemData;
	return item ? (lang === "en" ? item.name_en : item.name_zh) : benefit.item_name;
}

/**
 * Find the minimal (cheapest) plan that includes a specific item
 * @param itemId The item ID to search for
 * @returns The plan object or null if not found in any plan
 */
export function findMinimalPlanForItem(itemId: string): Plan | null {
	// Filter plans that include this item
	const plansWithItem = plans.filter(plan => plan.benefits.some(benefit => benefit.item_id === itemId));

	if (plansWithItem.length === 0) {
		return null;
	}

	// Sort by order (lower order = higher tier = more expensive usually, but we want to check)
	// Actually, looking at the data, order 1 is most expensive, so we want the highest order number
	plansWithItem.sort((a, b) => b.order - a.order);

	// Return the plan with highest order (cheapest plan that includes the item)
	return plansWithItem[0];
}

/**
 * Get the display price for an item
 * @param itemId The item ID (can be sub-item ID like "1-sub-0")
 * @param itemPrice The standalone item price (e.g., "$40,000")
 * @param lang Language for display ("zh-Hant" or "en")
 * @returns Display string for price
 */
export function getItemDisplayPrice(itemId: string, itemPrice: string, lang: string = "zh-Hant"): string {
	// Extract parent item ID if this is a sub-item (format: "parentId-sub-index")
	const parentItemId = itemId.includes("-sub-") ? itemId.split("-sub-")[0] : itemId;

	const minimalPlan = findMinimalPlanForItem(parentItemId);

	if (minimalPlan) {
		return lang === "en" ? "Plan Included Item" : "方案包含項目";
	}

	// Match quotation subtotals without changing non-numeric price labels.
	const price = (itemPrice || "").replace(/^\$(?=\d[\d,]*(?:\.\d+)?$)/, "NT$");
	return localizeItemPrice(price, lang);
}

/**
 * Check if an item is included in any plan
 * @param itemId The item ID to check
 * @returns true if included in at least one plan
 */
export function isItemInAnyPlan(itemId: string): boolean {
	return plans.some(plan => plan.benefits.some(benefit => benefit.item_id === itemId));
}

/**
 * Re-localize a stored interested item for the current page language.
 * Items in localStorage keep the title/price text from the language they were added in,
 * so derive them again from the source data by id whenever they are displayed.
 * @param item The stored interested item
 * @param lang Language for display ("zh-Hant" or "en")
 * @returns A copy of the item with localized title and price, plus the source deadline date for regular items (unchanged if the id is unknown)
 */
export function localizeInterestedItem<T extends { id: string; title: string; price?: string; deadline?: string }>(item: T, lang: string = "zh-Hant"): T {
	const en = lang === "en";

	if (item.id.startsWith("tier-")) {
		const plan = (planData as Record<string, Plan>)[item.id.slice("tier-".length)];
		return plan ? { ...item, title: en ? plan.name_en : plan.name_zh, price: plan.price } : item;
	}

	if (item.id.startsWith("opendream-")) {
		const opendream = en ? enOpendream : zhOpendream;
		const plan = opendream.plans.find(p => p.id === item.id);
		return plan ? { ...item, title: `${opendream.title}｜${plan.name}`, price: plan.price } : item;
	}

	const result = findItemByNameOrId(item.id);
	if (!result || result.itemId !== item.id) return item;
	const source = result.subItemData ?? result.itemData;
	return {
		...item,
		title: en ? source.name_en : source.name_zh,
		price: getItemDisplayPrice(item.id, source.price, lang),
		// The stored deadline is the localized card text (e.g. "3/9 截止"), so use the language-neutral source date instead
		deadline: result.itemData.deadline
	};
}
