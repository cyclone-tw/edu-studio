/* ============================================================
   NBLM 簡報生成助手 — Editor / Preview (editor.js)
   ============================================================
   Parses YAML and renders a visual slide preview.
   Sets up live editing with debounced re-render.
   Dependencies: js-yaml (global `jsyaml`)
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // Utility: debounce
  // ──────────────────────────────────────────────
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  // ──────────────────────────────────────────────
  // Escape HTML to prevent XSS in preview
  // ──────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ──────────────────────────────────────────────
  // renderPreview — Main preview rendering
  // ──────────────────────────────────────────────
  function renderPreview(yamlString) {
    var container = document.querySelector('#previewContent');
    if (!container) return;

    // Empty input
    if (!yamlString || !yamlString.trim()) {
      container.innerHTML = '<p class="preview-placeholder">預覽區域 — 生成後自動顯示</p>';
      return;
    }

    var data;
    try {
      data = jsyaml.load(yamlString);
    } catch (err) {
      container.innerHTML =
        '<div class="preview-error">' +
        '<strong>YAML 解析錯誤：</strong>' +
        '<pre>' + escapeHtml(err.message) + '</pre>' +
        '</div>';
      return;
    }

    if (!data) {
      container.innerHTML = '<p class="preview-placeholder">YAML 內容為空</p>';
      return;
    }

    var html = '';

    // Render metadata summary if present
    if (data.metadata) {
      html += '<div class="preview-metadata">';
      html += '<h3 class="preview-meta-title">' + escapeHtml(data.metadata.title) + '</h3>';
      html += '<div class="preview-meta-tags">';
      if (data.metadata.presenter_role) {
        html += '<span class="meta-tag">' + escapeHtml(data.metadata.presenter_role) + '</span>';
      }
      if (data.metadata.audience) {
        html += '<span class="meta-tag">' + escapeHtml(data.metadata.audience) + '</span>';
      }
      if (data.metadata.context) {
        html += '<span class="meta-tag">' + escapeHtml(data.metadata.context) + '</span>';
      }
      if (data.metadata.visual_style) {
        html += '<span class="meta-tag">' + escapeHtml(data.metadata.visual_style) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }

    // Render presentation strategy if present
    if (data.presentation_strategy) {
      var ps = data.presentation_strategy;
      html += '<div class="preview-strategy">';
      html += '<h4 class="strategy-heading">簡報策略</h4>';
      if (ps.opening_hook) {
        html += '<p><strong>開場鉤子：</strong>' + escapeHtml(ps.opening_hook) + '</p>';
      }
      if (ps.core_message) {
        html += '<p><strong>核心訊息：</strong>' + escapeHtml(ps.core_message) + '</p>';
      }
      if (ps.audience_adaptation) {
        html += '<p><strong>受眾調適：</strong>' + escapeHtml(ps.audience_adaptation) + '</p>';
      }
      if (ps.closing_action) {
        html += '<p><strong>結尾行動：</strong>' + escapeHtml(ps.closing_action) + '</p>';
      }
      html += '</div>';
    }

    // Render slides
    var slides = data.slides || [];
    if (slides.length === 0) {
      html += '<p class="preview-placeholder">沒有投影片資料</p>';
    }

    for (var i = 0; i < slides.length; i++) {
      html += renderSlideCard(slides[i], i);
    }

    container.innerHTML = html;
  }

  // ──────────────────────────────────────────────
  // renderSlideCard — Single slide card HTML
  // ──────────────────────────────────────────────
  function renderSlideCard(slide, index) {
    var slideNum = slide.slide_number || (index + 1);
    var slideType = slide.type || 'content';

    var html = '<div class="preview-slide">';

    // Header
    html += '<div class="preview-slide-header">';
    html += '<span class="slide-number">第 ' + slideNum + ' 頁</span>';
    html += '<span class="slide-type">' + escapeHtml(slideType) + '</span>';
    html += '</div>';

    // Title
    if (slide.title) {
      html += '<h4 class="slide-title">' + escapeHtml(slide.title) + '</h4>';
    }

    // Subtitle (AI mode)
    if (slide.subtitle) {
      html += '<p class="slide-subtitle">' + escapeHtml(slide.subtitle) + '</p>';
    }

    // Content area
    html += '<div class="slide-content">';

    if (slide.key_points && Array.isArray(slide.key_points) && slide.key_points.length > 0) {
      // AI mode: bullet list
      html += '<ul class="slide-key-points">';
      for (var j = 0; j < slide.key_points.length; j++) {
        html += '<li>' + escapeHtml(slide.key_points[j]) + '</li>';
      }
      html += '</ul>';
    } else if (slide.content) {
      // Textbook mode: paragraph
      if (Array.isArray(slide.content)) {
        for (var k = 0; k < slide.content.length; k++) {
          html += '<p>' + escapeHtml(slide.content[k]) + '</p>';
        }
      } else {
        html += '<p>' + escapeHtml(slide.content) + '</p>';
      }
    }

    html += '</div>';

    // Visual direction
    if (slide.visual_direction) {
      html += '<div class="slide-visual-direction">';
      html += '<strong>視覺指令：</strong>' + escapeHtml(slide.visual_direction);
      html += '</div>';
    }

    // Interaction (AI mode)
    if (slide.interaction) {
      html += '<div class="slide-interaction">';
      html += '<strong>互動設計：</strong>' + escapeHtml(slide.interaction);
      html += '</div>';
    }

    // Speaker notes
    if (slide.speaker_notes) {
      html += '<div class="slide-notes">';
      html += '<strong>講者備註：</strong>' + escapeHtml(slide.speaker_notes);
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────
  // Live editing: debounced input listener
  // ──────────────────────────────────────────────
  function initLiveEditing() {
    var editor = document.querySelector('#yamlEditor');
    if (!editor) return;

    var debouncedRender = debounce(function () {
      renderPreview(editor.value);
    }, 500);

    editor.addEventListener('input', debouncedRender);
  }

  // ──────────────────────────────────────────────
  // Initialize on DOMContentLoaded
  // ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveEditing);
  } else {
    initLiveEditing();
  }

  // ──────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────
  window.renderPreview = renderPreview;

})();
