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
  let isCallingGemini = false; // Prevent concurrent calls

  async function callGemini(apiKey, prompt) {
    if (!apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

    // Prevent concurrent API calls
    if (isCallingGemini) {
      console.warn('[Gemini] 已有進行中的 API 請求，跳過此次呼叫');
      throw new Error('已有進行中的生成任務，請稍候');
    }

    isCallingGemini = true;

    // Using gemini-2.5-flash (latest stable, better rate limits)
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    var response;
    try {
      response = await fetch(url, {
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
    } catch (networkErr) {
      isCallingGemini = false;
      throw new Error('網路連線失敗，請檢查網路狀態後重試。（' + (networkErr.message || '未知錯誤') + '）');
    }

    if (!response.ok) {
      isCallingGemini = false;
      var err = await response.json().catch(function () { return {}; });
      var errMsg = (err.error && err.error.message) || '';

      if (response.status === 400 && errMsg.toLowerCase().indexOf('api key') !== -1) {
        throw new Error('API Key 無效，請檢查後重新設定');
      } else if (response.status === 403) {
        throw new Error('API Key 權限不足或已被停用，請確認 Key 的有效性');
      } else if (response.status === 429) {
        throw new Error('⏱️ API 請求次數超過限制（每分鐘最多 15 次）。請等待 1 分鐘後重試，或考慮升級到付費版本以獲得更高配額。');
      } else if (response.status >= 500) {
        throw new Error('Gemini API 伺服器錯誤，請稍後重試');
      }
      throw new Error(errMsg || ('API 錯誤: ' + response.status));
    }

    var data = await response.json();
    var text = data.candidates
      && data.candidates[0]
      && data.candidates[0].content
      && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0]
      && data.candidates[0].content.parts[0].text;

    if (!text) {
      isCallingGemini = false;
      throw new Error('API 回應格式異常，請重試');
    }

    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new Error('AI 回應格式解析失敗，請重新生成');
    } finally {
      isCallingGemini = false; // Always reset the flag
    }
  }

  // ──────────────────────────────────────────────
  // generatePresentation — AI 智慧生成模式
  // ──────────────────────────────────────────────
  async function generatePresentation(text, state) {
    if (!text || !text.trim()) {
      throw new Error('請輸入素材內容');
    }
    if (!state || !state.apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

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
      'ja': '日本語',
      'bilingual': '雙語混合（中英）'
    };

    var prompt = '你是一位專業的簡報架構師，擅長根據素材和情境設計出最佳簡報結構。\n\n'
      + '⚠️ 【最重要的規則】你必須產生恰好 ' + state.slideCount + ' 頁投影片，不多不少。slides 陣列長度必須是 ' + state.slideCount + '。\n\n'
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
      + '- ⚠️ 投影片數量：必須恰好 ' + state.slideCount + ' 頁（這是硬性要求）\n'
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
      + '⚠️ 再次提醒：slides 陣列必須恰好包含 ' + state.slideCount + ' 個元素，這是最重要的硬性要求。';

    return await callGemini(state.apiKey, prompt);
  }

  // ──────────────────────────────────────────────
  // splitTextbook — 課文忠實模式
  // ──────────────────────────────────────────────
  async function splitTextbook(text, state) {
    if (!text || !text.trim()) {
      throw new Error('請輸入課文內容');
    }
    if (!state || !state.apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

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
      low: '低互動：以講述為主，僅在關鍵處設置簡單提問',
      medium: '中互動：每 3-4 頁穿插互動環節（提問、小活動）',
      high: '高互動：頻繁互動，每 1-2 頁都有參與環節'
    };

    var prompt = '你是一位簡報分段專家，擅長將課文轉換為教學簡報。\n\n'
      + '⚠️ 【最重要的規則】你必須將課文分配到恰好 ' + state.slideCount + ' 頁投影片中，不多不少。slides 陣列長度必須是 ' + state.slideCount + '。\n\n'
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
      + '### 互動程度\n'
      + '- ' + (interactionDesc[state.interactionLevel] || state.interactionLevel) + '\n\n'
      + '## 嚴格規則\n\n'
      + '1. ⚠️ 投影片數量：必須恰好 ' + state.slideCount + ' 頁（第 1 頁為標題頁，其餘為內容頁）\n'
      + '2. content 欄位中的課文原文「一字不改」「一字不漏」\n'
      + '3. 將所有文字完整分配到 content 中，不可遺漏任何字\n'
      + '4. 根據段落、語意斷點合理分配\n'
      + '5. 每頁的文字量盡量均勻\n'
      + '6. 每頁必須根據上方的「視覺風格」和「受眾」生成具體的 visual_direction（視覺設計指示）\n'
      + '7. 每頁必須根據上方的「簡報者角色」語調生成 speaker_notes（完整講稿，可直接當老師上課用的講稿）\n'
      + '8. 根據互動程度適當加入 interaction 互動設計\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "根據課文內容產生的標題",\n'
      + '  "presentation_strategy": {\n'
      + '    "opening_hook": "開場吸引策略",\n'
      + '    "core_message": "核心訊息",\n'
      + '    "audience_adaptation": "受眾適應策略",\n'
      + '    "closing_action": "結尾行動呼籲"\n'
      + '  },\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "slide_number": 1,\n'
      + '      "type": "title",\n'
      + '      "title": "標題頁文字",\n'
      + '      "content": "",\n'
      + '      "visual_direction": "具體的視覺設計指示（符合所選風格）",\n'
      + '      "interaction": "互動設計（若有）",\n'
      + '      "speaker_notes": "完整講稿（符合所選角色語調）"\n'
      + '    },\n'
      + '    {\n'
      + '      "slide_number": 2,\n'
      + '      "type": "content",\n'
      + '      "title": "此頁小標題",\n'
      + '      "content": "此頁的課文原文（一字不改）",\n'
      + '      "visual_direction": "具體的視覺設計指示",\n'
      + '      "interaction": "互動設計（若有）",\n'
      + '      "speaker_notes": "完整講稿"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '## 課文內容\n\n' + text + '\n\n'
      + '⚠️ 再次提醒：slides 陣列必須恰好包含 ' + state.slideCount + ' 個元素。每頁都必須有具體的 visual_direction 和 speaker_notes。';

    return await callGemini(state.apiKey, prompt);
  }

  // ──────────────────────────────────────────────
  // generateFromOutline — 依據上傳者大綱轉檔
  // ──────────────────────────────────────────────
  async function generateFromOutline(text, state) {
    if (!text || !text.trim()) {
      throw new Error('請輸入簡報大綱內容');
    }
    if (!state || !state.apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

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

    var prompt = '你是一位簡報格式轉換專家。請將使用者提供的簡報大綱轉換為結構化 JSON 格式。\n\n'
      + '## 簡報設定\n\n'
      + '- 簡報者角色：' + roleLabel + '（語調：' + roleTone + '）\n'
      + '- 受眾：' + audienceLabel + '（' + audienceTraits + '）\n'
      + '- 場景：' + contextLabel + '\n'
      + '- 視覺風格：' + styleLabel + '\n\n'
      + '## 嚴格規則\n\n'
      + '1. 大綱中的「標題」和「內容文字」必須「一字不改」「一字不漏」\n'
      + '2. 保持使用者原始的分頁和段落結構\n'
      + '3. 如果使用者沒有明確標示頁數，請根據內容合理分頁\n'
      + '4. 每頁必須根據上方的「視覺風格」生成具體的 visual_direction\n'
      + '5. 每頁必須根據「簡報者角色」語調生成 speaker_notes（完整講稿）\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "根據大綱內容產生的標題",\n'
      + '  "presentation_strategy": {\n'
      + '    "opening_hook": "開場策略",\n'
      + '    "core_message": "核心訊息",\n'
      + '    "audience_adaptation": "受眾適應策略",\n'
      + '    "closing_action": "結尾行動"\n'
      + '  },\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "slide_number": 1,\n'
      + '      "type": "title|content",\n'
      + '      "title": "此頁標題（從大綱提取，一字不改）",\n'
      + '      "key_points": ["要點1", "要點2"],\n'
      + '      "visual_direction": "具體的視覺設計指示（符合所選風格）",\n'
      + '      "interaction": "互動設計（若有）",\n'
      + '      "speaker_notes": "完整講稿（符合所選角色語調）"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '使用者提供的大綱：\n' + text;

    return await callGemini(state.apiKey, prompt);
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.generatePresentation = generatePresentation;
  window.splitTextbook = splitTextbook;
  window.generateFromOutline = generateFromOutline;

})();
