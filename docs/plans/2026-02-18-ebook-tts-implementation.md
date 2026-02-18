# Ebook TTS Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增電子書生成工具，讓使用者上傳 PDF + 選填 YAML，在瀏覽器端生成含翻頁動畫與 TTS 的自給自足 HTML 檔案。

**Architecture:** 純前端，無後端改動。PDF.js 在瀏覽器渲染 PDF 每頁為 base64 PNG；js-yaml 解析 YAML 萃取文字；StPageFlip 函式庫 inline 進輸出 HTML；Web Speech API 提供 TTS，設計成可插拔。

**Tech Stack:** Vanilla JS、PDF.js (CDN)、js-yaml (CDN)、StPageFlip (本地 bundle inline)、Web Speech API

---

## Task 1: 下載 StPageFlip Bundle

**Files:**
- Create: `public/js/page-flip.browser.js`

**Step 1: 從 npm registry 下載 browser bundle**

```bash
curl -L "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js" \
  -o public/js/page-flip.browser.js
```

**Step 2: 驗證檔案存在且非空**

```bash
wc -c public/js/page-flip.browser.js
# 預期：> 40000 bytes
head -c 100 public/js/page-flip.browser.js
# 預期：開頭看到 !function 或 (function 等 JS bundle 格式
```

**Step 3: 驗證 St 全域物件可用（在瀏覽器 console 測試）**

在任何頁面的 DevTools console 執行：
```javascript
// 手動貼入 page-flip.browser.js 的前幾行確認無語法錯誤
// 或在後面步驟的 ebook.html 完成後測試
```

**Step 4: Commit**

```bash
git add public/js/page-flip.browser.js
git commit -m "feat: add StPageFlip browser bundle for ebook feature"
```

---

## Task 2: 建立 ebook.html 骨架

**Files:**
- Create: `public/ebook.html`

**Step 1: 建立 HTML 骨架**

建立 `public/ebook.html`，內容如下：

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>電子書生成工具｜Cyclone</title>
  <link rel="icon" type="image/png" href="dragon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">

  <!-- PDF.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs" type="module" id="pdfjs-script"></script>

  <!-- js-yaml CDN -->
  <script src="https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js"></script>

  <!-- 共用樣式 -->
  <link rel="stylesheet" href="css/styles.css">
  <style>
    /* ebook 工具專用樣式 */
    .ebook-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    .tool-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .tool-header h1 {
      font-size: 1.8rem;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }
    .tool-header p {
      color: var(--text-secondary);
    }
    .upload-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 600px) {
      .upload-section { grid-template-columns: 1fr; }
    }
    .upload-card {
      background: var(--bg-card);
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      text-align: center;
      transition: border-color var(--transition);
    }
    .upload-card.required { border-color: var(--accent); }
    .upload-card h3 {
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    .upload-card p {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .upload-card input[type="file"] { display: none; }
    .upload-btn {
      display: inline-block;
      padding: 0.5rem 1.2rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.9rem;
      transition: all var(--transition);
    }
    .upload-btn:hover { border-color: var(--accent); color: var(--accent); }
    .upload-status {
      margin-top: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .upload-status.success { color: var(--success); }
    .upload-status.error { color: var(--danger); }
    .settings-section {
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .settings-section h3 {
      margin-bottom: 1rem;
      color: var(--accent);
    }
    .setting-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .setting-row label {
      min-width: 120px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .setting-row input[type="text"],
    .setting-row select {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.5rem 0.75rem;
      color: var(--text-primary);
      font-family: var(--font);
      font-size: 0.9rem;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .toggle-row label { min-width: 120px; color: var(--text-secondary); font-size: 0.9rem; }
    .toggle {
      position: relative;
      width: 48px;
      height: 26px;
    }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      inset: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 13px;
      cursor: pointer;
      transition: background var(--transition);
    }
    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
      left: 3px; top: 3px;
      background: var(--text-secondary);
      border-radius: 50%;
      transition: all var(--transition);
    }
    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider::before {
      background: white;
      transform: translateX(22px);
    }
    .preview-section {
      margin-bottom: 2rem;
    }
    .preview-section h3 {
      color: var(--accent);
      margin-bottom: 1rem;
    }
    .preview-empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 3rem;
      background: var(--bg-card);
      border-radius: var(--radius);
    }
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .page-card {
      background: var(--bg-card);
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .page-thumbnail {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      display: block;
      background: #111;
    }
    .page-card-body {
      padding: 0.75rem;
    }
    .page-num {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.4rem;
    }
    .page-text-input {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.5rem;
      color: var(--text-primary);
      font-family: var(--font);
      font-size: 0.8rem;
      resize: vertical;
      min-height: 60px;
    }
    .generate-section {
      text-align: center;
      padding: 1rem;
    }
    .generate-btn {
      padding: 0.9rem 2.5rem;
      background: var(--accent);
      color: #000;
      border: none;
      border-radius: var(--radius);
      font-family: var(--font);
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all var(--transition);
    }
    .generate-btn:hover { background: var(--accent-hover); transform: translateY(-2px); }
    .generate-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .progress-bar {
      width: 100%;
      max-width: 400px;
      margin: 1rem auto 0;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
      display: none;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      width: 0%;
      transition: width 0.3s ease;
    }
    .nav-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
      transition: color var(--transition);
    }
    .nav-back:hover { color: var(--accent); }
  </style>
</head>
<body>
  <div class="ebook-container">

    <a href="/" class="nav-back">← 返回簡報生成助手</a>

    <div class="tool-header">
      <h1>📖 電子書生成工具</h1>
      <p>上傳 NotebookLM 產出的 PDF 簡報，生成含翻頁動畫與語音朗讀的電子書</p>
    </div>

    <!-- Step 1: 上傳 -->
    <div class="upload-section">
      <div class="upload-card required">
        <h3>📄 PDF 簡報 <span style="color:var(--danger)">*</span></h3>
        <p>NotebookLM 產出的 PDF 檔案</p>
        <label class="upload-btn" for="pdf-input">選擇 PDF</label>
        <input type="file" id="pdf-input" accept=".pdf">
        <div class="upload-status" id="pdf-status">尚未選擇檔案</div>
      </div>
      <div class="upload-card">
        <h3>📋 YAML 大綱 <span style="color:var(--text-secondary)">(選填)</span></h3>
        <p>用於自動填入每頁語音文字</p>
        <label class="upload-btn" for="yaml-input">選擇 YAML</label>
        <input type="file" id="yaml-input" accept=".yaml,.yml">
        <div class="upload-status" id="yaml-status">尚未選擇（語音文字需手動填寫）</div>
      </div>
    </div>

    <!-- Step 2: 設定 -->
    <div class="settings-section">
      <h3>⚙️ 電子書設定</h3>
      <div class="setting-row">
        <label>書名</label>
        <input type="text" id="book-title" placeholder="我的電子書" value="我的電子書">
      </div>
      <div class="setting-row">
        <label>語音語言</label>
        <select id="tts-lang">
          <option value="zh-TW">繁體中文（zh-TW）</option>
          <option value="zh-CN">簡體中文（zh-CN）</option>
          <option value="en-US">English（en-US）</option>
          <option value="ja-JP">日本語（ja-JP）</option>
        </select>
      </div>
      <div class="toggle-row">
        <label>翻頁自動朗讀</label>
        <label class="toggle">
          <input type="checkbox" id="auto-play">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Step 3: 預覽 + 編輯 TTS 文字 -->
    <div class="preview-section">
      <h3>📝 頁面預覽 & 語音文字</h3>
      <div class="preview-empty" id="preview-empty">
        上傳 PDF 後，頁面縮圖會顯示在這裡
      </div>
      <div class="preview-grid" id="preview-grid" style="display:none"></div>
    </div>

    <!-- Step 4: 生成 -->
    <div class="generate-section">
      <button class="generate-btn" id="generate-btn" disabled>
        ⬇️ 生成並下載電子書 HTML
      </button>
      <div class="progress-bar" id="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
    </div>

  </div>

  <script type="module" src="js/ebook-generator.js"></script>
</body>
</html>
```

**Step 2: 在瀏覽器開啟 http://localhost:3000/ebook.html 確認**

- 頁面能正常載入（暗色主題一致）
- 兩個上傳區、設定區、預覽區、按鈕都顯示正確
- 按鈕為 disabled 狀態

**Step 3: Commit**

```bash
git add public/ebook.html
git commit -m "feat: add ebook generator HTML skeleton"
```

---

## Task 3: 實作 PDF 載入與渲染（ebook-generator.js）

**Files:**
- Create: `public/js/ebook-generator.js`

**Step 1: 建立 ebook-generator.js，實作 PDF 載入**

建立 `public/js/ebook-generator.js`：

```javascript
// ebook-generator.js — 電子書生成工具主邏輯
// 使用 ES Module 語法（ebook.html 以 type="module" 載入）

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

// ── 狀態 ──────────────────────────────────────────────────────────────
const state = {
  pages: [],      // [{ img: 'data:image/png;base64,...', text: '' }]
  slideTexts: [], // 從 YAML 解析出的文字，按頁碼排列
};

// ── DOM 元素 ──────────────────────────────────────────────────────────
const pdfInput      = document.getElementById('pdf-input');
const yamlInput     = document.getElementById('yaml-input');
const pdfStatus     = document.getElementById('pdf-status');
const yamlStatus    = document.getElementById('yaml-status');
const previewEmpty  = document.getElementById('preview-empty');
const previewGrid   = document.getElementById('preview-grid');
const generateBtn   = document.getElementById('generate-btn');
const progressBar   = document.getElementById('progress-bar');
const progressFill  = document.getElementById('progress-fill');

// ── PDF 載入 ──────────────────────────────────────────────────────────
pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pdfStatus.textContent = '載入中...';
  pdfStatus.className = 'upload-status';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    pdfStatus.textContent = `✓ ${file.name}（共 ${totalPages} 頁）`;
    pdfStatus.className = 'upload-status success';

    progressBar.style.display = 'block';
    state.pages = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 高解析度

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
      }).promise;

      const base64 = canvas.toDataURL('image/jpeg', 0.85); // JPEG 壓縮，平衡品質/大小
      const text = state.slideTexts[i - 1] || ''; // 若有 YAML 就帶入

      state.pages.push({ img: base64, text });

      // 更新進度
      const pct = Math.round((i / totalPages) * 100);
      progressFill.style.width = `${pct}%`;
    }

    progressBar.style.display = 'none';
    progressFill.style.width = '0%';

    renderPreview();
    generateBtn.disabled = false;

  } catch (err) {
    pdfStatus.textContent = `✗ 載入失敗：${err.message}`;
    pdfStatus.className = 'upload-status error';
    console.error('[ebook] PDF load error:', err);
  }
});
```

**Step 2: 在瀏覽器測試 PDF 載入**

1. 啟動伺服器：`node server.js`
2. 開啟 http://localhost:3000/ebook.html
3. 上傳任意 PDF 檔案
4. DevTools console 不應有錯誤
5. pdfStatus 應顯示「✓ filename.pdf（共 N 頁）」
6. 進度條應出現後消失

**Step 3: Commit**

```bash
git add public/js/ebook-generator.js
git commit -m "feat: implement PDF loading and rendering with PDF.js"
```

---

## Task 4: 實作 YAML 解析與文字對應

**Files:**
- Modify: `public/js/ebook-generator.js`

**Step 1: 新增 YAML 解析邏輯（append 到 ebook-generator.js）**

```javascript
// ── YAML 解析 ─────────────────────────────────────────────────────────
yamlInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  yamlStatus.textContent = '解析中...';
  yamlStatus.className = 'upload-status';

  try {
    const text = await file.text();
    const doc = jsyaml.load(text);

    if (!doc?.slides || !Array.isArray(doc.slides)) {
      throw new Error('找不到 slides 陣列，請確認 YAML 格式');
    }

    // 依 slide_number 排序，組合 TTS 文字
    const sorted = [...doc.slides].sort(
      (a, b) => (a.slide_number || 0) - (b.slide_number || 0)
    );

    state.slideTexts = sorted.map((slide) => {
      const parts = [
        slide.title,
        slide.subtitle,
        slide.content,
        slide.body,
      ].filter(Boolean);
      return parts.join('。');
    });

    yamlStatus.textContent = `✓ 已載入 ${state.slideTexts.length} 頁文字`;
    yamlStatus.className = 'upload-status success';

    // 若 PDF 已載入，更新每頁文字
    if (state.pages.length > 0) {
      state.pages.forEach((page, i) => {
        if (!page.text) page.text = state.slideTexts[i] || '';
      });
      renderPreview();
    }

  } catch (err) {
    yamlStatus.textContent = `✗ 解析失敗：${err.message}`;
    yamlStatus.className = 'upload-status error';
    console.error('[ebook] YAML parse error:', err);
  }
});
```

**Step 2: 驗證 YAML 解析**

在 DevTools console 貼入（使用現有 YAML 格式測試）：
```javascript
// 測試 YAML 含 slides 陣列時可正確解析
const testYaml = `
slides:
  - slide_number: 1
    title: 測試標題
    subtitle: 副標題
    content: 內文文字
`;
const doc = jsyaml.load(testYaml);
console.assert(doc.slides.length === 1, 'should have 1 slide');
console.assert(doc.slides[0].title === '測試標題', 'title should match');
```

**Step 3: Commit**

```bash
git add public/js/ebook-generator.js
git commit -m "feat: implement YAML parsing and text extraction for TTS"
```

---

## Task 5: 實作頁面預覽 UI

**Files:**
- Modify: `public/js/ebook-generator.js`

**Step 1: 新增 renderPreview 函式**

```javascript
// ── 預覽渲染 ──────────────────────────────────────────────────────────
function renderPreview() {
  previewEmpty.style.display = 'none';
  previewGrid.style.display  = 'grid';
  previewGrid.innerHTML = '';

  state.pages.forEach((page, i) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    const img = document.createElement('img');
    img.className = 'page-thumbnail';
    img.src = page.img;
    img.alt = `第 ${i + 1} 頁`;

    const body = document.createElement('div');
    body.className = 'page-card-body';

    const num = document.createElement('div');
    num.className = 'page-num';
    num.textContent = `第 ${i + 1} 頁`;

    const textarea = document.createElement('textarea');
    textarea.className = 'page-text-input';
    textarea.placeholder = '輸入此頁的語音朗讀文字...';
    textarea.value = page.text;
    textarea.addEventListener('input', () => {
      state.pages[i].text = textarea.value;
    });

    body.appendChild(num);
    body.appendChild(textarea);
    card.appendChild(img);
    card.appendChild(body);
    previewGrid.appendChild(card);
  });
}
```

**Step 2: 視覺驗證**

1. 上傳 PDF 後確認縮圖網格顯示
2. 若有上傳 YAML，確認 textarea 已預填文字
3. 修改 textarea 文字，確認 `state.pages[i].text` 即時更新（DevTools: `state.pages[0].text`）

**Step 3: Commit**

```bash
git add public/js/ebook-generator.js
git commit -m "feat: add page preview grid with editable TTS text fields"
```

---

## Task 6: 實作 HTML 組裝器

**Files:**
- Modify: `public/js/ebook-generator.js`

**Step 1: 新增 assembleHTML 函式**

這是核心函式，生成完整的自給自足 HTML：

```javascript
// ── HTML 組裝 ─────────────────────────────────────────────────────────
async function assembleHTML() {
  // 讀取 StPageFlip bundle（從本地伺服器）
  const libRes = await fetch('/js/page-flip.browser.js');
  if (!libRes.ok) throw new Error('無法載入 page-flip.browser.js');
  const pageFlipLib = await libRes.text();

  const title    = document.getElementById('book-title').value.trim() || '我的電子書';
  const lang     = document.getElementById('tts-lang').value;
  const autoPlay = document.getElementById('auto-play').checked;

  // 安全地跳脫 HTML 特殊字元（防止 XSS）
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 組裝每頁資料（JSON 格式，嵌入 HTML）
  const pagesJSON = JSON.stringify(
    state.pages.map((p) => ({ img: p.img, text: p.text || '' }))
  );

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
      background: #0a0a0f;
      color: #e8e8e8;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1.book-title {
      padding: 1rem;
      font-size: 1.2rem;
      color: #00d4aa;
      text-align: center;
    }
    #controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #14141f;
      border-radius: 12px;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .ctrl-btn {
      padding: 0.45rem 1rem;
      background: #1a1a2e;
      border: 1px solid #2a2a3e;
      border-radius: 8px;
      color: #e8e8e8;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .ctrl-btn:hover { border-color: #00d4aa; color: #00d4aa; }
    .ctrl-btn.active { background: #00d4aa; color: #000; border-color: #00d4aa; }
    #page-info { color: #a0a0b0; font-size: 0.9rem; }
    #book-container {
      width: 100%;
      max-width: 1200px;
      display: flex;
      justify-content: center;
      padding: 0 1rem 2rem;
    }
    #book { margin: 0 auto; }
    #tts-text-display {
      max-width: 700px;
      margin: 1rem auto;
      padding: 0.75rem 1.25rem;
      background: #14141f;
      border-left: 3px solid #00d4aa;
      border-radius: 0 8px 8px 0;
      color: #a0a0b0;
      font-size: 0.9rem;
      line-height: 1.6;
      min-height: 2.5rem;
    }
    .auto-play-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #a0a0b0;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1 class="book-title">${esc(title)}</h1>

  <div id="controls">
    <button class="ctrl-btn" id="btn-prev">◀ 上一頁</button>
    <span id="page-info">1 / ${state.pages.length}</span>
    <button class="ctrl-btn" id="btn-next">下一頁 ▶</button>
    <button class="ctrl-btn" id="btn-tts">▶ 朗讀此頁</button>
    <button class="ctrl-btn" id="btn-stop" style="display:none">■ 停止</button>
    <label class="auto-play-label">
      <input type="checkbox" id="chk-auto" ${autoPlay ? 'checked' : ''}>
      翻頁自動朗讀
    </label>
  </div>

  <div id="tts-text-display">—</div>

  <div id="book-container">
    <div id="book"></div>
  </div>

  <script>
/* ====== StPageFlip ====== */
${pageFlipLib}
  </script>
  <script>
/* ====== Book Data ====== */
const PAGES = ${pagesJSON};
const TTS_LANG = ${JSON.stringify(lang)};

/* ====== TTS (Web Speech API — pluggable) ====== */
const tts = {
  provider: 'webSpeech',
  speak(text) {
    if (!text) return;
    this.stop();
    if (this.provider === 'webSpeech') {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = TTS_LANG;
      utt.onstart = () => {
        btnStop.style.display = '';
        btnTts.style.display  = 'none';
      };
      utt.onend = utt.onerror = () => {
        btnStop.style.display = 'none';
        btnTts.style.display  = '';
      };
      speechSynthesis.speak(utt);
    }
  },
  stop() {
    speechSynthesis.cancel();
    btnStop.style.display = 'none';
    btnTts.style.display  = '';
  },
};

/* ====== Flip Book Init ====== */
const bookEl   = document.getElementById('book');
const pageInfo = document.getElementById('page-info');
const ttsDisplay = document.getElementById('tts-text-display');
const btnPrev  = document.getElementById('btn-prev');
const btnNext  = document.getElementById('btn-next');
const btnTts   = document.getElementById('btn-tts');
const btnStop  = document.getElementById('btn-stop');
const chkAuto  = document.getElementById('chk-auto');

// 計算合適的書本尺寸（響應式）
const containerW = Math.min(window.innerWidth - 32, 1100);
const pageW = Math.floor(containerW / 2);
const pageH = Math.round(pageW * (9 / 16));

const pageFlip = new St.PageFlip(bookEl, {
  width: pageW,
  height: pageH,
  size: 'fixed',
  showCover: false,
  flippingTime: 600,
  usePortrait: window.innerWidth < 600,
});

// 將 base64 圖片包成 img 元素
const imgEls = PAGES.map((p, i) => {
  const div = document.createElement('div');
  div.style.cssText = 'width:100%;height:100%;overflow:hidden;';
  const img = document.createElement('img');
  img.src = p.img;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
  img.alt = '第' + (i + 1) + '頁';
  div.appendChild(img);
  bookEl.appendChild(div);
  return div;
});

pageFlip.loadFromHTML(bookEl.querySelectorAll('div'));

function updateUI(pageIdx) {
  const total = PAGES.length;
  pageInfo.textContent = (pageIdx + 1) + ' / ' + total;
  const text = PAGES[pageIdx]?.text || '';
  ttsDisplay.textContent = text || '（此頁無語音文字）';
  if (chkAuto.checked && text) tts.speak(text);
}

pageFlip.on('flip', (e) => {
  tts.stop();
  updateUI(e.data);
});

updateUI(0);

btnPrev.addEventListener('click', () => { tts.stop(); pageFlip.flipPrev(); });
btnNext.addEventListener('click', () => { tts.stop(); pageFlip.flipNext(); });
btnTts.addEventListener('click', () => tts.speak(PAGES[pageFlip.getCurrentPageIndex()]?.text || ''));
btnStop.addEventListener('click', () => tts.stop());

// 鍵盤支援
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') btnNext.click();
  if (e.key === 'ArrowLeft')  btnPrev.click();
  if (e.key === ' ')          btnTts.click();
});
  </script>
</body>
</html>`;
}
```

**Step 2: Commit**

```bash
git add public/js/ebook-generator.js
git commit -m "feat: implement HTML assembler with StPageFlip inline and TTS logic"
```

---

## Task 7: 實作生成按鈕與下載

**Files:**
- Modify: `public/js/ebook-generator.js`

**Step 1: 新增下載邏輯**

```javascript
// ── 下載 HTML ─────────────────────────────────────────────────────────
function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── 生成按鈕 ──────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (state.pages.length === 0) return;

  generateBtn.disabled    = true;
  generateBtn.textContent = '⏳ 生成中...';
  progressBar.style.display = 'block';
  progressFill.style.width  = '50%';

  try {
    const html = await assembleHTML();
    progressFill.style.width = '100%';

    const title    = document.getElementById('book-title').value.trim() || '我的電子書';
    const filename = title.replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';
    downloadHTML(html, filename);

  } catch (err) {
    alert(`生成失敗：${err.message}`);
    console.error('[ebook] generate error:', err);
  } finally {
    generateBtn.disabled    = false;
    generateBtn.textContent = '⬇️ 生成並下載電子書 HTML';
    progressBar.style.display = 'none';
    progressFill.style.width  = '0%';
  }
});
```

**Step 2: 端對端測試**

1. 上傳 PDF → 確認縮圖顯示、按鈕 enabled
2. 點擊「生成並下載電子書 HTML」
3. 開啟下載的 HTML 檔案（用瀏覽器直接開）
4. 確認：
   - 翻頁動畫正常（點擊左右邊緣或使用按鈕）
   - ← → 鍵盤翻頁可用
   - 「朗讀此頁」按鈕可播放語音（需允許網頁 TTS）
   - 自動朗讀 checkbox 開啟後翻頁自動播放
   - 頁碼顯示正確

**Step 3: Commit**

```bash
git add public/js/ebook-generator.js
git commit -m "feat: add generate button, HTML download, and keyboard navigation"
```

---

## Task 8: 在主頁加入電子書工具入口

**Files:**
- Modify: `public/index.html`

**Step 1: 在 index.html 的 header 加入連結**

在 `public/index.html` 中找到 `<header>` 區塊，加入工具連結。
找到 header-brand 之後加入：

```html
<a href="/ebook.html" class="ebook-link" title="電子書生成工具">
  📖 電子書工具
</a>
```

並在 `css/styles.css` 加入樣式：

```css
.ebook-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: all var(--transition);
}
.ebook-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}
```

**Step 2: 驗證**

1. 開啟 http://localhost:3000 確認連結顯示
2. 點擊連結確認跳轉到 /ebook.html

**Step 3: Commit**

```bash
git add public/index.html public/css/styles.css
git commit -m "feat: add ebook tool entry link in main header"
```

---

## Task 9: 完整 E2E 測試 checklist

**無需寫程式碼，純手動驗證**

用一份真實的 NBLM 輸出 PDF（和對應 YAML）測試完整流程：

```
□ 上傳 PDF → 進度條出現 → 縮圖顯示
□ 上傳 YAML → 每頁 textarea 自動填入文字
□ 手動修改某頁 textarea 文字
□ 設定書名、語言
□ 開啟「翻頁自動朗讀」
□ 點擊生成 → 下載 HTML 檔案
□ 在瀏覽器開啟 HTML（離線環境測試）：
  □ 翻頁動畫流暢
  □ 頁碼顯示正確
  □ 朗讀按鈕可用
  □ 翻頁自動朗讀（若開啟）
  □ 鍵盤 ← → 翻頁
  □ TTS 文字顯示在下方
□ 嘗試不上傳 YAML，只上傳 PDF → textarea 空白，可手動填
□ 上傳非 PDF 檔案 → 顯示錯誤訊息
□ 上傳格式錯誤的 YAML → 顯示錯誤訊息
```

---

## 注意事項

- PDF.js 版本固定為 `4.9.155`，避免 API 變動
- StPageFlip `loadFromHTML` 需要 DOM 元素已插入文件，確保 `bookEl.appendChild(div)` 在 `loadFromHTML` 之前執行
- 生成的 HTML 圖片使用 JPEG 壓縮（85%），20 頁 PDF 約 3-8MB
- Web Speech API 在部分 iframe 環境（如 Notion embed）可能受限，這是瀏覽器安全政策，無法繞過
- `fetch('/js/page-flip.browser.js')` 需要從 HTTP 伺服器存取，`file://` 協定會 CORS 失敗（但正常從 Zeabur 部署時沒問題）
