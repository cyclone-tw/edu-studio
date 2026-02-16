/**
 * outline-editor.js
 *
 * Card-based outline editor with live YAML preview sync
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
      fullDocument = data;
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

  function clear() {
    outlineData = [];
    if (containerEl) {
      containerEl.innerHTML = '<p class="editor-placeholder">生成後顯示大綱編輯器...</p>';
    }
    if (previewEl) {
      previewEl.value = '';
    }
  }

  // ──────────────────────────────────────────────
  // Rendering — only title, key_points, visual_description
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

    // Header
    var header = document.createElement('div');
    header.className = 'outline-card-header';
    var numberSpan = document.createElement('span');
    numberSpan.className = 'outline-card-number';
    numberSpan.textContent = 'Slide ' + (index + 1);
    header.appendChild(numberSpan);
    card.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'outline-card-body';

    // Title
    var content = slide.content || slide;
    var titleValue = (content && content.title) || slide.title || '';

    var titleLabel = document.createElement('label');
    titleLabel.className = 'outline-field-label';
    titleLabel.textContent = '標題';

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'outline-field-input';
    titleInput.value = titleValue;
    titleInput.dataset.field = 'title';
    titleInput.dataset.index = index;

    body.appendChild(titleLabel);
    body.appendChild(titleInput);

    // Key points
    var keyPoints = (content && content.key_points) || slide.key_points || [];

    var pointsLabel = document.createElement('label');
    pointsLabel.className = 'outline-field-label';
    pointsLabel.textContent = '內容 (一行一點)';

    var pointsTextarea = document.createElement('textarea');
    pointsTextarea.className = 'outline-field-textarea';
    pointsTextarea.rows = 4;
    pointsTextarea.value = Array.isArray(keyPoints) ? keyPoints.join('\n') : '';
    pointsTextarea.dataset.field = 'key_points';
    pointsTextarea.dataset.index = index;

    body.appendChild(pointsLabel);
    body.appendChild(pointsTextarea);

    // Visual description
    var visualDesc = slide.visual_description || '';

    var vdLabel = document.createElement('label');
    vdLabel.className = 'outline-field-label';
    vdLabel.textContent = '視覺描述';

    var vdTextarea = document.createElement('textarea');
    vdTextarea.className = 'outline-field-textarea outline-field-secondary';
    vdTextarea.rows = 2;
    vdTextarea.value = visualDesc;
    vdTextarea.dataset.field = 'visual_description';
    vdTextarea.dataset.index = index;

    body.appendChild(vdLabel);
    body.appendChild(vdTextarea);

    card.appendChild(body);
    return card;
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

    if (field === 'title') {
      if (outlineData[index].content) {
        outlineData[index].content.title = value;
      } else {
        outlineData[index].title = value;
      }
    } else if (field === 'key_points') {
      var points = value.split('\n').filter(function (line) {
        return line.trim().length > 0;
      });
      if (outlineData[index].content) {
        outlineData[index].content.key_points = points;
      } else {
        outlineData[index].key_points = points;
      }
    } else if (field === 'visual_description') {
      outlineData[index].visual_description = value;
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
  // YAML Sync
  // ──────────────────────────────────────────────

  function syncToPreview() {
    if (!previewEl || !fullDocument) return;

    try {
      var yamlString = jsyaml.dump(fullDocument, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"'
      });
      previewEl.value = yamlString;
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
    clear: clear,
    bindEvents: bindEvents
  };

})(window);
