// Google Form that receives the sponsor inquiry form (#sponsor-form in
// src/components/section/Form.astro).
//
// TODO(#80): these values still point to the "SITCON 2026 贊助洽談表單". The
// 2027 team must provide the 2027 formResponse URL and its entry IDs. Replace
// the values below and set `isConfirmedFor2027` to true. Until then the build
// prints a warning.
export const contactForm = {
	isConfirmedFor2027: false,
	/** `https://docs.google.com/forms/d/e/<form id>/formResponse` */
	endpoint: "https://docs.google.com/forms/d/e/1FAIpQLSftAam5nJJQU925yOzuMoome-XY3MEs7idtbd56eqMDRrPKGw/formResponse",
	/** Google Form `entry.*` field IDs for each website field. */
	entries: {
		organization: "entry.1867519928",
		name: "entry.1660888396",
		contact: "entry.1209239304",
		message: "entry.65159086"
	},
	/** Shown when we cannot confirm the submission. */
	email: "contact@sitcon.org"
} as const;
