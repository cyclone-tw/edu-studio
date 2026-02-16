/* ============================================================
   NBLM 簡報生成助手 — Main Application Controller (app.js)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. State Management
  // ──────────────────────────────────────────────
  const state = {
    mode: 'ai',                // 'ai' | 'textbook' | 'pdf'
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
    pdfPanel:          $('#pdfPanel'),
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
    textbookInputArea: $('#textbookInputArea'),
    materialText:      $('#materialText'),
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
    yamlEditor:        $('#yamlEditor'),
    previewContent:    $('#previewContent'),
    btnOpenApiKey:     $('#btnOpenApiKey'),
    apiKeyModal:       $('#apiKeyModal'),
    apiKeyInput:       $('#apiKeyInput'),
    btnSaveApiKey:     $('#btnSaveApiKey'),
    btnCancelApiKey:   $('#btnCancelApiKey'),
    loadingOverlay:    $('#loadingOverlay'),
    loadingText:       $('#loadingText'),
    toastContainer:    $('#toastContainer')
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
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-fade-out');
      toast.addEventListener('transitionend', function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
      // Fallback removal
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 500);
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

    if (mode === 'pdf') {
      // PDF mode: hide step progress and step panels, show PDF panel
      dom.stepProgress.classList.add('hidden');
      for (var i = 1; i <= 4; i++) {
        if (dom.stepPanels[i]) dom.stepPanels[i].classList.add('hidden');
      }
      dom.pdfPanel.classList.remove('hidden');
    } else {
      // AI or textbook mode
      dom.stepProgress.classList.remove('hidden');
      dom.pdfPanel.classList.add('hidden');

      // Toggle input areas in step 3
      if (mode === 'ai') {
        dom.aiInputArea.classList.remove('hidden');
        dom.textbookInputArea.classList.add('hidden');
      } else {
        dom.aiInputArea.classList.add('hidden');
        dom.textbookInputArea.classList.remove('hidden');
      }

      // Go to current step (re-render step panels visibility)
      goToStep(state.step);
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
  // 9. Generate Button & Export
  // ──────────────────────────────────────────────
  function getInputText() {
    if (state.mode === 'ai') {
      return (dom.materialText.value || '').trim();
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

        if (state.mode === 'ai' && typeof window.generatePresentation === 'function') {
          result = await window.generatePresentation(text, state);
        } else if (state.mode === 'textbook' && typeof window.splitTextbook === 'function') {
          result = await window.splitTextbook(text, state);
        } else {
          hideLoading();
          showToast('Gemini 模組尚未載入', 'error');
          return;
        }

        // Build structured YAML from JSON result
        if (result) {
          var yamlString;
          try {
            if (state.mode === 'textbook' && typeof window.buildTextbookYaml === 'function') {
              yamlString = window.buildTextbookYaml(result, state);
            } else if (typeof window.buildYaml === 'function') {
              yamlString = window.buildYaml(result, state);
            } else {
              // Fallback: raw YAML dump
              yamlString = jsyaml.dump(result);
            }
          } catch (buildErr) {
            console.warn('[YAML Build Warning]', buildErr);
            yamlString = jsyaml.dump(result);
          }

          dom.yamlEditor.value = yamlString;

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
      } catch (err) {
        hideLoading();
        isGenerating = false;
        dom.btnGenerate.disabled = false;
        showToast('生成失敗：' + (err.message || err), 'error');
        console.error('[Generate Error]', err);
      }
    });
  }

  function initExportButtons() {
    dom.btnDownloadYaml.addEventListener('click', function () {
      var content = dom.yamlEditor.value;
      if (!content) {
        showToast('沒有可下載的內容', 'error');
        return;
      }
      downloadFile(content, 'presentation.yaml', 'text/yaml');
      showToast('YAML 已下載', 'success');
    });

    dom.btnDownloadMd.addEventListener('click', function () {
      var yamlContent = dom.yamlEditor.value;
      if (!yamlContent) {
        showToast('沒有可下載的內容', 'error');
        return;
      }

      var mdContent = yamlToMarkdownOutline(yamlContent);
      downloadFile(mdContent, 'presentation-outline.md', 'text/markdown');
      showToast('Markdown 大綱已下載', 'success');
    });
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

  /**
   * Convert YAML content to a Markdown outline.
   * Handles the expected slide structure gracefully.
   */
  function yamlToMarkdownOutline(yamlStr) {
    try {
      var data = jsyaml.load(yamlStr);
      var lines = ['# 簡報大綱\n'];

      if (!data) return yamlStr;

      // Handle case where data is an array of slides
      var slides = Array.isArray(data) ? data : (data.slides || []);

      if (slides.length === 0) {
        // Fallback: just return the raw YAML wrapped in a code block
        return '# 簡報大綱\n\n```yaml\n' + yamlStr + '\n```';
      }

      slides.forEach(function (slide, idx) {
        var title = slide.title || slide.heading || ('Slide ' + (idx + 1));
        lines.push('## ' + (idx + 1) + '. ' + title);

        // Handle key_points (AI mode)
        if (slide.key_points && Array.isArray(slide.key_points) && slide.key_points.length > 0) {
          slide.key_points.forEach(function (point) {
            lines.push('- ' + point);
          });
        }

        // Handle content (textbook mode)
        if (slide.content) {
          if (Array.isArray(slide.content)) {
            slide.content.forEach(function (item) {
              lines.push('- ' + item);
            });
          } else {
            lines.push(slide.content);
          }
        }

        // Handle speaker_notes or notes
        var notes = slide.speaker_notes || slide.notes;
        if (notes) {
          lines.push('\n> ' + notes);
        }

        lines.push('');
      });

      return lines.join('\n');
    } catch (e) {
      // If YAML parse fails, return raw content
      return '# 簡報大綱\n\n```yaml\n' + yamlStr + '\n```';
    }
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
    initStepNavigation();

    // Init generate & export
    initGenerateButton();
    initExportButtons();

    // Init API key modal
    initApiKeyModal();

    // Set initial mode (ensures correct panel visibility)
    setMode(state.mode);
  });

})();
