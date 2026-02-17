/**
 * outline-editor.js
 *
 * Card-based outline editor with cover/content page distinction,
 * global design panel, slide CRUD, and live YAML preview sync.
 */
(function (window) {
  'use strict';

  var fullDocument = null;
  var outlineData = [];
  var containerEl = null;
  var previewEl = null;
  var updateCallback = null;
  var debounceTimer = null;

  function init(container, preview, onUpdate) {
    containerEl = container;
    previewEl = preview;
    updateCallback = onUpdate;
  }

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

  function getOutline() {
    return outlineData;
  }

  function getFullDocument() {
    return fullDocument;
  }

  function clear() {
    outlineData = [];
    fullDocument = null;
    if (containerEl) {
      containerEl.innerHTML = '<p class="editor-placeholder">生成後顯示大綱編輯器...</p>';
    }
    if (previewEl) {
      previewEl.value = '';
    }
  }

  // ──────────────────────────────────────────────
  // Create Empty Document (for custom mode)
  // ──────────────────────────────────────────────

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

    if (typeof window.rebuildFullDocument === 'function') {
      window.rebuildFullDocument(doc);
    }

    return doc;
  }

  // ──────────────────────────────────────────────
  // Global Design Panel
  // ──────────────────────────────────────────────

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

    // Preset loader dropdown
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

    picker.addEventListener('input', function () {
      hex.value = picker.value;
      handleGdChange(field, picker.value);
    });
    hex.addEventListener('input', function () {
      if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
        picker.value = hex.value;
        handleGdChange(field, hex.value);
      }
    });

    row.appendChild(picker);
    row.appendChild(hex);
    wrapper.appendChild(row);
    container.appendChild(wrapper);
  }

  // ──────────────────────────────────────────────
  // Global Design Event Handling
  // ──────────────────────────────────────────────

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

    if (typeof window.rebuildFullDocument === 'function') {
      window.rebuildFullDocument(fullDocument);
    }

    debouncedSync();
  }

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

    renderCards();
    syncToPreview();
  }

  // ──────────────────────────────────────────────
  // Slide CRUD
  // ──────────────────────────────────────────────

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
    var newIndex = index + direction;
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

  // ──────────────────────────────────────────────
  // Add Slide Template Menu
  // ──────────────────────────────────────────────

  function showAddSlideMenu(e) {
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

    var btn = e.currentTarget || e.target;
    btn.parentNode.insertBefore(menu, btn);

    setTimeout(function () {
      document.addEventListener('click', function closeMenu(ev) {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  // ──────────────────────────────────────────────
  // Rendering
  // ──────────────────────────────────────────────

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

  function createSlideCard(slide, index) {
    var card = document.createElement('div');
    card.className = 'outline-card';
    card.dataset.index = index;

    var isFirst = (index === 0);
    var isLast = (index === outlineData.length - 1);
    var pageType = isFirst ? 'COVER' : (isLast ? 'CLOSING' : 'CONTENT');

    // Header: type badge + slide number + action buttons
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

    // Action buttons
    var actions = document.createElement('div');
    actions.className = 'outline-card-actions';

    var btnUp = document.createElement('button');
    btnUp.className = 'card-action-btn';
    btnUp.title = '上移';
    btnUp.textContent = '↑';
    btnUp.disabled = (index === 0);
    (function (idx) {
      btnUp.addEventListener('click', function () { moveSlide(idx, -1); });
    })(index);

    var btnDown = document.createElement('button');
    btnDown.className = 'card-action-btn';
    btnDown.title = '下移';
    btnDown.textContent = '↓';
    btnDown.disabled = (index === outlineData.length - 1);
    (function (idx) {
      btnDown.addEventListener('click', function () { moveSlide(idx, 1); });
    })(index);

    var btnDup = document.createElement('button');
    btnDup.className = 'card-action-btn';
    btnDup.title = '複製';
    btnDup.textContent = '⧉';
    (function (idx) {
      btnDup.addEventListener('click', function () { duplicateSlide(idx); });
    })(index);

    var btnDel = document.createElement('button');
    btnDel.className = 'card-action-btn card-action-btn-danger';
    btnDel.title = '刪除';
    btnDel.textContent = '✕';
    (function (idx) {
      btnDel.addEventListener('click', function () {
        if (confirm('確定刪除此頁？')) removeSlide(idx);
      });
    })(index);

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDup);
    actions.appendChild(btnDel);
    header.appendChild(actions);

    card.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'outline-card-body';

    var content = slide.content || slide;

    // Layout Style
    var layoutValue = slide.layout_style || '';
    addField(body, 'layout_style', '排版方式', layoutValue, 'input', index);

    // Title
    var titleValue = (content && content.title) || slide.title || '';
    addField(body, 'title', '標題', titleValue, 'input', index);

    // Subtitle (cover page only)
    if (isFirst) {
      var subtitleValue = (content && content.subtitle) || slide.subtitle || '';
      addField(body, 'subtitle', '副標題', subtitleValue, 'input', index);
    }

    // Key Points
    if (!isFirst) {
      var keyPoints = (content && content.key_points) || slide.key_points || [];
      var kpValue = Array.isArray(keyPoints) ? keyPoints.join('\n') : '';
      addField(body, 'key_points', '重點內容 (一行一點)', kpValue, 'textarea', index, 4);
    }

    // Script
    var scriptValue = slide.script || '';
    addField(body, 'script', '講者講綱 (Script)', scriptValue, 'textarea', index, 3);

    // Visual Description
    var visualDesc = slide.visual_description || '';
    addField(body, 'visual_description', 'AI 繪圖提示 (Visual Prompt)', visualDesc, 'textarea', index, 2);

    card.appendChild(body);
    return card;
  }

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

  // ──────────────────────────────────────────────
  // Event Handling
  // ──────────────────────────────────────────────

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
      var points = value.split('\n').filter(function (l) { return l.trim().length > 0; });
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

  function debouncedSync() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(function () {
      syncToPreview();
      if (updateCallback) {
        updateCallback(outlineData);
      }
    }, 300);
  }

  // ──────────────────────────────────────────────
  // YAML Sync — generates NBLM format (no script)
  // ──────────────────────────────────────────────

  function syncToPreview() {
    if (!previewEl || !fullDocument) return;

    // Ensure slides array stays in sync with fullDocument
    fullDocument.presentation_data.slides = outlineData;

    try {
      if (typeof window.toNblmYaml === 'function') {
        previewEl.value = window.toNblmYaml(fullDocument);
      } else {
        previewEl.value = jsyaml.dump(fullDocument, {
          indent: 2, lineWidth: -1, noRefs: true, quotingType: '"'
        });
      }
    } catch (err) {
      console.error('Failed to generate YAML:', err);
    }
  }

  // ──────────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────────

  window.OutlineEditor = {
    init: init,
    loadOutline: loadOutline,
    getOutline: getOutline,
    getFullDocument: getFullDocument,
    clear: clear,
    bindEvents: bindEvents,
    addSlide: addSlide,
    createEmptyDocument: createEmptyDocument
  };

})(window);
