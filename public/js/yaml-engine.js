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
    warm_pro:       { style_name: 'warm_professional', visual_keywords: '溫暖色調、專業排版、柔和漸層背景', title_font: 'Noto Sans TC', body_font: 'Noto Sans TC', bg: '#FFF8F0', text: '#2D2D2D', accent: '#E8825A', tone: 'professional, warm-toned editorial' },
    minimal_tech:   { style_name: 'minimal_tech', visual_keywords: '極簡設計、科技感、冷色調、幾何線條', title_font: 'Source Sans Pro', body_font: 'Noto Sans TC', bg: '#F5F7FA', text: '#1A1A2E', accent: '#4A90D9', tone: 'minimalist, sharp-edged, futuristic' },
    retro_collage:  { style_name: 'retro_collage', visual_keywords: '復古拼貼、舊報紙質感、懷舊色調', title_font: 'Playfair Display', body_font: 'Noto Serif TC', bg: '#F5F0E8', text: '#3D3225', accent: '#C4543A', tone: 'retro-futuristic, collage style, vintage' },
    hand_drawn:     { style_name: 'hand_drawn', visual_keywords: '手繪蠟筆質感、溫馨插圖、塗鴉風格', title_font: 'Caveat', body_font: 'Comic Sans MS', bg: '#FFFEF5', text: '#333333', accent: '#FF6B35', tone: 'bold and playful, hand-drawn illustration style' },
    q_cute:         { style_name: 'cute_cartoon', visual_keywords: 'Q版可愛、圓角元素、粉嫩配色、卡通插圖', title_font: 'Comic Sans MS', body_font: 'Noto Sans TC', bg: '#FFF5F8', text: '#4A3548', accent: '#FF85A2', tone: 'bold and playful, cute flat illustration' },
    watercolor:     { style_name: 'watercolor', visual_keywords: '手繪水彩暈染、柔和色彩、藝術質感', title_font: 'Dancing Script', body_font: 'Noto Sans TC', bg: '#FAFBF8', text: '#2C3E50', accent: '#5DADE2', tone: 'artistic, watercolor wash, soft-edged' },
    clay_3d:        { style_name: 'clay_3d', visual_keywords: '3D黏土質感、立體圓潤、柔和陰影', title_font: 'Fredoka One', body_font: 'Noto Sans TC', bg: '#F0F4F8', text: '#2D3436', accent: '#6C5CE7', tone: 'bold and playful, 3D clay render style' },
    edu_comic:      { style_name: 'comic_style', visual_keywords: '漫畫分格、對話框、教育漫畫風格', title_font: 'Comic Sans MS', body_font: 'Noto Sans TC', bg: '#FFFFF0', text: '#222222', accent: '#FF4757', tone: 'comic book style, speech bubbles, bold outlines' },
    paper_cut:      { style_name: 'paper_cut', visual_keywords: '剪紙藝術、層疊紙張、鮮豔色塊', title_font: 'Noto Sans TC', body_font: 'Noto Sans TC', bg: '#FFFFFF', text: '#222222', accent: '#E74C3C', tone: 'paper cut art, layered paper textures, vivid color blocks' },
    retro_poster:   { style_name: 'retro_poster', visual_keywords: '復古海報、大膽字型、懷舊配色', title_font: 'Anton', body_font: 'Noto Sans TC', bg: '#F5E6CC', text: '#1A1A1A', accent: '#D4403A', tone: 'retro poster, bold typography, vintage color palette' },
    infographic:    { style_name: 'infographic', visual_keywords: '資訊圖表、數據視覺化、圖標豐富', title_font: 'Source Sans Pro', body_font: 'Noto Sans TC', bg: '#FFFFFF', text: '#333333', accent: '#3498DB', tone: 'infographic style, data visualization, thin-line icons' },
    magazine:       { style_name: 'magazine', visual_keywords: '雜誌排版、精美圖文混排、時尚感', title_font: 'Playfair Display', body_font: 'Noto Sans TC', bg: '#FFFFFF', text: '#111111', accent: '#E8825A', tone: 'fashion magazine layout, editorial, asymmetrical placement' },
    neon_dark:      { style_name: 'neon_dark', visual_keywords: '霓虹燈光、暗黑背景、發光效果', title_font: 'Orbitron', body_font: 'Noto Sans TC', bg: '#0D0D0D', text: '#E0E0E0', accent: '#00F0FF', tone: 'dark mode, neon glow, cinematic, futuristic' },
    nature_organic: { style_name: 'nature_organic', visual_keywords: '自然有機、植物紋理、大地色系', title_font: 'Lora', body_font: 'Noto Sans TC', bg: '#F5F0E8', text: '#2C3E30', accent: '#4ECDC4', tone: 'nature inspired, organic textures, earth tones' },
    blueprint:      { style_name: 'blueprint', visual_keywords: '藍圖工程、網格線條、技術製圖風格', title_font: 'Source Code Pro', body_font: 'Noto Sans TC', bg: '#1B2838', text: '#E0E8F0', accent: '#4FC3F7', tone: 'blueprint engineering, grid-based layout, annotated technical notes' }
  };

  // ──────────────────────────────────────────────
  // rebuildSystemInstructions — extracted for reuse by editor
  // ──────────────────────────────────────────────
  function rebuildSystemInstructions(globalDesign) {
    var typo = globalDesign.typography || {};
    var palette = globalDesign.color_palette || {};
    var rules = globalDesign.common_layout_rules || [];

    var s = '[SYSTEM META - INTERNAL USE ONLY - DO NOT PRESENT AS CONTENT]\n';
    s += 'You are a top-tier visual design director creating educational slides.\n';
    s += 'Follow the design definitions below with absolute precision.\n\n';

    s += '[Absolutely Prohibited Output Format Rules]\n';
    s += '* Complete Exclusion of Markdown Symbols: Do not include #, *, **\n';
    s += '* Plain Text Only: no decorative symbols, no emojis in slide text\n';
    s += '* Never generate more or fewer slides than specified in the slides array\n';
    s += '* Do NOT merge, skip, reorder, or summarize any slide content\n';
    s += '* key_points text must be reproduced verbatim, 100% faithful, no rewriting\n';
    s += '* Avoid using Title: Subtitle formats - they appear very AI-generated\n\n';

    s += '[Content Rules]\n';
    s += '* Each slide YAML title field = that slide heading\n';
    s += '* Each slide key_points = exact text content to display on that slide\n';
    s += '* visual_description = image generation prompt for that slide background/illustration\n';
    s += '* layout_style = the layout arrangement to follow for that slide\n';
    s += '* 1 slide = 1 message, one idea per slide\n\n';

    s += '[Typography Hierarchy]\n';
    s += '* Headlines at large size occupying 25-40% of the slide area\n';
    s += '* Extreme Jump Ratio: ' + (typo.jump_ratio || '5:1 or more between headline and body text') + '\n';
    s += '* Title: extra-bold, ' + (typo.title_font || 'Noto Sans TC');
    if (typo.title_size) s += ', ' + typo.title_size + 'px';
    s += '\n';
    s += '* Body: regular weight, ' + (typo.body_font || 'Noto Sans TC') + ', generous line spacing';
    if (typo.body_size) s += ', ' + typo.body_size + 'px';
    s += '\n';
    if (typo.subtitle_size) s += '* Subtitle: ' + typo.subtitle_size + 'px\n';
    s += '* Key words highlighted with accent color background or underline\n\n';

    s += '[Color Palette]\n';
    s += '* Background: ' + (palette.background || '#FFFFFF') + '\n';
    s += '* Text: ' + (palette.text || '#333333') + '\n';
    s += '* Accent: ' + (palette.accent || '#00d4aa') + '\n\n';

    s += '[Layout Rules]\n';
    for (var i = 0; i < rules.length; i++) {
      s += '* ' + rules[i] + '\n';
    }
    if (rules.length === 0) {
      s += '* left-aligned layouts preferred\n';
      s += '* Wide margins, lots of white space\n';
    }
    s += '* Cover slide: centered layout with ultra-massive title\n\n';

    if (globalDesign.target_audience || globalDesign.learning_stage) {
      s += '[Design Context]\n';
      if (globalDesign.target_audience) s += '* Presenter: ' + globalDesign.target_audience + '\n';
      if (globalDesign.learning_stage) s += '* Audience: ' + globalDesign.learning_stage + '\n';
      if (globalDesign.scenario) s += '* Scenario: ' + globalDesign.scenario + '\n';
    }
    s += '(End of System Instructions)\n';

    return s;
  }

  // ──────────────────────────────────────────────
  // rebuildFullDocument — rebuild system_instructions from global_design
  // ──────────────────────────────────────────────
  function rebuildFullDocument(doc) {
    if (!doc || !doc.presentation_data) return doc;
    var gd = doc.presentation_data.global_design;
    if (gd) {
      doc.presentation_data.system_instructions = rebuildSystemInstructions(gd);
    }
    return doc;
  }

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

    // Build global_design first (needed for rebuildSystemInstructions)
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
        headings: 'extra-bold ' + styleInfo.title_font + ', occupying 25-40% of slide area',
        body: 'regular weight ' + styleInfo.body_font + ', generous letter spacing and line height',
        title_font: styleInfo.title_font,
        body_font: styleInfo.body_font,
        title_size: 48,
        subtitle_size: 28,
        body_size: 18,
        jump_ratio: '5:1 or more between headline and body text'
      },
      common_layout_rules: [
        'left-aligned layouts, ban simplistic centered alignment for content slides',
        'wide margins, lots of white space, negative space',
        'text on left and visual on right, or asymmetrical split',
        '1 slide = 1 message, one idea per slide',
        'key words highlighted with accent color'
      ],
      target_audience: labels.presenterRole,
      learning_stage: labels.audience,
      total_pages: (jsonData.slides || []).length
    };

    var sysInstructions = rebuildSystemInstructions(globalDesign);

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

      // Map layout_style to NotebookLM-effective keywords
      var layoutRaw = s.layout_style || '';
      var layoutStyle;
      if (i === 0) {
        layoutStyle = 'centered layout, ultra-massive title occupying 40% of slide area';
      } else {
        layoutStyle = layoutRaw || 'left-aligned title top-left, text on left, visual on right, asymmetrical split';
      }

      var slideObj = {
        type: pageType,
        layout_style: layoutStyle,
        visual_description: visualDesc,
        script: s.script || '',
        content: {
          title: s.title || ''
        }
      };

      // Cover page gets subtitle, content pages get key_points
      if (i === 0) {
        slideObj.content.subtitle = s.subtitle || '';
      }
      // All pages can have key_points (cover might have empty array)
      slideObj.content.key_points = keyPoints;

      slides.push(slideObj);
    }

    var doc = {
      presentation_data: {
        suggested_filename: safeTitle,
        system_instructions: sysInstructions,
        global_design: globalDesign,
        slides: slides
      }
    };

    return doc; // Return the object, NOT yaml string
  }

  // ──────────────────────────────────────────────
  // toNblmYaml — Strip script fields and return YAML string for NotebookLM
  // ──────────────────────────────────────────────
  function toNblmYaml(doc) {
    var clone = JSON.parse(JSON.stringify(doc));
    if (clone.presentation_data && clone.presentation_data.slides) {
      clone.presentation_data.slides.forEach(function(slide) {
        delete slide.script;
      });
    }
    return jsyaml.dump(clone, YAML_OPTIONS);
  }

  // ──────────────────────────────────────────────
  // buildMarkdownOutline — Build Markdown outline from slide data
  // ──────────────────────────────────────────────
  function buildMarkdownOutline(slides, docTitle) {
    var lines = ['# ' + (docTitle || '簡報大綱') + '\n'];

    for (var i = 0; i < slides.length; i++) {
      var slide = slides[i];
      var content = slide.content || slide;
      var title = (content && content.title) || slide.title || ('Slide ' + (i + 1));
      var type = slide.type || 'content_page';

      lines.push('## Slide ' + (i + 1) + ': ' + title);
      lines.push('**類型:** ' + type);

      if (slide.layout_style) {
        lines.push('**排版:** ' + slide.layout_style);
      }

      var subtitle = (content && content.subtitle) || slide.subtitle;
      if (subtitle) {
        lines.push('**副標題:** ' + subtitle);
      }

      var kp = (content && content.key_points) || slide.key_points || [];
      if (kp.length > 0) {
        lines.push('');
        lines.push('**重點內容:**');
        for (var j = 0; j < kp.length; j++) {
          lines.push('- ' + kp[j]);
        }
      }

      if (slide.script) {
        lines.push('');
        lines.push('**講者講綱:**');
        lines.push('> ' + slide.script.replace(/\n/g, '\n> '));
      }

      if (slide.visual_description) {
        lines.push('');
        lines.push('**視覺描述:**');
        lines.push('`' + slide.visual_description + '`');
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
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
  window.toNblmYaml = toNblmYaml;
  window.buildMarkdownOutline = buildMarkdownOutline;
  window.downloadFile = downloadFile;
  window.rebuildFullDocument = rebuildFullDocument;
  window.NBLM_STYLE_MAP = NBLM_STYLE_MAP;

})();
