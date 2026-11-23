// Google Form that receives the sponsor inquiry form (#sponsor-form in
// src/components/section/Form.astro). See docs/contact-form.md.
//
// SITCON 2027 贊助洽談表單 (https://forms.gle/TwFBtr83AJKmkfFQA). The 2027 form
// was copied from the 2026 one, so the entry IDs are unchanged. When editing the
// form's fields, update the IDs here (they are listed in the viewform page).
export const contactForm = {
	/** `https://docs.google.com/forms/d/e/<form id>/formResponse` */
	endpoint: "https://docs.google.com/forms/d/e/1FAIpQLSd3qhkNzSvIAeUJtbDJAcVnK82kkLb2W8dl_i9TFtsJNd-QnA/formResponse",
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
