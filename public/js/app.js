/* ============================================================
   NBLM 簡報生成助手 — Main Application Controller (app.js)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. State Management
  // ──────────────────────────────────────────────
  const state = {
    mode: 'ai',                // 'ai' | 'textbook'
    aiInputMode: 'smart',      // 'smart' | 'outline' (for AI mode)
    step: 1,
    presenterRole: null,
    audience: null,
    context: null,
    visualStyle: null,
    slideCount: 12,
    language: 'zh-TW',
    interactionLevel: 'medium',
    customPrompt: '',
    apiKey: localStorage.getItem('gemini_api_key') || ''
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
    stepProgress:      $('#stepProgress'),
    stepPanels:        [null, $('#step1Panel'), $('#step2Panel'), $('#step3Panel'), $('#step4Panel')],
    roleCards:         $('#roleCards'),
    audienceCardsEdu:  $('#audienceCardsEdu'),
    audienceCardsWork: $('#audienceCardsWork'),
    scenarioCards:     $('#scenarioCards'),
    styleCards:        $('#styleCards'),
    slideCount:        $('#slideCount'),
    slideCountValue:   $('#slideCountValue'),
    language:          $('#language'),
    customPrompt:      $('#customPrompt'),
    aiInputArea:       $('#aiInputArea'),
    aiInputTabs:       $('.ai-input-tabs'),
    smartInputPanel:   $('#smartInputPanel'),
    outlineInputPanel: $('#outlineInputPanel'),
    textbookInputArea: $('#textbookInputArea'),
    materialText:      $('#materialText'),
    outlineText:       $('#outlineText'),
    textbookText:      $('#textbookText'),
    materialFile:      $('#materialFile'),
    fileName:          $('#fileName'),
    step1Next:         $('#step1Next'),
    step2Prev:         $('#step2Prev'),
    step2Next:         $('#step2Next'),
    step3Prev:         $('#step3Prev'),
    btnGenerate:       $('#btnGenerate'),
    step4Prev:         $('#step4Prev'),
    btnDownloadYaml:   $('#btnDownloadYaml'),
    btnDownloadMd:     $('#btnDownloadMd'),
    previewContent:    $('#previewContent'),
    btnOpenApiKey:     $('#btnOpenApiKey'),
    apiKeyModal:       $('#apiKeyModal'),
    apiKeyInput:       $('#apiKeyInput'),
    btnSaveApiKey:     $('#btnSaveApiKey'),
    btnCancelApiKey:   $('#btnCancelApiKey'),
    loadingOverlay:    $('#loadingOverlay'),
    loadingText:       $('#loadingText'),
    toastContainer:    $('#toastContainer'),
    btnOpenHelp:       $('#btnOpenHelp'),
    helpModal:         $('#helpModal'),
    btnCloseHelp:      $('#btnCloseHelp'),
    btnHelpOk:         $('#btnHelpOk'),
    btnCopyYaml:       $('#btnCopyYaml'),
    yamlPreview:       $('#yamlPreview'),
    outlineEditor:     $('#outlineEditor')
  };

  // ──────────────────────────────────────────────
  // 10. Toast System
  // ──────────────────────────────────────────────
  function showToast(message, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    // Trigger reflow then add visible class for animation
    requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    setTimeout(function () {
      if (!toast) return; // Guard against null toast
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-fade-out');

      var removed = false;
      var removeToast = function() {
        if (removed || !toast) return; // Prevent double removal
        removed = true;
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      };

      toast.addEventListener('transitionend', removeToast, { once: true });
      // Fallback removal
      setTimeout(removeToast, 500);
    }, 3000);
  }

  // Expose globally for other modules
  window.showToast = showToast;

  // ──────────────────────────────────────────────
  // 11. Loading Overlay
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
  // 3. Step Flow Control
  // ──────────────────────────────────────────────
  function goToStep(n) {
    if (n < 1 || n > 4) return;
    state.step = n;

    // Hide all step panels
    for (var i = 1; i <= 4; i++) {
      if (dom.stepPanels[i]) {
        dom.stepPanels[i].classList.add('hidden');
      }
    }

    // Show target panel
    if (dom.stepPanels[n]) {
      dom.stepPanels[n].classList.remove('hidden');
    }

    // Update step progress dots
    var stepItems = $$('#stepProgress .step-item');
    stepItems.forEach(function (item) {
      var stepNum = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (stepNum === n) {
        item.classList.add('active');
      } else if (stepNum < n) {
        item.classList.add('completed');
      }
    });
  }

  // ──────────────────────────────────────────────
  // 2. Mode Tab Switching
  // ──────────────────────────────────────────────
  function setMode(mode) {
    state.mode = mode;

    // Toggle active class on tab buttons
    $$('#modeTabs .mode-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    // AI or textbook mode
    dom.stepProgress.classList.remove('hidden');

    // Toggle input areas in step 3
    if (mode === 'ai') {
      dom.aiInputArea.classList.remove('hidden');
      dom.textbookInputArea.classList.add('hidden');
    } else if (mode === 'textbook') {
      dom.aiInputArea.classList.add('hidden');
      dom.textbookInputArea.classList.remove('hidden');
    }

    // Go to current step (re-render step panels visibility)
    goToStep(state.step);
  }

  // ──────────────────────────────────────────────
  // AI Input Mode Tab Switching
  // ──────────────────────────────────────────────
  function setAiInputMode(aiMode) {
    state.aiInputMode = aiMode;

    // Toggle active class on AI input tabs
    $$('.ai-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-ai-mode') === aiMode);
    });

    // Toggle input panels
    if (aiMode === 'smart') {
      dom.smartInputPanel.classList.remove('hidden');
      dom.outlineInputPanel.classList.add('hidden');
    } else {
      dom.smartInputPanel.classList.add('hidden');
      dom.outlineInputPanel.classList.remove('hidden');
    }
  }

  // ──────────────────────────────────────────────
  // 4. Card Selector Rendering
  // ──────────────────────────────────────────────

  /**
   * Parse label string like '👨‍🏫 教師' into { emoji, text }.
   * Emoji may be a single char, a multi-codepoint sequence, or a flag.
   */
  function parseLabel(label) {
    var parts = label.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { emoji: parts[0], text: parts.slice(1).join(' ') };
    }
    return { emoji: '', text: label };
  }

  function createCard(id, label, desc) {
    var parsed = parseLabel(label);
    var card = document.createElement('div');
    card.className = 'preset-card';
    card.setAttribute('data-id', id);

    var emojiSpan = document.createElement('span');
    emojiSpan.className = 'card-emoji';
    emojiSpan.textContent = parsed.emoji;

    var labelSpan = document.createElement('span');
    labelSpan.className = 'card-name';
    labelSpan.textContent = parsed.text;

    card.appendChild(emojiSpan);
    card.appendChild(labelSpan);

    if (desc) {
      var descSpan = document.createElement('span');
      descSpan.className = 'card-desc';
      descSpan.textContent = desc;
      card.appendChild(descSpan);
    }

    return card;
  }

  function renderCards() {
    // Presenter Roles
    PRESETS.presenterRoles.forEach(function (item) {
      dom.roleCards.appendChild(createCard(item.id, item.label, item.tone));
    });

    // Audience Profiles — Education
    PRESETS.audienceProfiles
      .filter(function (a) { return a.category === '教育類'; })
      .forEach(function (item) {
        dom.audienceCardsEdu.appendChild(createCard(item.id, item.label, item.traits));
      });

    // Audience Profiles — Work
    PRESETS.audienceProfiles
      .filter(function (a) { return a.category === '職場類'; })
      .forEach(function (item) {
        dom.audienceCardsWork.appendChild(createCard(item.id, item.label, item.traits));
      });

    // Contexts / Scenarios
    PRESETS.contexts.forEach(function (item) {
      dom.scenarioCards.appendChild(createCard(item.id, item.label, ''));
    });

    // Visual Styles
    PRESETS.visualStyles.forEach(function (item) {
      dom.styleCards.appendChild(createCard(item.id, item.label, item.css));
    });
  }

  /**
   * Set up single-select click handlers for a card container.
   * stateKey: key in `state` to update on selection.
   */
  function initCardGroup(container, stateKey) {
    if (!container) return;
    container.addEventListener('click', function (e) {
      var card = e.target.closest('.preset-card');
      if (!card) return;

      // Deselect siblings in this container
      container.querySelectorAll('.preset-card').forEach(function (c) {
        c.classList.remove('selected');
      });
      card.classList.add('selected');
      state[stateKey] = card.getAttribute('data-id');
    });
  }

  /**
   * Audience cards span two containers but share one state key.
   * Selecting in one container deselects the other.
   */
  function initAudienceGroups() {
    var eduContainer = dom.audienceCardsEdu;
    var workContainer = dom.audienceCardsWork;

    function handleClick(e) {
      var card = e.target.closest('.preset-card');
      if (!card) return;

      // Deselect all audience cards in both containers
      eduContainer.querySelectorAll('.preset-card').forEach(function (c) {
        c.classList.remove('selected');
      });
      workContainer.querySelectorAll('.preset-card').forEach(function (c) {
        c.classList.remove('selected');
      });

      card.classList.add('selected');
      state.audience = card.getAttribute('data-id');
    }

    eduContainer.addEventListener('click', handleClick);
    workContainer.addEventListener('click', handleClick);
  }

  // ──────────────────────────────────────────────
  // 5. Range Slider
  // ──────────────────────────────────────────────
  function initSlider() {
    dom.slideCount.addEventListener('input', function () {
      var val = parseInt(this.value, 10);
      dom.slideCountValue.textContent = val;
      state.slideCount = val;
    });
  }

  // ──────────────────────────────────────────────
  // 6. Form Bindings
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
  // 7. File Upload (AI mode)
  // ──────────────────────────────────────────────
  function initFileUpload() {
    dom.materialFile.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) {
        dom.fileName.textContent = '';
        return;
      }

      dom.fileName.textContent = file.name;

      var ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'txt') {
        var reader = new FileReader();
        reader.onload = function (e) {
          dom.materialText.value = e.target.result;
        };
        reader.readAsText(file, 'UTF-8');
      }
      // For PDF, we store the file object — actual extraction
      // can be handled by gemini.js or a separate utility.
    });
  }

  // ──────────────────────────────────────────────
  // 8. API Key Modal
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

    // Click overlay to close
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

    // Click overlay to close
    dom.helpModal.addEventListener('click', function (e) {
      if (e.target === dom.helpModal) {
        dom.helpModal.classList.add('hidden');
      }
    });
  }

  // ──────────────────────────────────────────────
  // 9. Generate Button & Export
  // ──────────────────────────────────────────────
  function getInputText() {
    if (state.mode === 'ai') {
      if (state.aiInputMode === 'smart') {
        return (dom.materialText.value || '').trim();
      } else {
        return (dom.outlineText.value || '').trim();
      }
    }
    if (state.mode === 'textbook') {
      return (dom.textbookText.value || '').trim();
    }
    return '';
  }

  var isGenerating = false; // Prevent double-click

  function initGenerateButton() {
    dom.btnGenerate.addEventListener('click', async function () {
      // Prevent double-click
      if (isGenerating) {
        showToast('正在生成中，請稍候...', 'info');
        return;
      }

      // Validate API key
      if (!state.apiKey) {
        showToast('請先設定 Gemini API Key', 'error');
        return;
      }

      // Validate input
      var text = getInputText();
      if (!text) {
        showToast('請先輸入或上傳素材', 'error');
        return;
      }

      isGenerating = true;
      dom.btnGenerate.disabled = true;
      showLoading('生成中，請稍候...');

      try {
        var result;

        if (state.mode === 'ai') {
          if (state.aiInputMode === 'smart' && typeof window.generatePresentation === 'function') {
            result = await window.generatePresentation(text, state);
          } else if (state.aiInputMode === 'outline' && typeof window.generateFromOutline === 'function') {
            result = await window.generateFromOutline(text, state);
          } else {
            hideLoading();
            showToast('Gemini 模組尚未載入', 'error');
            return;
          }
        } else if (state.mode === 'textbook' && typeof window.splitTextbook === 'function') {
          result = await window.splitTextbook(text, state);
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
            if (typeof window.buildYaml === 'function') {
              doc = window.buildYaml(result, state);
              // Generate NBLM YAML (without script) for preview
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

          // Update YAML preview
          if (dom.yamlPreview) dom.yamlPreview.value = yamlString;

          // Load full document (with script) into outline editor
          if (typeof OutlineEditor !== 'undefined' && doc) {
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
        goToStep(4);
        showToast('簡報生成完成！', 'success');
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
   * Format: YYYY-MM-DD-標題.ext
   */
  function generateFilename(extension) {
    var yamlContent = dom.yamlPreview.value;
    var title = 'presentation';

    // Try to extract title from YAML content
    try {
      var data = jsyaml.load(yamlContent);
      if (data && data.title) {
        title = data.title;
      } else if (Array.isArray(data) && data[0] && data[0].title) {
        title = data[0].title;
      }
    } catch (e) {
      // If YAML parse fails, try to extract from first line
      var lines = yamlContent.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('title:')) {
          title = line.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
          break;
        }
      }
    }

    // Sanitize title for filename (remove special chars, limit length)
    title = title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .substring(0, 50);             // Limit length

    // Get current date in YYYY-MM-DD format
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
      var filename = generateFilename('yaml');
      downloadFile(content, filename, 'text/yaml');
      showToast('YAML 已下載', 'success');
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
  // Step Navigation Wiring
  // ──────────────────────────────────────────────
  function initStepNavigation() {
    dom.step1Next.addEventListener('click', function () {
      // Validate: all 4 dimensions must be selected
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
      goToStep(2);
    });

    dom.step2Prev.addEventListener('click', function () {
      goToStep(1);
    });

    dom.step2Next.addEventListener('click', function () {
      goToStep(3);
    });

    dom.step3Prev.addEventListener('click', function () {
      goToStep(2);
    });

    dom.step4Prev.addEventListener('click', function () {
      goToStep(3);
    });
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
    // Render cards from PRESETS
    renderCards();

    // Init card selection groups
    initCardGroup(dom.roleCards, 'presenterRole');
    initAudienceGroups();
    initCardGroup(dom.scenarioCards, 'context');
    initCardGroup(dom.styleCards, 'visualStyle');

    // Init form controls
    initSlider();
    initFormBindings();
    initFileUpload();

    // Init navigation
    initModeTabs();
    initAiInputTabs();
    initStepNavigation();

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
          // Callback when outline is updated
          console.log('[OutlineEditor] Updated:', updatedOutline);
        }
      );
      OutlineEditor.bindEvents();
    }

    // Set initial mode (ensures correct panel visibility)
    setMode(state.mode);
    setAiInputMode(state.aiInputMode);
  });

})();
