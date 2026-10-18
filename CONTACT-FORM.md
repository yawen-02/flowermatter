# 聯絡表單串接

已從 Google 公開填答頁的 `FB_PUBLIC_LOAD_DATA_` 核對輸入欄位，而非題目區塊 ID：

| 欄位 | POST name |
| --- | --- |
| 您的姓名／稱呼 | entry.588998168 |
| 聯絡電子信箱 | entry.476214014 |
| 您的需求 | entry.1610329698 |
| 需求簡介 | entry.1646642689 |
| 適合聯絡的時間 | entry.1091995575 |

Google Action：
`https://docs.google.com/forms/d/e/1FAIpQLScpd46ezLkcLj5QMhAx0AdNtQSxM3kU08yRE5G6DP4pSXvbGg/formResponse`

## 上線方式

此版本包含 Cloudflare Pages Function：`functions/api/contact.js`，對應 `POST /api/contact`。
以支援 Pages Functions 的 Git 整合或 Wrangler 部署整個專案，讓網站和端點位於相同網域。
單獨開啟 HTML、一般靜態主機或只拖曳上傳 HTML，不會執行這個端點。
若使用其他主機，需將端點移植到該主機的後端；前端仍呼叫 `/api/contact`。

前端背景傳送五個 entry 欄位，端點向固定 Google Action POST，檢查 Google 收件確認頁後回傳 JSON。
只有 `success: true` 才會清空欄位並顯示自訂成功視窗；不會跳轉到 Google。
連線中斷或確認結果不明時保留內容，不自動重試，避免重複收件。
HTML 的隱藏 iframe 僅作為原生表單的背景目標，不以其 load 事件判定成功。

不需要 Google 帳號密碼或 API 金鑰。Google 表單須維持公開、接受回覆，不能要求登入。
Google 改版可能改變確認頁標記；無法辨識時端點會回報無法確認，不會假報成功。
本次未送出任何測試回覆；部署後需使用明確標示的測試資料，確認 Google 回覆清單實際收到。

官方路由文件：https://developers.cloudflare.com/pages/functions/routing/
