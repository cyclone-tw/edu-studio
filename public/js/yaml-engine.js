/* ============================================================
   NBLM 簡報生成助手 — YAML Engine (yaml-engine.js)
   ============================================================
   Transforms Gemini JSON responses into structured YAML strings.
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
  // buildYaml — AI mode
  // ──────────────────────────────────────────────
  function buildYaml(jsonData, state) {
    if (!jsonData) throw new Error('No JSON data provided');

    var labels = resolvePresetLabels(state);

    var doc = {
      metadata: {
        title: jsonData.title || '',
        presenter_role: labels.presenterRole,
        audience: labels.audience,
        context: labels.context,
        visual_style: labels.visualStyle,
        slide_count: state.slideCount || 12,
        language: state.language || 'zh-TW',
        interaction_level: state.interactionLevel || 'medium',
        generated_at: new Date().toISOString()
      },
      presentation_strategy: {
        opening_hook: (jsonData.presentation_strategy && jsonData.presentation_strategy.opening_hook)
          || jsonData.opening_hook || jsonData.openingHook || '',
        core_message: (jsonData.presentation_strategy && jsonData.presentation_strategy.core_message)
          || jsonData.core_message || jsonData.coreMessage || '',
        audience_adaptation: (jsonData.presentation_strategy && jsonData.presentation_strategy.audience_adaptation)
          || jsonData.audience_adaptation || jsonData.audienceAdaptation || '',
        closing_action: (jsonData.presentation_strategy && jsonData.presentation_strategy.closing_action)
          || jsonData.closing_action || jsonData.closingAction || ''
      },
      slides: [],
      appendix: {
        references: jsonData.references || [],
        additional_resources: jsonData.additional_resources || jsonData.additionalResources || []
      }
    };

    // Map slides
    var rawSlides = jsonData.slides || [];
    for (var i = 0; i < rawSlides.length; i++) {
      var s = rawSlides[i];
      doc.slides.push({
        slide_number: s.slide_number || s.slideNumber || (i + 1),
        type: s.type || 'content',
        title: s.title || '',
        subtitle: s.subtitle || '',
        key_points: s.key_points || s.keyPoints || s.content || [],
        visual_direction: s.visual_direction || s.visualDirection || '',
        interaction: s.interaction || '',
        speaker_notes: s.speaker_notes || s.speakerNotes || ''
      });
    }

    return '# NBLM Presentation Blueprint\n' + jsyaml.dump(doc, YAML_OPTIONS);
  }

  // ──────────────────────────────────────────────
  // buildTextbookYaml — Textbook mode
  // ──────────────────────────────────────────────
  function buildTextbookYaml(jsonData, state) {
    if (!jsonData) throw new Error('No JSON data provided');

    var labels = resolvePresetLabels(state);

    var doc = {
      metadata: {
        title: jsonData.title || '',
        presenter_role: labels.presenterRole,
        audience: labels.audience,
        context: labels.context,
        visual_style: labels.visualStyle,
        slide_count: state.slideCount || 12,
        language: state.language || 'zh-TW',
        interaction_level: state.interactionLevel || 'medium',
        generated_at: new Date().toISOString()
      },
      presentation_strategy: {
        opening_hook: (jsonData.presentation_strategy && jsonData.presentation_strategy.opening_hook)
          || jsonData.opening_hook || '',
        core_message: (jsonData.presentation_strategy && jsonData.presentation_strategy.core_message)
          || jsonData.core_message || '',
        audience_adaptation: (jsonData.presentation_strategy && jsonData.presentation_strategy.audience_adaptation)
          || jsonData.audience_adaptation || '',
        closing_action: (jsonData.presentation_strategy && jsonData.presentation_strategy.closing_action)
          || jsonData.closing_action || ''
      },
      slides: [],
      appendix: {
        references: jsonData.references || [],
        additional_resources: jsonData.additional_resources || jsonData.additionalResources || []
      }
    };

    // Map slides — textbook mode: put verbatim text in both content and key_points
    // NotebookLM reads key_points for slide text, so we need original text there
    var rawSlides = jsonData.slides || [];
    for (var i = 0; i < rawSlides.length; i++) {
      var s = rawSlides[i];
      var contentText = s.content || '';

      // Split content into sentences for key_points (NotebookLM uses this for display)
      var keyPoints = s.key_points || s.keyPoints || [];
      if (keyPoints.length === 0 && contentText) {
        // Split by Chinese sentence endings (。！？) preserving the punctuation
        keyPoints = contentText.split(/(?<=[。！？\n])/).filter(function (seg) {
          return seg.trim().length > 0;
        }).map(function (seg) {
          return seg.trim();
        });
      }

      doc.slides.push({
        slide_number: s.slide_number || s.slideNumber || (i + 1),
        type: s.type || 'content',
        title: s.title || '',
        key_points: keyPoints,
        content: contentText,
        visual_direction: s.visual_direction || s.visualDirection || '',
        interaction: s.interaction || '',
        speaker_notes: s.speaker_notes || s.speakerNotes || ''
      });
    }

    return '# NBLM Presentation Blueprint\n' + jsyaml.dump(doc, YAML_OPTIONS);
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
  window.buildTextbookYaml = buildTextbookYaml;
  window.downloadFile = downloadFile;

})();
