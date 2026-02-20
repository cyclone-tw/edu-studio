/* ============================================================
   NBLM 簡報生成助手 — Main Application Controller (app.js)
   Single-page layout with dropdown selectors
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. State Management
  // ──────────────────────────────────────────────
  const state = {
    mode: 'ai',                // 'ai' | 'textbook' | 'custom' | 'character' | 'vocabulary'
    aiInputMode: 'smart',      // 'smart' | 'outline' (for AI mode)
    presenterRole: null,
    audience: null,
    context: null,
    visualStyle: null,
    slideCount: 12,
    language: 'zh-TW',
    interactionLevel: 'medium',
    customPrompt: '',
    apiKey: localStorage.getItem('gemini_api_key') || '',
    uploadedFiles: [],       // Array of { name, mimeType, data, size }
    textbookFiles: [],       // Separate array for textbook mode
    characterFiles: [],      // Separate array for character flashcard mode
    vocabularyFiles: []      // Separate array for vocabulary flashcard mode
  };

  // Expose state for other modules (gemini.js etc.)
  window.appState = state;

  // ──────────────────────────────────────────────
  // 2. DOM References
  // ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    modeTabs:          $('#modeTabs'),
    // Dimension dropdowns
    roleSelect:        $('#roleSelect'),
    audienceSelect:    $('#audienceSelect'),
    contextSelect:     $('#contextSelect'),
    styleSelect:       $('#styleSelect'),
    flashcardStyleSection: $('#flashcardStyleSection'),
    flashcardStyleSelect:  $('#flashcardStyleSelect'),
    fcFontSize:            $('#fcFontSize'),
    fcFontSizeVal:         $('#fcFontSizeVal'),
    fcFontSizeGroup:       $('#fcFontSizeGroup'),
    // Sections
    dimensionsSection: $('#dimensionsSection'),
    paramsSection:     $('#paramsSection'),
    materialSection:   $('#materialSection'),
    generateRow:       $('#generateRow'),
    previewSection:    $('#previewSection'),
    // Form controls
    slideCount:        $('#slideCount'),
    slideCountValue:   $('#slideCountValue'),
    language:          $('#language'),
    customPrompt:      $('#customPrompt'),
    // Input areas
    aiInputArea:       $('#aiInputArea'),
    aiInputTabs:       $('.ai-input-tabs'),
    smartInputPanel:   $('#smartInputPanel'),
    outlineInputPanel: $('#outlineInputPanel'),
    textbookInputArea: $('#textbookInputArea'),
    characterInputArea: $('#characterInputArea'),
    vocabularyInputArea: $('#vocabularyInputArea'),
    materialText:      $('#materialText'),
    outlineText:       $('#outlineText'),
    textbookText:      $('#textbookText'),
    characterText:     $('#characterText'),
    vocabularyText:    $('#vocabularyText'),
    // File upload
    smartDropZone:     $('#smartDropZone'),
    smartFileInput:    $('#smartFileInput'),
    smartFileTags:     $('#smartFileTags'),
    textbookDropZone:  $('#textbookDropZone'),
    textbookFileInput: $('#textbookFileInput'),
    textbookFileTags:  $('#textbookFileTags'),
    characterDropZone: $('#characterDropZone'),
    characterFileInput: $('#characterFileInput'),
    characterFileTags: $('#characterFileTags'),
    vocabularyDropZone: $('#vocabularyDropZone'),
    vocabularyFileInput: $('#vocabularyFileInput'),
    vocabularyFileTags: $('#vocabularyFileTags'),
    // Buttons
    btnGenerate:       $('#btnGenerate'),
    btnDownloadYaml:   $('#btnDownloadYaml'),
    btnDownloadMd:     $('#btnDownloadMd'),
    btnCopyYaml:       $('#btnCopyYaml'),
    // API Key
    btnOpenApiKey:     $('#btnOpenApiKey'),
    apiKeyModal:       $('#apiKeyModal'),
    apiKeyInput:       $('#apiKeyInput'),
    btnSaveApiKey:     $('#btnSaveApiKey'),
    btnCancelApiKey:   $('#btnCancelApiKey'),
    // Loading
    loadingOverlay:    $('#loadingOverlay'),
    loadingText:       $('#loadingText'),
    toastContainer:    $('#toastContainer'),
    // Help
    btnOpenHelp:       $('#btnOpenHelp'),
    helpModal:         $('#helpModal'),
    btnCloseHelp:      $('#btnCloseHelp'),
    btnHelpOk:         $('#btnHelpOk'),
    // Editor
    yamlPreview:       $('#yamlPreview'),
    outlineEditor:     $('#outlineEditor')
  };

  // ──────────────────────────────────────────────
  // Toast System
  // ──────────────────────────────────────────────
  function showToast(message, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    setTimeout(function () {
      if (!toast) return;
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-fade-out');

      var removed = false;
      var removeToast = function() {
        if (removed || !toast) return;
        removed = true;
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      };

      toast.addEventListener('transitionend', removeToast, { once: true });
      setTimeout(removeToast, 500);
    }, 3000);
  }

  window.showToast = showToast;

  // ──────────────────────────────────────────────
  // Loading Overlay
  // ──────────────────────────────────────────────
  function showLoading(text) {
    dom.loadingText.textContent = text || '生成中，請稍候...';
    dom.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    dom.loadingOverlay.classList.add('hidden');
  }

  window.showLoading = showLoading;
  window.hideLoading = hideLoading;

  // ──────────────────────────────────────────────
  // Dropdown Population
  // ──────────────────────────────────────────────
  function populateDropdowns() {
    // Presenter Roles
    PRESETS.presenterRoles.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label + ' — ' + item.tone;
      dom.roleSelect.appendChild(opt);
    });

    // Audience Profiles — with optgroups
    var eduGroup = document.createElement('optgroup');
    eduGroup.label = '教育類';
    var workGroup = document.createElement('optgroup');
    workGroup.label = '職場類';

    PRESETS.audienceProfiles.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      if (item.category === '教育類') {
        eduGroup.appendChild(opt);
      } else {
        workGroup.appendChild(opt);
      }
    });

    dom.audienceSelect.appendChild(eduGroup);
    dom.audienceSelect.appendChild(workGroup);

    // Contexts
    PRESETS.contexts.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      dom.contextSelect.appendChild(opt);
    });

    // Visual Styles
    PRESETS.visualStyles.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      dom.styleSelect.appendChild(opt);
    });

    // Flashcard style dropdown (same options)
    if (dom.flashcardStyleSelect) {
      PRESETS.visualStyles.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.label;
        dom.flashcardStyleSelect.appendChild(opt);
      });
    }
  }

  // ──────────────────────────────────────────────
  // Dropdown Bindings
  // ──────────────────────────────────────────────
  function initDropdownBindings() {
    dom.roleSelect.addEventListener('change', function () {
      state.presenterRole = this.value || null;
    });
    dom.audienceSelect.addEventListener('change', function () {
      state.audience = this.value || null;
    });
    dom.contextSelect.addEventListener('change', function () {
      state.context = this.value || null;
    });
    dom.styleSelect.addEventListener('change', function () {
      state.visualStyle = this.value || null;
    });
    if (dom.flashcardStyleSelect) {
      dom.flashcardStyleSelect.addEventListener('change', function () {
        state.visualStyle = this.value || null;
      });
    }
    if (dom.fcFontSize && dom.fcFontSizeVal) {
      dom.fcFontSize.addEventListener('input', function () {
        dom.fcFontSizeVal.textContent = this.value + 'pt';
      });
    }
  }

  // ──────────────────────────────────────────────
  // Mode Tab Switching
  // ──────────────────────────────────────────────
  function setMode(mode) {
    // When switching away from custom mode, clear editor
    if (mode !== 'custom' && state.mode === 'custom') {
      if (typeof OutlineEditor !== 'undefined') OutlineEditor.clear();
    }
    // When switching away from flashcard modes, clear flashcard editor
    if (mode !== 'character' && mode !== 'vocabulary' &&
        (state.mode === 'character' || state.mode === 'vocabulary')) {
      if (typeof FlashcardEditor !== 'undefined') FlashcardEditor.clear();
    }

    state.mode = mode;

    // Clear file state on mode switch
    state.uploadedFiles.length = 0;
    state.textbookFiles.length = 0;
    state.characterFiles.length = 0;
    state.vocabularyFiles.length = 0;
    if (dom.smartFileTags) dom.smartFileTags.innerHTML = '';
    if (dom.textbookFileTags) dom.textbookFileTags.innerHTML = '';
    if (dom.characterFileTags) dom.characterFileTags.innerHTML = '';
    if (dom.vocabularyFileTags) dom.vocabularyFileTags.innerHTML = '';

    // Toggle active class on tab buttons
    $$('#modeTabs .mode-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    // Hide all input areas first
    dom.aiInputArea.classList.add('hidden');
    dom.textbookInputArea.classList.add('hidden');
    if (dom.characterInputArea) dom.characterInputArea.classList.add('hidden');
    if (dom.vocabularyInputArea) dom.vocabularyInputArea.classList.add('hidden');

    // Toggle MD download button visibility
    if (dom.btnDownloadMd) {
      dom.btnDownloadMd.classList.toggle('hidden', mode === 'character' || mode === 'vocabulary');
    }
    // Hide flashcard style section by default (shown only in flashcard modes)
    if (dom.flashcardStyleSection) dom.flashcardStyleSection.classList.add('hidden');

    if (mode === 'ai') {
      dom.dimensionsSection.classList.remove('hidden');
      dom.paramsSection.classList.remove('hidden');
      dom.materialSection.classList.remove('hidden');
      dom.generateRow.classList.remove('hidden');
      dom.aiInputArea.classList.remove('hidden');
      dom.previewSection.classList.add('hidden');
    } else if (mode === 'textbook') {
      dom.dimensionsSection.classList.remove('hidden');
      dom.paramsSection.classList.remove('hidden');
      dom.materialSection.classList.remove('hidden');
      dom.generateRow.classList.remove('hidden');
      dom.textbookInputArea.classList.remove('hidden');
      dom.previewSection.classList.add('hidden');
    } else if (mode === 'custom') {
      dom.dimensionsSection.classList.add('hidden');
      dom.paramsSection.classList.add('hidden');
      dom.materialSection.classList.add('hidden');
      dom.generateRow.classList.add('hidden');
      dom.previewSection.classList.remove('hidden');

      if (typeof OutlineEditor !== 'undefined') {
        var emptyDoc = OutlineEditor.createEmptyDocument();
        OutlineEditor.loadOutline(emptyDoc);
      }
    } else if (mode === 'character' || mode === 'vocabulary') {
      // Flashcard modes: hide dimensions/params, show material + generate + style
      dom.dimensionsSection.classList.add('hidden');
      dom.paramsSection.classList.add('hidden');
      dom.materialSection.classList.remove('hidden');
      dom.generateRow.classList.remove('hidden');
      dom.previewSection.classList.add('hidden');
      if (dom.flashcardStyleSection) dom.flashcardStyleSection.classList.remove('hidden');
      // Font size group only for character mode
      if (dom.fcFontSizeGroup) dom.fcFontSizeGroup.style.display = (mode === 'character') ? '' : 'none';

      if (mode === 'character') {
        dom.characterInputArea.classList.remove('hidden');
      } else {
        dom.vocabularyInputArea.classList.remove('hidden');
      }
    }
  }

  // ──────────────────────────────────────────────
  // Show Preview Section (after generation)
  // ──────────────────────────────────────────────
  function showPreview() {
    dom.previewSection.classList.remove('hidden');
    // Smooth scroll to preview
    dom.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ──────────────────────────────────────────────
  // AI Input Mode Tab Switching
  // ──────────────────────────────────────────────
  function setAiInputMode(aiMode) {
    state.aiInputMode = aiMode;

    $$('.ai-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-ai-mode') === aiMode);
    });

    if (aiMode === 'smart') {
      dom.smartInputPanel.classList.remove('hidden');
      dom.outlineInputPanel.classList.add('hidden');
    } else {
      dom.smartInputPanel.classList.add('hidden');
      dom.outlineInputPanel.classList.remove('hidden');
    }
  }

  // ──────────────────────────────────────────────
  // Range Slider
  // ──────────────────────────────────────────────
  function initSlider() {
    dom.slideCount.addEventListener('input', function () {
      var val = parseInt(this.value, 10);
      dom.slideCountValue.textContent = val;
      state.slideCount = val;
    });
  }

  // ──────────────────────────────────────────────
  // Form Bindings
  // ──────────────────────────────────────────────
  function initFormBindings() {
    dom.language.addEventListener('change', function () {
      state.language = this.value;
    });

    $$('input[name="interaction"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.interactionLevel = this.value;
      });
    });

    dom.customPrompt.addEventListener('input', function () {
      state.customPrompt = this.value;
    });
  }

  // ──────────────────────────────────────────────
  // File Upload — Drag & Drop
  // ──────────────────────────────────────────────

  var pendingReads = 0;

  var ALLOWED_TYPES = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'audio/mpeg': 'MP3',
    'audio/mp4': 'MP4',
    'video/mp4': 'MP4',
    'audio/wav': 'WAV',
    'audio/x-wav': 'WAV',
    'audio/ogg': 'OGG',
    'audio/webm': 'WEBM',
    'audio/x-m4a': 'M4A',
    'audio/mp3': 'MP3',
    'image/png': 'PNG',
    'image/jpeg': 'JPG'
  };

  var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  function initDropZone(dropZoneEl, fileInputEl, fileTagsEl, filesArray, filesKey) {
    if (!dropZoneEl) return;

    dropZoneEl.addEventListener('click', function (e) {
      if (e.target === fileInputEl) return;
      fileInputEl.click();
    });

    fileInputEl.addEventListener('change', function () {
      handleFiles(this.files, filesArray, filesKey, fileTagsEl);
      this.value = '';
    });

    dropZoneEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZoneEl.classList.add('drop-zone-hover');
    });

    dropZoneEl.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!dropZoneEl.contains(e.relatedTarget)) {
        dropZoneEl.classList.remove('drop-zone-hover');
      }
    });

    dropZoneEl.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZoneEl.classList.remove('drop-zone-hover');
      handleFiles(e.dataTransfer.files, filesArray, filesKey, fileTagsEl);
    });
  }

  function handleFiles(fileList, filesArray, filesKey, fileTagsEl) {
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];

      var mimeType = file.type;
      if (!mimeType) {
        var ext = file.name.split('.').pop().toLowerCase();
        var extMap = { pdf: 'application/pdf', txt: 'text/plain', mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', m4a: 'audio/x-m4a', ogg: 'audio/ogg', webm: 'audio/webm', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
        mimeType = extMap[ext] || '';
      }

      if (!ALLOWED_TYPES[mimeType]) {
        showToast('不支援的檔案格式：' + file.name + '。請上傳 PDF、TXT 或音檔。', 'error');
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        showToast('檔案 ' + file.name + ' 超過 20MB 限制', 'error');
        continue;
      }

      (function (f, mime) {
        pendingReads++;
        if (dom.btnGenerate) dom.btnGenerate.disabled = true;

        if (mime === 'text/plain') {
          var reader = new FileReader();
          reader.onload = function (ev) {
            var textarea;
            if (filesKey === 'uploadedFiles') {
              textarea = dom.materialText;
            } else if (filesKey === 'characterFiles') {
              textarea = dom.characterText;
            } else if (filesKey === 'vocabularyFiles') {
              textarea = dom.vocabularyText;
            } else {
              textarea = dom.textbookText;
            }
            if (textarea) {
              var existing = textarea.value;
              textarea.value = existing + (existing ? '\n\n' : '') + ev.target.result;
            }
            showToast('已載入 ' + f.name + ' 的文字內容', 'success');
            pendingReads--;
            if (pendingReads <= 0 && !isGenerating) {
              pendingReads = 0;
              if (dom.btnGenerate) dom.btnGenerate.disabled = false;
            }
          };
          reader.onerror = function () {
            showToast('檔案 ' + f.name + ' 讀取失敗', 'error');
            pendingReads--;
            if (pendingReads <= 0 && !isGenerating) {
              pendingReads = 0;
              if (dom.btnGenerate) dom.btnGenerate.disabled = false;
            }
          };
          reader.readAsText(f, 'UTF-8');
        } else {
          var reader = new FileReader();
          reader.onload = function (ev) {
            var base64 = ev.target.result.split(',')[1];

            state[filesKey].push({
              name: f.name,
              mimeType: mime,
              data: base64,
              size: f.size
            });

            renderFileTags(fileTagsEl, state[filesKey], filesKey);
            pendingReads--;
            if (pendingReads <= 0 && !isGenerating) {
              pendingReads = 0;
              if (dom.btnGenerate) dom.btnGenerate.disabled = false;
            }
          };
          reader.onerror = function () {
            showToast('檔案 ' + f.name + ' 讀取失敗', 'error');
            pendingReads--;
            if (pendingReads <= 0 && !isGenerating) {
              pendingReads = 0;
              if (dom.btnGenerate) dom.btnGenerate.disabled = false;
            }
          };
          reader.readAsDataURL(f);
        }
      })(file, mimeType);
    }
  }

  function renderFileTags(container, filesArray, filesKey) {
    if (!container) return;
    container.innerHTML = '';

    filesArray.forEach(function (f, index) {
      var tag = document.createElement('span');
      tag.className = 'file-tag';

      var icon = '\u{1F4C4}';
      if (f.mimeType.startsWith('audio/') || f.mimeType === 'video/mp4') icon = '\u{1F3B5}';
      if (f.mimeType === 'application/pdf') icon = '\u{1F4D5}';
      if (f.mimeType.startsWith('image/')) icon = '\u{1F5BC}';

      var sizeStr = f.size < 1024 * 1024
        ? Math.round(f.size / 1024) + 'KB'
        : (f.size / (1024 * 1024)).toFixed(1) + 'MB';

      var iconSpan = document.createElement('span');
      iconSpan.className = 'file-tag-icon';
      iconSpan.textContent = icon;

      var nameSpan = document.createElement('span');
      nameSpan.className = 'file-tag-name';
      nameSpan.textContent = f.name;

      var sizeSpan = document.createElement('span');
      sizeSpan.className = 'file-tag-size';
      sizeSpan.textContent = sizeStr;

      tag.appendChild(iconSpan);
      tag.appendChild(nameSpan);
      tag.appendChild(sizeSpan);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'file-tag-remove';
      removeBtn.textContent = '\u2715';
      removeBtn.title = '移除';
      (function (idx) {
        removeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          state[filesKey].splice(idx, 1);
          renderFileTags(container, state[filesKey], filesKey);
        });
      })(index);

      tag.appendChild(removeBtn);
      container.appendChild(tag);
    });
  }

  // ──────────────────────────────────────────────
  // API Key Modal
  // ──────────────────────────────────────────────
  function initApiKeyModal() {
    dom.btnOpenApiKey.addEventListener('click', function () {
      dom.apiKeyInput.value = state.apiKey;
      dom.apiKeyModal.classList.remove('hidden');
    });

    dom.btnSaveApiKey.addEventListener('click', function () {
      var key = dom.apiKeyInput.value.trim();
      if (!key) {
        showToast('請輸入 API Key', 'error');
        return;
      }
      state.apiKey = key;
      localStorage.setItem('gemini_api_key', key);
      dom.apiKeyModal.classList.add('hidden');
      showToast('API Key 已儲存', 'success');
    });

    dom.btnCancelApiKey.addEventListener('click', function () {
      dom.apiKeyModal.classList.add('hidden');
    });

    dom.apiKeyModal.addEventListener('click', function (e) {
      if (e.target === dom.apiKeyModal) {
        dom.apiKeyModal.classList.add('hidden');
      }
    });
  }

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

    dom.helpModal.addEventListener('click', function (e) {
      if (e.target === dom.helpModal) {
        dom.helpModal.classList.add('hidden');
      }
    });
  }

  // ──────────────────────────────────────────────
  // Generate Button & Export
  // ──────────────────────────────────────────────
  function getInputData() {
    var text = '';
    var files = [];

    if (state.mode === 'ai') {
      if (state.aiInputMode === 'smart') {
        text = (dom.materialText.value || '').trim();
        files = state.uploadedFiles || [];
      } else {
        text = (dom.outlineText.value || '').trim();
      }
    } else if (state.mode === 'textbook') {
      text = (dom.textbookText.value || '').trim();
      files = state.textbookFiles || [];
    } else if (state.mode === 'character') {
      text = (dom.characterText ? dom.characterText.value || '' : '').trim();
      files = state.characterFiles || [];
    } else if (state.mode === 'vocabulary') {
      text = (dom.vocabularyText ? dom.vocabularyText.value || '' : '').trim();
      files = state.vocabularyFiles || [];
    }

    return { text: text, files: files };
  }

  var isGenerating = false;

  function initGenerateButton() {
    dom.btnGenerate.addEventListener('click', async function () {
      if (isGenerating) {
        showToast('正在生成中，請稍候...', 'info');
        return;
      }

      if (pendingReads > 0) {
        showToast('檔案讀取中，請稍候...', 'info');
        return;
      }

      // Validate API key
      if (!state.apiKey) {
        showToast('請先設定 Gemini API Key', 'error');
        return;
      }

      // Validate dimensions (for ai/textbook modes only)
      if (state.mode === 'ai' || state.mode === 'textbook') {
        if (!state.presenterRole) {
          showToast('請選擇簡報者角色', 'error');
          return;
        }
        if (!state.audience) {
          showToast('請選擇受眾面向', 'error');
          return;
        }
        if (!state.context) {
          showToast('請選擇簡報場景', 'error');
          return;
        }
        if (!state.visualStyle) {
          showToast('請選擇視覺風格', 'error');
          return;
        }
      }

      // Validate input
      var input = getInputData();
      if (!input.text && input.files.length === 0) {
        showToast('請輸入素材或上傳檔案', 'error');
        return;
      }

      isGenerating = true;
      dom.btnGenerate.disabled = true;
      showLoading(input.files.length > 0 ? '分析檔案中...' : '生成中，請稍候...');

      try {
        var result;
        var isFlashcardMode = (state.mode === 'character' || state.mode === 'vocabulary');

        if (state.mode === 'ai') {
          if (state.aiInputMode === 'smart' && typeof window.generatePresentation === 'function') {
            result = await window.generatePresentation(input.text, state, input.files);
          } else if (state.aiInputMode === 'outline' && typeof window.generateFromOutline === 'function') {
            result = await window.generateFromOutline(input.text, state);
          } else {
            hideLoading();
            showToast('Gemini 模組尚未載入', 'error');
            return;
          }
        } else if (state.mode === 'textbook' && typeof window.splitTextbook === 'function') {
          result = await window.splitTextbook(input.text, state, input.files);
        } else if (state.mode === 'character' && typeof window.generateCharacterCards === 'function') {
          result = await window.generateCharacterCards(input.text, state.apiKey, input.files);
        } else if (state.mode === 'vocabulary' && typeof window.generateVocabularyCards === 'function') {
          result = await window.generateVocabularyCards(input.text, state.apiKey, input.files);
        } else {
          hideLoading();
          showToast('Gemini 模組尚未載入', 'error');
          return;
        }

        // Build NotebookLM-compatible YAML from JSON result
        if (result) {
          var doc;
          var yamlString;
          try {
            if (isFlashcardMode) {
              // Use flashcard-specific YAML builders
              // Use mode-appropriate default: hand_drawn for character, q_cute for vocabulary
              var defaultStyle = state.mode === 'vocabulary' ? 'q_cute' : 'hand_drawn';
              var styleId = state.visualStyle || defaultStyle;
              if (state.mode === 'character' && typeof window.buildCharacterYaml === 'function') {
                var charOpts = {};
                if (dom.fcFontSize) charOpts.keyPointsFontSize = dom.fcFontSize.value + 'pt';
                doc = window.buildCharacterYaml(result, styleId, charOpts);
              } else if (state.mode === 'vocabulary' && typeof window.buildVocabularyYaml === 'function') {
                doc = window.buildVocabularyYaml(result, styleId);
              }
              if (doc && typeof window.toNblmYaml === 'function') {
                yamlString = window.toNblmYaml(doc);
              } else {
                yamlString = jsyaml.dump(doc || result);
              }
            } else if (typeof window.buildYaml === 'function') {
              doc = window.buildYaml(result, state);
              if (typeof window.toNblmYaml === 'function') {
                yamlString = window.toNblmYaml(doc);
              } else {
                yamlString = jsyaml.dump(doc);
              }
            } else {
              yamlString = jsyaml.dump(result);
            }
          } catch (buildErr) {
            console.warn('[YAML Build Warning]', buildErr);
            yamlString = jsyaml.dump(result);
          }

          if (dom.yamlPreview) dom.yamlPreview.value = yamlString;

          if (isFlashcardMode && typeof FlashcardEditor !== 'undefined' && doc) {
            try {
              FlashcardEditor.loadCards(doc, state.mode);
            } catch (editorErr) {
              console.warn('[FlashcardEditor] Load failed:', editorErr);
            }
          } else if (typeof OutlineEditor !== 'undefined' && doc) {
            try {
              OutlineEditor.loadOutline(doc);
            } catch (outlineErr) {
              console.warn('[OutlineEditor] Load failed:', outlineErr);
            }
          }
        }

        hideLoading();
        isGenerating = false;
        dom.btnGenerate.disabled = false;
        showPreview();
        var successMsg = isFlashcardMode ? '閃卡生成完成！' : '簡報生成完成！';
        showToast(successMsg, 'success');
      } catch (err) {
        hideLoading();
        isGenerating = false;
        dom.btnGenerate.disabled = false;
        showToast('生成失敗：' + (err.message || err), 'error');
        console.error('[Generate Error]', err);
      }
    });
  }

  /**
   * Generate filename with date prefix and title
   */
  function generateFilename(extension) {
    var yamlContent = dom.yamlPreview.value;
    var title = '簡報大綱';

    try {
      var data = jsyaml.load(yamlContent);
      if (data && data.presentation_data && data.presentation_data.suggested_filename) {
        title = data.presentation_data.suggested_filename;
      } else if (data && data.presentation_data && data.presentation_data.slides && data.presentation_data.slides[0]) {
        var firstSlide = data.presentation_data.slides[0];
        title = (firstSlide.content && firstSlide.content.title) || firstSlide.title || '簡報大綱';
      } else if (data && data.title) {
        title = data.title;
      }
    } catch (e) {
      var lines = yamlContent.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('suggested_filename:')) {
          title = line.replace('suggested_filename:', '').trim().replace(/^['"]|['"]$/g, '');
          break;
        }
      }
    }

    title = title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var datePrefix = year + '-' + month + '-' + day;

    return datePrefix + '-' + title + '.' + extension;
  }

  function extractDocTitle() {
    try {
      var yamlContent = dom.yamlPreview.value;
      if (!yamlContent) return '簡報大綱';
      var data = jsyaml.load(yamlContent);
      if (data && data.presentation_data) {
        return data.presentation_data.suggested_filename || '簡報大綱';
      }
      return '簡報大綱';
    } catch (e) {
      return '簡報大綱';
    }
  }

  function initExportButtons() {
    dom.btnDownloadYaml.addEventListener('click', function () {
      var content = dom.yamlPreview.value;
      if (!content) {
        showToast('沒有可下載的內容', 'error');
        return;
      }
      var filename = generateFilename('txt');
      downloadFile(content, filename, 'text/plain');
      showToast('已下載（.txt 格式，可直接匯入 NotebookLM）', 'success');
    });

    dom.btnDownloadMd.addEventListener('click', function () {
      if (typeof OutlineEditor === 'undefined' || typeof window.buildMarkdownOutline !== 'function') {
        showToast('沒有可下載的內容', 'error');
        return;
      }
      var slides = OutlineEditor.getOutline();
      if (!slides || slides.length === 0) {
        showToast('沒有可下載的內容', 'error');
        return;
      }
      var title = extractDocTitle();
      var mdContent = window.buildMarkdownOutline(slides, title);
      var filename = generateFilename('md');
      downloadFile(mdContent, filename, 'text/markdown');
      showToast('Markdown 大綱已下載', 'success');
    });
  }

  function copyYamlToClipboard() {
    var yamlContent = dom.yamlPreview.value;
    if (!yamlContent) {
      showToast('沒有可複製的 YAML 內容', 'error');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(yamlContent)
        .then(function () {
          showToast('YAML 已複製到剪貼簿', 'success');
        })
        .catch(function (err) {
          console.error('Clipboard API failed:', err);
          fallbackCopy(yamlContent);
        });
    } else {
      fallbackCopy(yamlContent);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      var successful = document.execCommand('copy');
      if (successful) {
        showToast('YAML 已複製到剪貼簿', 'success');
      } else {
        showToast('複製失敗，請手動複製', 'error');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      showToast('複製失敗，請手動複製', 'error');
    }

    document.body.removeChild(textarea);
  }

  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ──────────────────────────────────────────────
  // Mode Tab Event Listener
  // ──────────────────────────────────────────────
  function initModeTabs() {
    dom.modeTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.mode-tab');
      if (!tab) return;
      var mode = tab.getAttribute('data-mode');
      if (mode) setMode(mode);
    });
  }

  // ──────────────────────────────────────────────
  // AI Input Tab Event Listener
  // ──────────────────────────────────────────────
  function initAiInputTabs() {
    if (!dom.aiInputTabs) return;
    dom.aiInputTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.ai-tab');
      if (!tab) return;
      var aiMode = tab.getAttribute('data-ai-mode');
      if (aiMode) setAiInputMode(aiMode);
    });
  }

  // ──────────────────────────────────────────────
  // Initialize Everything on DOMContentLoaded
  // ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Populate dropdowns from PRESETS
    populateDropdowns();

    // Init dropdown bindings
    initDropdownBindings();

    // Init form controls
    initSlider();
    initFormBindings();

    // Init drop zones
    initDropZone(dom.smartDropZone, dom.smartFileInput, dom.smartFileTags, state.uploadedFiles, 'uploadedFiles');
    initDropZone(dom.textbookDropZone, dom.textbookFileInput, dom.textbookFileTags, state.textbookFiles, 'textbookFiles');
    initDropZone(dom.characterDropZone, dom.characterFileInput, dom.characterFileTags, state.characterFiles, 'characterFiles');
    initDropZone(dom.vocabularyDropZone, dom.vocabularyFileInput, dom.vocabularyFileTags, state.vocabularyFiles, 'vocabularyFiles');

    // Init navigation
    initModeTabs();
    initAiInputTabs();

    // Init generate & export
    initGenerateButton();
    initExportButtons();

    // Init copy YAML button
    dom.btnCopyYaml.addEventListener('click', copyYamlToClipboard);

    // Init API key modal
    initApiKeyModal();

    // Init help modal
    initHelpModal();

    // Init outline editor
    if (typeof OutlineEditor !== 'undefined') {
      OutlineEditor.init(
        dom.outlineEditor || document.getElementById('outlineEditor'),
        dom.yamlPreview,
        function (updatedOutline) {
          console.log('[OutlineEditor] Updated:', updatedOutline);
        }
      );
      OutlineEditor.bindEvents();
    }

    // Init flashcard editor (shares same container and preview)
    if (typeof FlashcardEditor !== 'undefined') {
      FlashcardEditor.init(
        dom.outlineEditor || document.getElementById('outlineEditor'),
        dom.yamlPreview,
        function (updatedCards) {
          console.log('[FlashcardEditor] Updated:', updatedCards);
        }
      );
      FlashcardEditor.bindEvents();
    }

    // Set initial mode
    setMode(state.mode);
    setAiInputMode(state.aiInputMode);
  });

})();
