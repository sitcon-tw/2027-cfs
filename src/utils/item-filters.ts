export const purposes = ["talent_recruitment", "brand_exposure", "product_promotion"] as const;

export const formatOrder = ["現場實體曝光", "數位媒體曝光", "紀念品配件曝光", "獨家議程", "更多曝光方式"];

export function formatRank(format: string): number {
	const index = formatOrder.indexOf(format);
	return index === -1 ? formatOrder.length : index;
}
