/* ============================================================
   閃卡 Gemini Prompt — 生字意象圖 / 語詞閃卡
   Dependencies: gemini.js (window.callGemini)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // generateCharacterCards — 生字意象圖模式
  // ──────────────────────────────────────────────
  async function generateCharacterCards(text, apiKey, files) {
    if ((!text || !text.trim()) && (!files || files.length === 0)) {
      throw new Error('請輸入生字或上傳截圖');
    }
    if (!apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

    // Preprocess: split characters by any separator or no separator
    // Supports: 菊花香秋涼 / 菊 花 香 / 菊,花,香 / 菊、花、香 / newline separated
    var normalizedText = (text || '').trim();
    if (normalizedText) {
      var chars = normalizedText
        .replace(/[\s,，、\n\r]+/g, '')  // Remove all separators
        .split('')                         // Split into individual characters
        .filter(function (c) { return c.trim(); });
      // Deduplicate while preserving order
      var seen = {};
      var unique = [];
      for (var ci = 0; ci < chars.length; ci++) {
        if (!seen[chars[ci]]) {
          seen[chars[ci]] = true;
          unique.push(chars[ci]);
        }
      }
      normalizedText = unique.join(' ');
    }

    var materialSection;
    if (files && files.length > 0) {
      materialSection = '## 素材\n\n'
        + '以下附加了 ' + files.length + ' 個檔案（截圖/PDF），請用 OCR 辨識其中的生字。\n';
      if (normalizedText) {
        materialSection += '使用者另外補充的文字：\n' + normalizedText + '\n';
      }
    } else {
      materialSection = '## 生字列表\n\n' + normalizedText + '\n';
    }

    var prompt = '你是國小語文教材設計專家。根據提供的生字，為每個字設計「意象圖」圖像提示及學習資訊。\n\n'
      + materialSection + '\n'
      + '## 任務\n'
      + '為每個生字產生一張「意象圖」的圖像提示，讓國小學生更容易理解和記住這個字。\n'
      + '意象圖的核心概念：\n'
      + '- 象形字或具體名詞（如：山、水、鳥、魚、日、月、火）→ 用具象的實物或場景來呈現，讓文字和物體的形象結合\n'
      + '- 抽象概念或動詞/形容詞（如：遠、近、快、慢、美、善）→ 用意象場景來傳達字義，例如「遠」可以是一條綿延到地平線的道路融入字的筆畫中\n'
      + '- 字本身要大且清晰可辨，同時與背景的具象/意象元素自然融合\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "第X課生字",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "title": "鳳",\n'
      + '      "key_points": ["注音：ㄈㄥˋ", "部首：鳥", "造詞：鳳凰、鳳梨、龍鳳"],\n'
      + '      "visual_description": "A large Chinese character 鳳 (phoenix) rendered in bold calligraphy strokes. The strokes are formed by and intertwined with a majestic phoenix bird — its colorful feathers (red, orange, gold) flow along the character strokes. The phoenix tail feathers extend from the bottom strokes, creating a sense of elegance. Background: soft cream with subtle golden sparks. Style: children\'s illustration, vivid and magical."\n'
      + '    },\n'
      + '    {\n'
      + '      "title": "遠",\n'
      + '      "key_points": ["注音：ㄩㄢˇ", "部首：辵", "造詞：遠方、遙遠、遠大"],\n'
      + '      "visual_description": "A large Chinese character 遠 (far/distant) with a long winding road stretching from the foreground into a distant horizon, merging naturally with the character strokes. Small mountains and clouds at the far end give a sense of vast distance. A tiny figure walks along the road. Background: dreamy blue-purple gradient sky. Style: watercolor children\'s illustration, evokes a sense of journey and distance."\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '規則：\n'
      + '- 每個生字一張 slide\n'
      + '- title 放該字（單一個字）\n'
      + '- key_points 放三項學習資訊：\n'
      + '  * 第一項：「注音：」開頭，該字的注音符號\n'
      + '  * 第二項：「部首：」開頭，該字的部首\n'
      + '  * 第三項：「造詞：」開頭，2-3個常見詞語\n'
      + '- visual_description 必須是英文的意象圖圖像提示，根據字的特性選擇合適的表現方式：\n'
      + '  * 象形字/具體名詞 → 用該字代表的實物（動物、自然物等）融入字的筆畫\n'
      + '  * 抽象概念/動詞/形容詞 → 用能表達字義的場景或意象融入字的筆畫\n'
      + '  * 字必須大且清晰可辨認，佔畫面主要位置\n'
      + '  * 實物或場景要與字的筆畫自然結合，而非分開放置\n'
      + '  * 背景描述（柔和、不搶眼）\n'
      + '  * 風格描述（children\'s illustration, vivid colors）\n'
      + '- 每個字的色彩主題和意象要有變化，不要全部一樣\n'
      + '- 不要輸出其他欄位';

    return await window.callGemini(apiKey, prompt, files);
  }

  // ──────────────────────────────────────────────
  // generateVocabularyCards — 語詞閃卡模式
  // ──────────────────────────────────────────────
  async function generateVocabularyCards(text, apiKey, files) {
    if ((!text || !text.trim()) && (!files || files.length === 0)) {
      throw new Error('請輸入語詞或上傳截圖');
    }
    if (!apiKey) {
      throw new Error('請先設定 Gemini API Key');
    }

    var materialSection;
    if (files && files.length > 0) {
      materialSection = '## 素材\n\n'
        + '以下附加了 ' + files.length + ' 個檔案（截圖/PDF），請用 OCR 辨識其中的語詞。\n';
      if (text && text.trim()) {
        materialSection += '使用者另外補充的文字：\n' + text + '\n';
      }
    } else {
      materialSection = '## 語詞列表\n\n' + text + '\n';
    }

    var prompt = '你是國小語文教材設計專家。根據提供的語詞，為每個詞設計閃卡內容。\n\n'
      + materialSection + '\n'
      + '## 任務\n'
      + '為每個語詞產生閃卡，包含解釋、例句和圖像提示。\n\n'
      + '## 輸出 JSON 格式\n\n'
      + '{\n'
      + '  "title": "第X課語詞閃卡",\n'
      + '  "slides": [\n'
      + '    {\n'
      + '      "title": "菊花",\n'
      + '      "key_points": ["解釋：秋天盛開的花朵，花瓣細長，顏色多樣", "例句：秋天到了，公園裡的菊花開得好美。"],\n'
      + '      "visual_description": "A colorful children\'s illustration showing chrysanthemum flowers blooming in an autumn park. Bright yellow, white and purple chrysanthemums in the foreground, with falling orange leaves and a cheerful blue sky. Style: vibrant watercolor illustration for children, warm autumn palette."\n'
      + '    }\n'
      + '  ]\n'
      + '}\n\n'
      + '規則：\n'
      + '- 每個語詞一張 slide\n'
      + '- title 放語詞\n'
      + '- key_points 放兩項：\n'
      + '  * 第一項：「解釋：」開頭，用國小生能理解的白話解釋\n'
      + '  * 第二項：「例句：」開頭，造一個生活化的例句\n'
      + '- visual_description 必須是英文的圖像提示，描述與語詞意思相關的兒童插畫場景\n'
      + '- 風格統一為 children\'s illustration，色彩鮮明活潑\n'
      + '- 不要輸出其他欄位';

    return await window.callGemini(apiKey, prompt, files);
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.generateCharacterCards = generateCharacterCards;
  window.generateVocabularyCards = generateVocabularyCards;

})();
