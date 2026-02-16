# 編輯器改版 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 改版 NBLM 簡報生成助手的編輯器介面，新增使用說明彈窗、卡片式大綱編輯器、YAML 即時預覽、NotebookLM 整合功能。

**Architecture:** 採用模組化設計，新增 outline-editor.js 模組處理卡片編輯器邏輯。使用防抖動機制（300ms）實現左側編輯、右側即時更新的體驗。使用現有 CSS 變數保持視覺一致性。

**Tech Stack:** Vanilla JavaScript (ES5)、js-yaml、現有的 Toast 系統、Clipboard API

---

## Task 1: 新增使用說明彈窗 HTML 結構

**Files:**
- Modify: `public/index.html`

**Step 1: 在 header 新增「使用說明」按鈕**

在 `<header>` 中，API 設定按鈕旁邊新增使用說明按鈕：

```html
<!-- 在 btnOpenApiKey 按鈕後方新增 -->
<button class="btn btn-secondary" id="btnOpenHelp" type="button">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
  使用說明
</button>
```

**Step 2: 在 body 結尾前新增彈窗 HTML**

在 `</body>` 前新增完整的使用說明彈窗結構：

```html
<!-- 使用說明彈窗 -->
<div class="modal hidden" id="helpModal">
  <div class="modal-content help-modal-content">
    <div class="modal-header">
      <h2>📖 使用說明</h2>
      <button class="btn-close" id="btnCloseHelp" type="button">&times;</button>
    </div>
    <div class="modal-body">
      <!-- 四步驟流程圖 -->
      <section class="help-section">
        <h3>🎯 使用流程</h3>
        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-icon">📤</div>
            <div class="help-step-title">1. 上傳素材</div>
          </div>
          <div class="help-step-arrow">→</div>
          <div class="help-step">
            <div class="help-step-icon">⚗️</div>
            <div class="help-step-title">2. 生成結構</div>
          </div>
          <div class="help-step-arrow">→</div>
          <div class="help-step">
            <div class="help-step-icon">📗</div>
            <div class="help-step-title">3. 匯入 NBLM</div>
          </div>
          <div class="help-step-arrow">→</div>
          <div class="help-step">
            <div class="help-step-icon">📊</div>
            <div class="help-step-title">4. 生成簡報</div>
          </div>
        </div>
      </section>

      <!-- API Key 設定說明 -->
      <section class="help-section">
        <h3>🔑 設定 API Key</h3>
        <p>首先需要設定 Google Gemini API Key 才能啟用 AI 大腦。</p>
        <ol>
          <li>點擊右上角「🔑 AI 設定」按鈕</li>
          <li>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio 申請 API Key</a>（免費版即可）</li>
          <li>複製 API Key 並貼上到輸入框</li>
          <li>點擊「儲存」</li>
        </ol>
      </section>

      <!-- 三種模式說明 -->
      <section class="help-section">
        <h3>🎨 三種生成模式</h3>
        <div class="help-mode">
          <h4>✨ AI 智慧生成</h4>
          <p><strong>AI 自動生成：</strong>AI 會分析你的素材，自動設計簡報架構和重點。</p>
          <p><strong>現有大綱轉檔：</strong>保留你的大綱結構，只做格式轉換，文字內容一字不改。</p>
        </div>
        <div class="help-mode">
          <h4>📚 課文忠實模式</h4>
          <p>將課文原文完整呈現，一字不改、一字不漏，AI 只負責合理分頁。</p>
        </div>
        <div class="help-mode">
          <h4>📄 PDF 轉圖片</h4>
          <p>將 PDF 的每一頁轉換為高品質 PNG 圖片，方便插入簡報使用。</p>
        </div>
      </section>

      <!-- NotebookLM 使用說明 -->
      <section class="help-section">
        <h3>📗 如何使用 NotebookLM 製作簡報？</h3>
        <ol>
          <li>完成前三步驟後，點擊「下載 TXT」下載 YAML 施工圖</li>
          <li>前往 <a href="https://notebooklm.google.com" target="_blank" rel="noopener">Google NotebookLM</a> 並建立新筆記本</li>
          <li>將剛下載的 .txt 檔案上傳作為來源 (Source)</li>
          <li>在 NotebookLM 中，指示 AI：「請根據這份 YAML 結構檔案，為我生成完整的簡報內容」</li>
          <li>NotebookLM 會自動分析並生成簡報內容</li>
        </ol>
      </section>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="btnHelpOk" type="button">我知道了</button>
    </div>
  </div>
</div>
```

**Step 3: 測試 HTML 結構**

開啟瀏覽器檢查：
- Header 中有「使用說明」按鈕
- 使用瀏覽器開發者工具找到 `#helpModal` 元素
- 移除 `hidden` class 確認彈窗顯示正常

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: 新增使用說明彈窗 HTML 結構"
```

---

## Task 2: 新增使用說明彈窗 CSS 樣式

**Files:**
- Modify: `public/css/styles.css`

**Step 1: 新增 modal 通用樣式**

在 styles.css 的 Modal 區塊新增（如果已有 modal 樣式則擴充）：

```css
/* ========================================
   Modal 通用樣式
   ======================================== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.help-modal-content {
  max-width: 900px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color var(--transition);
}

.btn-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

**Step 2: 新增使用說明專屬樣式**

```css
/* ========================================
   使用說明彈窗
   ======================================== */
.help-section {
  margin-bottom: 32px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  font-size: 1.1rem;
  color: var(--accent);
  margin-bottom: 16px;
}

.help-section h4 {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.help-section p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.help-section ol,
.help-section ul {
  color: var(--text-secondary);
  line-height: 1.8;
  padding-left: 24px;
}

.help-section a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition);
}

.help-section a:hover {
  border-bottom-color: var(--accent);
}

/* 四步驟流程圖 */
.help-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.help-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 100px;
}

.help-step-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 50%;
  border: 2px solid var(--border);
}

.help-step-title {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
}

.help-step-arrow {
  color: var(--text-secondary);
  font-size: 1.5rem;
  flex-shrink: 0;
}

/* 模式說明卡片 */
.help-mode {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
}

.help-mode:last-child {
  margin-bottom: 0;
}

.help-mode h4 {
  margin-top: 0;
}

/* 響應式 */
@media (max-width: 768px) {
  .help-steps {
    flex-direction: column;
  }

  .help-step-arrow {
    transform: rotate(90deg);
  }
}
```

**Step 3: 測試樣式**

開啟瀏覽器：
- 手動移除 `#helpModal` 的 `hidden` class
- 確認彈窗居中顯示
- 確認遮罩層顏色正確
- 確認卡片樣式符合設計（深色主題）
- 確認四步驟流程圖水平排列
- 確認在手機尺寸下流程圖垂直排列

**Step 4: Commit**

```bash
git add public/css/styles.css
git commit -m "style: 新增使用說明彈窗 CSS 樣式"
```

---

## Task 3: 實作使用說明彈窗開關邏輯

**Files:**
- Modify: `public/js/app.js`

**Step 1: 新增 DOM 引用**

在 `dom` 物件中新增：

```javascript
const dom = {
  // ... 現有的 DOM 引用
  btnOpenHelp:       $('#btnOpenHelp'),
  helpModal:         $('#helpModal'),
  btnCloseHelp:      $('#btnCloseHelp'),
  btnHelpOk:         $('#btnHelpOk')
};
```

**Step 2: 新增彈窗控制函數**

在 API Key Modal 相關函數後新增：

```javascript
// ──────────────────────────────────────────────
// Help Modal
// ──────────────────────────────────────────────
function initHelpModal() {
  dom.btnOpenHelp.addEventListener('click', function () {
    dom.helpModal.classList.remove('hidden');
  });

  dom.btnCloseHelp.addEventListener('click', function () {
    dom.helpModal.classList.add('hidden');
  });

  dom.btnHelpOk.addEventListener('click', function () {
    dom.helpModal.classList.add('hidden');
  });

  // Click overlay to close
  dom.helpModal.addEventListener('click', function (e) {
    if (e.target === dom.helpModal) {
      dom.helpModal.classList.add('hidden');
    }
  });
}
```

**Step 3: 在 DOMContentLoaded 中初始化**

在 `document.addEventListener('DOMContentLoaded', ...)` 中新增：

```javascript
// Init help modal
initHelpModal();
```

**Step 4: 測試功能**

開啟瀏覽器測試：
1. 點擊「使用說明」按鈕 → 彈窗顯示
2. 點擊右上角 ✕ 按鈕 → 彈窗關閉
3. 再次開啟，點擊「我知道了」→ 彈窗關閉
4. 再次開啟，點擊彈窗外部（遮罩層）→ 彈窗關閉
5. 確認所有連結可正常開啟（新分頁）

**Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "feat: 實作使用說明彈窗開關邏輯"
```

---

## Task 4: 改版 Step 4 HTML 結構（NotebookLM 說明區塊）

**Files:**
- Modify: `public/index.html`

**Step 1: 在 Step 4 Panel 最上方新增 NotebookLM 說明區塊**

找到 `<section class="step-panel hidden" id="step4Panel">` 的內容區域，在 `<h2>` 和 `<p>` 之後、編輯器之前新增：

```html
<!-- NotebookLM 使用說明 -->
<div class="notebooklm-guide">
  <div class="guide-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <h3>接下來該怎麼做？(NotebookLM 轉檔教學)</h3>
  </div>

  <div class="guide-steps">
    <div class="guide-step">
      <div class="guide-step-icon">📥</div>
      <div class="guide-step-content">
        <div class="guide-step-title">1. 下載施工圖</div>
        <div class="guide-step-desc">點擊下方的「下載 TXT (.yaml)」按鈕。<br>這份 YAML 檔包含了完整的簡報結構與教學指令。</div>
      </div>
    </div>

    <div class="guide-step-arrow">→</div>

    <div class="guide-step">
      <div class="guide-step-icon">☁️</div>
      <div class="guide-step-content">
        <div class="guide-step-title">2. 上傳至 NotebookLM</div>
        <div class="guide-step-desc">
          打開 <a href="https://notebooklm.google.com" target="_blank" rel="noopener">Google NotebookLM</a>，建立新筆記本。<br>
          點擊「新增來源」上傳剛下載的 .txt 檔案。
        </div>
      </div>
    </div>

    <div class="guide-step-arrow">→</div>

    <div class="guide-step">
      <div class="guide-step-icon">🎤</div>
      <div class="guide-step-content">
        <div class="guide-step-title">3. 一鍵生成內容</div>
        <div class="guide-step-desc">
          生成語音：直接點擊「語音概覽」，再點擊「生成」。<br>
          生成簡報：直接點擊「簡報」，再點擊「生成」。
        </div>
      </div>
    </div>
  </div>
</div>
```

**Step 2: 測試 HTML 結構**

開啟瀏覽器開發者工具：
- 確認 `.notebooklm-guide` 元素存在
- 確認三個步驟都有正確的圖示和文字
- 確認 NotebookLM 連結可點擊

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: 新增 NotebookLM 使用說明區塊"
```

---

## Task 5: 新增 NotebookLM 說明區塊 CSS 樣式

**Files:**
- Modify: `public/css/styles.css`

**Step 1: 新增 NotebookLM 說明區塊樣式**

在 Step 4 相關樣式區塊新增：

```css
/* ========================================
   NotebookLM 使用說明
   ======================================== */
.notebooklm-guide {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.guide-header svg {
  color: var(--accent);
  flex-shrink: 0;
}

.guide-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.guide-steps {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.guide-step {
  flex: 1;
  display: flex;
  gap: 12px;
  min-width: 0;
}

.guide-step-icon {
  font-size: 2rem;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 50%;
  border: 2px solid var(--border);
}

.guide-step-content {
  flex: 1;
  min-width: 0;
}

.guide-step-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.guide-step-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.guide-step-desc a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition);
}

.guide-step-desc a:hover {
  border-bottom-color: var(--accent);
}

.guide-step-arrow {
  color: var(--text-secondary);
  font-size: 1.5rem;
  line-height: 48px;
  flex-shrink: 0;
}

/* 響應式 */
@media (max-width: 768px) {
  .guide-steps {
    flex-direction: column;
  }

  .guide-step-arrow {
    transform: rotate(90deg);
    align-self: center;
  }
}
```

**Step 2: 測試樣式**

開啟瀏覽器進入 Step 4：
- 確認說明區塊顯示在編輯器上方
- 確認三步驟水平排列
- 確認卡片背景顏色與其他元件一致
- 調整瀏覽器寬度，確認在手機尺寸下垂直排列

**Step 3: Commit**

```bash
git add public/css/styles.css
git commit -m "style: 新增 NotebookLM 說明區塊樣式"
```

---

## Task 6: 改版 Step 4 為左右分欄佈局

**Files:**
- Modify: `public/index.html`

**Step 1: 替換現有的 editor-split 結構**

找到 Step 4 中的 `<div class="editor-split">` 區塊，完整替換為：

```html
<div class="editor-split">
  <!-- Left: 簡報大綱編輯器 -->
  <div class="outline-editor-pane">
    <div class="editor-pane-header">
      <span>📝 簡報大綱編輯器</span>
      <span class="editor-mode-badge">EDITOR MODE</span>
    </div>
    <div class="outline-editor-container" id="outlineEditorContainer">
      <!-- 卡片將由 JavaScript 動態生成 -->
      <div class="outline-placeholder">
        <p>生成簡報後，這裡會顯示可編輯的簡報卡片</p>
      </div>
    </div>
  </div>

  <!-- Right: YAML 預覽 -->
  <div class="yaml-preview-pane">
    <div class="editor-pane-header">
      <span>👀 YAML 預覽</span>
      <button class="btn btn-sm btn-copy-yaml" id="btnCopyYaml" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        複製 YAML
      </button>
    </div>
    <textarea class="form-textarea editor-textarea" id="yamlEditor"
      placeholder="生成的 YAML 將顯示在這裡..." spellcheck="false" readonly></textarea>
  </div>
</div>
```

**Step 2: 測試 HTML 結構**

開啟瀏覽器：
- 確認左右兩欄結構存在
- 確認「複製 YAML」按鈕在右上角
- 確認左側顯示佔位符文字

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "refactor: 改版 Step 4 為左右分欄佈局"
```

---

## Task 7: 新增編輯器分欄佈局 CSS 樣式

**Files:**
- Modify: `public/css/styles.css`

**Step 1: 更新 editor-split 樣式**

找到現有的 `.editor-split` 樣式並更新：

```css
/* ========================================
   Step 4: Editor Split Pane（更新）
   ======================================== */
.editor-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 500px;
  max-height: 70vh;
}

.outline-editor-pane,
.yaml-preview-pane {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.editor-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.editor-mode-badge {
  font-size: 0.7rem;
  padding: 4px 8px;
  background: rgba(0, 212, 170, 0.1);
  color: var(--accent);
  border-radius: var(--radius-sm);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.btn-copy-yaml {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.85rem;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity var(--transition);
}

.btn-copy-yaml:hover {
  opacity: 0.9;
}

.btn-copy-yaml svg {
  flex-shrink: 0;
}

/* 大綱編輯器容器 */
.outline-editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.outline-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* YAML 預覽 */
.yaml-preview-pane .editor-textarea {
  flex: 1;
  resize: none;
  border: none;
  border-radius: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  background: var(--bg-primary);
}

/* 響應式 */
@media (max-width: 1024px) {
  .editor-split {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .outline-editor-pane {
    min-height: 400px;
  }

  .yaml-preview-pane {
    min-height: 400px;
  }
}
```

**Step 2: 測試樣式**

開啟瀏覽器：
- 確認左右兩欄等寬排列
- 確認標題列樣式正確
- 確認「複製 YAML」按鈕樣式符合設計（青綠色背景）
- 調整視窗寬度，確認在小螢幕下變成上下排列

**Step 3: Commit**

```bash
git add public/css/styles.css
git commit -m "style: 新增編輯器分欄佈局樣式"
```

---

## Task 8: 實作複製 YAML 功能

**Files:**
- Modify: `public/js/app.js`

**Step 1: 新增 DOM 引用**

在 `dom` 物件中新增：

```javascript
btnCopyYaml:       $('#btnCopyYaml'),
outlineEditorContainer: $('#outlineEditorContainer')
```

**Step 2: 新增複製函數（使用 Clipboard API）**

在檔案中新增：

```javascript
// ──────────────────────────────────────────────
// Copy YAML to Clipboard
// ──────────────────────────────────────────────
function copyYamlToClipboard() {
  var yamlContent = dom.yamlEditor.value;

  if (!yamlContent) {
    showToast('沒有可複製的內容', 'error');
    return;
  }

  // Modern browsers
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(yamlContent)
      .then(function() {
        showToast('已複製到剪貼簿', 'success');
      })
      .catch(function(err) {
        console.error('[Clipboard Error]', err);
        fallbackCopyToClipboard(yamlContent);
      });
  } else {
    // Fallback for older browsers
    fallbackCopyToClipboard(yamlContent);
  }
}

function fallbackCopyToClipboard(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    var successful = document.execCommand('copy');
    if (successful) {
      showToast('已複製到剪貼簿', 'success');
    } else {
      showToast('複製失敗，請手動選取複製', 'error');
    }
  } catch (err) {
    console.error('[Fallback Copy Error]', err);
    showToast('複製失敗，請手動選取複製', 'error');
  }

  document.body.removeChild(textarea);
}

function initCopyYaml() {
  dom.btnCopyYaml.addEventListener('click', copyYamlToClipboard);
}
```

**Step 3: 在 DOMContentLoaded 中初始化**

```javascript
// Init copy YAML
initCopyYaml();
```

**Step 4: 測試複製功能**

開啟瀏覽器測試：
1. 生成一個簡報（確保 YAML 編輯器有內容）
2. 點擊「複製 YAML」按鈕
3. 確認顯示「已複製到剪貼簿」Toast
4. 打開一個文字編輯器，貼上（Ctrl+V / Cmd+V）
5. 確認貼上的內容與 YAML 預覽區一致
6. 在 YAML 為空時點擊「複製 YAML」
7. 確認顯示「沒有可複製的內容」錯誤提示

**Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "feat: 實作複製 YAML 到剪貼簿功能"
```

---

## Task 9: 新增 outline-editor.js 模組檔案

**Files:**
- Create: `public/js/outline-editor.js`

**Step 1: 建立檔案基本結構**

```javascript
/* ============================================================
   NBLM 簡報生成助手 — Outline Editor Module
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // Global reference to presentation data
  // ──────────────────────────────────────────────
  // This will be set by loadPresentationData()
  window.presentationData = null;

  // ──────────────────────────────────────────────
  // Debounce timer
  // ──────────────────────────────────────────────
  let updateTimer = null;

  // ──────────────────────────────────────────────
  // Load presentation data into editor
  // ──────────────────────────────────────────────
  function loadPresentationData(data) {
    window.presentationData = data;
    renderOutlineEditor();
    updateYamlPreview();
  }

  // ──────────────────────────────────────────────
  // Render outline editor cards
  // ──────────────────────────────────────────────
  function renderOutlineEditor() {
    // Will be implemented in next task
  }

  // ──────────────────────────────────────────────
  // Update YAML preview with debounce
  // ──────────────────────────────────────────────
  function onEditorChange() {
    // Clear previous timer
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    // Set new timer (300ms delay)
    updateTimer = setTimeout(function() {
      updateYamlPreview();
    }, 300);
  }

  function updateYamlPreview() {
    if (!window.presentationData) return;

    try {
      var yamlString = jsyaml.dump(window.presentationData);
      var yamlEditor = document.querySelector('#yamlEditor');
      if (yamlEditor) {
        yamlEditor.value = yamlString;
      }
    } catch (err) {
      console.error('[YAML Generation Error]', err);
      if (window.showToast) {
        window.showToast('YAML 生成失敗，請檢查內容', 'error');
      }
    }
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.loadPresentationData = loadPresentationData;
  window.onEditorChange = onEditorChange;

})();
```

**Step 2: 在 index.html 中引入新模組**

在 `</body>` 前，`app.js` 之前引入：

```html
<script src="js/outline-editor.js"></script>
```

**Step 3: 測試模組載入**

開啟瀏覽器 Console：
```javascript
console.log(typeof window.loadPresentationData); // 應該顯示 "function"
console.log(typeof window.onEditorChange); // 應該顯示 "function"
```

**Step 4: Commit**

```bash
git add public/js/outline-editor.js public/index.html
git commit -m "feat: 新增 outline-editor.js 模組基本結構"
```

---

## Task 10: 實作卡片編輯器渲染邏輯

**Files:**
- Modify: `public/js/outline-editor.js`

**Step 1: 實作 renderOutlineEditor 函數**

找到 `renderOutlineEditor()` 函數，實作完整邏輯：

```javascript
function renderOutlineEditor() {
  var container = document.querySelector('#outlineEditorContainer');
  if (!container) return;

  if (!window.presentationData || !window.presentationData.slides) {
    container.innerHTML = '<div class="outline-placeholder"><p>尚未生成簡報，請先完成前面步驟</p></div>';
    return;
  }

  var slides = window.presentationData.slides;
  container.innerHTML = ''; // Clear existing content

  slides.forEach(function(slide, index) {
    var card = createSlideCard(slide, index);
    container.appendChild(card);
  });
}
```

**Step 2: 實作 createSlideCard 函數**

在 `renderOutlineEditor()` 前新增：

```javascript
function createSlideCard(slide, slideIndex) {
  var card = document.createElement('div');
  card.className = 'slide-card';
  card.setAttribute('data-slide-index', slideIndex);

  // Card header
  var header = document.createElement('div');
  header.className = 'slide-card-header';
  header.innerHTML = '<span class="slide-number">SLIDE ' + slide.slide_number + '</span>';
  card.appendChild(header);

  // Title input
  var titleSection = createInputSection('標題', 'slide-title-input', slide.title || '', 'text');
  card.appendChild(titleSection);

  // Key points
  var keyPointsSection = createKeyPointsSection(slide.key_points || []);
  card.appendChild(keyPointsSection);

  // Visual direction
  var visualSection = createTextareaSection('🎨 視覺指示', 'visual-input', slide.visual_direction || '', 3);
  card.appendChild(visualSection);

  // Speaker notes
  var notesSection = createTextareaSection('📝 講稿', 'notes-input', slide.speaker_notes || '', 5);
  card.appendChild(notesSection);

  // Bind events
  bindCardEvents(card, slideIndex);

  return card;
}
```

**Step 3: 實作輔助函數**

```javascript
function createInputSection(label, className, value, type) {
  var section = document.createElement('div');
  section.className = 'slide-card-section';

  var labelEl = document.createElement('label');
  labelEl.className = 'slide-card-label';
  labelEl.textContent = label;
  section.appendChild(labelEl);

  var input = document.createElement('input');
  input.type = type || 'text';
  input.className = 'form-input ' + className;
  input.value = value || '';
  section.appendChild(input);

  return section;
}

function createTextareaSection(label, className, value, rows) {
  var section = document.createElement('div');
  section.className = 'slide-card-section';

  var labelEl = document.createElement('label');
  labelEl.className = 'slide-card-label';
  labelEl.textContent = label;
  section.appendChild(labelEl);

  var textarea = document.createElement('textarea');
  textarea.className = 'form-textarea ' + className;
  textarea.rows = rows || 3;
  textarea.value = value || '';
  section.appendChild(textarea);

  return section;
}

function createKeyPointsSection(keyPoints) {
  var section = document.createElement('div');
  section.className = 'slide-card-section';

  var label = document.createElement('label');
  label.className = 'slide-card-label';
  label.textContent = '📌 重點 (Key Points)';
  section.appendChild(label);

  var pointsContainer = document.createElement('div');
  pointsContainer.className = 'key-points-container';

  // Ensure at least 3 points
  var points = keyPoints.length > 0 ? keyPoints : ['', '', ''];
  points.forEach(function(point) {
    var pointInput = createKeyPointInput(point);
    pointsContainer.appendChild(pointInput);
  });

  section.appendChild(pointsContainer);

  // Add point button
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-point';
  addBtn.textContent = '+ 新增重點';
  addBtn.addEventListener('click', function() {
    if (pointsContainer.children.length < 10) {
      var newInput = createKeyPointInput('');
      pointsContainer.appendChild(newInput);
    } else {
      if (window.showToast) {
        window.showToast('最多 10 個重點', 'error');
      }
    }
  });
  section.appendChild(addBtn);

  return section;
}

function createKeyPointInput(value) {
  var wrapper = document.createElement('div');
  wrapper.className = 'key-point-item';

  var bullet = document.createElement('span');
  bullet.className = 'key-point-bullet';
  bullet.textContent = '•';
  wrapper.appendChild(bullet);

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input key-point-input';
  input.value = value || '';
  input.placeholder = '輸入重點...';
  wrapper.appendChild(input);

  return wrapper;
}
```

**Step 4: 測試渲染（暫時無資料）**

開啟瀏覽器 Console 手動測試：
```javascript
window.loadPresentationData({
  title: "測試簡報",
  slides: [{
    slide_number: 1,
    title: "測試標題",
    key_points: ["重點1", "重點2"],
    visual_direction: "視覺指示",
    speaker_notes: "講稿內容"
  }]
});
```

確認：
- 左側顯示一張卡片
- 卡片包含標題、重點、視覺指示、講稿
- 欄位值正確顯示

**Step 5: Commit**

```bash
git add public/js/outline-editor.js
git commit -m "feat: 實作卡片編輯器渲染邏輯"
```

---

## Task 11: 新增卡片編輯器 CSS 樣式

**Files:**
- Modify: `public/css/styles.css`

**Step 1: 新增卡片樣式**

```css
/* ========================================
   簡報卡片編輯器
   ======================================== */
.slide-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  overflow: hidden;
  transition: box-shadow var(--transition);
}

.slide-card:hover {
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.1);
}

.slide-card:last-child {
  margin-bottom: 0;
}

.slide-card-header {
  background: var(--bg-surface);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.slide-number {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--accent);
  letter-spacing: 0.5px;
}

.slide-card-section {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.slide-card-section:last-child {
  border-bottom: none;
}

.slide-card-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.slide-card-section .form-input,
.slide-card-section .form-textarea {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color var(--transition);
}

.slide-card-section .form-input:focus,
.slide-card-section .form-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.slide-card-section .form-textarea {
  resize: vertical;
  min-height: 80px;
  max-height: 300px;
  font-family: inherit;
  line-height: 1.6;
}

/* Key points */
.key-points-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.key-point-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-point-bullet {
  color: var(--accent);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.key-point-input {
  flex: 1;
}

.btn-add-point {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.85rem;
  background: transparent;
  color: var(--accent);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.btn-add-point:hover {
  background: rgba(0, 212, 170, 0.1);
}
```

**Step 2: 測試樣式**

開啟瀏覽器，使用 Console 載入測試資料：
```javascript
window.loadPresentationData({
  title: "測試簡報",
  slides: [
    {slide_number: 1, title: "第一頁", key_points: ["重點1", "重點2"], visual_direction: "視覺", speaker_notes: "講稿"},
    {slide_number: 2, title: "第二頁", key_points: ["重點A"], visual_direction: "", speaker_notes: ""}
  ]
});
```

確認：
- 卡片樣式符合設計（深色主題）
- Hover 時有淡淡的陰影
- 輸入框 focus 時邊框變成青綠色
- 重點項目前有子彈點
- 「+ 新增重點」按鈕樣式正確

**Step 3: Commit**

```bash
git add public/css/styles.css
git commit -m "style: 新增卡片編輯器樣式"
```

---

## Task 12: 實作卡片事件綁定與防抖動更新

**Files:**
- Modify: `public/js/outline-editor.js`

**Step 1: 實作 bindCardEvents 函數**

在檔案中新增：

```javascript
function bindCardEvents(card, slideIndex) {
  // Title
  var titleInput = card.querySelector('.slide-title-input');
  if (titleInput) {
    titleInput.addEventListener('input', function() {
      window.presentationData.slides[slideIndex].title = this.value;
      onEditorChange();
    });
  }

  // Key points
  var keyPointInputs = card.querySelectorAll('.key-point-input');
  function updateKeyPoints() {
    var points = [];
    card.querySelectorAll('.key-point-input').forEach(function(input) {
      var value = input.value.trim();
      if (value) points.push(value);
    });
    window.presentationData.slides[slideIndex].key_points = points;
    onEditorChange();
  }

  keyPointInputs.forEach(function(input) {
    input.addEventListener('input', updateKeyPoints);
  });

  // Visual direction
  var visualInput = card.querySelector('.visual-input');
  if (visualInput) {
    visualInput.addEventListener('input', function() {
      window.presentationData.slides[slideIndex].visual_direction = this.value;
      onEditorChange();
    });
  }

  // Speaker notes
  var notesInput = card.querySelector('.notes-input');
  if (notesInput) {
    notesInput.addEventListener('input', function() {
      window.presentationData.slides[slideIndex].speaker_notes = this.value;
      onEditorChange();
    });
  }

  // Add point button (already bound in createKeyPointsSection)
  // Re-bind when new point is added
  var addPointBtn = card.querySelector('.btn-add-point');
  if (addPointBtn) {
    addPointBtn.addEventListener('click', function() {
      // Re-bind events for new inputs
      setTimeout(function() {
        var newInputs = card.querySelectorAll('.key-point-input');
        newInputs.forEach(function(input) {
          input.removeEventListener('input', updateKeyPoints);
          input.addEventListener('input', updateKeyPoints);
        });
      }, 50);
    });
  }
}
```

**Step 2: 測試事件綁定與防抖動**

開啟瀏覽器 Console，載入測試資料：
```javascript
window.loadPresentationData({
  title: "測試",
  slides: [{
    slide_number: 1,
    title: "測試標題",
    key_points: ["重點1"],
    visual_direction: "視覺",
    speaker_notes: "講稿"
  }]
});
```

測試：
1. 修改標題輸入框 → 等待 300ms
2. 確認右側 YAML 預覽更新（title 欄位改變）
3. 修改重點 → 等待 300ms → 確認 YAML 更新
4. 修改視覺指示 → 確認更新
5. 修改講稿 → 確認更新
6. 點擊「+ 新增重點」→ 輸入內容 → 確認更新

**Step 3: Commit**

```bash
git add public/js/outline-editor.js
git commit -m "feat: 實作卡片事件綁定與防抖動更新機制"
```

---

## Task 13: 整合編輯器到現有生成流程

**Files:**
- Modify: `public/js/app.js`

**Step 1: 修改 generate button 處理邏輯**

找到 `initGenerateButton()` 函數中的成功處理區塊，將生成的結果傳入編輯器：

在 `goToStep(4);` 之前新增：

```javascript
// Load data into outline editor
if (typeof window.loadPresentationData === 'function') {
  window.loadPresentationData(result);
}
```

完整區塊應該像這樣：

```javascript
// Build structured YAML from JSON result
if (result) {
  var yamlString;
  try {
    if (state.mode === 'textbook' && typeof window.buildTextbookYaml === 'function') {
      yamlString = window.buildTextbookYaml(result, state);
    } else if (typeof window.buildYaml === 'function') {
      yamlString = window.buildYaml(result, state);
    } else {
      yamlString = jsyaml.dump(result);
    }
  } catch (buildErr) {
    console.warn('[YAML Build Warning]', buildErr);
    yamlString = jsyaml.dump(result);
  }

  dom.yamlEditor.value = yamlString;

  // Load data into outline editor
  if (typeof window.loadPresentationData === 'function') {
    window.loadPresentationData(result);
  }

  // Trigger preview if renderPreview is available
  if (typeof window.renderPreview === 'function') {
    window.renderPreview(yamlString);
  }
}

hideLoading();
isGenerating = false;
dom.btnGenerate.disabled = false;
goToStep(4);
showToast('簡報生成完成！', 'success');
```

**Step 2: 測試完整流程**

開啟瀏覽器，進行完整測試：
1. 設定 API Key
2. 選擇參數（Step 1）
3. 設定簡報數量（Step 2）
4. 輸入素材並生成（Step 3）
5. 等待生成完成
6. 確認 Step 4 顯示：
   - 上方：NotebookLM 使用說明區塊
   - 左側：簡報卡片編輯器（顯示所有頁面）
   - 右側：YAML 預覽（顯示生成的 YAML）
7. 編輯左側任一欄位
8. 等待 300ms，確認右側 YAML 自動更新
9. 點擊「複製 YAML」→ 確認成功複製
10. 點擊「下載 TXT」→ 確認檔案下載且檔名正確

**Step 3: Commit**

```bash
git add public/js/app.js
git commit -m "feat: 整合編輯器到現有生成流程"
```

---

## Task 14: 測試與修復邊界情況

**Files:**
- Modify: `public/js/outline-editor.js` (if needed)
- Modify: `public/js/app.js` (if needed)

**Step 1: 測試邊界情況清單**

開啟瀏覽器，逐一測試以下情況：

**測試 1：空白簡報**
- 直接進入 Step 4（未生成簡報）
- 預期：左側顯示「尚未生成簡報，請先完成前面步驟」
- 右側：空白

**測試 2：超長文字**
- 在講稿區域輸入超過 500 字的文字
- 預期：textarea 出現滾動條（最大高度 300px）
- YAML 正確更新

**測試 3：重點數量上限**
- 連續點擊「+ 新增重點」超過 10 次
- 預期：第 11 次顯示 Toast「最多 10 個重點」
- 不再新增輸入框

**測試 4：快速連續輸入**
- 快速打字修改多個欄位
- 預期：不會卡頓
- YAML 在停止輸入後 300ms 更新

**測試 5：複製功能在無內容時**
- 在未生成簡報時點擊「複製 YAML」
- 預期：顯示「沒有可複製的內容」

**測試 6：三種模式都能正常編輯**
- 分別測試 AI 智慧生成、現有大綱轉檔、課文忠實模式
- 預期：所有模式生成後都能正常編輯

**Step 2: 修復發現的問題**

如果發現任何問題，在對應檔案中修復。

**Step 3: Commit 修復（如有）**

```bash
git add .
git commit -m "fix: 修復邊界情況處理問題"
```

---

## Task 15: 最終測試與文件更新

**Files:**
- Test all features
- Update: `README.md` (if exists)

**Step 1: 完整功能測試**

執行完整的使用者流程測試：

1. **首次使用流程**
   - 點擊「使用說明」→ 閱讀說明 → 關閉
   - 點擊「AI 設定」→ 設定 API Key

2. **AI 智慧生成模式**
   - 選擇參數 → 輸入素材 → 生成
   - 確認編輯器正常顯示
   - 編輯內容 → 確認 YAML 更新
   - 複製 YAML → 下載 TXT

3. **現有大綱轉檔模式**
   - 切換到「現有大綱轉檔」tab
   - 輸入大綱 → 生成
   - 確認編輯器正常

4. **課文忠實模式**
   - 切換到課文忠實模式
   - 輸入課文 → 生成
   - 確認編輯器正常

5. **NotebookLM 整合**
   - 確認說明區塊顯示
   - 確認連結可點擊
   - 下載 TXT → 開啟 NotebookLM → 上傳檔案

**Step 2: 跨瀏覽器測試**

在以下瀏覽器測試：
- Chrome（最新版）
- Safari（macOS）
- Firefox（最新版）

確認：
- 所有功能正常運作
- 複製功能在所有瀏覽器都能運作
- CSS 樣式一致

**Step 3: 響應式測試**

調整瀏覽器寬度測試：
- 桌面（> 1024px）→ 左右分欄
- 平板（768-1024px）→ 左右分欄
- 手機（< 768px）→ 上下排列

**Step 4: 效能測試**

- 生成 20 頁簡報 → 確認載入順暢
- 快速編輯多個欄位 → 確認不卡頓
- 防抖動機制運作正常

**Step 5: 最終 Commit**

```bash
git add .
git commit -m "test: 完成編輯器改版完整測試"
```

---

## Task 16: 建立 Git Tag 與總結

**Files:**
- None (Git operations only)

**Step 1: 建立版本標籤**

```bash
git tag -a v2.0.0 -m "Editor Redesign: 卡片式編輯器、使用說明彈窗、NotebookLM 整合"
```

**Step 2: 推送到 remote（如有）**

```bash
git push origin main
git push origin v2.0.0
```

**Step 3: 建立 Release Notes（可選）**

在專案根目錄建立 `CHANGELOG.md`（如果還沒有）：

```markdown
# Changelog

## [2.0.0] - 2026-02-16

### Added
- 🎨 全新卡片式簡報大綱編輯器
  - 每頁簡報獨立卡片，可編輯標題、重點、視覺指示、講稿
  - 左側編輯、右側 YAML 即時預覽（防抖動更新）

- 📖 使用說明彈窗
  - 四步驟流程圖
  - Gemini API Key 申請指引
  - 三種模式說明
  - NotebookLM 使用教學

- 📗 NotebookLM 整合
  - Step 4 上方顯示三步驟使用指南
  - 複製 YAML 到剪貼簿功能
  - 直達 NotebookLM 連結

### Changed
- ♻️ Step 4 改版為左右分欄佈局
- 🎯 YAML 編輯器改為唯讀預覽

### Technical
- 新增 `outline-editor.js` 模組
- 實作防抖動機制（300ms）
- 使用 Clipboard API（含降級方案）
```

**Step 4: Commit changelog**

```bash
git add CHANGELOG.md
git commit -m "docs: 新增 v2.0.0 changelog"
```

---

## 完成！

**所有任務已完成。** 你現在擁有：

✅ 使用說明彈窗（含 API Key 申請指引）
✅ 卡片式簡報大綱編輯器（左側）
✅ YAML 即時預覽（右側，防抖動更新）
✅ 複製 YAML 功能
✅ NotebookLM 使用說明與整合
✅ 完整測試與文件

**下一步：** 部署到 Zeabur 或其他平台，讓使用者開始使用！
