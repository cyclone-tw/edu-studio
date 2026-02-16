# NBLM 簡報生成助手 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個多維度 NBLM YAML 簡報生成器，支援 AI 智慧生成、課文忠實模式、PDF 轉圖片三大功能。

**Architecture:** Node.js + Express 後端提供靜態檔案和 PDF 轉圖片 API。前端純 HTML/CSS/JS，直接呼叫 Gemini API（使用者自帶 Key）。四維度卡片式選擇器 UI，暗色主題。

**Tech Stack:** Node.js, Express, multer, pdf-poppler, archiver, js-yaml (CDN), pdf.js (CDN), Noto Sans TC

---

### Task 1: 專案初始化 + Express 伺服器

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `.gitignore`

**Step 1: 初始化 npm 專案**

Run: `cd /Users/cyclone/VibeCoding開發專案/nblm-gem && npm init -y`

**Step 2: 安裝依賴**

Run: `npm install express multer archiver`

**Step 3: 建立 .gitignore**

```
node_modules/
uploads/
*.zip
.env
.DS_Store
```

**Step 4: 建立 server.js**

```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// PDF API route（Task 8 實作）
// app.use('/api', require('./routes/pdf'));

app.listen(PORT, () => {
  console.log(`NBLM 簡報生成助手 running on port ${PORT}`);
});
```

**Step 5: 建立目錄結構**

Run: `mkdir -p public/css public/js routes`

**Step 6: 測試伺服器啟動**

Run: `node server.js`
Expected: 輸出 `NBLM 簡報生成助手 running on port 3000`

**Step 7: 初始化 git 並提交**

Run:
```bash
git init
git add package.json server.js .gitignore
git commit -m "chore: init project with Express server"
```

---

### Task 2: 預設資料模組（presets.js）

**Files:**
- Create: `public/js/presets.js`

**Step 1: 建立四維度預設資料**

包含完整的 8 種簡報者角色、10 種受眾面向、9 種簡報場景、15 種視覺風格。每個項目含 id、label（含 emoji）、描述文字。

```javascript
const PRESETS = {
  presenterRoles: [
    { id: 'teacher', label: '👨‍🏫 教師', tone: '引導式、循序漸進' },
    { id: 'student', label: '🎓 學生', tone: '展示學習成果、同儕分享' },
    { id: 'researcher', label: '🔬 研究者', tone: '數據驅動、假設驗證' },
    { id: 'consultant', label: '💼 顧問', tone: '問題解決、策略建議' },
    { id: 'storyteller', label: '📖 故事家', tone: '敘事弧線、情感連結' },
    { id: 'trainer', label: '🏋️ 培訓師', tone: '實操演練、技能養成' },
    { id: 'pitch_maker', label: '🚀 提案者', tone: '價值主張、行動呼籲' },
    { id: 'facilitator', label: '🤝 引導師', tone: '問題框架、共創討論' }
  ],
  audienceProfiles: [
    { id: 'elementary', label: '🧒 國小生', traits: '視覺豐富、互動遊戲化、短注意力', category: '教育類' },
    { id: 'middle_school', label: '🧑‍🎓 國中生', traits: '探索好奇、需要明確結構', category: '教育類' },
    { id: 'high_school', label: '📚 高中生', traits: '邏輯思辨、考試導向', category: '教育類' },
    { id: 'college', label: '🎓 大學生', traits: '學術深度、批判思考', category: '教育類' },
    { id: 'special_ed', label: '💛 特教生', traits: '多感官輸入、重複強化、簡化結構', category: '教育類' },
    { id: 'executives', label: '👔 高階主管', traits: '時間有限、只看結論與ROI', category: '職場類' },
    { id: 'team_members', label: '👥 團隊成員', traits: '需要 actionable takeaways', category: '職場類' },
    { id: 'clients', label: '🤝 客戶', traits: '關注價值與信任', category: '職場類' },
    { id: 'general_public', label: '🌍 一般大眾', traits: '淺顯易懂、引人入勝', category: '職場類' },
    { id: 'tech_audience', label: '💻 技術人員', traits: '重視細節、可執行性', category: '職場類' }
  ],
  contexts: [
    { id: 'classroom', label: '🏫 課堂教學' },
    { id: 'workshop', label: '🔧 工作坊' },
    { id: 'keynote', label: '🎤 主題演講' },
    { id: 'team_meeting', label: '📋 團隊會議' },
    { id: 'sales_pitch', label: '💰 銷售提案' },
    { id: 'training', label: '📝 培訓課程' },
    { id: 'conference', label: '🎪 研討會發表' },
    { id: 'parent_meeting', label: '👨‍👩‍👧 家長會' },
    { id: 'iep_meeting', label: '📑 IEP 會議' }
  ],
  visualStyles: [
    { id: 'warm_pro', label: '💼 溫暖專業', css: 'warm' },
    { id: 'minimal_tech', label: '🤖 極簡科技', css: 'tech' },
    { id: 'retro_collage', label: '🎞️ 復古拼貼', css: 'retro' },
    { id: 'hand_drawn', label: '✏️ 溫馨手繪', css: 'sketch' },
    { id: 'q_cute', label: '🧸 Q版可愛', css: 'cute' },
    { id: 'watercolor', label: '🎨 手繪水彩', css: 'watercolor' },
    { id: 'clay_3d', label: '🧱 黏土風', css: 'clay' },
    { id: 'edu_comic', label: '💭 教育漫畫', css: 'comic' },
    { id: 'paper_cut', label: '✂️ 剪紙藝術', css: 'papercut' },
    { id: 'retro_poster', label: '📢 復古海報', css: 'poster' },
    { id: 'infographic', label: '📊 資訊圖表', css: 'infographic' },
    { id: 'magazine', label: '📰 雜誌排版', css: 'magazine' },
    { id: 'neon_dark', label: '🌃 霓虹暗黑', css: 'neon' },
    { id: 'nature_organic', label: '🌿 自然有機', css: 'organic' },
    { id: 'blueprint', label: '📐 藍圖工程', css: 'blueprint' }
  ]
};
```

**Step 2: 提交**

```bash
git add public/js/presets.js
git commit -m "feat: add four-dimension preset data"
```

---

### Task 3: HTML 主頁面骨架

**Files:**
- Create: `public/index.html`

**Step 1: 建立完整 HTML 結構**

包含：
- `<head>`：meta、Noto Sans TC font、js-yaml CDN、pdf.js CDN、styles.css
- Header：標題 `NBLM 簡報生成助手｜Cyclone`
- 模式切換 Tab：AI 智慧生成 / 課文忠實模式 / PDF 轉圖片
- Step 進度條（Step 1-4）
- Step 1 面板：四維度卡片選擇器容器
- Step 2 面板：額外參數（頁數滑桿、語言、互動程度、自訂 prompt）
- Step 3 面板：素材輸入區（文字框 + 檔案上傳）
- Step 4 面板：左右分欄（編輯器 + 預覽）
- PDF 轉圖片面板：上傳區 + 結果下載
- API Key 設定 Modal
- Footer：`© 2026 Cyclone. All rights reserved.`
- Script 標籤引入所有 JS

**Step 2: 驗證**

Run: `node server.js` 然後瀏覽器開 `http://localhost:3000`
Expected: 看到頁面骨架，暗色背景，標題和 footer 顯示正確

**Step 3: 提交**

```bash
git add public/index.html
git commit -m "feat: add main HTML page structure"
```

---

### Task 4: CSS 主題系統 + 樣式

**Files:**
- Create: `public/css/styles.css`

**Step 1: 建立完整 CSS**

包含：
- CSS 變數：暗色主題色板（背景 `#0f0f0f`、卡片 `#1a1a2e`、accent `#00d4aa` 青綠色）
- 全域排版：Noto Sans TC、base font-size、行高
- Header 樣式：品牌標題
- 模式切換 Tab 樣式
- Step 進度條：圓點 + 連線 + active 狀態
- 卡片選擇器：grid 排列、hover 浮起 (`transform: translateY(-4px)`)、選中高亮邊框 (`border-color: var(--accent)`)
- 分類標籤（教育類/職場類）
- 左右分欄佈局（editor pane）
- 滑桿、select、textarea 暗色樣式
- 按鈕樣式（primary、secondary、disabled 狀態）
- Modal 樣式（API Key 設定）
- Loading spinner / 進度提示
- Footer 樣式
- 響應式：`@media (max-width: 768px)` 垂直堆疊 + 卡片橫向滾動

**Step 2: 驗證**

Run: 重新載入 `http://localhost:3000`
Expected: 暗色主題、青綠 accent、卡片排列正確、手機版 responsive

**Step 3: 提交**

```bash
git add public/css/styles.css
git commit -m "feat: add dark theme CSS with card selectors"
```

---

### Task 5: 前端主邏輯（app.js）

**Files:**
- Create: `public/js/app.js`

**Step 1: 實作核心邏輯**

功能包含：
- **模式切換**：三個 tab（AI 智慧生成 / 課文忠實模式 / PDF 轉圖片）切換顯示對應面板
- **Step 流程控制**：上一步/下一步按鈕、進度條更新、步驟驗證（必須選完維度才能下一步）
- **卡片選擇器渲染**：讀取 `PRESETS` 資料動態生成卡片 DOM，綁定 click 事件切換 selected 狀態
- **額外參數綁定**：頁數滑桿即時顯示數值、語言 select、互動程度 radio
- **API Key 管理**：存取 localStorage、Modal 開關
- **狀態管理**：一個 `state` 物件追蹤所有選擇

```javascript
const state = {
  mode: 'ai',           // 'ai' | 'textbook' | 'pdf'
  step: 1,
  presenterRole: null,
  audience: null,
  context: null,
  visualStyle: null,
  slideCount: 12,
  language: 'zh-TW',
  interactionLevel: 'medium',
  customPrompt: '',
  apiKey: localStorage.getItem('gemini_api_key') || ''
};
```

**Step 2: 驗證**

Expected: 點擊卡片可選擇、切換步驟、滑桿正常運作、API Key 可存取

**Step 3: 提交**

```bash
git add public/js/app.js
git commit -m "feat: add main app logic with step flow and card selectors"
```

---

### Task 6: Gemini API 整合（gemini.js）

**Files:**
- Create: `public/js/gemini.js`

**Step 1: 實作 Gemini API 呼叫模組**

兩個核心函數：

**`generatePresentation(materials, state)`** — AI 智慧生成模式
- 組裝 system prompt（含四維度、頁數、互動程度等參數）
- 呼叫 `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- 要求 Gemini 輸出符合 YAML 規格的 JSON
- 解析回應、處理錯誤

**`splitTextbook(text, slideCount, state)`** — 課文忠實模式
- Prompt 要求：「將課文一字不改地分配到 N 張投影片」
- 強調原文一字不漏
- 回傳每頁對應的文字段落

Prompt 模板：

```javascript
// AI 智慧生成 prompt
const AI_SYSTEM_PROMPT = `你是一位專業的簡報架構師。請根據以下條件，將使用者提供的素材「原子化」拆解為知識單元，並重組為結構化的簡報大綱。

【簡報者角色】{presenterRole}
【目標受眾】{audience}
【簡報場景】{context}
【視覺風格】{visualStyle}
【頁數限制】{slideCount} 頁
【互動程度】{interactionLevel}
{customPrompt}

請輸出 JSON 格式（不是 YAML），結構如下：
{schema}

重要原則：
1. 每頁只講一個核心概念
2. 視覺指令必須具體可執行
3. 針對受眾調整用語難度和互動方式
4. 每 3-4 頁穿插一個互動環節
5. speaker_notes 要完整到可以直接當講稿`;

// 課文忠實模式 prompt
const TEXTBOOK_PROMPT = `你是一位簡報分段專家。請將以下課文依照段落邏輯，分配到 {slideCount} 張投影片中。

嚴格規則：
1. 課文原文「一字不改」「一字不漏」
2. 根據段落、語意斷點合理分配
3. 每頁的文字量盡量均勻
4. 輸出 JSON 陣列，每個元素代表一頁的文字內容

課文內容：
{text}`;
```

**Step 2: 驗證**

Expected: 填入 API Key 後，可呼叫 Gemini 並取得回應（在 console 印出）

**Step 3: 提交**

```bash
git add public/js/gemini.js
git commit -m "feat: add Gemini API integration for AI and textbook modes"
```

---

### Task 7: YAML 引擎 + 編輯器（yaml-engine.js + editor.js）

**Files:**
- Create: `public/js/yaml-engine.js`
- Create: `public/js/editor.js`

**Step 1: 實作 YAML 生成引擎**

`yaml-engine.js`：
- `buildYaml(geminiResponse, state)` — 將 Gemini 回傳的 JSON 組裝成完整 YAML 結構（含 metadata、presentation_strategy、slides、appendix）
- `buildTextbookYaml(segments, state)` — 課文模式專用，將分段結果塞入 YAML（原文不改）
- `downloadYaml(yamlString, filename)` — 觸發瀏覽器下載 .yaml 檔
- 使用 `js-yaml`（CDN 引入）的 `jsyaml.dump()` 生成

**Step 2: 實作編輯器**

`editor.js`：
- 左側：`<textarea>` 顯示生成的 YAML，可手動編輯
- 右側：即時預覽，解析 YAML 渲染為卡片式簡報大綱
- 監聽 textarea 的 `input` 事件，即時更新預覽
- 下載按鈕：匯出 .yaml 檔 + .md 大綱

**Step 3: 驗證**

Expected: 生成後可看到左右分欄，左側可編輯 YAML，右側即時預覽，可下載 .yaml

**Step 4: 提交**

```bash
git add public/js/yaml-engine.js public/js/editor.js
git commit -m "feat: add YAML engine and split-pane editor"
```

---

### Task 8: PDF 轉圖片後端 API

**Files:**
- Create: `routes/pdf.js`
- Modify: `server.js` — 啟用 PDF route

**Step 1: 安裝 PDF 轉圖片依賴**

Run: `npm install pdf-poppler`

> 注意：`pdf-poppler` 需要系統安裝 poppler。若 Zeabur 環境沒有，備選方案用 `pdf2pic` 或 `canvas` + `pdfjs-dist`。

備選方案（不依賴系統套件）：
Run: `npm install pdfjs-dist canvas`

**Step 2: 實作 PDF route**

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('只接受 PDF 檔案'));
  }
});

router.post('/pdf-to-images', upload.single('file'), async (req, res) => {
  // 1. 讀取 PDF
  // 2. 逐頁轉為 PNG（使用 pdfjs-dist + canvas）
  // 3. 用 archiver 打包成 ZIP
  // 4. 串流回應 ZIP
  // 5. 清理暫存檔
});

module.exports = router;
```

**Step 3: 在 server.js 啟用 route**

取消註解：`app.use('/api', require('./routes/pdf'));`

加入 uploads 目錄建立：
```javascript
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
```

**Step 4: 驗證**

Run: `curl -X POST -F "file=@test.pdf" http://localhost:3000/api/pdf-to-images --output result.zip`
Expected: 收到 ZIP 檔，解壓後有 slide-01.png, slide-02.png 等

**Step 5: 提交**

```bash
git add routes/pdf.js server.js package.json package-lock.json
git commit -m "feat: add PDF to PNG conversion API"
```

---

### Task 9: PDF 轉圖片前端 UI（pdf-splitter.js）

**Files:**
- Create: `public/js/pdf-splitter.js`

**Step 1: 實作前端 PDF 上傳和下載**

功能：
- 拖曳上傳區域（drag & drop）
- 檔案選擇按鈕
- 上傳進度條
- 完成後自動觸發 ZIP 下載
- 錯誤提示（檔案太大、格式錯誤等）

```javascript
async function uploadPdfForSplit(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/pdf-to-images', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('轉換失敗');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name.replace('.pdf', '')}-slides.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: 驗證**

Expected: 上傳 PDF 後自動下載 ZIP，內含每頁 PNG

**Step 3: 提交**

```bash
git add public/js/pdf-splitter.js
git commit -m "feat: add PDF splitter frontend with drag-and-drop"
```

---

### Task 10: 整合測試 + 錯誤處理

**Files:**
- Modify: `public/js/app.js` — 加入全域錯誤處理
- Modify: `public/js/gemini.js` — API 錯誤處理
- Modify: `public/index.html` — Toast 通知元件

**Step 1: 加入 Toast 通知系統**

在 `index.html` 加入 toast container，在 `app.js` 加入 `showToast(message, type)` 函數。
type: 'success' | 'error' | 'info'

**Step 2: 加入 Gemini API 錯誤處理**

- API Key 未設定 → 提示設定
- API 呼叫失敗 → 顯示錯誤訊息
- 回應格式解析失敗 → 顯示原始回應讓使用者重試
- Loading 狀態：生成中顯示 spinner + 禁用按鈕

**Step 3: 加入 PDF 上傳錯誤處理**

- 非 PDF 檔案 → 提示格式錯誤
- 檔案過大 → 提示大小限制
- 伺服器錯誤 → 顯示重試按鈕

**Step 4: 端對端驗證**

測試完整流程：
1. 設定 API Key
2. 選擇四維度
3. 輸入文字素材
4. 生成 YAML → 預覽 → 下載
5. 課文模式：貼上課文 → 生成 → 驗證原文完整
6. PDF 轉圖片：上傳 → 下載 ZIP

**Step 5: 提交**

```bash
git add -A
git commit -m "feat: add error handling and toast notifications"
```

---

### Task 11: Zeabur 部署設定

**Files:**
- Create: `Dockerfile`
- Modify: `package.json` — 加入 start script

**Step 1: 加入 start script**

在 `package.json` 的 `scripts` 加入：
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

**Step 2: 建立 Dockerfile**

```dockerfile
FROM node:20-slim

# 安裝 poppler（PDF 轉圖片需要，若用 pdfjs-dist+canvas 則不需要）
# RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

**Step 3: 本地測試 Docker build**

Run: `docker build -t nblm-gem . && docker run -p 3000:3000 nblm-gem`
Expected: 可在 `http://localhost:3000` 正常使用

**Step 4: 提交**

```bash
git add Dockerfile package.json
git commit -m "chore: add Dockerfile for Zeabur deployment"
```

---

## 任務依賴圖

```
Task 1 (專案初始化)
  ├── Task 2 (presets.js)
  ├── Task 3 (index.html) ── Task 4 (styles.css)
  │                      └── Task 5 (app.js)
  │                            ├── Task 6 (gemini.js)
  │                            ├── Task 7 (yaml + editor)
  │                            └── Task 9 (pdf-splitter.js)
  └── Task 8 (PDF API backend)

Task 10 (整合測試) ── depends on all above
Task 11 (部署) ── depends on Task 10
```

## 預估時間

共 11 個 Task，每個 Task 含 3-5 個 Step。
