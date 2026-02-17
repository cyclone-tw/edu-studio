# 全面編輯器改版實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 參照阿亮校長的工具架構，重新設計編輯器系統：Gemini 生成豐富內容（script、layout、visual prompt），編輯器可完整編輯，YAML 和 MD 大綱分開下載。

**Architecture:**
- Gemini 生成豐富 JSON（含 script、layout_style、subtitle 等）
- 內部存儲完整 slide 資料（outlineData）
- 編輯器顯示所有欄位並可編輯（封面頁 vs 內容頁不同欄位）
- YAML 輸出只保留 NotebookLM 需要的欄位（presentation_data 格式）
- MD 大綱輸出人類可讀的完整版本

**Tech Stack:** Vanilla JS、js-yaml、CSS Grid

---

## 資料流架構

```
Gemini JSON (豐富) → outlineData[] (內部完整資料)
                          ↓                    ↓
              大綱編輯器 (全部可編輯)    YAML 預覽 (NBLM 精簡格式)
                          ↓                    ↓
                    下載 MD 大綱          下載 YAML / 複製 YAML
```

### Gemini 輸出的 JSON 結構（每個 slide）
```json
{
  "title": "簡報標題",
  "slides": [
    {
      "title": "頁面標題",
      "subtitle": "副標題（僅封面頁）",
      "key_points": ["重點1", "重點2"],
      "script": "講者講綱，口語化的補充說明",
      "visual_description": "視覺設計描述",
      "layout_style": "Title Top-Left + Text Left / Image Right"
    }
  ]
}
```

### 編輯器顯示的欄位
- **封面頁（第1頁）**: type 標籤、layout_style、title、subtitle、script、visual_description
- **內容頁（中間）**: type 標籤、layout_style、title、key_points、script、visual_description
- **結尾頁（最後1頁）**: type 標籤、layout_style、title、key_points、script、visual_description

### YAML 輸出（NBLM 格式，精簡）
只保留：type、layout_style、visual_description、content.title、content.key_points（或 content.subtitle）

### MD 大綱輸出（人類可讀，完整）
包含所有欄位：title、subtitle、key_points、script、visual_description、layout_style

---

## Task 1: 重新設計 Gemini Prompt（gemini.js）

**Files:**
- Modify: `public/js/gemini.js`

**目標:** 讓 Gemini 生成更豐富的 JSON，包含 script（講綱）、layout_style、subtitle（封面頁）。

**Step 1: 修改 generatePresentation prompt**

將 prompt 改為要求以下欄位：
```javascript
var prompt = '你是一位專業的簡報架構師。根據素材設計簡報，輸出結構化 JSON。\n\n'
  + '⚠️ 必須恰好 ' + state.slideCount + ' 頁。\n\n'
  + '## 設定\n'
  + '- 角色：' + roleLabel + '\n'
  + '- 受眾：' + audienceLabel + '（' + audienceTraits + '）\n'
  + '- 場景：' + contextLabel + '\n'
  + '- 視覺風格：' + styleLabel + '\n\n'
  + '## 輸出 JSON 格式\n\n'
  + '{\n'
  + '  "title": "簡報標題",\n'
  + '  "slides": [\n'
  + '    {\n'
  + '      "title": "頁面標題",\n'
  + '      "subtitle": "副標題（僅第一頁封面需要，其他頁留空字串）",\n'
  + '      "key_points": ["重點1", "重點2"],\n'
  + '      "script": "這頁的講者講綱，口語化的補充說明和教學重點",\n'
  + '      "visual_description": "此頁的視覺設計描述（符合' + styleLabel + '風格）",\n'
  + '      "layout_style": "排版建議，如 Centered / Title Top-Left + Text Left / Image Right"\n'
  + '    }\n'
  + '  ]\n'
  + '}\n\n'
  + '規則：\n'
  + '- slides 必須恰好 ' + state.slideCount + ' 個\n'
  + '- 第一頁為封面頁，需要 subtitle，key_points 留空陣列\n'
  + '- 最後一頁為結尾頁\n'
  + '- key_points 放該頁要顯示的文字內容\n'
  + '- script 放講者口語化的講綱補充（不會顯示在簡報上）\n'
  + '- visual_description 描述背景插圖風格，要具體\n'
  + '- layout_style 建議排版方式\n'
  + '- 不要輸出其他欄位';
```

**Step 2: 同樣修改 splitTextbook 和 generateFromOutline 的 prompt**

三個函數都加入 subtitle、script、layout_style 欄位的要求。課文忠實模式的 key_points 仍然是原文不改。

**Step 3: 驗證**

在瀏覽器中測試 AI 智慧生成，確認回傳的 JSON 包含新欄位。

---

## Task 2: 重新設計 Outline Editor（outline-editor.js）

**Files:**
- Modify: `public/js/outline-editor.js`

**目標:**
1. 封面頁和內容頁顯示不同欄位
2. 新增 script、layout_style、subtitle 欄位
3. 所有欄位可編輯
4. 編輯器容器設為固定高度可捲動

**Step 1: 修改 loadOutline 保留完整資料**

```javascript
function loadOutline(data) {
  if (data && data.presentation_data && data.presentation_data.slides) {
    fullDocument = data;
    outlineData = data.presentation_data.slides || [];
  } else if (data && data.slides) {
    fullDocument = null;
    outlineData = data.slides || [];
  } else if (Array.isArray(data)) {
    fullDocument = null;
    outlineData = data || [];
  } else {
    fullDocument = null;
    outlineData = [];
  }
  renderCards();
  syncToPreview();
}
```

**Step 2: 重寫 createSlideCard 函數**

每張卡片根據頁面類型顯示不同欄位：

```javascript
function createSlideCard(slide, index) {
  var card = document.createElement('div');
  card.className = 'outline-card';
  card.dataset.index = index;

  var isFirst = (index === 0);
  var isLast = (index === outlineData.length - 1);
  var pageType = isFirst ? 'COVER' : (isLast ? 'CLOSING' : 'CONTENT');

  // Header: 類型標籤 + Slide 編號
  var header = document.createElement('div');
  header.className = 'outline-card-header';

  var typeBadge = document.createElement('span');
  typeBadge.className = 'outline-card-type outline-card-type-' + pageType.toLowerCase();
  typeBadge.textContent = pageType;
  header.appendChild(typeBadge);

  var numberSpan = document.createElement('span');
  numberSpan.className = 'outline-card-number';
  numberSpan.textContent = 'Slide ' + (index + 1);
  header.appendChild(numberSpan);

  card.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.className = 'outline-card-body';

  // Layout Style (所有頁面)
  var layoutValue = slide.layout_style || '';
  addField(body, 'layout_style', '排版方式', layoutValue, 'input', index);

  // Title (所有頁面)
  var content = slide.content || slide;
  var titleValue = (content && content.title) || slide.title || '';
  addField(body, 'title', '標題', titleValue, 'input', index);

  // Subtitle (僅封面頁)
  if (isFirst) {
    var subtitleValue = (content && content.subtitle) || slide.subtitle || '';
    addField(body, 'subtitle', '副標題', subtitleValue, 'input', index);
  }

  // Key Points (非封面頁)
  if (!isFirst) {
    var keyPoints = (content && content.key_points) || slide.key_points || [];
    var kpValue = Array.isArray(keyPoints) ? keyPoints.join('\n') : '';
    addField(body, 'key_points', '重點內容 (一行一點)', kpValue, 'textarea', index, 4);
  }

  // Script (所有頁面)
  var scriptValue = slide.script || '';
  addField(body, 'script', '講者講綱 (Script)', scriptValue, 'textarea', index, 3);

  // Visual Description (所有頁面)
  var visualDesc = slide.visual_description || '';
  addField(body, 'visual_description', 'AI 繪圖提示 (Visual Prompt)', visualDesc, 'textarea', index, 2);

  card.appendChild(body);
  return card;
}

// Helper: 建立欄位
function addField(container, field, label, value, type, index, rows) {
  var lbl = document.createElement('label');
  lbl.className = 'outline-field-label';
  lbl.textContent = label;
  container.appendChild(lbl);

  var el;
  if (type === 'textarea') {
    el = document.createElement('textarea');
    el.className = 'outline-field-textarea';
    if (field === 'visual_description') el.className += ' outline-field-secondary';
    el.rows = rows || 3;
  } else {
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'outline-field-input';
  }

  el.value = value;
  el.dataset.field = field;
  el.dataset.index = index;
  container.appendChild(el);
}
```

**Step 3: 更新 handleFieldChange 支援新欄位**

```javascript
function handleFieldChange(element) {
  var index = parseInt(element.dataset.index, 10);
  var field = element.dataset.field;
  var value = element.value;

  if (isNaN(index) || !outlineData[index]) return;

  var slide = outlineData[index];

  if (field === 'title') {
    if (slide.content) { slide.content.title = value; }
    else { slide.title = value; }
  } else if (field === 'subtitle') {
    if (slide.content) { slide.content.subtitle = value; }
    else { slide.subtitle = value; }
  } else if (field === 'key_points') {
    var points = value.split('\n').filter(function(l) { return l.trim().length > 0; });
    if (slide.content) { slide.content.key_points = points; }
    else { slide.key_points = points; }
  } else if (field === 'script') {
    slide.script = value;
  } else if (field === 'visual_description') {
    slide.visual_description = value;
  } else if (field === 'layout_style') {
    slide.layout_style = value;
  }

  debouncedSync();
}
```

**Step 4: syncToPreview 改為生成 NBLM YAML（不含 script）**

```javascript
function syncToPreview() {
  if (!previewEl) return;
  try {
    var nblmDoc = buildNblmDocument();
    var yamlString = jsyaml.dump(nblmDoc, {
      indent: 2, lineWidth: -1, noRefs: true, quotingType: '"'
    });
    previewEl.value = yamlString;
  } catch (err) {
    console.error('Failed to generate YAML:', err);
  }
}
```

---

## Task 3: 重新設計 YAML Engine（yaml-engine.js）

**Files:**
- Modify: `public/js/yaml-engine.js`

**目標:**
1. `buildYaml()` — 從 Gemini JSON 建立完整內部資料 + NBLM YAML
2. `buildNblmYaml()` — 從 outlineData 建立 NBLM YAML（供預覽和複製）
3. `buildMarkdownOutline()` — 從 outlineData 建立人類可讀 MD 大綱
4. 移除舊的 `yamlToMarkdownOutline` 在 app.js 中的函數

**Step 1: 重寫 buildYaml — 回傳完整文件物件（非字串）**

```javascript
function buildYaml(jsonData, state) {
  // ... (保留現有的 labels, styleInfo 邏輯)

  var rawSlides = jsonData.slides || [];
  var slides = [];

  for (var i = 0; i < rawSlides.length; i++) {
    var s = rawSlides[i];
    var pageType = (i === 0) ? 'cover_page' : (i === rawSlides.length - 1) ? 'closing_page' : 'content_page';

    var keyPoints = s.key_points || s.keyPoints || [];
    var visualDesc = s.visual_description || '';
    // 加上風格關鍵字和 --ar 16:9
    if (visualDesc) {
      visualDesc = styleInfo.visual_keywords + ', ' + visualDesc + ' --ar 16:9, , ' + (s.title || '');
    } else {
      visualDesc = styleInfo.visual_keywords + ' --ar 16:9, , ' + (s.title || '');
    }

    var slideObj = {
      type: pageType,
      layout_style: s.layout_style || (i === 0 ? 'Centered' : 'Title Top-Left'),
      visual_description: visualDesc,
      // 非 NBLM 欄位（供編輯器和 MD 大綱用）
      script: s.script || '',
      content: {
        title: s.title || ''
      }
    };

    if (i === 0) {
      slideObj.content.subtitle = s.subtitle || '';
    } else {
      slideObj.content.key_points = keyPoints;
    }

    slides.push(slideObj);
  }

  var doc = {
    presentation_data: {
      suggested_filename: safeTitle,
      system_instructions: sysInstructions,
      global_design: { /* ... 保持不變 ... */ },
      slides: slides
    }
  };

  // 回傳 YAML 字串（NBLM 格式，不含 script）
  var nblmDoc = stripNonNblmFields(doc);
  return jsyaml.dump(nblmDoc, YAML_OPTIONS);
}
```

**Step 2: 新增 buildNblmDocument — 去除 script 欄位**

```javascript
function stripNonNblmFields(doc) {
  var clone = JSON.parse(JSON.stringify(doc));
  if (clone.presentation_data && clone.presentation_data.slides) {
    clone.presentation_data.slides.forEach(function(slide) {
      delete slide.script;
    });
  }
  return clone;
}
```

**Step 3: 新增 buildMarkdownOutline**

```javascript
function buildMarkdownOutline(outlineData, docTitle) {
  var lines = ['# ' + (docTitle || '簡報大綱') + '\n'];

  outlineData.forEach(function(slide, idx) {
    var content = slide.content || slide;
    var title = (content && content.title) || slide.title || ('Slide ' + (idx + 1));
    var type = slide.type || 'content_page';

    lines.push('## Slide ' + (idx + 1) + ': ' + title);
    lines.push('**類型:** ' + type);

    if (slide.layout_style) {
      lines.push('**排版:** ' + slide.layout_style);
    }

    // Subtitle (封面頁)
    var subtitle = (content && content.subtitle) || slide.subtitle;
    if (subtitle) {
      lines.push('**副標題:** ' + subtitle);
    }

    // Key Points
    var kp = (content && content.key_points) || slide.key_points || [];
    if (kp.length > 0) {
      lines.push('\n**重點內容:**');
      kp.forEach(function(point) { lines.push('- ' + point); });
    }

    // Script
    if (slide.script) {
      lines.push('\n**講者講綱:**');
      lines.push('> ' + slide.script.replace(/\n/g, '\n> '));
    }

    // Visual Description
    if (slide.visual_description) {
      lines.push('\n**視覺描述:**');
      lines.push('`' + slide.visual_description + '`');
    }

    lines.push('\n---\n');
  });

  return lines.join('\n');
}
```

**Step 4: 暴露新函數**

```javascript
window.buildYaml = buildYaml;
window.buildMarkdownOutline = buildMarkdownOutline;
window.stripNonNblmFields = stripNonNblmFields;
window.downloadFile = downloadFile;
```

---

## Task 4: 重新設計 Step 4 UI 佈局（index.html + styles.css）

**Files:**
- Modify: `public/index.html`（Step 4 區塊）
- Modify: `public/css/styles.css`

**目標:**
1. 編輯器和 YAML 預覽設固定高度（如 500px），可上下捲動
2. 按鈕區（生成大綱 + 生成 YAML + 複製 YAML）放在編輯器和預覽之間的上方
3. 下載按鈕分開：下載 MD 大綱 / 下載 YAML
4. 類型標籤有顏色區分（COVER 綠色、CONTENT 藍色、CLOSING 橘色）

**Step 1: 修改 index.html Step 4 結構**

```html
<section class="step-panel hidden" id="step4Panel" data-step="4">
  <h2 class="panel-title">預覽與匯出</h2>
  <p class="panel-desc">編輯大綱內容，預覽 NotebookLM YAML</p>

  <!-- 按鈕列：放在編輯區上方中間 -->
  <div class="editor-actions">
    <button class="btn btn-primary" id="btnCopyYaml" type="button">
      📋 複製 YAML
    </button>
    <button class="btn btn-secondary" id="btnDownloadYaml" type="button">
      ⬇️ 下載 YAML
    </button>
    <button class="btn btn-secondary" id="btnDownloadMd" type="button">
      ⬇️ 下載 MD 大綱
    </button>
  </div>

  <div class="editor-split">
    <!-- Left: Outline Editor (scrollable) -->
    <div class="outline-editor-pane">
      <div class="editor-pane-header">
        <span>📝 簡報大綱編輯器</span>
      </div>
      <div class="outline-editor" id="outlineEditor">
        <p class="editor-placeholder">生成後顯示大綱編輯器...</p>
      </div>
    </div>

    <!-- Right: YAML Preview (scrollable) -->
    <div class="yaml-preview-pane">
      <div class="editor-pane-header">
        <span>📄 YAML 預覽 (NotebookLM 格式)</span>
      </div>
      <textarea class="form-textarea yaml-preview-textarea" id="yamlPreview"
        placeholder="YAML 預覽將顯示在這裡..." spellcheck="false" readonly></textarea>
    </div>
  </div>

  <!-- NotebookLM 使用說明 -->
  <div class="notebooklm-guide">
    <!-- 保持原有 ... -->
  </div>

  <div class="step-nav">
    <button class="btn btn-secondary" id="step4Prev" type="button">上一步</button>
  </div>
</section>
```

**Step 2: CSS — 固定高度可捲動**

```css
.editor-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 500px; /* 固定高度 */
  margin-bottom: 8px;
}

.outline-editor-pane,
.yaml-preview-pane {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  height: 100%; /* 填滿 grid cell */
}

.outline-editor {
  flex: 1;
  padding: 16px;
  overflow-y: auto; /* 可捲動 */
}

.yaml-preview-textarea {
  flex: 1;
  overflow-y: auto; /* 可捲動 */
}
```

**Step 3: CSS — 按鈕區居中**

```css
.editor-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
```

**Step 4: CSS — 類型標籤樣式**

```css
.outline-card-type {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.outline-card-type-cover {
  background: rgba(0, 212, 170, 0.15);
  color: var(--accent);
}

.outline-card-type-content {
  background: rgba(52, 152, 219, 0.15);
  color: var(--info);
}

.outline-card-type-closing {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
}
```

---

## Task 5: 更新 App Controller（app.js）

**Files:**
- Modify: `public/js/app.js`

**目標:**
1. 生成後將完整資料載入編輯器（包含 script、layout_style）
2. 複製 YAML 按鈕使用 NBLM 格式（不含 script）
3. 下載 MD 大綱使用 `buildMarkdownOutline()`
4. 下載 YAML 使用預覽區的內容
5. 移除舊的 `yamlToMarkdownOutline` 函數

**Step 1: 修改 initGenerateButton 的生成流程**

```javascript
// 生成後：
// 1. buildYaml() 回傳 YAML 字串（NBLM 格式）給 yamlPreview
// 2. 同時保存 Gemini 的完整 JSON 給 OutlineEditor
if (result) {
  var yamlString;
  try {
    yamlString = window.buildYaml(result, state);
  } catch (buildErr) {
    yamlString = jsyaml.dump(result);
  }

  // YAML 預覽
  if (dom.yamlPreview) dom.yamlPreview.value = yamlString;

  // 載入完整資料到編輯器
  // buildYaml 內部已建立 presentation_data 結構，但我們需要帶 script
  // 所以先解析 YAML 回物件，再把 script 合併回去
  if (typeof OutlineEditor !== 'undefined') {
    try {
      var fullDoc = jsyaml.load(yamlString);
      // 將 Gemini 原始的 script 合併回 slides
      if (fullDoc && fullDoc.presentation_data && fullDoc.presentation_data.slides) {
        var rawSlides = result.slides || [];
        fullDoc.presentation_data.slides.forEach(function(slide, i) {
          if (rawSlides[i]) {
            slide.script = rawSlides[i].script || '';
          }
        });
      }
      OutlineEditor.loadOutline(fullDoc);
    } catch (outlineErr) {
      console.warn('[OutlineEditor] Load failed:', outlineErr);
    }
  }
}
```

**Step 2: 修改下載 MD 按鈕**

```javascript
dom.btnDownloadMd.addEventListener('click', function () {
  if (typeof OutlineEditor === 'undefined') {
    showToast('沒有可下載的內容', 'error');
    return;
  }
  var slides = OutlineEditor.getOutline();
  if (!slides || slides.length === 0) {
    showToast('沒有可下載的內容', 'error');
    return;
  }
  var title = extractTitle();
  var mdContent = window.buildMarkdownOutline(slides, title);
  var filename = generateFilename('md');
  downloadFile(mdContent, filename, 'text/markdown');
  showToast('Markdown 大綱已下載', 'success');
});
```

**Step 3: 移除舊的 yamlToMarkdownOutline 函數**

刪除 app.js 中 697-748 行的 `yamlToMarkdownOutline` 函數。

**Step 4: 更新 DOM references**

確保 `btnCopyYaml`、`btnDownloadYaml`、`btnDownloadMd` 的 DOM 引用正確（因為 HTML 結構改變了）。

---

## Task 6: 整合測試和最終調整

**Step 1: 端到端測試**

1. 在瀏覽器啟動應用
2. 設定 API Key
3. 選擇維度、設定參數
4. 輸入測試素材
5. 點擊生成
6. 確認：
   - 編輯器顯示所有欄位（封面頁有 subtitle，內容頁有 key_points）
   - 每張卡片有類型標籤（COVER / CONTENT / CLOSING）
   - 所有欄位可編輯，編輯後 YAML 預覽即時更新
   - YAML 預覽不含 script 欄位
   - 複製 YAML 複製的是 NBLM 格式
   - 下載 YAML 下載的是 NBLM 格式
   - 下載 MD 大綱包含完整欄位（含 script、visual_description）
   - 編輯器和 YAML 預覽可上下捲動，不會撐大頁面
   - 按鈕區在編輯器上方居中

**Step 2: 三種模式都測試**
- AI 智慧生成
- 課文忠實模式
- 大綱轉檔模式

**Step 3: 確認 YAML 格式**
- `system_instructions` 使用 `|`（非 `|-`）
- `visual_description` 包含風格關鍵字 + `--ar 16:9`
- 無 script 欄位在 YAML 中

---

## 實作順序

1. **Task 1** (gemini.js) — Gemini prompt 改豐富輸出
2. **Task 3** (yaml-engine.js) — YAML engine 新增 MD 和 NBLM 分離
3. **Task 2** (outline-editor.js) — 編輯器改版
4. **Task 4** (HTML + CSS) — UI 佈局改版
5. **Task 5** (app.js) — 整合控制器
6. **Task 6** — 端到端測試
