/**
 * flashcard-editor.js
 *
 * Card-based editor for flashcards (生字花瓣字 / 語詞閃卡).
 * Simplified version of outline-editor.js.
 */
(function (window) {
  'use strict';

  var fullDocument = null;
  var cardsData = [];
  var cardType = 'character'; // 'character' | 'vocabulary'
  var containerEl = null;
  var previewEl = null;
  var updateCallback = null;
  var debounceTimer = null;
  var _activeTtsBtn = null; // track active TTS preview button

  function init(container, preview, onUpdate) {
    containerEl = container;
    previewEl = preview;
    updateCallback = onUpdate;
  }

  function loadCards(doc, type) {
    cardType = type || 'character';

    if (doc && doc.presentation_data && doc.presentation_data.slides) {
      fullDocument = doc;
      cardsData = doc.presentation_data.slides || [];
    } else if (doc && doc.slides) {
      fullDocument = null;
      cardsData = doc.slides || [];
    } else if (Array.isArray(doc)) {
      fullDocument = null;
      cardsData = doc;
    } else {
      fullDocument = null;
      cardsData = [];
    }

    renderCards();
    syncToPreview();
  }

  function getCards() {
    return cardsData;
  }

  function getFullDocument() {
    return fullDocument;
  }

  function clear() {
    cardsData = [];
    fullDocument = null;
    if (containerEl) {
      containerEl.innerHTML = '<p class="editor-placeholder">生成後顯示閃卡編輯器...</p>';
    }
    if (previewEl) {
      previewEl.value = '';
    }
  }

  // ──────────────────────────────────────────────
  // Card CRUD
  // ──────────────────────────────────────────────

  function addCard() {
    var card;
    if (cardType === 'character') {
      card = {
        type: 'content_page',
        layout_style: 'centered, single large character with illustration',
        visual_description: '',
        content: { title: '', key_points: [] }
      };
    } else {
      card = {
        type: 'content_page',
        layout_style: 'vocabulary card with word, definition and illustration',
        visual_description: '',
        content: { title: '', key_points: ['解釋：', '例句：'] }
      };
    }

    cardsData.push(card);
    updateTotalPages();
    renderCards();
    syncToPreview();
  }

  function removeCard(index) {
    if (cardsData.length <= 1) {
      window.showToast('至少需要保留一張卡片', 'error');
      return;
    }
    cardsData.splice(index, 1);
    updateTotalPages();
    renderCards();
    syncToPreview();
  }

  function moveCard(index, direction) {
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= cardsData.length) return;
    var temp = cardsData[index];
    cardsData[index] = cardsData[newIndex];
    cardsData[newIndex] = temp;
    renderCards();
    syncToPreview();
  }

  function duplicateCard(index) {
    var clone = JSON.parse(JSON.stringify(cardsData[index]));
    cardsData.splice(index + 1, 0, clone);
    updateTotalPages();
    renderCards();
    syncToPreview();
  }

  function updateTotalPages() {
    if (fullDocument && fullDocument.presentation_data && fullDocument.presentation_data.global_design) {
      fullDocument.presentation_data.global_design.total_pages = cardsData.length;
    }
  }

  // ──────────────────────────────────────────────
  // Rendering
  // ──────────────────────────────────────────────

  function renderCards() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (cardsData.length === 0) {
      containerEl.innerHTML = '<p class="editor-placeholder">沒有卡片可顯示</p>';
      return;
    }

    cardsData.forEach(function (card, index) {
      var el = createCardElement(card, index);
      containerEl.appendChild(el);
    });

    // Add new card button
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-add-slide';
    addBtn.innerHTML = '+ 新增卡片';
    addBtn.addEventListener('click', function () { addCard(); });
    containerEl.appendChild(addBtn);
  }

  function createCardElement(card, index) {
    var el = document.createElement('div');
    el.className = 'flashcard-edit-card';
    el.dataset.index = index;

    var content = card.content || card;
    var titleValue = (content && content.title) || card.title || '';

    // Header
    var header = document.createElement('div');
    header.className = 'outline-card-header';

    var typeBadge = document.createElement('span');
    typeBadge.className = 'outline-card-type outline-card-type-content';
    typeBadge.textContent = cardType === 'character' ? '生字' : '語詞';
    header.appendChild(typeBadge);

    var numberSpan = document.createElement('span');
    numberSpan.className = 'outline-card-number';
    numberSpan.textContent = '#' + (index + 1);
    header.appendChild(numberSpan);

    // Large character display for character mode
    if (cardType === 'character' && titleValue) {
      var bigChar = document.createElement('span');
      bigChar.className = 'flashcard-big-char';
      bigChar.textContent = titleValue;
      header.appendChild(bigChar);
    }

    // Action buttons
    var actions = document.createElement('div');
    actions.className = 'outline-card-actions';

    var btnUp = document.createElement('button');
    btnUp.className = 'card-action-btn';
    btnUp.title = '上移';
    btnUp.textContent = '↑';
    btnUp.disabled = (index === 0);
    (function (idx) {
      btnUp.addEventListener('click', function () { moveCard(idx, -1); });
    })(index);

    var btnDown = document.createElement('button');
    btnDown.className = 'card-action-btn';
    btnDown.title = '下移';
    btnDown.textContent = '↓';
    btnDown.disabled = (index === cardsData.length - 1);
    (function (idx) {
      btnDown.addEventListener('click', function () { moveCard(idx, 1); });
    })(index);

    var btnDup = document.createElement('button');
    btnDup.className = 'card-action-btn';
    btnDup.title = '複製';
    btnDup.textContent = '⧉';
    (function (idx) {
      btnDup.addEventListener('click', function () { duplicateCard(idx); });
    })(index);

    var btnDel = document.createElement('button');
    btnDel.className = 'card-action-btn card-action-btn-danger';
    btnDel.title = '刪除';
    btnDel.textContent = '✕';
    (function (idx) {
      btnDel.addEventListener('click', function () {
        if (confirm('確定刪除此卡片？')) removeCard(idx);
      });
    })(index);

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDup);
    actions.appendChild(btnDel);
    header.appendChild(actions);
    el.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'outline-card-body';

    // Title field
    var titleLabel = cardType === 'character' ? '生字' : '語詞';
    addField(body, 'title', titleLabel, titleValue, 'input', index);

    // Key points (vocabulary mode only)
    if (cardType === 'vocabulary') {
      var keyPoints = (content && content.key_points) || card.key_points || [];
      var kpValue = Array.isArray(keyPoints) ? keyPoints.join('\n') : '';
      addField(body, 'key_points', '解釋 + 例句 (一行一項)', kpValue, 'textarea', index, 3);
    }

    // Key points for character mode (read-only display)
    if (cardType === 'character') {
      var charKp = (content && content.key_points) || card.key_points || [];
      var charKpValue = Array.isArray(charKp) ? charKp.join('\n') : '';
      addField(body, 'key_points', '注音 / 部首 / 造詞', charKpValue, 'textarea', index, 3);
    }

    // TTS preview button
    var ttsBtn = document.createElement('button');
    ttsBtn.className = 'card-action-btn flashcard-tts-btn';
    ttsBtn.textContent = '▶ 試聽';
    ttsBtn.title = '朗讀此卡片';
    (function (idx, btn) {
      btn.addEventListener('click', function () {
        speakCard(idx, btn);
      });
    })(index, ttsBtn);
    body.appendChild(ttsBtn);

    // Visual description
    var visualDesc = card.visual_description || '';
    addField(body, 'visual_description', 'AI 繪圖提示 (Visual Prompt)', visualDesc, 'textarea', index, 2);

    el.appendChild(body);
    return el;
  }

  function stopTts() {
    if (typeof speechSynthesis !== 'undefined') { speechSynthesis.cancel(); speechSynthesis.resume(); }
    if (_activeTtsBtn) {
      _activeTtsBtn.textContent = '▶ 試聽';
      _activeTtsBtn = null;
    }
  }

  function speakCard(index, btn) {
    // Toggle off if same button
    if (_activeTtsBtn === btn) { stopTts(); return; }
    stopTts();

    var card = cardsData[index];
    if (!card) return;

    var content = card.content || card;
    var title = (content && content.title) || card.title || '';
    var kp = (content && content.key_points) || card.key_points || [];
    var kpText = Array.isArray(kp) ? kp.join('。') : '';
    var text = title + (kpText ? '。' + kpText : '');
    if (!text) return;

    _activeTtsBtn = btn;
    btn.textContent = '■ 停止';
    // Delay speak after cancel() to avoid Chrome speechSynthesis bug
    setTimeout(function () {
      var utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'zh-TW';
      utt.rate = 0.9;
      utt.onend = utt.onerror = function () {
        if (_activeTtsBtn === btn) { btn.textContent = '▶ 試聽'; _activeTtsBtn = null; }
      };
      speechSynthesis.speak(utt);
    }, 50);
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
      if (cardType === 'character' && field === 'title') {
        el.className += ' flashcard-char-input';
      }
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

    if (isNaN(index) || !cardsData[index]) return;

    var card = cardsData[index];

    if (field === 'title') {
      if (card.content) { card.content.title = value; }
      else { card.title = value; }
    } else if (field === 'key_points') {
      var points = value.split('\n').filter(function (l) { return l.trim().length > 0; });
      if (card.content) { card.content.key_points = points; }
      else { card.key_points = points; }
    } else if (field === 'visual_description') {
      card.visual_description = value;
    }

    debouncedSync();
  }

  function debouncedSync() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      syncToPreview();
      if (updateCallback) updateCallback(cardsData);
    }, 300);
  }

  // ──────────────────────────────────────────────
  // YAML Sync
  // ──────────────────────────────────────────────

  function syncToPreview() {
    if (!previewEl || !fullDocument) return;

    fullDocument.presentation_data.slides = cardsData;

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

  window.FlashcardEditor = {
    init: init,
    loadCards: loadCards,
    getCards: getCards,
    getFullDocument: getFullDocument,
    clear: clear,
    addCard: addCard,
    bindEvents: bindEvents
  };

})(window);
