import planData from "@data/plan.json";
import zh from "@i18n/zh-Hant.json";
import en from "@i18n/en.json";
import { parseExactPrice } from "./item-price.js";
import { createItemOffers } from "./item-schema.js";
import type { ItemData } from "./items-loader.js";

export function createSponsorshipCatalog(lang: string, homeUrl: URL, items: ItemData[]) {
	const t = lang === "en" ? en : zh;
	const catalogs = [
		{
			name: t.plans.plan_comparison,
			description: t.plans.availability_note,
			plans: Object.values(planData).map(plan => ({ id: `plan-${plan.id}`, name: lang === "en" ? plan.name_en : plan.name_zh, price: plan.price }))
		},
		{
			name: t.opendream.title,
			description: `${t.opendream.description} ${t.opendream.independent_note}`,
			plans: t.opendream.plans
		}
	];
	return {
		"@type": "OfferCatalog",
		name: t.meta.title,
		itemListElement: [
			...catalogs.map(catalog => ({
				"@type": "OfferCatalog",
				name: catalog.name,
				itemListElement: catalog.plans.flatMap(plan => {
					const price = parseExactPrice(plan.price);
					if (price === null) return [];
					const url = new URL(`#${plan.id}`, homeUrl).href;
					return [
						{
							"@type": "Offer",
							url,
							price,
							priceCurrency: "TWD",
							// Sponsorship remains open for discussion; individual benefit deadlines do not close a tier.
							availability: "https://schema.org/InStock",
							seller: { "@id": "https://sitcon.org/#organization" },
							itemOffered: {
								"@type": "Service",
								name: plan.name,
								description: catalog.description,
								url
							}
						}
					];
				})
			})),
			...items.flatMap(item => {
				const url = new URL(`item/${item.id}/`, homeUrl).href;
				return createItemOffers(item).map(offer => ({
					...offer,
					url,
					seller: { "@id": "https://sitcon.org/#organization" },
					itemOffered: {
						"@type": "Service",
						name: offer.name,
						description: item.global_description,
						url
					}
				}));
			})
		]
	};
}
