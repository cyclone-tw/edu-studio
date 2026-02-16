# Zeabur 部署指南

## 前置準備

### 1. 確認專案已推送到 Git
```bash
# 確認所有變更已提交
git status

# 如果有未提交的變更，先提交
git add .
git commit -m "prepare for deployment"

# 推送到 GitHub（或其他 Git 平台）
git push origin main
```

### 2. 註冊 Zeabur 帳號
- 前往 [zeabur.com](https://zeabur.com)
- 使用 GitHub 帳號登入（推薦）

---

## 部署步驟

### Step 1: 建立新專案
1. 登入 Zeabur 後，點擊 **「Create Project」**
2. 輸入專案名稱（例如：`nblm-gem`）
3. 選擇區域（建議選擇 **Tokyo** 或 **Hong Kong**，台灣用戶延遲最低）

### Step 2: 新增服務
1. 在專案頁面點擊 **「Add Service」**
2. 選擇 **「Git」**
3. 選擇您的 Git 儲存庫
   - 如果是第一次使用，需要授權 Zeabur 存取您的 GitHub
   - 在儲存庫列表中找到 `nblm-gem`
   - 點擊選擇

### Step 3: 自動偵測與部署
Zeabur 會自動偵測到：
- ✅ `Dockerfile` - 使用 Docker 部署
- ✅ `package.json` - Node.js 專案
- ✅ `npm start` - 啟動指令

部署會自動開始，等待 2-5 分鐘。

### Step 4: 設定網域
部署完成後：
1. 點擊服務卡片
2. 找到 **「Domains」** 區塊
3. 點擊 **「Generate Domain」** 自動產生免費網域
   - 格式：`<random-name>.zeabur.app`
4. 或綁定自訂網域（需要先擁有網域）

---

## 環境變數設定（可選）

如果需要設定環境變數（例如 API 金鑰）：

1. 在服務頁面找到 **「Variables」** 分頁
2. 點擊 **「Add Variable」**
3. 新增變數：
   ```
   KEY: PORT
   VALUE: 3000
   ```
   （註：實際上 Zeabur 會自動注入 PORT，不需手動設定）

---

## 檢查部署狀態

### 查看建置日誌
1. 點擊服務卡片
2. 進入 **「Logs」** 分頁
3. 查看即時日誌

### 常見問題排查

**問題 1：建置失敗**
- 檢查 `package.json` 的 `dependencies` 是否完整
- 確認 Node.js 版本（Dockerfile 使用 node:20）

**問題 2：服務啟動失敗**
```bash
# 本地測試
npm install
npm start
```
確認本地可以正常啟動

**問題 3：canvas 套件安裝失敗**
- 已在 Dockerfile 安裝所需依賴
- 檢查 Dockerfile 的 apt-get 指令是否正確

---

## 更新部署

### 自動部署（推薦）
只要推送到 GitHub，Zeabur 會自動重新部署：
```bash
git add .
git commit -m "update feature"
git push origin main
```

### 手動觸發
1. 進入服務頁面
2. 點擊 **「Redeploy」** 按鈕

---

## 進階設定

### 1. 監控與日誌
- **Logs**：即時應用程式日誌
- **Metrics**：CPU、記憶體使用率圖表

### 2. 自訂網域
1. 在 Domains 區塊點擊 **「Add Domain」**
2. 輸入您的網域（例如：`nblm.yourdomain.com`）
3. 在您的 DNS 服務商新增 CNAME 記錄：
   ```
   Type: CNAME
   Name: nblm
   Value: <zeabur-提供的網域>
   ```

### 3. HTTPS
- Zeabur 自動提供免費 SSL 憑證
- 所有網域都會自動啟用 HTTPS

### 4. 效能優化
- Zeabur 提供 CDN 加速靜態資源
- 自動 gzip 壓縮

---

## 費用說明

### 免費方案
- ✅ 每月 5 USD 免費額度
- ✅ 無限專案數
- ✅ 免費 SSL
- ✅ 自動部署

### 付費方案
- 超過免費額度後，按使用量計費
- 詳見：[zeabur.com/pricing](https://zeabur.com/pricing)

---

## 快速檢查清單

部署前確認：
- [ ] 所有程式碼已推送到 GitHub
- [ ] `package.json` 有正確的 `start` script
- [ ] `Dockerfile` 存在且正確
- [ ] `.gitignore` 包含 `node_modules`、`uploads`
- [ ] 本地測試通過

部署後確認：
- [ ] 建置成功（查看 Logs）
- [ ] 服務啟動成功
- [ ] 網域可訪問
- [ ] 功能正常運作
- [ ] PDF 上傳功能正常
- [ ] API 呼叫正常

---

## 故障排除

### 建置成功但無法訪問
1. 確認 PORT 使用 `process.env.PORT`（已完成 ✓）
2. 檢查防火牆設定
3. 查看應用程式日誌

### Canvas 相關錯誤
```dockerfile
# Dockerfile 已包含所需依賴
RUN apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    ...
```

### 記憶體不足
- 檢查是否有記憶體洩漏
- 考慮升級方案

---

## 相關連結

- [Zeabur 官方文件](https://zeabur.com/docs)
- [Zeabur Discord 社群](https://discord.gg/zeabur)
- [專案 GitHub](https://github.com/yourusername/nblm-gem)

---

**部署完成後，您的應用程式將可在以下網址訪問：**
```
https://<your-service-name>.zeabur.app
```

祝部署順利！🚀
