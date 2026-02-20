/* ============================================================
   閃卡 YAML Engine — 生字/語詞 JSON → presentation_data YAML
   Dependencies: js-yaml (global `jsyaml`), yaml-engine.js (toNblmYaml)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // buildCharacterYaml — 生字意象圖 YAML
  // ──────────────────────────────────────────────
  function buildCharacterYaml(jsonData, styleId, options) {
    if (!jsonData) throw new Error('No JSON data provided');
    options = options || {};

    var styleMap = window.NBLM_STYLE_MAP || {};
    var styleInfo = styleMap[styleId] || styleMap.hand_drawn || {
      style_name: 'hand_drawn',
      visual_keywords: '手繪蠟筆質感、溫馨插圖、塗鴉風格',
      title_font: 'Noto Sans TC',
      body_font: 'Noto Sans TC',
      bg: '#FFFEF5',
      text: '#333333',
      accent: '#FF6B35',
      tone: 'bold and playful, hand-drawn illustration style'
    };

    var title = jsonData.title || '生字意象圖';
    var safeTitle = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);

    // Font size for key_points (注音/部首/造詞)
    var keyPointsFontSize = options.keyPointsFontSize || '28pt';

    var globalDesign = {
      tone: styleInfo.tone,
      style_name: styleInfo.style_name,
      visual_keywords: styleInfo.visual_keywords,
      color_palette: {
        background: styleInfo.bg,
        text: styleInfo.text,
        accent: styleInfo.accent
      },
      typography: {
        title_font: styleInfo.title_font,
        body_font: styleInfo.body_font,
        key_points_font_size: keyPointsFontSize
      },
      total_pages: (jsonData.slides || []).length
    };

    var slideCount = (jsonData.slides || []).length;
    var sysInstructions = '[SYSTEM META - INTERNAL USE ONLY]\n'
      + 'You are a visual design director creating character imagery flashcards (生字意象圖).\n'
      + 'Each slide contains ONE Chinese character with a meaning-based illustration.\n'
      + 'The character should be LARGE, bold, and centered. The illustration shows concrete objects or abstract imagery that helps children understand the character meaning.\n'
      + '- For pictographic/concrete characters (象形字/名詞): merge real objects into the character strokes (e.g. 鳥 with a bird shape, 山 with mountain scenery)\n'
      + '- For abstract/verb/adjective characters: use evocative scenes that convey the meaning (e.g. 遠 with a long road stretching to the horizon)\n'
      + 'Style: ' + styleInfo.tone + '\n'
      + 'Visual keywords: ' + styleInfo.visual_keywords + '\n\n'
      + '[TYPOGRAPHY]\n'
      + '- The key_points text (注音、部首、造詞) below the character illustration MUST be rendered in LARGE, clearly readable font size: ' + keyPointsFontSize + '.\n'
      + '- Use bold weight for the labels (注音：, 部首：, 造詞：).\n'
      + '- Ensure adequate line spacing between the three key_points lines.\n\n'
      + '[CRITICAL CONSTRAINT — MUST FOLLOW]\n'
      + '- Total slide count: EXACTLY ' + slideCount + '. No more, no less.\n'
      + '- FORBIDDEN: Do NOT create any cover page, title page, introduction page, table of contents, instruction page, quiz page, summary page, conclusion page, or closing page.\n'
      + '- ONE character per slide. Never combine two or more characters on the same slide.\n'
      + '- Every slide MUST correspond one-to-one with the provided slide list.\n'
      + '- IMPORTANT: All text content (key_points) is in Traditional Chinese (繁體中文). Do NOT translate the labels. Keep them exactly as provided: 「注音：」「部首：」「造詞：」. Do NOT change them to Zhuyin, Radical, Words, or any English equivalent.\n'
      + '- The total_pages in global_design is ' + slideCount + '. Respect this number absolutely.\n'
      + '- If you feel the need to add extra slides, STOP. The count is final.\n'
      + '(End of System Instructions)\n';

    var rawSlides = jsonData.slides || [];
    var slides = [];

    for (var i = 0; i < rawSlides.length; i++) {
      var s = rawSlides[i];
      var visualDesc = s.visual_description || '';
      if (visualDesc && styleInfo.visual_keywords) {
        visualDesc = styleInfo.visual_keywords + ', ' + visualDesc;
      }

      slides.push({
        slide_number: i + 1,
        type: 'content_page',
        layout_style: 'SINGLE character flashcard — one large character with meaning-based illustration centered in upper portion, key_points (注音/部首/造詞) displayed in LARGE ' + keyPointsFontSize + ' font below',
        visual_description: visualDesc,
        content: {
          title: s.title || '',
          key_points: s.key_points || []
        }
      });
    }

    return {
      presentation_data: {
        suggested_filename: safeTitle,
        system_instructions: sysInstructions,
        global_design: globalDesign,
        slides: slides
      }
    };
  }

  // ──────────────────────────────────────────────
  // buildVocabularyYaml — 語詞閃卡 YAML
  // ──────────────────────────────────────────────
  function buildVocabularyYaml(jsonData, styleId) {
    if (!jsonData) throw new Error('No JSON data provided');

    var styleMap = window.NBLM_STYLE_MAP || {};
    var styleInfo = styleMap[styleId] || styleMap.q_cute || {
      style_name: 'cute_cartoon',
      visual_keywords: 'Q版可愛、圓角元素、粉嫩配色、卡通插圖',
      title_font: 'Noto Sans TC',
      body_font: 'Noto Sans TC',
      bg: '#FFF5F8',
      text: '#4A3548',
      accent: '#FF85A2',
      tone: 'bold and playful, cute flat illustration'
    };

    var title = jsonData.title || '語詞閃卡';
    var safeTitle = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);

    var globalDesign = {
      tone: styleInfo.tone,
      style_name: styleInfo.style_name,
      visual_keywords: styleInfo.visual_keywords,
      color_palette: {
        background: styleInfo.bg,
        text: styleInfo.text,
        accent: styleInfo.accent
      },
      typography: {
        title_font: styleInfo.title_font,
        body_font: styleInfo.body_font
      },
      total_pages: (jsonData.slides || []).length
    };

    var slideCount = (jsonData.slides || []).length;
    var sysInstructions = '[SYSTEM META - INTERNAL USE ONLY]\n'
      + 'You are a visual design director creating vocabulary flashcard illustrations.\n'
      + 'Each slide contains ONE vocabulary word with its definition and example sentence.\n'
      + 'The illustration should depict the meaning of the word in a child-friendly style.\n'
      + 'Style: ' + styleInfo.tone + '\n'
      + 'Visual keywords: ' + styleInfo.visual_keywords + '\n\n'
      + '[CRITICAL CONSTRAINT — MUST FOLLOW]\n'
      + '- Total slide count: EXACTLY ' + slideCount + '. No more, no less.\n'
      + '- FORBIDDEN: Do NOT create any cover page, title page, introduction page, table of contents, instruction page, quiz page, summary page, conclusion page, or closing page.\n'
      + '- ONE vocabulary word per slide. Never combine two or more words on the same slide.\n'
      + '- Every slide MUST correspond one-to-one with the provided slide list.\n'
      + '- IMPORTANT: All text content (key_points) is in Traditional Chinese (繁體中文). Do NOT translate the labels. Keep them exactly as provided: 「解釋：」「例句：」. Do NOT change them to Definition, Example, or any English equivalent.\n'
      + '- The total_pages in global_design is ' + slideCount + '. Respect this number absolutely.\n'
      + '- If you feel the need to add extra slides, STOP. The count is final.\n'
      + '(End of System Instructions)\n';

    var rawSlides = jsonData.slides || [];
    var slides = [];

    for (var i = 0; i < rawSlides.length; i++) {
      var s = rawSlides[i];
      var visualDesc = s.visual_description || '';
      if (visualDesc && styleInfo.visual_keywords) {
        visualDesc = styleInfo.visual_keywords + ', ' + visualDesc;
      }

      slides.push({
        slide_number: i + 1,
        type: 'content_page',
        layout_style: 'SINGLE vocabulary flashcard — one word with illustration, definition and example sentence',
        visual_description: visualDesc,
        content: {
          title: s.title || '',
          key_points: s.key_points || []
        }
      });
    }

    return {
      presentation_data: {
        suggested_filename: safeTitle,
        system_instructions: sysInstructions,
        global_design: globalDesign,
        slides: slides
      }
    };
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.buildCharacterYaml = buildCharacterYaml;
  window.buildVocabularyYaml = buildVocabularyYaml;

})();
