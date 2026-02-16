/**
 * outline-editor.js
 *
 * Card-based outline editor with live YAML preview sync
 */
(function (window) {
  'use strict';

  // ──────────────────────────────────────────────
  // Module State
  // ──────────────────────────────────────────────
  var fullDocument = null; // Complete YAML document with metadata
  var outlineData = []; // Array of slide objects
  var containerEl = null;
  var previewEl = null;
  var updateCallback = null;
  var debounceTimer = null;

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Initialize the outline editor
   * @param {HTMLElement} container - The outline editor container
   * @param {HTMLElement} preview - The YAML preview textarea
   * @param {Function} onUpdate - Callback when outline changes
   */
  function init(container, preview, onUpdate) {
    containerEl = container;
    previewEl = preview;
    updateCallback = onUpdate;
  }

  /**
   * Load outline data and render cards
   * @param {Array|Object} data - Array of slide objects OR full document with metadata
   * @param {Object} document - Optional full document structure (for backward compatibility)
   */
  function loadOutline(data, document) {
    // Support both new format (full document) and old format (just slides array)
    if (document) {
      // New format: data is slides array, document is full structure
      fullDocument = document;
      outlineData = data || [];
    } else if (Array.isArray(data)) {
      // Old format: just slides array
      fullDocument = null;
      outlineData = data || [];
    } else if (data && data.slides) {
      // New format: data is full document
      fullDocument = data;
      outlineData = data.slides || [];
    } else {
      // Fallback
      fullDocument = null;
      outlineData = [];
    }

    renderCards();
    syncToPreview();
  }

  /**
   * Get current outline data
   * @returns {Array} Current outline data
   */
  function getOutline() {
    return outlineData;
  }

  /**
   * Clear the outline editor
   */
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
    // Create card container
    var card = document.createElement('div');
    card.className = 'outline-card';
    card.dataset.index = index;

    // Card header with slide number
    var header = document.createElement('div');
    header.className = 'outline-card-header';

    var numberSpan = document.createElement('span');
    numberSpan.className = 'outline-card-number';
    numberSpan.textContent = 'Slide ' + (index + 1);
    header.appendChild(numberSpan);

    card.appendChild(header);

    // Card body
    var body = document.createElement('div');
    body.className = 'outline-card-body';

    // Title field
    var titleLabel = document.createElement('label');
    titleLabel.className = 'outline-field-label';
    titleLabel.textContent = '標題';

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'outline-field-input';
    titleInput.value = slide.title || '';
    titleInput.dataset.field = 'title';
    titleInput.dataset.index = index;

    body.appendChild(titleLabel);
    body.appendChild(titleInput);

    // Key points or content (depending on mode)
    if (slide.key_points && Array.isArray(slide.key_points)) {
      // AI mode: key_points
      var pointsLabel = document.createElement('label');
      pointsLabel.className = 'outline-field-label';
      pointsLabel.textContent = '重點 (一行一點)';

      var pointsTextarea = document.createElement('textarea');
      pointsTextarea.className = 'outline-field-textarea';
      pointsTextarea.rows = 4;
      pointsTextarea.value = slide.key_points.join('\n');
      pointsTextarea.dataset.field = 'key_points';
      pointsTextarea.dataset.index = index;

      body.appendChild(pointsLabel);
      body.appendChild(pointsTextarea);
    } else if (slide.content) {
      // Textbook mode: content
      var contentLabel = document.createElement('label');
      contentLabel.className = 'outline-field-label';
      contentLabel.textContent = '內容';

      var contentTextarea = document.createElement('textarea');
      contentTextarea.className = 'outline-field-textarea';
      contentTextarea.rows = 4;
      contentTextarea.value = slide.content || '';
      contentTextarea.dataset.field = 'content';
      contentTextarea.dataset.index = index;

      body.appendChild(contentLabel);
      body.appendChild(contentTextarea);
    }

    card.appendChild(body);

    return card;
  }

  // ──────────────────────────────────────────────
  // Event Handling & Updates
  // ──────────────────────────────────────────────

  function bindEvents() {
    if (!containerEl) return;

    // Use event delegation for input/textarea changes
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

    // Update outlineData
    if (field === 'key_points') {
      // Split by newline, filter empty lines
      outlineData[index].key_points = value.split('\n').filter(function (line) {
        return line.trim().length > 0;
      });
    } else {
      outlineData[index][field] = value;
    }

    // Debounced sync to YAML preview
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
    }, 300); // 300ms debounce
  }

  // ──────────────────────────────────────────────
  // YAML Sync
  // ──────────────────────────────────────────────

  function syncToPreview() {
    if (!previewEl) return;

    try {
      var yamlString;

      if (fullDocument) {
        // Generate complete YAML with metadata
        var doc = {
          metadata: fullDocument.metadata || {},
          presentation_strategy: fullDocument.presentation_strategy || {},
          slides: outlineData,
          appendix: fullDocument.appendix || {}
        };

        yamlString = '# NBLM Presentation Blueprint\n' + jsyaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          quotingType: '"'
        });
      } else {
        // Fallback: just dump slides array
        yamlString = jsyaml.dump(outlineData, {
          indent: 2,
          lineWidth: -1,
          noRefs: true
        });
      }

      previewEl.value = yamlString;
    } catch (err) {
      console.error('Failed to generate YAML:', err);
      previewEl.value = '# YAML 生成失敗\n# ' + err.message;
    }
  }

  // ──────────────────────────────────────────────
  // Export Public API
  // ──────────────────────────────────────────────

  window.OutlineEditor = {
    init: init,
    loadOutline: loadOutline,
    getOutline: getOutline,
    clear: clear,
    bindEvents: bindEvents
  };

})(window);
