# 2026-09-27 review implementation

User decisions: keep the entire mobile comparison table horizontally scrollable (no pinned description column), collapse detailed benefits on phones, retain six 2026 stories, move event information before selection, replace the form with email, and create a separate 5–10 page pricing overview. The dark block was the “我們準備好了” event section.

## Delivered scope

| Issue | Implementation |
| --- | --- |
| #40 | The three commercial highlight links open Items and select the matching category. |
| #41 | Six 2026 reports; compact desktop collage and a phone carousel with a six-story hint. |
| #42 | Chair-cover details show R0 426 seats and R1/R2 112 seats each, with a venue popup link. Existing venue figures are preserved. |
| #43 | Navigation: plans, language, email contact, PDF. Menu closes after selecting a link. |
| #44 | Replace the corporate form with mailto, selected items/prices in the draft, and email copying. Preserve personal donations. |
| #45–47 | Event details move before commercial highlights; replace the dark full-height event block with a light, compact introduction. Group audience/news before selection and education impact details under Open Dream. |
| #48 | Timeline dates and descriptions wrap vertically on phones. |
| #49 | Phone plan prices remain visible; detailed comparison is initially collapsed. Desktop comparison stays expanded. |
| #50 | Dedicated bilingual A4 brochure using the existing item/plan data. No expanded website popups or duplicated carousels. Item links retain full specifications. |
| #51–52 | Separate mobile numbers/labels; readable audience data tables and development-level definitions; expandable historical school/social data. Desktop charts remain available. |
| #53 | Item navigation uses the active card order, including plan-only items. English URLs retain their language. |
| #55–56 | Previous/next item controls with disabled end states; diagonal vertical gestures scroll instead of changing items. Image-carousel/input gestures are excluded. |
| #57 | Original sticky-column / selected-two-plan proposal superseded by the user's decision to retain free horizontal scrolling. |

## Outstanding

- **#54:** Reported visual style change still lacks a reproducible trigger. Category navigation is tested, but this separate report must not be claimed fixed without evidence.
- **#58:** User explicitly confirmed the spreadsheet is still being edited and requested retaining existing data. No changes to `src/data/item.json` or `src/data/plan.json`.

### Spreadsheet audit

Authenticated read of the supplied spreadsheet succeeded. Six relevant tabs match the configured GIDs. The items tab lacks item 18, related category rows contain `#REF!`, and its deadline column is blank. The introduction tab retains old 2025 deadlines. Item 21's general/recruitment text still promises travel subsidies, conflicting with the previously corrected website text. Do not run a wholesale import until the source is finalized.

Implementation commit: [0ff9786](https://github.com/skyhong2002/2027-cfs/commit/0ff978629efec46ac4707c8fa1c665a1936258f5).

## Verification

- Astro check: no errors or warnings (one pre-existing unused Lenis variable hint).
- Full preview build: 85 routes including Chinese and English brochure routes.
- Browser regression: `scripts/verify-review.cjs`, Chromium 153. Phone gestures at 390 × 844; Chinese/English main pages at 320, 768 and 1440 pixels; phone brochure preview at 390 pixels.
- Tests cover category selection and next/previous order, horizontal table scrolling, initial collapse, selected plan/price in the email draft, timeline width, diagonal scroll without item switching, visible statistics tables, chair-cover venue links, English deep links, and print page overflow.
- Brochure output: Chinese 8 A4 pages, English 9 A4 pages. Each page must fit within its print margins. PDF file sizes and sample renders are recorded with the verification artifacts.
- Print validation uses Chromium PDF output with A4 and background graphics; OS print dialogs, physical devices and Safari were not exercised.

To reproduce against a full build served under `/2027-cfs/`, launch Chromium with a local debugging port, then run:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright \
CDP_URL=http://127.0.0.1:9334 \
REVIEW_BASE_URL=http://127.0.0.1:4322/2027-cfs/ \
REVIEW_OUTPUT=/path/to/evidence \
node scripts/verify-review.cjs
```

For the build, use `CFS_PREVIEW=1 BASE_PATH=/2027-cfs SITE_URL=https://skyhong2002.github.io`.

## Screenshots

- [mobile-event.png](evidence/mobile-event.png)
- [mobile-news.png](evidence/mobile-news.png)
- [mobile-contact.png](evidence/mobile-contact.png)
- [mobile-plans.png](evidence/mobile-plans.png)
- [mobile-timeline.png](evidence/mobile-timeline.png)
- [mobile-statistics.png](evidence/mobile-statistics.png)
- [mobile-item-scroll.png](evidence/mobile-item-scroll.png)
- [brochure-zh.png](evidence/brochure-zh.png)
- [pdf-en-plans.png](evidence/pdf-en-plans.png)
- [pdf-zh-items.png](evidence/pdf-zh-items.png)
- [pdf-en-contact.png](evidence/pdf-en-contact.png)
