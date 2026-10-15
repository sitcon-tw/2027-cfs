<div align=center>

# SITCON 2027 贊助徵求書

![Astro](https://img.shields.io/badge/Astro-5f3cbe?logo=astro)  
<https://sitcon.org/2027/cfs>

![SITCON 2027 贊助徵求書](src/assets/img/og.webp)

</div>

## 開發

使用 [Node.js](https://nodejs.org/) 22（見 [.node-version](.node-version)）與 [package.json](package.json) 的 `packageManager` 指定的 [pnpm](https://pnpm.io/installation) 版本：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

本機開發與一般建置預設使用儲存庫內的資料，網站路徑為 `/2027/cfs/`。

## 檢查與本機建置

```bash
pnpm test
pnpm format:check
pnpm build
pnpm preview --host 127.0.0.1 --port 4321
```

建置預覽位於 <http://127.0.0.1:4321/2027/cfs/>。`pnpm test` 執行 Astro 檢查；CI 另執行格式檢查與建置。瀏覽器互動測試不包含在 `pnpm test` 內，合作表單的測試方式見[合作洽詢表單](docs/contact-form.md)。

## 內容維護

贊助品項與方案來自 [2027 年 Google 試算表](https://docs.google.com/spreadsheets/d/1ggq2rcQF1N_KAs_hiLFxa-61mBU1nvT_mx7PLWUtvg4/edit)。[scripts/sheet.json](scripts/sheet.json) 設定公開 CSV 來源與分頁 GID，[scripts/fetch-and-merge.js](scripts/fetch-and-merge.js) 負責下載及合併。

需要更新本機贊助資料時執行：

```bash
pnpm fetch-data
```

此指令會覆寫 `src/data/item.json`、`src/data/plan.json`，並下載圖片至 `public/items/`；執行後請檢查差異。一般開發與 PR 檢查可省略。

其他內容在儲存庫內維護：

- 中英文文案：[src/i18n/zh-Hant.json](src/i18n/zh-Hant.json)、[src/i18n/en.json](src/i18n/en.json) 與各頁面、元件。
- [統計數據來源與口徑](docs/2026-stats-sources.md)：數字的來源、計算方式與待補依據。
- [照片與媒體素材](docs/photo-sources.md)：照片出處、授權紀錄與媒體截圖更新方式。
- [合作洽詢表單](docs/contact-form.md)：收件設定、送出狀態與互動驗證。

## 正式站發布

推送至 `main` 或手動執行 [Build CFS site](.github/workflows/gh-pages.yml)，會下載試算表資料與圖片、檢查專案，並將建置結果發布至 `build` 分支，接著觸發 `sitcon-tw/2027` 的 **Deploy website**。建置失敗時會保留上次成功的結果，也不會觸發主網站部署。

資料不會回寫至 `main`，也不會定時更新。只修改試算表時，在本儲存庫的 `main` 手動執行 **Build CFS site** 即可。

觸發主網站部署需要 `DEPLOY_DISPATCH_TOKEN` secret：對 `sitcon-tw/2027` 具 Actions 讀寫權限的 fine-grained token（預設的 `GITHUB_TOKEN` 無法存取其他儲存庫）。

主網站每次部署都會下載 `build` 分支至 `dist/cfs/`，一併發布。本儲存庫不單獨發布正式 GitHub Pages。

## Cloudflare 預覽

SITCON 帳號的 `2027-cfs-preview` Worker 使用 `dev` 分支，網址為 <https://2027-cfs-preview.sitcon.workers.dev>。Cloudflare Workers Builds 也會在其他來源分支推送時建立 Worker Preview，並將網址附在對應 PR；沒有 PR 的分支也會觸發預覽。

建置設定：

- Production branch：`dev`（固定開發預覽）。
- Build command：`pnpm build:preview`。
- Deploy command：`pnpm exec wrangler deploy`。
- Preview command：`pnpm exec wrangler preview`。
- Node.js：22；pnpm 版本依 `package.json`。

[預覽建置](scripts/build-preview.js) 會取得最新贊助資料與圖片、以 `/` 為路徑建置，並加入 `X-Robots-Tag: noindex, nofollow`。`SITE_URL` 可覆寫預覽 metadata 使用的網站來源；一般 `pnpm build` 預設保留正式站的 `/2027/cfs` 路徑。

GitHub 整合與部署憑證由 Cloudflare 管理，不需要 GitHub Actions 部署密鑰。
