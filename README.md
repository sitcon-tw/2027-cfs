<div align=center>

# SITCON 2027 贊助徵求書

![Astro](https://img.shields.io/badge/Astro-5f3cbe?logo=astro)  
<https://sitcon.org/2027/cfs>

![](src/assets/img/og.webp)

</div>

## 開發

請先安裝 [Node.js](https://nodejs.org/) 及 [pnpm](https://pnpm.io/installation)，接著執行：

```bash
pnpm i
pnpm dev
```

## 建置與發布

### 個人 fork 預覽站

預覽網址：<https://skyhong2002.github.io/2027-cfs/>

此 fork 推送至 `main` 或手動執行 **Deploy preview to GitHub Pages** 時，會使用儲存庫內的資料建置並自動部署至 GitHub Pages。Pages 的 Source 需設為 **GitHub Actions**。

預覽流程透過 `CFS_PREVIEW=1` 顯示完整網站，並依 Pages 設定指定 `SITE_URL` 與 `BASE_PATH`。未設定預覽模式時，正式建置仍會導向 WIP 頁面。原有 **Build CFS site** 僅在 `sitcon-tw/2027-cfs` 執行。

若要在本機重現預覽建置：

```bash
SITE_URL=https://skyhong2002.github.io BASE_PATH=/2027-cfs CFS_PREVIEW=1 pnpm build
BASE_PATH=/2027-cfs pnpm preview
```

本機 `origin` 指向個人 fork，`upstream` 指向 `sitcon-tw/2027-cfs`；後續開發可直接 `git push origin main` 發布預覽。

### 正式站流程

網站設計與靜態內容沿用 2026 年版本，贊助資料來自 [2027 年 Google 試算表](https://docs.google.com/spreadsheets/d/1ggq2rcQF1N_KAs_hiLFxa-61mBU1nvT_mx7PLWUtvg4/edit)。

推送至 `main` 或手動執行 **Build CFS site**，會下載試算表資料與圖片、檢查專案，並將建置結果發布至 `build` 分支。建置失敗時會保留上次成功的結果。

資料不會回寫至 `main`，也不會定時更新。此流程沒有其他儲存庫的寫入權限。

只修改試算表時，請手動發布：

1. 在 `main` 執行 **Build CFS site**，等待成功。
2. 在 `sitcon-tw/2027` 的 `main` 執行 **Deploy website**。

主網站每次部署都會下載最新建置至 `dist/cfs/`，一併發布。此儲存庫不單獨發布 GitHub Pages。

### 本機建置

使用 Node.js 22，執行：

```bash
pnpm install --frozen-lockfile
pnpm fetch-data
pnpm test
pnpm build
```

`pnpm fetch-data` 會更新本機 JSON 與圖片。一般建置與 PR 檢查可使用儲存庫內的資料，省略此步驟。

## Cloudflare previews

The `2027-cfs-preview` Worker serves `dev` at <https://2027-cfs-preview.sitcon.workers.dev>. GitHub Actions owns all builds:

- A push to `dev` rebuilds and deploys the fixed development preview.
- A pull request targeting `dev` builds without secrets or write permissions. After that build finishes, the trusted workflow on the default branch (`main`) verifies the repository, workflow, PR, head SHA, result, and open state before deploying the artifact as `pr-<number>`.
- The bot updates one PR comment and the GitHub deployment status with the preview URL and source SHA. Failed builds do not replace the last successful Cloudflare deployment.
- Closing or merging a PR deletes its Cloudflare Preview. Reopening the PR triggers a fresh build.

The PR build fetches the current public sponsorship spreadsheet and images with `pnpm fetch-data`; it does not use committed sponsorship data. Astro builds at the root path `/`. `dist/_headers` adds `X-Robots-Tag: noindex, nofollow`, and Cloudflare also adds `noindex` on `workers.dev` Preview URLs.

Repository configuration:

1. Add a `CLOUDFLARE_API_TOKEN` Actions secret. Scope it to the SITCON account and only the Workers Scripts write permission needed by `2027-cfs-preview`.
2. Add `CLOUDFLARE_WORKERS_SUBDOMAIN` as an Actions variable. Its value is the account subdomain used in `pr-<number>-2027-cfs-preview.<subdomain>.workers.dev`.
3. Keep `.github/workflows/preview-deploy.yml` on the GitHub default branch. GitHub only runs a `workflow_run` workflow from that branch.
4. After one `dev` deployment and one real fork PR have passed, disable the Worker's native Git integration in Cloudflare. Leaving it enabled creates a second deployment path.

GitHub may require a maintainer to approve the first workflow run from a new external contributor. The untrusted PR job receives neither the Cloudflare token nor a write-capable `GITHUB_TOKEN`; the trusted deployment job checks out only the default branch and never installs or executes files from the PR.

Local equivalent:

```bash
pnpm build:preview
pnpm exec wrangler deploy
```
