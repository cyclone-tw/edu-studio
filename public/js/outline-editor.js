/**
 * outline-editor.js
 *
 * Card-based outline editor with cover/content page distinction
 * and live YAML preview sync (NBLM format, no script in YAML)
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
  // Rendering
  // ──────────────────────────────────────────────

  function renderCards() {
    if (!containerEl) return;

    if (outlineData.length === 0) {
      containerEl.innerHTML = '<p class="editor-placeholder">沒有內容可顯示</p>';
      return;
    }

    containerEl.innerHTML = '';
    outlineData.forEach(function (slide, index) {
      var card = createSlideCard(slide, index);
      containerEl.appendChild(card);
    });
  }

  function createSlideCard(slide, index) {
    var card = document.createElement('div');
    card.className = 'outline-card';
    card.dataset.index = index;

    var isFirst = (index === 0);
    var isLast = (index === outlineData.length - 1);
    var pageType = isFirst ? 'COVER' : (isLast ? 'CLOSING' : 'CONTENT');

    // Header: type badge + slide number
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

    // Access content (may be nested or flat)
    var content = slide.content || slide;

    // Layout Style (all pages)
    var layoutValue = slide.layout_style || '';
    addField(body, 'layout_style', '排版方式', layoutValue, 'input', index);

    // Title (all pages)
    var titleValue = (content && content.title) || slide.title || '';
    addField(body, 'title', '標題', titleValue, 'input', index);

    // Subtitle (cover page only)
    if (isFirst) {
      var subtitleValue = (content && content.subtitle) || slide.subtitle || '';
      addField(body, 'subtitle', '副標題', subtitleValue, 'input', index);
    }

    // Key Points (non-cover pages, but also allow on cover if present)
    if (!isFirst) {
      var keyPoints = (content && content.key_points) || slide.key_points || [];
      var kpValue = Array.isArray(keyPoints) ? keyPoints.join('\n') : '';
      addField(body, 'key_points', '重點內容 (一行一點)', kpValue, 'textarea', index, 4);
    }

    // Script (all pages)
    var scriptValue = slide.script || '';
    addField(body, 'script', '講者講綱 (Script)', scriptValue, 'textarea', index, 3);

    // Visual Description (all pages)
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
      if (target.classList.contains('outline-field-input') ||
          target.classList.contains('outline-field-textarea')) {
        handleFieldChange(target);
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

    try {
      if (typeof window.toNblmYaml === 'function') {
        previewEl.value = window.toNblmYaml(fullDocument);
      } else {
        // Fallback: dump the full document
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
    bindEvents: bindEvents
  };

})(window);
