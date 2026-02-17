# Editor Enhancement & Custom Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add global design panel, slide manipulation (add/delete/move/duplicate), and a "fully custom" mode to the editor.

**Architecture:** Extend `outline-editor.js` with a collapsible global design panel and slide CRUD operations. Add `rebuildFromGlobalDesign()` to `yaml-engine.js` to regenerate `system_instructions` from editable fields. Add `custom` mode to `app.js` that skips Steps 1-3.

**Tech Stack:** Vanilla JS (ES5 IIFE pattern), CSS3, js-yaml CDN

---

### Task 1: yaml-engine.js — Extract rebuildSystemInstructions + add font size fields

**Files:**
- Modify: `public/js/yaml-engine.js:62-196`

**What to do:**

1. Extract `system_instructions` generation into a standalone function `rebuildSystemInstructions(globalDesign, labels)` that takes the `global_design` object and labels, and returns the instructions string. This decouples system_instructions from `buildYaml()` so the editor can call it directly when users modify global design fields.

2. Add `title_size`, `body_size`, `subtitle_size` fields to the typography section in `buildYaml()`.

3. Add a new export `rebuildFullDocument(doc)` that takes an existing full document object, regenerates `system_instructions` from its `global_design`, and returns the updated document. This is what the editor calls after any global design field change.

4. Expose `NBLM_STYLE_MAP` globally as `window.NBLM_STYLE_MAP` so the editor can list available presets.

**Implementation:**

```javascript
// New function — extracted from buildYaml lines 73-110
function rebuildSystemInstructions(globalDesign) {
  var typo = globalDesign.typography || {};
  var palette = globalDesign.color_palette || {};
  var rules = globalDesign.common_layout_rules || [];

  var s = '[SYSTEM META - INTERNAL USE ONLY - DO NOT PRESENT AS CONTENT]\n';
  s += 'You are a top-tier visual design director creating educational slides.\n';
  s += 'Follow the design definitions below with absolute precision.\n\n';

  s += '[Absolutely Prohibited Output Format Rules]\n';
  s += '* Complete Exclusion of Markdown Symbols: Do not include #, *, **\n';
  s += '* Plain Text Only: no decorative symbols, no emojis in slide text\n';
  s += '* Never generate more or fewer slides than specified in the slides array\n';
  s += '* Do NOT merge, skip, reorder, or summarize any slide content\n';
  s += '* key_points text must be reproduced verbatim, 100% faithful, no rewriting\n';
  s += '* Avoid using Title: Subtitle formats - they appear very AI-generated\n\n';

  s += '[Content Rules]\n';
  s += '* Each slide YAML title field = that slide heading\n';
  s += '* Each slide key_points = exact text content to display on that slide\n';
  s += '* visual_description = image generation prompt for that slide background/illustration\n';
  s += '* layout_style = the layout arrangement to follow for that slide\n';
  s += '* 1 slide = 1 message, one idea per slide\n\n';

  s += '[Typography Hierarchy]\n';
  s += '* Headlines at large size occupying 25-40% of the slide area\n';
  s += '* Extreme Jump Ratio: ' + (typo.jump_ratio || '5:1 or more between headline and body text') + '\n';
  s += '* Title: extra-bold, ' + (typo.title_font || 'Noto Sans TC');
  if (typo.title_size) s += ', ' + typo.title_size + 'px';
  s += '\n';
  s += '* Body: regular weight, ' + (typo.body_font || 'Noto Sans TC') + ', generous line spacing';
  if (typo.body_size) s += ', ' + typo.body_size + 'px';
  s += '\n';
  if (typo.subtitle_size) s += '* Subtitle: ' + typo.subtitle_size + 'px\n';
  s += '* Key words highlighted with accent color background or underline\n\n';

  s += '[Color Palette]\n';
  s += '* Background: ' + (palette.background || '#FFFFFF') + '\n';
  s += '* Text: ' + (palette.text || '#333333') + '\n';
  s += '* Accent: ' + (palette.accent || '#00d4aa') + '\n\n';

  s += '[Layout Rules]\n';
  for (var i = 0; i < rules.length; i++) {
    s += '* ' + rules[i] + '\n';
  }
  if (rules.length === 0) {
    s += '* left-aligned layouts preferred\n';
    s += '* Wide margins, lots of white space\n';
  }
  s += '* Cover slide: centered layout with ultra-massive title\n\n';

  if (globalDesign.target_audience || globalDesign.learning_stage) {
    s += '[Design Context]\n';
    if (globalDesign.target_audience) s += '* Presenter: ' + globalDesign.target_audience + '\n';
    if (globalDesign.learning_stage) s += '* Audience: ' + globalDesign.learning_stage + '\n';
    if (globalDesign.scenario) s += '* Scenario: ' + globalDesign.scenario + '\n';
  }
  s += '(End of System Instructions)\n';

  return s;
}

// New function — rebuild document's system_instructions from its global_design
function rebuildFullDocument(doc) {
  if (!doc || !doc.presentation_data) return doc;
  var gd = doc.presentation_data.global_design;
  if (gd) {
    doc.presentation_data.system_instructions = rebuildSystemInstructions(gd);
  }
  return doc;
}
```

Update `buildYaml()` to:
- Call `rebuildSystemInstructions()` instead of inline string building
- Add `title_size: 48`, `body_size: 18`, `subtitle_size: 28` defaults to typography

Update exports:
```javascript
window.buildYaml = buildYaml;
window.toNblmYaml = toNblmYaml;
window.buildMarkdownOutline = buildMarkdownOutline;
window.downloadFile = downloadFile;
window.rebuildFullDocument = rebuildFullDocument;
window.NBLM_STYLE_MAP = NBLM_STYLE_MAP;
```

**Verify:** Open browser console, confirm `window.NBLM_STYLE_MAP` and `window.rebuildFullDocument` exist. Generate a presentation, check YAML output still matches expected format with new font size fields in typography.

**Commit:**
```bash
git add public/js/yaml-engine.js
git commit -m "refactor: extract rebuildSystemInstructions, add font size fields, expose NBLM_STYLE_MAP"
```

---

### Task 2: outline-editor.js — Global Design Panel

**Files:**
- Modify: `public/js/outline-editor.js`

**What to do:**

Add a collapsible "Global Design" panel at the top of the editor, before slide cards. This panel shows all `global_design` fields from the current `fullDocument` and allows editing. Changes trigger `rebuildFullDocument()` + `syncToPreview()`.

**Implementation:**

Add these functions to outline-editor.js:

```javascript
function renderGlobalDesignPanel() {
  if (!containerEl || !fullDocument) return null;

  var gd = fullDocument.presentation_data.global_design || {};
  var typo = gd.typography || {};
  var palette = gd.color_palette || {};
  var rules = gd.common_layout_rules || [];

  var panel = document.createElement('div');
  panel.className = 'global-design-panel';
  panel.id = 'globalDesignPanel';

  // Collapsible header
  var header = document.createElement('div');
  header.className = 'global-design-header';
  header.innerHTML = '<span class="global-design-toggle">▼</span> <span>全域風格設定</span>';
  header.addEventListener('click', function () {
    var body = panel.querySelector('.global-design-body');
    var toggle = header.querySelector('.global-design-toggle');
    if (body.classList.contains('collapsed')) {
      body.classList.remove('collapsed');
      toggle.textContent = '▼';
    } else {
      body.classList.add('collapsed');
      toggle.textContent = '▶';
    }
  });
  panel.appendChild(header);

  var body = document.createElement('div');
  body.className = 'global-design-body';

  // Preset loader dropdown (for custom mode or quick switch)
  var presetRow = document.createElement('div');
  presetRow.className = 'gd-field-row';
  var presetLabel = document.createElement('label');
  presetLabel.className = 'gd-field-label';
  presetLabel.textContent = '載入預設風格';
  var presetSelect = document.createElement('select');
  presetSelect.className = 'gd-field-select';
  presetSelect.id = 'gdPresetLoader';
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- 選擇預設 --';
  presetSelect.appendChild(defaultOpt);
  var styleMap = window.NBLM_STYLE_MAP || {};
  var presets = window.PRESETS ? window.PRESETS.visualStyles : [];
  for (var p = 0; p < presets.length; p++) {
    var opt = document.createElement('option');
    opt.value = presets[p].id;
    opt.textContent = presets[p].label;
    presetSelect.appendChild(opt);
  }
  presetRow.appendChild(presetLabel);
  presetRow.appendChild(presetSelect);
  body.appendChild(presetRow);

  // suggested_filename
  addGdField(body, 'suggested_filename', '檔案名稱', fullDocument.presentation_data.suggested_filename || '', 'input');

  // Style fields
  addGdField(body, 'style_name', '風格名稱 (style_name)', gd.style_name || '', 'input');
  addGdField(body, 'tone', '風格描述 (tone, 英文)', gd.tone || '', 'input');
  addGdField(body, 'visual_keywords', '視覺關鍵字', gd.visual_keywords || '', 'input');

  // Color palette — 3 color pickers side by side
  var colorRow = document.createElement('div');
  colorRow.className = 'gd-color-row';
  addColorField(colorRow, 'bg', '背景色', palette.background || '#FFFFFF');
  addColorField(colorRow, 'text_color', '文字色', palette.text || '#333333');
  addColorField(colorRow, 'accent', '強調色', palette.accent || '#00d4aa');
  body.appendChild(colorRow);

  // Typography
  var typoRow = document.createElement('div');
  typoRow.className = 'gd-typo-row';
  addGdField(typoRow, 'title_font', '標題字型', typo.title_font || '', 'input');
  addGdField(typoRow, 'body_font', '內文字型', typo.body_font || '', 'input');
  body.appendChild(typoRow);

  var sizeRow = document.createElement('div');
  sizeRow.className = 'gd-size-row';
  addGdField(sizeRow, 'title_size', '標題字級 (px)', typo.title_size || '48', 'number');
  addGdField(sizeRow, 'subtitle_size', '副標題字級', typo.subtitle_size || '28', 'number');
  addGdField(sizeRow, 'body_size', '內文字級', typo.body_size || '18', 'number');
  addGdField(sizeRow, 'jump_ratio', '跳躍比', typo.jump_ratio || '5:1', 'input');
  body.appendChild(sizeRow);

  // Layout rules
  addGdField(body, 'layout_rules', '排版規則 (一行一條)', rules.join('\n'), 'textarea', 3);

  panel.appendChild(body);
  return panel;
}

function addGdField(container, field, label, value, type, rows) {
  var wrapper = document.createElement('div');
  wrapper.className = 'gd-field';
  var lbl = document.createElement('label');
  lbl.className = 'gd-field-label';
  lbl.textContent = label;
  wrapper.appendChild(lbl);

  var el;
  if (type === 'textarea') {
    el = document.createElement('textarea');
    el.className = 'gd-field-input';
    el.rows = rows || 3;
  } else if (type === 'number') {
    el = document.createElement('input');
    el.type = 'number';
    el.className = 'gd-field-input gd-field-number';
  } else {
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'gd-field-input';
  }
  el.value = value;
  el.dataset.gdField = field;
  wrapper.appendChild(el);
  container.appendChild(wrapper);
}

function addColorField(container, field, label, value) {
  var wrapper = document.createElement('div');
  wrapper.className = 'gd-color-field';
  var lbl = document.createElement('label');
  lbl.className = 'gd-field-label';
  lbl.textContent = label;
  wrapper.appendChild(lbl);

  var row = document.createElement('div');
  row.className = 'gd-color-input-row';

  var picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'gd-color-picker';
  picker.value = value;
  picker.dataset.gdField = field;

  var hex = document.createElement('input');
  hex.type = 'text';
  hex.className = 'gd-field-input gd-color-hex';
  hex.value = value;
  hex.dataset.gdField = field;

  // Sync color picker ↔ hex input
  picker.addEventListener('input', function () {
    hex.value = picker.value;
    handleGdChange(field, picker.value);
  });
  hex.addEventListener('input', function () {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
      picker.value = hex.value;
    }
    handleGdChange(field, hex.value);
  });

  row.appendChild(picker);
  row.appendChild(hex);
  wrapper.appendChild(row);
  container.appendChild(wrapper);
}
```

**Event handling for global design fields:**

```javascript
function handleGdChange(field, value) {
  if (!fullDocument || !fullDocument.presentation_data) return;
  var pd = fullDocument.presentation_data;
  var gd = pd.global_design;
  if (!gd) return;

  if (field === 'suggested_filename') {
    pd.suggested_filename = value;
  } else if (field === 'style_name') {
    gd.style_name = value;
  } else if (field === 'tone') {
    gd.tone = value;
  } else if (field === 'visual_keywords') {
    gd.visual_keywords = value;
  } else if (field === 'bg') {
    gd.color_palette.background = value;
  } else if (field === 'text_color') {
    gd.color_palette.text = value;
  } else if (field === 'accent') {
    gd.color_palette.accent = value;
  } else if (field === 'title_font') {
    gd.typography.title_font = value;
    gd.typography.headings = 'extra-bold ' + value + ', occupying 25-40% of slide area';
  } else if (field === 'body_font') {
    gd.typography.body_font = value;
    gd.typography.body = 'regular weight ' + value + ', generous letter spacing and line height';
  } else if (field === 'title_size') {
    gd.typography.title_size = value;
  } else if (field === 'subtitle_size') {
    gd.typography.subtitle_size = value;
  } else if (field === 'body_size') {
    gd.typography.body_size = value;
  } else if (field === 'jump_ratio') {
    gd.typography.jump_ratio = value;
  } else if (field === 'layout_rules') {
    gd.common_layout_rules = value.split('\n').filter(function (l) { return l.trim().length > 0; });
  }

  // Rebuild system_instructions from updated global_design
  if (typeof window.rebuildFullDocument === 'function') {
    window.rebuildFullDocument(fullDocument);
  }

  debouncedSync();
}

// Handle preset loader
function handlePresetLoad(styleId) {
  var styleMap = window.NBLM_STYLE_MAP || {};
  var info = styleMap[styleId];
  if (!info || !fullDocument) return;

  var gd = fullDocument.presentation_data.global_design;
  gd.style_name = info.style_name;
  gd.tone = info.tone;
  gd.visual_keywords = info.visual_keywords;
  gd.color_palette = { background: info.bg, text: info.text, accent: info.accent };
  gd.typography.title_font = info.title_font;
  gd.typography.body_font = info.body_font;
  gd.typography.headings = 'extra-bold ' + info.title_font + ', occupying 25-40% of slide area';
  gd.typography.body = 'regular weight ' + info.body_font + ', generous letter spacing and line height';

  if (typeof window.rebuildFullDocument === 'function') {
    window.rebuildFullDocument(fullDocument);
  }

  // Re-render the global design panel to reflect new values
  renderCards();
  syncToPreview();
}
```

**Update `renderCards()` to include global design panel:**

```javascript
function renderCards() {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  // Render global design panel first (if fullDocument exists)
  if (fullDocument) {
    var gdPanel = renderGlobalDesignPanel();
    if (gdPanel) containerEl.appendChild(gdPanel);
  }

  if (outlineData.length === 0 && !fullDocument) {
    containerEl.innerHTML = '<p class="editor-placeholder">沒有內容可顯示</p>';
    return;
  }

  // Render slide cards
  outlineData.forEach(function (slide, index) {
    var card = createSlideCard(slide, index);
    containerEl.appendChild(card);
  });

  // Add "new slide" button at bottom
  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-add-slide';
  addBtn.innerHTML = '+ 新增投影片';
  addBtn.addEventListener('click', showAddSlideMenu);
  containerEl.appendChild(addBtn);
}
```

**Update `bindEvents()` to handle global design input:**

```javascript
function bindEvents() {
  if (!containerEl) return;

  containerEl.addEventListener('input', function (e) {
    var target = e.target;
    if (target.dataset.gdField) {
      handleGdChange(target.dataset.gdField, target.value);
      return;
    }
    if (target.classList.contains('outline-field-input') ||
        target.classList.contains('outline-field-textarea')) {
      handleFieldChange(target);
    }
  });

  containerEl.addEventListener('change', function (e) {
    if (e.target.id === 'gdPresetLoader' && e.target.value) {
      handlePresetLoad(e.target.value);
    }
  });
}
```

**Verify:** Generate a presentation. Confirm global design panel appears above slide cards. Edit a color → check YAML updates. Load a different preset → confirm fields update.

**Commit:**
```bash
git add public/js/outline-editor.js
git commit -m "feat: add global design panel with all editable fields and preset loader"
```

---

### Task 3: outline-editor.js — Slide CRUD (Add/Delete/Move/Duplicate)

**Files:**
- Modify: `public/js/outline-editor.js`

**What to do:**

Add slide manipulation functions and UI buttons.

**Implementation — CRUD functions:**

```javascript
function addSlide(templateType, insertIndex) {
  var slide = {
    type: 'content_page',
    layout_style: 'left-aligned title top-left, text on left, visual on right, asymmetrical split',
    visual_description: '',
    script: '',
    content: { title: '', key_points: [] }
  };

  if (templateType === 'cover') {
    slide.type = 'cover_page';
    slide.layout_style = 'centered layout, ultra-massive title occupying 40% of slide area';
    slide.content.title = '簡報標題';
    slide.content.subtitle = '副標題';
    slide.content.key_points = [];
  } else if (templateType === 'content') {
    slide.content.title = '頁面標題';
    slide.content.key_points = ['重點內容'];
  } else if (templateType === 'closing') {
    slide.type = 'closing_page';
    slide.content.title = '總結';
    slide.content.key_points = ['總結重點'];
  }
  // 'blank' → use defaults (empty)

  if (typeof insertIndex === 'number') {
    outlineData.splice(insertIndex, 0, slide);
  } else {
    outlineData.push(slide);
  }

  recalcPageTypes();
  updateTotalPages();
  renderCards();
  syncToPreview();
}

function removeSlide(index) {
  if (outlineData.length <= 1) {
    window.showToast('至少需要保留一頁', 'error');
    return;
  }
  outlineData.splice(index, 1);
  recalcPageTypes();
  updateTotalPages();
  renderCards();
  syncToPreview();
}

function moveSlide(index, direction) {
  var newIndex = index + direction; // direction: -1 (up) or +1 (down)
  if (newIndex < 0 || newIndex >= outlineData.length) return;
  var temp = outlineData[index];
  outlineData[index] = outlineData[newIndex];
  outlineData[newIndex] = temp;
  recalcPageTypes();
  renderCards();
  syncToPreview();
}

function duplicateSlide(index) {
  var original = outlineData[index];
  var clone = JSON.parse(JSON.stringify(original));
  outlineData.splice(index + 1, 0, clone);
  recalcPageTypes();
  updateTotalPages();
  renderCards();
  syncToPreview();
}

function recalcPageTypes() {
  for (var i = 0; i < outlineData.length; i++) {
    if (i === 0) outlineData[i].type = 'cover_page';
    else if (i === outlineData.length - 1) outlineData[i].type = 'closing_page';
    else outlineData[i].type = 'content_page';
  }
}

function updateTotalPages() {
  if (fullDocument && fullDocument.presentation_data && fullDocument.presentation_data.global_design) {
    fullDocument.presentation_data.global_design.total_pages = outlineData.length;
  }
}
```

**Add action buttons to each card header** (modify `createSlideCard`):

```javascript
// After numberSpan in createSlideCard, add action buttons:
var actions = document.createElement('div');
actions.className = 'outline-card-actions';

var btnUp = document.createElement('button');
btnUp.className = 'card-action-btn';
btnUp.title = '上移';
btnUp.textContent = '↑';
btnUp.disabled = (index === 0);
btnUp.addEventListener('click', function () { moveSlide(index, -1); });

var btnDown = document.createElement('button');
btnDown.className = 'card-action-btn';
btnDown.title = '下移';
btnDown.textContent = '↓';
btnDown.disabled = (index === outlineData.length - 1);
btnDown.addEventListener('click', function () { moveSlide(index, 1); });

var btnDup = document.createElement('button');
btnDup.className = 'card-action-btn';
btnDup.title = '複製';
btnDup.textContent = '⧉';
btnDup.addEventListener('click', function () { duplicateSlide(index); });

var btnDel = document.createElement('button');
btnDel.className = 'card-action-btn card-action-btn-danger';
btnDel.title = '刪除';
btnDel.textContent = '✕';
btnDel.addEventListener('click', function () {
  if (confirm('確定刪除此頁？')) removeSlide(index);
});

actions.appendChild(btnUp);
actions.appendChild(btnDown);
actions.appendChild(btnDup);
actions.appendChild(btnDel);
header.appendChild(actions);
```

**Add slide template menu:**

```javascript
function showAddSlideMenu(e) {
  // Remove existing menu
  var existing = document.querySelector('.add-slide-menu');
  if (existing) existing.remove();

  var menu = document.createElement('div');
  menu.className = 'add-slide-menu';

  var templates = [
    { type: 'cover', label: '封面頁', desc: '預填標題 + 副標題' },
    { type: 'content', label: '內容頁', desc: '預填標題 + 重點內容' },
    { type: 'closing', label: '結尾頁', desc: '預填總結標題' },
    { type: 'blank', label: '空白頁', desc: '全部欄位空白' }
  ];

  templates.forEach(function (t) {
    var item = document.createElement('button');
    item.className = 'add-slide-menu-item';
    item.innerHTML = '<strong>' + t.label + '</strong><span>' + t.desc + '</span>';
    item.addEventListener('click', function () {
      addSlide(t.type);
      menu.remove();
    });
    menu.appendChild(item);
  });

  // Position near the button
  e.target.parentNode.insertBefore(menu, e.target);

  // Close on outside click
  setTimeout(function () {
    document.addEventListener('click', function closeMenu(ev) {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}
```

**Update exports:**
```javascript
window.OutlineEditor = {
  init: init,
  loadOutline: loadOutline,
  getOutline: getOutline,
  getFullDocument: getFullDocument,
  clear: clear,
  bindEvents: bindEvents,
  addSlide: addSlide,
  createEmptyDocument: createEmptyDocument  // Task 4 will add this
};
```

**Verify:** Generate a presentation. Confirm ↑↓⧉✕ buttons appear on each card. Test move up/down, duplicate, delete. Confirm YAML updates after each operation. Test "新增投影片" button and template menu.

**Commit:**
```bash
git add public/js/outline-editor.js
git commit -m "feat: add slide CRUD — add/delete/move/duplicate with template menu"
```

---

### Task 4: outline-editor.js + app.js — Custom Mode ("完全自訂")

**Files:**
- Modify: `public/js/outline-editor.js`
- Modify: `public/js/app.js`
- Modify: `public/index.html`

**What to do:**

1. Add `createEmptyDocument(styleId)` to outline-editor.js that creates a blank `fullDocument` with global_design from a preset (or empty defaults).

2. Add third mode tab "完全自訂" to index.html.

3. In app.js, handle `custom` mode: skip Steps 1-3, go directly to Step 4, initialize empty document.

**Implementation — outline-editor.js:**

```javascript
function createEmptyDocument(styleId) {
  var styleMap = window.NBLM_STYLE_MAP || {};
  var info = styleMap[styleId] || {
    style_name: 'custom',
    visual_keywords: '',
    title_font: 'Noto Sans TC',
    body_font: 'Noto Sans TC',
    bg: '#FFFFFF',
    text: '#333333',
    accent: '#00d4aa',
    tone: ''
  };

  var doc = {
    presentation_data: {
      suggested_filename: '自訂簡報',
      system_instructions: '',
      global_design: {
        tone: info.tone,
        style_name: info.style_name,
        visual_keywords: info.visual_keywords,
        color_palette: {
          background: info.bg,
          text: info.text,
          accent: info.accent
        },
        typography: {
          headings: 'extra-bold ' + info.title_font + ', occupying 25-40% of slide area',
          body: 'regular weight ' + info.body_font + ', generous letter spacing and line height',
          title_font: info.title_font,
          body_font: info.body_font,
          title_size: '48',
          subtitle_size: '28',
          body_size: '18',
          jump_ratio: '5:1 or more between headline and body text'
        },
        common_layout_rules: [
          'left-aligned layouts, ban simplistic centered alignment for content slides',
          'wide margins, lots of white space, negative space',
          'text on left and visual on right, or asymmetrical split',
          '1 slide = 1 message, one idea per slide',
          'key words highlighted with accent color'
        ],
        total_pages: 0
      },
      slides: []
    }
  };

  // Generate system_instructions
  if (typeof window.rebuildFullDocument === 'function') {
    window.rebuildFullDocument(doc);
  }

  return doc;
}
```

**Implementation — index.html:**

Add third mode tab (after the existing two):
```html
<nav class="mode-tabs" id="modeTabs">
  <button class="mode-tab active" data-mode="ai" type="button">AI 智慧生成</button>
  <button class="mode-tab" data-mode="textbook" type="button">課文忠實模式</button>
  <button class="mode-tab" data-mode="custom" type="button">完全自訂</button>
</nav>
```

**Implementation — app.js:**

Update `setMode()`:
```javascript
function setMode(mode) {
  state.mode = mode;

  $$('#modeTabs .mode-tab').forEach(function (tab) {
    tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
  });

  dom.stepProgress.classList.remove('hidden');

  if (mode === 'ai') {
    dom.aiInputArea.classList.remove('hidden');
    dom.textbookInputArea.classList.add('hidden');
  } else if (mode === 'textbook') {
    dom.aiInputArea.classList.add('hidden');
    dom.textbookInputArea.classList.remove('hidden');
  } else if (mode === 'custom') {
    // Custom mode: skip steps, go directly to editor
    dom.aiInputArea.classList.add('hidden');
    dom.textbookInputArea.classList.add('hidden');
    dom.stepProgress.classList.add('hidden');

    // Initialize empty document and load into editor
    if (typeof OutlineEditor !== 'undefined') {
      var emptyDoc = OutlineEditor.createEmptyDocument();
      OutlineEditor.loadOutline(emptyDoc);
    }

    goToStep(4);
    return;
  }

  goToStep(state.step);
}
```

**Verify:** Click "完全自訂" tab. Confirm Steps 1-3 are hidden, editor appears with global design panel (empty/default) and "新增投影片" button. Add slides, edit fields, confirm YAML updates.

**Commit:**
```bash
git add public/js/outline-editor.js public/js/app.js public/index.html
git commit -m "feat: add custom mode — skip steps, create from scratch with empty editor"
```

---

### Task 5: styles.css — Global Design Panel & Slide CRUD Styles

**Files:**
- Modify: `public/css/styles.css`

**What to do:**

Add CSS for all new UI elements: global design panel, color pickers, card action buttons, add-slide button, template menu.

**Implementation:**

```css
/* ── Global Design Panel ── */
.global-design-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.global-design-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
  user-select: none;
}

.global-design-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.global-design-toggle {
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.global-design-body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.global-design-body.collapsed {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}

.gd-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gd-field-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.gd-field-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.gd-field-input:focus {
  border-color: var(--accent);
  outline: none;
}

.gd-field-number {
  width: 80px;
}

.gd-field-select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
}

.gd-field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Color fields */
.gd-color-row {
  display: flex;
  gap: 16px;
}

.gd-color-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gd-color-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.gd-color-picker {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: var(--bg);
}

.gd-color-hex {
  width: 90px !important;
  font-family: 'SF Mono', monospace;
  font-size: 12px;
}

/* Typography row */
.gd-typo-row {
  display: flex;
  gap: 16px;
}

.gd-typo-row .gd-field {
  flex: 1;
}

/* Size row */
.gd-size-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.gd-size-row .gd-field {
  flex: 1;
  min-width: 80px;
}

/* ── Slide Card Action Buttons ── */
.outline-card-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.card-action-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s;
  padding: 0;
}

.card-action-btn:hover {
  background: var(--surface);
  color: var(--text-primary);
  border-color: var(--accent);
}

.card-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.card-action-btn-danger:hover {
  border-color: #e74c3c;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

/* ── Add Slide Button ── */
.btn-add-slide {
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-add-slide:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(0, 212, 170, 0.05);
}

/* ── Add Slide Template Menu ── */
.add-slide-menu {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: 8px;
  margin-bottom: 8px;
  z-index: 10;
}

.add-slide-menu-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.add-slide-menu-item:hover {
  background: rgba(0, 212, 170, 0.1);
}

.add-slide-menu-item strong {
  font-size: 14px;
}

.add-slide-menu-item span {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .gd-color-row,
  .gd-typo-row {
    flex-direction: column;
  }

  .gd-size-row {
    flex-wrap: wrap;
  }

  .gd-size-row .gd-field {
    min-width: 45%;
  }
}
```

**Verify:** Visually check all components in both desktop and mobile view. Confirm dark theme consistency, color picker works, buttons have proper hover states.

**Commit:**
```bash
git add public/css/styles.css
git commit -m "feat: add styles for global design panel, slide CRUD buttons, template menu"
```

---

### Task 6: Integration Testing & Edge Cases

**Files:**
- Modify: `public/js/outline-editor.js` (minor fixes)
- Modify: `public/js/app.js` (minor fixes)

**What to do:**

Test all three modes end-to-end and fix edge cases:

1. **AI mode → Step 4**: Generate presentation → global design panel auto-populated → edit tone → YAML updates
2. **Custom mode**: Empty editor → add 3 slides → edit global design → copy YAML → verify valid YAML
3. **Mode switching**: Switch from AI → Custom → AI → verify state doesn't leak
4. **Edge cases**:
   - Delete all slides except one → "至少保留一頁" toast
   - Move first slide up → disabled button
   - Move last slide down → disabled button
   - Load preset in global design → all fields update
   - Custom mode + no slides → YAML should still be valid (empty slides array)

Fix any issues found during testing. Ensure `loadOutline()` properly handles the case where custom mode switches to AI mode (clear state).

**Update `setMode()` in app.js** to properly handle mode transitions:

```javascript
// When switching away from custom mode back to AI/textbook,
// reset step to 1 if not already on step 4 with generated content
if (mode !== 'custom' && state.mode === 'custom') {
  state.step = 1;
}
```

**Verify:** All three modes work. YAML is valid in all cases. No console errors. Copy/download buttons work in custom mode.

**Commit:**
```bash
git add public/js/outline-editor.js public/js/app.js
git commit -m "fix: integration testing — mode switching, edge cases, state cleanup"
```
