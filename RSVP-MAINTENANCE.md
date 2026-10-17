# RSVP 維護與驗收（全程留在婚禮網站）

狀態：Google Apps Script 已部署；已實際提交並讀回一筆標記的虛構測試資料，同一 ID 重試回傳已儲存。尚待使用者從網站驗收完整不跳頁流程。不能合併發布。
正式版備份：backup/rsvp-before-fix-20261016（219b6a5fdf10b855515c497e48a72bc2248288fd）。
測試分支：fix/rsvp-test-20261016；main 保持不變。

## 已修正原因
index.html 載入 js/script.js；關係選項須對齊 Google 全形／與目前「大學同學/朋友」等文字。
Google 的「怎麼認識的說明」一律必填；非其他選項沿用賓客所選完整關係文字。
歷史版本只有合併出席題，現在分成禮拜與午宴，不能整份回退。
舊版 no-cors 無法判定 Google 是否拒收，不能當作成功證據。

## 現在的操作
賓客全程留在網站。隱藏 iframe 僅作傳輸，不開分頁、不顯示 Google 表單。
Apps Script 透過 FormApp 寫入原 Google 表單，取得回覆 ID 並讀回該筆後才回傳 saved。
前端驗證訊息來源、requestId、nonce，只在 saved 確認後顯示原成功畫面。
iframe load、逾時、登入頁、網路失敗、缺少設定都不會視為成功。
送出期間停用編輯避免內容改動遺失；失敗恢復編輯並保留本機七天草稿。
請求 ID 在同瀏覽器保留七天。重試同內容沿用 ID；後端以鎖與持久化紀錄避免同 ID 重複寫入。
若後端提交途中中斷，保留 pending 並提示聯絡新人，不能盲目再寫入。
這是同一請求的重試保護；不同裝置或清除瀏覽器資料後不保證自動去重。

## 一次性部署（Google 表單擁有人）
1. 在 Apps Script 建立新的獨立專案，貼入 backend/apps-script/Code.gs。
2. 儲存，選 authorizeRsvp 函式執行，自行登入並查看授權範圍後授權。
3. 部署 → 新增部署 → 網頁應用程式；執行身分選自己，存取者選任何人，讓賓客不必登入。這只提供新增回覆的介面，不提供讀取回覆或 OAuth token。
4. 複製部署的 /exec 網址，填入 js/script.js 的 RSVP_ENDPOINT。不要使用 /dev 網址。
5. 修改 Google 程式後須更新部署版本；修改 JS 後須更新 index.html 的版本參數。
6. 先在測試分支驗收，使用者確認後才合併。不要切換正式 GitHub Pages 的發布分支來測試。
7. 若使用自訂網域或獨立測試網域，在 RSVP_ORIGINS 加入精確 origin。允許名單只是傳輸限制，不是防機器人驗證；公開端點仍受 Apps Script 配額與垃圾提交影響。

## 測試方式
下載測試分支，解壓後以 python -m http.server 8000 開啟 http://localhost:8000。
不要直接雙擊 file:// 開啟。目前測試分支已填入部署的 /exec 網址。
程式回歸測試：node tests/rsvp.test.cjs（模擬 Google 服務與 DOM，不等於真實入帳驗證）。
部署後使用明確標記「RSVP 測試」的虛構資料。
測所有關係選項、其他說明、禮拜/午宴是與否、人數 0/1/5、葷素、紙本及電子喜帖。
確認網站不換頁、不開 Google、新增回覆後才顯示成功；後台逐欄核對內容。
測離線、逾時、未部署端點、錯誤選項，皆不得顯示成功或清空內容。
測連點、同內容重試及重新載入恢復草稿，確認不因同請求重試多出一筆。
若 pending 永遠無法確認，先查 Google 後台，再由維護者處理該 requestId；不要直接刪除後端 pending 再重送。
Apps Script 以程式提交不會觸發一般表單提交觸發器；若有通知或其他自動化，須另外驗收。

## 未來安全修改 index.html
1. 每次從 main 建新分支，小範圍修改與提交，先備份。
2. 改文案/圖片時保留表單 name/id、option value、script 載入及成功畫面 ID。
3. 改 Google 題目、選項、必填或題型，同步核對前端 entry 對照與後端 item ID；兩者是不同代碼。
4. 更新 JS 版本參數，執行回歸測試與後台驗收，檢查差異後再合併。
5. 不要還原成 no-cors 後直接顯示成功；不要以 iframe load 當儲存成功。
6. 若有問題，由備份建立還原提交，不強制改寫 main 歷史。

## 已部署的驗收版本
私人測試頁：https://randj-rsvp-test-20261016.quirkyflea1024.chatgpt.site
Apps Script 專案：https://script.google.com/home/projects/1mu3qktamhxptIFmIXbQdRWzgMKAl4yTPEMz_CCv3eh3YhwMJDXVwpclN/edit
後台測試名稱：RSVP 系統測試 20261016-1840（請勿納入出席統計）。
回歸測試另已核對前端實際 payload 能通過目前 Google 選項 fixture。
私人測試頁只是驗收入口，正式婚禮網址及 main 均未變更。此環境無法開啟線上私人測試頁進行瀏覽器端對端驗證，必須由使用者完成最後驗收。
