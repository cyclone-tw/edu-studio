/* ============================================================
   NBLM 簡報生成助手 — Gemini API Integration (gemini.js)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // Helper: lookupLabel / lookupItem
  // ──────────────────────────────────────────────
  function lookupLabel(dimension, id) {
    var items = PRESETS[dimension];
    if (!items) return id;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i].label;
    }
    return id;
  }

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
  let isCallingGemini = false;

  async function callGemini(apiKey, prompt, files) {
    if (!apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }
    if (isCallingGemini) {
      throw new Error('已有進行中的生成任務，請稍候');
    }

    isCallingGemini = true;

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    var response;
    try {
      // Build parts array
      var parts = [{ text: prompt }];

      // Add file parts for multimodal
      if (files && files.length > 0) {
        for (var fi = 0; fi < files.length; fi++) {
          parts.push({
            inlineData: {
              mimeType: files[fi].mimeType,
              data: files[fi].data  // base64 string (no data URI prefix)
            }
          });
        }
      }

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 65536,
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
      try {
        var fixed = text;
        fixed = fixed.replace(/,\s*"[^"]*$/, '');
        fixed = fixed.replace(/,\s*$/, '');
        var opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
        var braces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
        for (var ci = 0; ci < opens; ci++) fixed += ']';
        for (var bi = 0; bi < braces; bi++) fixed += '}';
        console.warn('[Gemini] JSON truncated, attempted auto-fix');
        return JSON.parse(fixed);
      } catch (fixErr) {
        console.error('[Gemini] Raw response:', text.substring(0, 500));
        throw new Error('AI 回應格式解析失敗，請重新生成');
      }
    } finally {
      isCallingGemini = false;
    }
  }

  // ──────────────────────────────────────────────
  // generatePresentation — AI 智慧生成模式
  // ──────────────────────────────────────────────
  async function generatePresentation(text, state, files) {
    if ((!text || !text.trim()) && (!files || files.length === 0)) {
      throw new Error('請輸入素材內容或上傳檔案');
    }
    if (!state || !state.apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

    var role = lookupItem('presenterRoles', state.presenterRole);
    var audience = lookupItem('audienceProfiles', state.audience);
    var context = lookupItem('contexts', state.context);
    var style = lookupItem('visualStyles', state.visualStyle);

    var roleLabel = role ? role.label : state.presenterRole;
    var audienceLabel = audience ? audience.label : state.audience;
    var audienceTraits = audience ? audience.traits : '';
    var contextLabel = context ? context.label : state.context;
    var styleLabel = style ? style.label : state.visualStyle;

    // Build material section based on whether files are attached
    var materialSection;
    if (files && files.length > 0) {
      materialSection = '## 素材\n\n'
        + '以下附加了 ' + files.length + ' 個檔案（PDF/音檔等），請分析其內容作為素材。\n';
      if (text && text.trim()) {
        materialSection += '使用者另外補充的文字：\n' + text + '\n';
      }
    } else {
      materialSection = '## 素材\n\n' + text + '\n';
    }

    var prompt = '你是一位專業的簡報架構師。根據素材設計簡報，輸出精簡的 JSON。\n\n'
      + '⚠️ 必須恰好 ' + state.slideCount + ' 頁。\n\n'
      + '## 設定\n'
      + '- 角色：' + roleLabel + '\n'
      + '- 受眾：' + audienceLabel + '（' + audienceTraits + '）\n'
      + '- 場景：' + contextLabel + '\n'
      + '- 視覺風格：' + styleLabel + '\n\n'
      + materialSection + '\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "簡報標題",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "title": "頁面標題",\n'
      + '      "subtitle": "副標題（僅第一頁封面需要，其他頁留空字串）",\n'
      + '      "key_points": ["重點1", "重點2"],\n'
      + '      "script": "這頁的講者講綱，口語化的補充說明和教學重點",\n'
      + '      "visual_description": "此頁的圖像生成提示（描述具體的插圖場景、物件、構圖，符合' + styleLabel + '風格）",\n'
      + '      "layout_style": "排版描述，用英文，如: left-aligned title, text on left visual on right, asymmetrical split"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '規則：\n'
      + '- slides 必須恰好 ' + state.slideCount + ' 個\n'
      + '- 第一頁為封面頁，需要 subtitle，key_points 留空陣列\n'
      + '- 最後一頁為結尾頁\n'
      + '- key_points 放該頁要顯示的文字內容\n'
      + '- script 放講者口語化的講綱補充（不會顯示在簡報上）\n'
      + '- visual_description 要具體描述場景、物件和構圖，不要只寫「溫馨插圖」這類抽象詞\n'
      + '- layout_style 必須用英文描述版面排列方式（如 text on left visual on right / 50:50 split / full-width image with text overlay）\n'
      + '- 不要輸出其他欄位';

    return await callGemini(state.apiKey, prompt, files);
  }

  // ──────────────────────────────────────────────
  // splitTextbook — 課文忠實模式
  // ──────────────────────────────────────────────
  async function splitTextbook(text, state, files) {
    if ((!text || !text.trim()) && (!files || files.length === 0)) {
      throw new Error('請輸入課文內容或上傳檔案');
    }
    if (!state || !state.apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

    var role = lookupItem('presenterRoles', state.presenterRole);
    var audience = lookupItem('audienceProfiles', state.audience);
    var context = lookupItem('contexts', state.context);
    var style = lookupItem('visualStyles', state.visualStyle);

    var roleLabel = role ? role.label : state.presenterRole;
    var audienceLabel = audience ? audience.label : state.audience;
    var contextLabel = context ? context.label : state.context;
    var styleLabel = style ? style.label : state.visualStyle;

    // Build course section based on whether files are attached
    var courseSection;
    if (files && files.length > 0) {
      courseSection = '## 課文\n\n'
        + '以下附加了課文檔案，請分析其完整內容。\n';
      if (text && text.trim()) {
        courseSection += '使用者另外補充的文字：\n' + text + '\n';
      }
    } else {
      courseSection = '## 課文\n\n' + text;
    }

    var prompt = '你是課文分段專家。將課文原文忠實分配到簡報頁面中。\n\n'
      + '⚠️ 必須恰好 ' + state.slideCount + ' 頁。\n\n'
      + '## 設定\n'
      + '- 角色：' + roleLabel + '\n'
      + '- 受眾：' + audienceLabel + '\n'
      + '- 場景：' + contextLabel + '\n'
      + '- 視覺風格：' + styleLabel + '\n\n'
      + '## 嚴格規則\n'
      + '1. 課文原文「一字不改」「一字不漏」放入 key_points\n'
      + '2. 所有文字必須完整分配，不可遺漏\n'
      + '3. 根據段落、語意斷點合理分頁\n'
      + '4. 每頁文字量盡量均勻\n'
      + '5. 第 1 頁為標題頁（key_points 留空）\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "根據課文產生的簡報標題",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "title": "此頁小標題",\n'
      + '      "subtitle": "副標題（僅第一頁封面需要，其他頁留空字串）",\n'
      + '      "key_points": ["課文原文句子1", "課文原文句子2"],\n'
      + '      "script": "這頁的講者講綱，口語化說明如何呈現這段課文內容",\n'
      + '      "visual_description": "此頁的圖像生成提示（描述具體的插圖場景、物件、構圖，符合' + styleLabel + '風格）",\n'
      + '      "layout_style": "排版描述，用英文，如: left-aligned title, text on left visual on right, asymmetrical split"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '規則：\n'
      + '- slides 必須恰好 ' + state.slideCount + ' 個\n'
      + '- 第一頁為封面頁，需要 subtitle，key_points 留空陣列\n'
      + '- 最後一頁為結尾頁\n'
      + '- key_points 放課文原文（一字不改）\n'
      + '- script 放講者口語化的講綱補充（不會顯示在簡報上）\n'
      + '- visual_description 要具體描述場景、物件和構圖，不要只寫抽象詞\n'
      + '- layout_style 必須用英文描述版面排列方式（如 text on left visual on right / 50:50 split / full-width image with text overlay）\n'
      + '- 不要輸出其他欄位\n\n'
      + courseSection;

    return await callGemini(state.apiKey, prompt, files);
  }

  // ──────────────────────────────────────────────
  // generateFromOutline — 大綱轉檔模式
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
    var audienceLabel = audience ? audience.label : state.audience;
    var contextLabel = context ? context.label : state.context;
    var styleLabel = style ? style.label : state.visualStyle;

    var prompt = '你是簡報格式轉換專家。將大綱轉換為結構化 JSON。\n\n'
      + '## 設定\n'
      + '- 角色：' + roleLabel + '\n'
      + '- 受眾：' + audienceLabel + '\n'
      + '- 場景：' + contextLabel + '\n'
      + '- 視覺風格：' + styleLabel + '\n\n'
      + '## 規則\n'
      + '1. 大綱的標題和內容「一字不改」\n'
      + '2. 保持原始分頁結構\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "簡報標題",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "title": "頁面標題（從大綱提取，一字不改）",\n'
      + '      "subtitle": "副標題（僅第一頁封面需要，其他頁留空字串）",\n'
      + '      "key_points": ["內容1", "內容2"],\n'
      + '      "script": "這頁的講者講綱，口語化的補充說明",\n'
      + '      "visual_description": "圖像生成提示（描述具體的插圖場景、物件、構圖，符合' + styleLabel + '風格）",\n'
      + '      "layout_style": "排版描述，用英文，如: left-aligned title, text on left visual on right, asymmetrical split"\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '規則：\n'
      + '- 第一頁為封面頁，需要 subtitle，key_points 留空陣列\n'
      + '- 最後一頁為結尾頁\n'
      + '- key_points 放大綱內容（一字不改）\n'
      + '- script 放講者口語化的講綱補充（不會顯示在簡報上）\n'
      + '- visual_description 要具體描述場景、物件和構圖，不要只寫抽象詞\n'
      + '- layout_style 必須用英文描述版面排列方式（如 text on left visual on right / 50:50 split / full-width image with text overlay）\n'
      + '- 不要輸出其他欄位\n\n'
      + '## 大綱\n\n' + text;

    return await callGemini(state.apiKey, prompt);
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.generatePresentation = generatePresentation;
  window.splitTextbook = splitTextbook;
  window.generateFromOutline = generateFromOutline;

})();
