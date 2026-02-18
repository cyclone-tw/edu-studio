// ebook-generator.js — 電子書生成工具主邏輯
// 使用 ES Module 語法（ebook.html 以 type="module" 載入）

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

// ── 狀態 ──────────────────────────────────────────────────────────────
const state = {
  pages: [],      // [{ img: 'data:image/png;base64,...', text: '' }]
  slideTexts: [], // 從 YAML 解析出的文字，按頁碼排列
};

// ── DOM 元素 ──────────────────────────────────────────────────────────
const pdfInput      = document.getElementById('pdf-input');
const yamlInput     = document.getElementById('yaml-input');
const pdfStatus     = document.getElementById('pdf-status');
const yamlStatus    = document.getElementById('yaml-status');
const previewEmpty  = document.getElementById('preview-empty');
const previewGrid   = document.getElementById('preview-grid');
const generateBtn   = document.getElementById('generate-btn');
const progressBar   = document.getElementById('progress-bar');
const progressFill  = document.getElementById('progress-fill');

// ── PDF 載入 ──────────────────────────────────────────────────────────
pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pdfStatus.textContent = '載入中...';
  pdfStatus.className = 'upload-status';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    pdfStatus.textContent = `✓ ${file.name}（共 ${totalPages} 頁）`;
    pdfStatus.className = 'upload-status success';

    progressBar.style.display = 'block';
    state.pages = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 高解析度

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
      }).promise;

      const base64 = canvas.toDataURL('image/jpeg', 0.85); // JPEG 壓縮，平衡品質/大小
      const text = state.slideTexts[i - 1] || ''; // 若有 YAML 就帶入

      state.pages.push({ img: base64, text });

      // 更新進度
      const pct = Math.round((i / totalPages) * 100);
      progressFill.style.width = `${pct}%`;
    }

    progressBar.style.display = 'none';
    progressFill.style.width = '0%';

    renderPreview();
    generateBtn.disabled = false;

  } catch (err) {
    pdfStatus.textContent = `✗ 載入失敗：${err.message}`;
    pdfStatus.className = 'upload-status error';
    console.error('[ebook] PDF load error:', err);
  }
});
