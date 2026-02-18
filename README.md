# Cyclone Studio - AI 教材製作

> 整合 AI 生成、電子書製作與語音朗讀的教材創作平台，專為教師與教育工作者設計

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/yourusername/nblm-gem)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org/)

## 📖 專案簡介

Cyclone Studio 是一個教材製作平台，提供兩大核心工具：

1. **AI 簡報大綱生成器** — 透過 Google Gemini AI 分析素材，產生結構化 YAML，可直接匯入 NotebookLM 製作精美簡報
2. **有聲電子書生成器** — 上傳 PDF 簡報，自動轉為含翻頁動畫與 TTS 語音朗讀的獨立 HTML 電子書

---

## ✨ 功能總覽

### 🤖 AI 簡報大綱生成器

| 功能 | 說明 |
|------|------|
| **三種生成模式** | 智慧生成 / 現有大綱轉檔 / 教科書切片 |
| **四維度設定** | 簡報者角色（8種）× 受眾面向（10種）× 簡報場景（9種）× 視覺風格（16種） |
| **豐富卡片編輯器** | 封面 / 內容 / 結尾頁分類，支援標題、副標題、重點、講綱、視覺描述、排版風格六欄位 |
| **NotebookLM 專用 YAML** | `presentation_data` 格式，含完整 `system_instructions`、`global_design`、`color_palette` |
| **一鍵複製 / 下載** | 複製到剪貼簿，或下載為 `.txt`（NotebookLM 可直接匯入）/ `.md` Markdown 大綱 |
| **智慧命名** | 下載檔案自動以簡報標題（`suggested_filename`）命名，非通用名稱 |
| **NotebookLM 排版優化** | 英文排版關鍵字、Hex 色碼、Typography Hierarchy，確保版面被正確執行 |

### 📖 有聲電子書生成器

| 功能 | 說明 |
|------|------|
| **PDF 轉電子書** | 在瀏覽器端用 PDF.js 把每頁渲染為圖片，無需後端 |
| **YAML / TXT 自動對應** | 上傳大綱檔案，自動對應每頁標題與內文 |
| **手動填寫模式** | 無 YAML 也可逐頁手動輸入語音文字，舊 PDF 也能製作有聲電子書 |
| **翻頁動畫** | 採用 StPageFlip 引擎，單頁模式，書本翻頁效果 |
| **TTS 語音朗讀** | Web Speech API，支援繁中、簡中、英文、日文等多種語言 |
| **朗讀模式切換** | 可選擇「全文（含標題）」或「純內文」朗讀 |
| **速度控制** | 0.5x ～ 2.0x 速度滑桿，即時生效 |
| **自動 / 手動朗讀** | 可設定翻頁自動朗讀，或手動按鍵觸發 |
| **鍵盤支援** | ← → 翻頁，空白鍵朗讀 |
| **響應式電子書** | 自動計算 16:9 尺寸填滿視窗，resize 自動重排 |
| **單一 HTML 輸出** | 圖片 base64 內嵌 + JS 函式庫 inline，完全離線可用 |
| **Notion 嵌入** | 下載 HTML 上傳至 GitHub Pages / CDN，取得 URL 後可嵌入 Notion Embed 區塊 |

### 🎨 共通設計

- 暗色主題 + 青綠 accent，Noto Sans TC 字體
- 全響應式：桌機 / 平板 / 手機無縫切換
- API Key 本地儲存，不經伺服器

---

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
docker build -t cyclone-studio .
docker run -p 3000:3000 cyclone-studio
```

---

## 📋 使用說明

### AI 簡報大綱生成器

#### 1. 設定 API Key
前往 [Google AI Studio](https://aistudio.google.com/apikey) 申請免費 API Key，在應用程式中點擊「API Key」按鈕輸入並儲存（本地加密）。

#### 2. 設定簡報維度
選擇簡報者角色、受眾面向、簡報場景、視覺風格，調整頁數、語言、互動程度。

#### 3. 選擇生成模式
- **智慧生成** — 貼上原始素材，AI 自動分析生成大綱
- **現有大綱轉檔** — 貼上任意格式大綱，轉為 YAML
- **教科書切片** — 上傳課文，AI 依句切分為投影片頁面

#### 4. 匯出與使用
- 點「複製 YAML」或下載 `.txt` 檔案
- 前往 [NotebookLM](https://notebooklm.google.com)，建立筆記本並貼入

---

### 有聲電子書生成器

#### 1. 上傳 PDF
選擇 NotebookLM 產出的 PDF，瀏覽器自動轉換每頁為圖片。

#### 2. 上傳大綱（選填）
上傳 `.txt` 或 `.yaml` 大綱檔案，系統自動對應每頁標題與內文；若無大綱，可在預覽區手動填寫。

#### 3. 確認與編輯
預覽區顯示每頁縮圖與兩個可編輯欄位（📌 標題文字 / 📝 內文），確認後可微調。

#### 4. 設定與生成
設定書名、語音語言、是否翻頁自動朗讀，點擊「生成並下載電子書 HTML」。

#### 5. 部署與嵌入
下載的 HTML 可直接在瀏覽器開啟（完全離線），或上傳至 GitHub Pages 取得公開 URL 後嵌入 Notion。

---

## 🛠️ 技術架構

### 前端
- **純 JavaScript (ES5 / ES Module)** — 主邏輯用 ES5，電子書生成器用 ES Module
- **PDF.js 4.9** — 瀏覽器端 PDF 渲染（電子書生成工具）
- **StPageFlip 2.0.7** — 翻頁動畫引擎（inline 進輸出 HTML）
- **js-yaml 4** — YAML 解析
- **Web Speech API** — TTS 語音朗讀
- **CSS3 + CSS Variables** — 深色主題，響應式設計

### 後端
- **Node.js + Express 5** — 純靜態檔案伺服器（無 API endpoint）

### 部署
- **Docker** — 容器化部署
- **Zeabur** — 一鍵部署，自動 CI/CD，免費 HTTPS

---

## 📂 專案結構

```
nblm-gem/
├── public/
│   ├── index.html              # 主頁面（AI 簡報大綱生成器）
│   ├── ebook.html              # 有聲電子書生成工具
│   ├── dragon.png              # Favicon
│   ├── css/
│   │   └── styles.css          # 暗色主題樣式
│   └── js/
│       ├── app.js              # 主應用邏輯
│       ├── gemini.js           # Gemini API 整合
│       ├── yaml-engine.js      # YAML 生成引擎
│       ├── outline-editor.js   # 大綱卡片編輯器
│       ├── editor.js           # 編輯器工具函式
│       ├── presets.js          # 四維度預設選項
│       ├── ebook-generator.js  # 電子書生成主邏輯
│       └── page-flip.browser.js # StPageFlip bundle（inline 用）
├── docs/
│   ├── CHANGELOG-v2.0.md       # v2.0 版本摘要
│   ├── DEPLOY-ZEABUR.md        # Zeabur 部署指南
│   ├── DEVELOPMENT-LOG.md      # 開發日誌
│   └── plans/                  # 設計與實作計畫文件
├── server.js                   # Express 靜態伺服器
├── package.json
├── Dockerfile
└── README.md
```

---

## 🔄 版本歷程

### v2.3.0 (2026-02-18) — 有聲電子書生成器 & 品牌改版

#### 電子書生成器（全新功能）
- ✨ 新增 `/ebook.html` 有聲電子書生成工具，主頁 header 加入入口連結
- ✨ 瀏覽器端 PDF.js 渲染 PDF 每頁為 base64 JPEG（scale 2.0 高解析度）
- ✨ 支援上傳 `.txt` / `.yaml` / `.yml` 大綱，自動對應每頁標題與內文
- ✨ 修正 YAML 解析路徑：同時支援頂層 `slides` 與 `presentation_data.slides`
- ✨ 預覽區顯示縮圖 + 分離可編輯欄位（📌 標題文字 / 📝 內文）
- ✨ 無大綱時支援完全手動填寫 TTS 文字
- ✨ StPageFlip 2.0.7 bundle inline 進輸出 HTML，完全離線可用
- ✨ 單頁翻頁模式（`usePortrait: true`），所有裝置一致
- ✨ 輸出 HTML 響應式：`calcSize()` 維持 16:9 填滿視窗，resize 自動重建
- ✨ TTS 朗讀模式切換：「朗讀標題」開關，可選全文或純內文
- ✨ 速度控制 slider（0.5x ～ 2.0x），即時生效
- ✨ 翻頁自動朗讀 / 手動觸發，鍵盤 ← → 空白鍵支援
- ✨ 電子書編輯器響應式版面：桌機 3 欄、平板 2 欄、手機 1 欄

#### 簡報大綱生成器改進
- ✨ 下載格式從 `.yaml` 改為 `.txt`（NotebookLM 可直接匯入）
- ✨ 下載檔名改用 `suggested_filename` 內容命名，非通用的 `presentation`
- 🔧 修正 YAML 路徑相容性（`presentation_data.suggested_filename`）

#### 品牌
- 🎨 網站標題更名為 **Cyclone Studio - AI 教材製作**

---

### v2.2.0 (2026-02-18) — 單頁佈局改版
- ✨ 4 步驟精靈合併為單頁垂直佈局
- ✨ 42 張卡片選擇器改為 4 個下拉選單（2×2 grid）
- ✨ 生成後自動顯示預覽並 smooth scroll 到位
- 📱 768px 以下自動切換單欄

### v2.1.0 (2026-02-17) — NotebookLM 排版優化 & 編輯器增強
- ✨ 卡片編輯器全面改版：封面 / 內容 / 結尾頁分類，六欄位編輯
- ✨ YAML 格式升級為 `presentation_data` 結構
- ✨ 16 種視覺風格各配備完整色彩配置
- ✨ 新增一鍵複製 YAML + 下載按鈕

### v2.0.0 (2026-02-16) — 編輯器重大改版
- ✨ 新增使用說明彈窗
- ✨ 卡片式大綱編輯器（左右分欄）
- ✨ YAML 即時預覽與複製

### v1.0.0 (2026-02-15) — 初始版本
- 🎉 基礎 AI 生成功能，YAML 匯出，深色主題

---

## 🎯 適用場景

- 👨‍🏫 **教師** — 快速製作課程簡報與有聲教材
- 👔 **企業培訓** — 建立標準化訓練教材
- 🎤 **演講者** — 組織演講大綱與重點
- 📚 **內容創作者** — 將文章轉為簡報或電子書
- 🏫 **學生** — 製作報告、讀書報告有聲版

---

## 🚀 部署指南

### Zeabur 部署（推薦）

1. 推送程式碼到 GitHub
2. 前往 [zeabur.com](https://zeabur.com) 建立專案並連接儲存庫
3. 自動偵測 Dockerfile 並部署，產生免費網域

詳細步驟請參考：[Zeabur 部署指南](docs/DEPLOY-ZEABUR.md)

---

## 📄 授權條款

ISC License © 2026 Cyclone. All rights reserved.

## 🙏 致謝

- [Google Gemini API](https://ai.google.dev/) — AI 生成引擎
- [NotebookLM](https://notebooklm.google.com) — 簡報製作平台
- [StPageFlip](https://github.com/Nodlik/StPageFlip) — 翻頁動畫引擎
- [PDF.js](https://mozilla.github.io/pdf.js/) — 瀏覽器端 PDF 渲染
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML 處理
- [Zeabur](https://zeabur.com) — 部署平台

---

*用 AI 賦能教育，讓每一份教材都精彩。* 🎓✨
