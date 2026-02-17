# NBLM 簡報生成助手 (YAML Generator)

> 基於 Google Gemini AI 的智慧簡報大綱生成工具，專為 NotebookLM 製作簡報而設計

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/yourusername/nblm-gem)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org/)

## 📖 專案簡介

NBLM 簡報生成助手是一個創新的工具，協助教師、講師和內容創作者快速生成專業的簡報大綱。透過 AI 智慧分析，將原始素材轉換為結構化的 YAML 格式，可直接用於 NotebookLM 製作精美簡報。

### ✨ 核心特色

- 🤖 **AI 智慧生成** - 基於 Google Gemini 2.5 Flash，快速且準確
- 📝 **三種生成模式** - 智慧生成 / 現有大綱轉檔 / 教科書切片
- ✏️ **豐富卡片編輯器** - 封面/內容/結尾頁分類，支援標題、副標題、重點、講綱、視覺描述、排版風格六欄位
- 📄 **NotebookLM 專用 YAML** - `presentation_data` 格式，含 `system_instructions`、`global_design`、`color_palette`
- 📋 **一鍵複製 YAML** - 複製後直接貼入 NotebookLM 筆記本
- 📥 **多格式下載** - YAML 檔案 + Markdown 大綱（含講者講綱）
- 🎨 **16 種視覺風格** - 手繪蠟筆、Q版可愛、水彩暈染、霓虹暗黑等，每種含完整色彩配置
- 🎯 **NotebookLM 排版優化** - 英文排版關鍵字、Hex 色碼、Typography Hierarchy 確保排版被正確執行
- 📱 **響應式設計** - 支援桌面、平板、手機
- 🔒 **本地儲存** - API Key 安全儲存在瀏覽器

## 🚀 快速開始

### 線上使用（推薦）

訪問部署網址：`https://your-app.zeabur.app`

### 本地開發

```bash
# 1. 克隆專案
git clone https://github.com/yourusername/nblm-gem.git
cd nblm-gem

# 2. 安裝依賴
npm install

# 3. 啟動服務
npm start

# 4. 訪問應用
# 開啟瀏覽器：http://localhost:3000
```

### Docker 部署

```bash
# 建置映像
docker build -t nblm-gem .

# 執行容器
docker run -p 3000:3000 nblm-gem
```

## 📋 使用說明

### 1. 設定 API Key
- 前往 [Google AI Studio](https://aistudio.google.com/apikey) 申請免費 API Key
- 在應用程式中點擊「API Key」按鈕
- 輸入並儲存（本地加密儲存）

### 2. 設定簡報維度
- 從下拉選單選擇：簡報者角色、受眾面向、簡報場景、視覺風格
- 調整額外參數：頁數、語言、互動程度
- 所有設定在單頁內一目了然

### 3. 選擇生成模式 & 輸入素材

#### 📌 智慧生成模式
- 貼上原始素材（文字、網址、上傳檔案）
- AI 自動分析並生成結構化大綱

#### 📌 現有大綱轉檔
- 貼上您的大綱（任何格式）
- 保留原始結構，僅轉換為 YAML 格式

#### 📌 教科書切片
- 上傳教科書內容
- AI 自動切分為適當段落

### 4. 編輯 & 匯出
- 點擊「開始生成」，預覽區自動顯示並捲動到位
- 左側：豐富卡片編輯器，依頁面類型（封面/內容/結尾）顯示不同欄位
- 右側：即時 YAML 預覽（自動排除講者講綱，僅顯示 NotebookLM 所需內容）
- 點擊「複製 YAML」直接複製到剪貼簿
- 前往 [NotebookLM](https://notebooklm.google.com)，貼上即可生成簡報
- 另可下載 Markdown 大綱（含講者講綱）作為教學備忘

## 🎯 適用場景

- 👨‍🏫 **教育工作者** - 快速製作課程簡報
- 👔 **企業培訓** - 建立標準化訓練教材
- 🎤 **演講者** - 組織演講大綱與重點
- 📚 **內容創作者** - 將文章轉為簡報格式
- 🏫 **學生** - 製作報告與專題簡報

## 🛠️ 技術架構

### 前端技術
- **純 JavaScript (ES5)** - 無框架依賴，輕量高效
- **CSS3 + CSS Variables** - 深色主題，響應式設計
- **js-yaml** - YAML 解析與生成
- **Clipboard API** - 剪貼簿功能

### 後端技術
- **Node.js + Express** - RESTful API 服務
- **Google Gemini API** - AI 生成引擎
- **Multer** - 檔案上傳處理
- **pdf-lib + pdfjs-dist** - PDF 解析
- **Canvas + Sharp** - 圖片處理

### 部署方案
- **Docker** - 容器化部署
- **Zeabur** - 一鍵部署，自動 CI/CD
- **免費 HTTPS** - 自動 SSL 憑證

## 📂 專案結構

```
nblm-gem/
├── public/                 # 前端靜態資源
│   ├── index.html         # 主頁面
│   ├── css/
│   │   └── styles.css     # 樣式表
│   └── js/
│       ├── app.js         # 主應用邏輯
│       ├── presets.js     # 預設選項
│       ├── gemini.js      # Gemini API 整合
│       ├── yaml-engine.js # YAML 生成引擎
│       ├── outline-editor.js # 大綱編輯器
│       ├── editor.js      # 編輯器工具
│       └── pdf-splitter.js # PDF 處理
├── routes/                # API 路由
│   └── pdf.js            # PDF 轉圖片 API
├── docs/                  # 文件
│   ├── CHANGELOG-v2.0.md # 版本更新日誌
│   ├── DEPLOY-ZEABUR.md  # Zeabur 部署指南
│   └── plans/            # 設計與實作計畫
├── server.js             # Express 服務器
├── package.json          # 依賴管理
├── Dockerfile           # Docker 配置
└── README.md            # 本文件
```

## 🔄 版本歷程

### v2.2.0 (2026-02-18) - 單頁佈局改版
- ✨ 4 步驟精靈合併為單頁垂直佈局，所有設定一目了然
- ✨ 42 張卡片選擇器改為 4 個下拉選單（2×2 grid），大幅精簡介面
- ✨ 受眾下拉選單使用 `<optgroup>` 區分教育類/職場類
- ✨ 額外參數改為 3 欄橫向排列（頁數、語言、互動程度）
- ✨ 預覽區生成後自動顯示並 smooth scroll 到位
- ✨ 完全自訂模式直接顯示編輯器，隱藏所有設定區塊
- 🔧 移除 step progress bar、step-nav 按鈕、card grid 等多餘 UI
- 🔧 CSS 精簡約 190 行，新增約 60 行新佈局樣式
- 🔧 app.js 移除 `goToStep()`、`renderCards()`、`initStepNavigation()` 等函數
- 📱 響應式：768px 以下維度/參數自動切換為單欄

### v2.1.0 (2026-02-17) - NotebookLM 排版優化 & 編輯器增強
- ✨ 卡片編輯器全面改版：封面/內容/結尾頁分類，支援六欄位編輯
- ✨ NotebookLM 排版優化：英文排版關鍵字、Hex 色碼、Typography Hierarchy
- ✨ YAML 格式升級為 `presentation_data` 結構，含 `system_instructions` 和 `global_design`
- ✨ 16 種視覺風格各配備完整色彩配置（bg/text/accent hex codes）
- ✨ 新增一鍵複製 YAML + 下載 YAML/MD 按鈕
- ✨ 講者講綱（script）在編輯器可見、YAML 輸出自動排除
- 🔧 Gemini prompt 全面更新，要求具體視覺描述與英文排版指令

### v2.0.0 (2026-02-16) - 編輯器重大改版
- ✨ 新增使用說明彈窗
- ✨ 卡片式大綱編輯器（左右分欄）
- ✨ YAML 即時預覽與複製
- ✨ NotebookLM 整合指南
- 🐛 修復 metadata 遺失問題
- 📝 完整保留簡報設定資訊

### v1.0.0 (2026-02-15) - 初始版本
- 🎉 基礎 AI 生成功能
- 📄 YAML 匯出
- 🎨 深色主題 UI
- 📱 響應式設計

[查看完整更新日誌](docs/CHANGELOG-v2.0.md)

## 🚀 部署指南

### Zeabur 部署（推薦）

1. 推送程式碼到 GitHub
2. 前往 [zeabur.com](https://zeabur.com) 註冊
3. 建立專案並連接 GitHub 儲存庫
4. 自動偵測 Dockerfile 並部署
5. 產生免費網域

詳細步驟請參考：[Zeabur 部署指南](docs/DEPLOY-ZEABUR.md)

### 其他部署方案
- Vercel
- Netlify + Serverless Functions
- Railway
- Render
- 自架伺服器 + Docker

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 程式碼風格
- 使用 ES5 語法（相容性考量）
- 遵循現有程式碼風格
- 註解使用繁體中文
- Commit 訊息遵循 Conventional Commits

## 📄 授權條款

ISC License

## 🙏 致謝

- [Google Gemini API](https://ai.google.dev/) - AI 生成引擎
- [NotebookLM](https://notebooklm.google.com) - 簡報製作平台
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML 處理
- [Zeabur](https://zeabur.com) - 部署平台

## 📮 聯絡方式

- 問題回報：[GitHub Issues](https://github.com/yourusername/nblm-gem/issues)
- 功能建議：[GitHub Discussions](https://github.com/yourusername/nblm-gem/discussions)

---

**用 AI 賦能教育，讓每一份簡報都精彩！** 🎓✨
