# 合作洽詢表單

表單實作位於 [Form.astro](../src/components/section/Form.astro)，中英文共用。單位名稱、稱呼、聯絡方式必填，合作想法選填；聯絡方式接受電話、LINE ID、Email、Facebook 或 Telegram 等文字。

已選方案與價格獨立顯示，送出時附在訊息中，不改寫使用者輸入的合作想法。使用者也可以直接寄信至 `contact@sitcon.org`。

## 收件設定與狀態

收件端為 [SITCON 2027 贊助洽談表單](https://forms.gle/TwFBtr83AJKmkfFQA)。端點與 Google Forms 欄位 ID 定義在 `Form.astro`；變更表單欄位時，需同步調整前端對應與後端必填設定。

目前使用跨來源 `no-cors` 請求，前端無法確認 Google Forms 是否接受資料。因此介面只顯示「已傳送請求」，不宣稱收件成功，也不清空輸入。若要提供確實收件的成功狀態，需改用能回報收件結果的提交服務。

## 互動驗證

先依 [README](../README.md) 建置並啟動本機預覽，再使用既有的 Playwright 或 playwright-core 與 Chromium 執行：

```sh
PLAYWRIGHT_MODULE=/path/to/playwright-core \
CHROMIUM_PATH=/path/to/chrome \
REVIEW_BASE_URL=http://127.0.0.1:4321/2027/cfs/ \
node scripts/verify-contact.cjs
```

Playwright 與 Chromium 並未列在專案依賴中，路徑請依測試環境提供；也可設定 `CDP_URL` 連線至已啟動的 Chromium。

測試涵蓋中英文、320／390／1440px、任意聯絡方式、必填驗證、方案增減、留言保留，以及模擬送出與失敗重試。腳本會攔截 Google Forms 請求，不會送出真實洽詢；測試通過也不代表已驗證 Google Forms 實際收件。
