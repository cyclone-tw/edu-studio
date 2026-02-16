/* ============================================================
   NBLM 簡報生成助手 — Gemini API Integration (gemini.js)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // Helper: lookupLabel
  // ──────────────────────────────────────────────
  /**
   * Look up the full label from PRESETS for a given dimension and id.
   * E.g., lookupLabel('presenterRoles', 'teacher') → '👨‍🏫 教師'
   */
  function lookupLabel(dimension, id) {
    var items = PRESETS[dimension];
    if (!items) return id;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i].label;
    }
    return id;
  }

  /**
   * Look up full item object from PRESETS for a given dimension and id.
   */
  function lookupItem(dimension, id) {
    var items = PRESETS[dimension];
    if (!items) return null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // Helper: callGemini
  // ──────────────────────────────────────────────
  async function callGemini(apiKey, prompt) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      var err = await response.json().catch(function () { return {}; });
      throw new Error((err.error && err.error.message) || ('API 錯誤: ' + response.status));
    }

    var data = await response.json();
    var text = data.candidates
      && data.candidates[0]
      && data.candidates[0].content
      && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0]
      && data.candidates[0].content.parts[0].text;

    if (!text) throw new Error('API 回應格式異常');

    return JSON.parse(text);
  }

  // ──────────────────────────────────────────────
  // generatePresentation — AI 智慧生成模式
  // ──────────────────────────────────────────────
  async function generatePresentation(text, state) {
    var role = lookupItem('presenterRoles', state.presenterRole);
    var audience = lookupItem('audienceProfiles', state.audience);
    var context = lookupItem('contexts', state.context);
    var style = lookupItem('visualStyles', state.visualStyle);

    var roleLabel = role ? role.label : state.presenterRole;
    var roleTone = role ? role.tone : '';
    var audienceLabel = audience ? audience.label : state.audience;
    var audienceTraits = audience ? audience.traits : '';
    var contextLabel = context ? context.label : state.context;
    var styleLabel = style ? style.label : state.visualStyle;

    var interactionDesc = {
      low: '低互動：以講述為主，少量提問',
      medium: '中互動：每 3-4 頁穿插互動環節（提問、小活動）',
      high: '高互動：頻繁互動，每 1-2 頁都有參與環節'
    };

    var languageDesc = {
      'zh-TW': '繁體中文',
      'en': 'English',
      'ja': '日本語'
    };

    var prompt = '你是一位專業的簡報架構師，擅長根據素材和情境設計出最佳簡報結構。\n\n'
      + '## 簡報設定\n\n'
      + '### 簡報者角色\n'
      + '- 角色：' + roleLabel + '\n'
      + '- 語調風格：' + roleTone + '\n\n'
      + '### 受眾分析\n'
      + '- 受眾：' + audienceLabel + '\n'
      + '- 受眾特質：' + audienceTraits + '\n\n'
      + '### 簡報場景\n'
      + '- 場景：' + contextLabel + '\n\n'
      + '### 視覺風格\n'
      + '- 風格：' + styleLabel + '\n\n'
      + '### 其他參數\n'
      + '- 投影片數量：' + state.slideCount + ' 頁\n'
      + '- 語言：' + (languageDesc[state.language] || state.language) + '\n'
      + '- 互動程度：' + (interactionDesc[state.interactionLevel] || state.interactionLevel) + '\n';

    if (state.customPrompt) {
      prompt += '- 額外指示：' + state.customPrompt + '\n';
    }

    prompt += '\n## 素材內容\n\n' + text + '\n\n';

    prompt += '## 設計原則\n\n'
      + '1. 每頁只講一個核心概念\n'
      + '2. 視覺指令必須具體可執行（例如：「左側放一張老師站在黑板前的插圖，右側條列三個要點」）\n'
      + '3. 針對受眾調整用語難度和互動方式\n'
      + '4. ' + (state.interactionLevel === 'low'
        ? '以講述為主，僅在關鍵處設置簡單提問'
        : '每 3-4 頁穿插互動環節（提問、小測驗、討論）') + '\n'
      + '5. speaker_notes 要完整到可以直接當講稿使用\n\n';

    prompt += '## 輸出格式\n\n'
      + '請輸出以下 JSON 格式（嚴格遵守結構）：\n\n'
      + '{\n'
      + '  "title": "簡報標題",\n'
      + '  "presentation_strategy": {\n'
      + '    "opening_hook": "開場吸引策略",\n'
      + '    "core_message": "核心訊息",\n'
      + '    "audience_adaptation": "受眾適應策略",\n'
      + '    "closing_action": "結尾行動呼籲"\n'
      + '  },\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "slide_number": 1,\n'
      + '      "type": "title|content|activity",\n'
      + '      "title": "頁面標題",\n'
      + '      "subtitle": "副標題（可選）",\n'
      + '      "key_points": ["重點1", "重點2"],\n'
      + '      "visual_direction": "具體的視覺設計指示",\n'
      + '      "interaction": "互動設計（若有）",\n'
      + '      "speaker_notes": "完整講稿"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '請產生恰好 ' + state.slideCount + ' 頁投影片。';

    return await callGemini(state.apiKey, prompt);
  }

  // ──────────────────────────────────────────────
  // splitTextbook — 課文忠實模式
  // ──────────────────────────────────────────────
  async function splitTextbook(text, state) {
    var prompt = '你是一位簡報分段專家。請將以下課文依照段落邏輯，分配到 '
      + state.slideCount + ' 張投影片中。\n\n'
      + '嚴格規則：\n'
      + '1. 課文原文「一字不改」「一字不漏」\n'
      + '2. 將所有文字完整分配，不可遺漏任何字\n'
      + '3. 根據段落、語意斷點合理分配\n'
      + '4. 每頁的文字量盡量均勻\n\n'
      + '輸出 JSON 格式：\n'
      + '{\n'
      + '  "title": "根據課文內容產生的標題",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "slide_number": 1,\n'
      + '      "type": "title",\n'
      + '      "title": "標題頁文字",\n'
      + '      "content": ""\n'
      + '    },\n'
      + '    {\n'
      + '      "slide_number": 2,\n'
      + '      "type": "content",\n'
      + '      "title": "此頁小標題",\n'
      + '      "content": "此頁的課文原文（一字不改）"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '課文內容：\n' + text;

    var result = await callGemini(state.apiKey, prompt);

    // Wrap the result to include metadata and strategy for consistency with AI mode
    var roleLabel = lookupLabel('presenterRoles', state.presenterRole);
    var audienceLabel = lookupLabel('audienceProfiles', state.audience);
    var contextLabel = lookupLabel('contexts', state.context);
    var styleLabel = lookupLabel('visualStyles', state.visualStyle);

    if (!result.presentation_strategy) {
      result.presentation_strategy = {
        opening_hook: '直接呈現課文內容',
        core_message: result.title || '課文重點整理',
        audience_adaptation: '忠實呈現原文，保持課文完整性',
        closing_action: '複習課文重點'
      };
    }

    if (!result.metadata) {
      result.metadata = {
        mode: 'textbook',
        presenterRole: roleLabel,
        audience: audienceLabel,
        context: contextLabel,
        visualStyle: styleLabel,
        slideCount: state.slideCount,
        language: state.language
      };
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.generatePresentation = generatePresentation;
  window.splitTextbook = splitTextbook;

})();
