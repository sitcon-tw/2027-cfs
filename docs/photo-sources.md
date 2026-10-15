# 照片與媒體素材

## 活動照片

[photo-credits.json](../src/data/photo-credits.json) 記錄已整理素材的本機檔案、Flickr 原始連結、相簿、拍攝日期、攝影者、授權與替代文字，作為照片出處的集中紀錄。本檔不另維護一份重複清單。

照片索引取自 SITCON Photo Finder；既有紀錄標為 `ai_labeled`，未完成人工複核。選圖時排除 `public_use_status = avoid`，並核對原始 Flickr 頁面的場景與授權。攝影者只採用索引中明確的人名，不從檔名前綴推測。

紀錄中的 `slot` 是整理素材時的用途，不保證該檔案仍用於目前頁面。尤其 `public/items/` 的品項圖片會隨試算表匯入更新；目前使用的檔案以 [item.json](../src/data/item.json) 與元件引用為準。更新照片時同步維護來源紀錄與頁面署名。

## 媒體卡片

目前的圖片與連結由 [News.astro](../src/components/section/News.astro) 的 `coverage` 設定，名稱與替代文字位於中英文文案的 `news.coverage`。兩者依陣列順序配對，新增或重排時需一併更新。

| 來源                                    | 圖片（位於 `src/assets/img/news/`） |
| --------------------------------------- | ----------------------------------- |
| 總統府                                  | `president2026.webp`                |
| 中央社                                  | `cna2026.webp`                      |
| 經濟日報                                | `udn2026.webp`                      |
| 第三屆青志獎「志能運用獎」              | `moe2026.webp`                      |
| 第四屆 ACT 台灣敏捷大賞「年度敏捷組織」 | `agile-awards2026.webp`             |
| 年代 MUCH《台灣新驕點》                 | `muchtv2026.webp`                   |

## 更新文章截圖

[scripts/capture-news.cjs](../scripts/capture-news.cjs) 可重新擷取總統府、中央社、經濟日報的原始網頁，移除導覽、分享列、廣告與側欄後輸出 WebP：

```sh
PLAYWRIGHT_MODULE=/path/to/playwright-core \
CHROMIUM_PATH=/path/to/chrome \
NEWS_ONLY=president2026,cna2026,udn2026 \
node scripts/capture-news.cjs
```

Playwright 與 Chromium 需由測試環境提供。腳本還保留僑務電子報與 LY Corporation Tech Blog 的擷取設定；使用 `NEWS_ONLY` 可避免更新目前未展示的素材。兩張獎項圖片及 MUCH 影片畫面不在腳本的擷取範圍內，需另行更新。

截圖應保留原標題、日期及文章內容，不以生成圖片替代新聞。來源網站版型可能變動，每次擷取後須檢視輸出；網站卡片使用 4:3 裁切，亦需確認標題與主要內容在頁面上仍可辨識。
