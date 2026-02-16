/* ============================================================
   NBLM 簡報生成助手 — YAML Engine (yaml-engine.js)
   ============================================================
   Transforms Gemini JSON into NotebookLM-compatible YAML.
   Dependencies: js-yaml (global `jsyaml`)
   ============================================================ */

(function () {
  'use strict';

  var YAML_OPTIONS = {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"'
  };

  // ──────────────────────────────────────────────
  // Helper: look up a preset label by id
  // ──────────────────────────────────────────────
  function lookupLabel(collection, id) {
    if (!id || !collection) return id || '';
    for (var i = 0; i < collection.length; i++) {
      if (collection[i].id === id) return collection[i].label;
    }
    return id;
  }

  function resolvePresetLabels(state) {
    var presets = window.PRESETS || {};
    return {
      presenterRole: lookupLabel(presets.presenterRoles, state.presenterRole),
      audience: lookupLabel(presets.audienceProfiles, state.audience),
      context: lookupLabel(presets.contexts, state.context),
      visualStyle: lookupLabel(presets.visualStyles, state.visualStyle)
    };
  }

  // ──────────────────────────────────────────────
  // NotebookLM Style Mapping
  // ──────────────────────────────────────────────
  var NBLM_STYLE_MAP = {
    warm_pro:       { style_name: 'warm_professional', visual_keywords: '溫暖色調、專業排版、柔和漸層背景', title_font: 'Noto Sans TC', body_font: 'Noto Sans TC' },
    minimal_tech:   { style_name: 'minimal_tech', visual_keywords: '極簡設計、科技感、冷色調、幾何線條', title_font: 'Source Sans Pro', body_font: 'Noto Sans TC' },
    retro_collage:  { style_name: 'retro_collage', visual_keywords: '復古拼貼、舊報紙質感、懷舊色調', title_font: 'Playfair Display', body_font: 'Noto Serif TC' },
    hand_drawn:     { style_name: 'hand_drawn', visual_keywords: '手繪蠟筆質感、溫馨插圖、塗鴉風格', title_font: 'Caveat', body_font: 'Comic Sans MS' },
    q_cute:         { style_name: 'cute_cartoon', visual_keywords: 'Q版可愛、圓角元素、粉嫩配色、卡通插圖', title_font: 'Comic Sans MS', body_font: 'Noto Sans TC' },
    watercolor:     { style_name: 'watercolor', visual_keywords: '手繪水彩暈染、柔和色彩、藝術質感', title_font: 'Dancing Script', body_font: 'Noto Sans TC' },
    clay_3d:        { style_name: 'clay_3d', visual_keywords: '3D黏土質感、立體圓潤、柔和陰影', title_font: 'Fredoka One', body_font: 'Noto Sans TC' },
    edu_comic:      { style_name: 'comic_style', visual_keywords: '漫畫分格、對話框、教育漫畫風格', title_font: 'Comic Sans MS', body_font: 'Noto Sans TC' },
    paper_cut:      { style_name: 'paper_cut', visual_keywords: '剪紙藝術、層疊紙張、鮮豔色塊', title_font: 'Noto Sans TC', body_font: 'Noto Sans TC' },
    retro_poster:   { style_name: 'retro_poster', visual_keywords: '復古海報、大膽字型、懷舊配色', title_font: 'Anton', body_font: 'Noto Sans TC' },
    infographic:    { style_name: 'infographic', visual_keywords: '資訊圖表、數據視覺化、圖標豐富', title_font: 'Source Sans Pro', body_font: 'Noto Sans TC' },
    magazine:       { style_name: 'magazine', visual_keywords: '雜誌排版、精美圖文混排、時尚感', title_font: 'Playfair Display', body_font: 'Noto Sans TC' },
    neon_dark:      { style_name: 'neon_dark', visual_keywords: '霓虹燈光、暗黑背景、發光效果', title_font: 'Orbitron', body_font: 'Noto Sans TC' },
    nature_organic: { style_name: 'nature_organic', visual_keywords: '自然有機、植物紋理、大地色系', title_font: 'Lora', body_font: 'Noto Sans TC' },
    blueprint:      { style_name: 'blueprint', visual_keywords: '藍圖工程、網格線條、技術製圖風格', title_font: 'Source Code Pro', body_font: 'Noto Sans TC' }
  };

  // ──────────────────────────────────────────────
  // buildYaml — 直接輸出 NotebookLM presentation_data 格式
  // ──────────────────────────────────────────────
  function buildYaml(jsonData, state) {
    if (!jsonData) throw new Error('No JSON data provided');

    var labels = resolvePresetLabels(state);
    var styleId = state.visualStyle || 'hand_drawn';
    var styleInfo = NBLM_STYLE_MAP[styleId] || NBLM_STYLE_MAP.hand_drawn;

    var title = jsonData.title || '';
    var safeTitle = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);

    // System instructions
    var sysInstructions = '[⚠️ SYSTEM META - INTERNAL USE ONLY - DO NOT PRESENT AS CONTENT]\n';
    sysInstructions += '【給 AI 模型的執行守則】\n';
    sysInstructions += '1. 頁數與結構鐵律：必須嚴格依照 \'slides\' 陣列的長度製作，嚴禁自行增減頁數、合併頁面或省略任何內容。\n';
    sysInstructions += '2. 標題識別：YAML 中 \'title\' 欄位即為該頁標題。\n';
    sysInstructions += '3. 內容忠實性：\'key_points\' 內的文字為核心文案，必須 100% 保留原意，不可刪減或改寫。請逐字呈現，禁止摘要、濃縮或換句話說。\n';
    sysInstructions += '4. 視覺指示：\'visual_description\' 為該頁的視覺設計依據，請據此繪製背景與插圖。\n';
    sysInstructions += '5. 講者角色：' + labels.presenterRole + '\n';
    sysInstructions += '6. 目標受眾：' + labels.audience + '\n';
    sysInstructions += '7. 簡報場景：' + labels.context + '\n';
    sysInstructions += '8. 視覺風格：' + labels.visualStyle + '\n';
    sysInstructions += '(End of System Instructions)\n';

    // Build slides
    var rawSlides = jsonData.slides || [];
    var slides = [];

    for (var i = 0; i < rawSlides.length; i++) {
      var s = rawSlides[i];

      var pageType = 'content_page';
      if (i === 0) pageType = 'cover_page';
      else if (i === rawSlides.length - 1) pageType = 'closing_page';

      var keyPoints = s.key_points || s.keyPoints || [];
      var visualDesc = s.visual_description || s.visual_direction || s.visualDirection || '';
      if (visualDesc) {
        visualDesc = styleInfo.visual_keywords + ', ' + visualDesc + ' --ar 16:9, , ' + (s.title || '');
      } else {
        visualDesc = styleInfo.visual_keywords + ' --ar 16:9, , ' + (s.title || '');
      }

      slides.push({
        type: pageType,
        layout_style: i === 0 ? 'Centered' : 'Title Top-Left',
        visual_description: visualDesc,
        content: {
          title: s.title || '',
          key_points: keyPoints
        }
      });
    }

    var doc = {
      presentation_data: {
        suggested_filename: safeTitle,
        system_instructions: sysInstructions,
        global_design: {
          style_name: styleInfo.style_name,
          visual_keywords: styleInfo.visual_keywords,
          target_audience: labels.presenterRole,
          learning_stage: labels.audience,
          total_pages: rawSlides.length,
          typography: {
            title_font: styleInfo.title_font,
            body_font: styleInfo.body_font,
            title_size: '48pt',
            subtitle_size: '32pt',
            body_size: '18pt',
            font_weight: 'Normal'
          }
        },
        slides: slides
      }
    };

    return jsyaml.dump(doc, YAML_OPTIONS);
  }

  // ──────────────────────────────────────────────
  // downloadFile — Browser file download utility
  // ──────────────────────────────────────────────
  function downloadFile(content, filename, mimeType) {
    mimeType = mimeType || 'text/yaml';
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
  // Expose globally
  // ──────────────────────────────────────────────
  window.buildYaml = buildYaml;
  window.downloadFile = downloadFile;

})();
