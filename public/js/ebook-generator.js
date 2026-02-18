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

// ── YAML 解析 ─────────────────────────────────────────────────────────
yamlInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  yamlStatus.textContent = '解析中...';
  yamlStatus.className = 'upload-status';

  try {
    const text = await file.text();
    const doc = jsyaml.load(text);

    if (!doc?.slides || !Array.isArray(doc.slides)) {
      throw new Error('找不到 slides 陣列，請確認 YAML 格式');
    }

    // 依 slide_number 排序，組合 TTS 文字
    const sorted = [...doc.slides].sort(
      (a, b) => (a.slide_number || 0) - (b.slide_number || 0)
    );

    state.slideTexts = sorted.map((slide) => {
      const parts = [
        slide.title,
        slide.subtitle,
        slide.content,
        slide.body,
      ].filter(Boolean);
      return parts.join('。');
    });

    yamlStatus.textContent = `✓ 已載入 ${state.slideTexts.length} 頁文字`;
    yamlStatus.className = 'upload-status success';

    // 若 PDF 已載入，更新每頁文字
    if (state.pages.length > 0) {
      state.pages.forEach((page, i) => {
        if (!page.text) page.text = state.slideTexts[i] || '';
      });
      renderPreview();
    }

  } catch (err) {
    yamlStatus.textContent = `✗ 解析失敗：${err.message}`;
    yamlStatus.className = 'upload-status error';
    console.error('[ebook] YAML parse error:', err);
  }
});

// ── 預覽渲染 ──────────────────────────────────────────────────────────
function renderPreview() {
  previewEmpty.style.display = 'none';
  previewGrid.style.display  = 'grid';
  previewGrid.innerHTML = '';

  state.pages.forEach((page, i) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    const img = document.createElement('img');
    img.className = 'page-thumbnail';
    img.src = page.img;
    img.alt = `第 ${i + 1} 頁`;

    const body = document.createElement('div');
    body.className = 'page-card-body';

    const num = document.createElement('div');
    num.className = 'page-num';
    num.textContent = `第 ${i + 1} 頁`;

    const textarea = document.createElement('textarea');
    textarea.className = 'page-text-input';
    textarea.placeholder = '輸入此頁的語音朗讀文字...';
    textarea.value = page.text;
    textarea.addEventListener('input', () => {
      state.pages[i].text = textarea.value;
    });

    body.appendChild(num);
    body.appendChild(textarea);
    card.appendChild(img);
    card.appendChild(body);
    previewGrid.appendChild(card);
  });
}

// ── HTML 組裝 ─────────────────────────────────────────────────────────
async function assembleHTML() {
  // 讀取 StPageFlip bundle（從本地伺服器）
  const libRes = await fetch('/js/page-flip.browser.js');
  if (!libRes.ok) throw new Error('無法載入 page-flip.browser.js');
  const pageFlipLib = await libRes.text();

  const title    = document.getElementById('book-title').value.trim() || '我的電子書';
  const lang     = document.getElementById('tts-lang').value;
  const autoPlay = document.getElementById('auto-play').checked;

  // 安全地跳脫 HTML 特殊字元（防止 XSS）
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 組裝每頁資料（JSON 格式，嵌入 HTML）
  const pagesJSON = JSON.stringify(
    state.pages.map((p) => ({ img: p.img, text: p.text || '' }))
  );

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
      background: #0a0a0f;
      color: #e8e8e8;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1.book-title {
      padding: 1rem;
      font-size: 1.2rem;
      color: #00d4aa;
      text-align: center;
    }
    #controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #14141f;
      border-radius: 12px;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .ctrl-btn {
      padding: 0.45rem 1rem;
      background: #1a1a2e;
      border: 1px solid #2a2a3e;
      border-radius: 8px;
      color: #e8e8e8;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .ctrl-btn:hover { border-color: #00d4aa; color: #00d4aa; }
    .ctrl-btn.active { background: #00d4aa; color: #000; border-color: #00d4aa; }
    #page-info { color: #a0a0b0; font-size: 0.9rem; }
    #book-container {
      width: 100%;
      max-width: 1200px;
      display: flex;
      justify-content: center;
      padding: 0 1rem 2rem;
    }
    #book { margin: 0 auto; }
    #tts-text-display {
      max-width: 700px;
      margin: 1rem auto;
      padding: 0.75rem 1.25rem;
      background: #14141f;
      border-left: 3px solid #00d4aa;
      border-radius: 0 8px 8px 0;
      color: #a0a0b0;
      font-size: 0.9rem;
      line-height: 1.6;
      min-height: 2.5rem;
    }
    .auto-play-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #a0a0b0;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1 class="book-title">${esc(title)}</h1>

  <div id="controls">
    <button class="ctrl-btn" id="btn-prev">◀ 上一頁</button>
    <span id="page-info">1 / ${state.pages.length}</span>
    <button class="ctrl-btn" id="btn-next">下一頁 ▶</button>
    <button class="ctrl-btn" id="btn-tts">▶ 朗讀此頁</button>
    <button class="ctrl-btn" id="btn-stop" style="display:none">■ 停止</button>
    <label class="auto-play-label">
      <input type="checkbox" id="chk-auto" ${autoPlay ? 'checked' : ''}>
      翻頁自動朗讀
    </label>
  </div>

  <div id="tts-text-display">—</div>

  <div id="book-container">
    <div id="book"></div>
  </div>

  <script>
/* ====== StPageFlip ====== */
${pageFlipLib}
  </script>
  <script>
/* ====== Book Data ====== */
const PAGES = ${pagesJSON};
const TTS_LANG = ${JSON.stringify(lang)};

/* ====== TTS (Web Speech API — pluggable) ====== */
const tts = {
  provider: 'webSpeech',
  speak(text) {
    if (!text) return;
    this.stop();
    if (this.provider === 'webSpeech') {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = TTS_LANG;
      utt.onstart = () => {
        btnStop.style.display = '';
        btnTts.style.display  = 'none';
      };
      utt.onend = utt.onerror = () => {
        btnStop.style.display = 'none';
        btnTts.style.display  = '';
      };
      speechSynthesis.speak(utt);
    }
  },
  stop() {
    speechSynthesis.cancel();
    btnStop.style.display = 'none';
    btnTts.style.display  = '';
  },
};

/* ====== Flip Book Init ====== */
const bookEl   = document.getElementById('book');
const pageInfo = document.getElementById('page-info');
const ttsDisplay = document.getElementById('tts-text-display');
const btnPrev  = document.getElementById('btn-prev');
const btnNext  = document.getElementById('btn-next');
const btnTts   = document.getElementById('btn-tts');
const btnStop  = document.getElementById('btn-stop');
const chkAuto  = document.getElementById('chk-auto');

// 計算合適的書本尺寸（響應式）
const containerW = Math.min(window.innerWidth - 32, 1100);
const pageW = Math.floor(containerW / 2);
const pageH = Math.round(pageW * (9 / 16));

const pageFlip = new St.PageFlip(bookEl, {
  width: pageW,
  height: pageH,
  size: 'fixed',
  showCover: false,
  flippingTime: 600,
  usePortrait: window.innerWidth < 600,
});

// 將 base64 圖片包成 img 元素
const imgEls = PAGES.map((p, i) => {
  const div = document.createElement('div');
  div.style.cssText = 'width:100%;height:100%;overflow:hidden;';
  const img = document.createElement('img');
  img.src = p.img;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
  img.alt = '第' + (i + 1) + '頁';
  div.appendChild(img);
  bookEl.appendChild(div);
  return div;
});

pageFlip.loadFromHTML(bookEl.querySelectorAll('div'));

function updateUI(pageIdx) {
  const total = PAGES.length;
  pageInfo.textContent = (pageIdx + 1) + ' / ' + total;
  const text = PAGES[pageIdx]?.text || '';
  ttsDisplay.textContent = text || '（此頁無語音文字）';
  if (chkAuto.checked && text) tts.speak(text);
}

pageFlip.on('flip', (e) => {
  tts.stop();
  updateUI(e.data);
});

updateUI(0);

btnPrev.addEventListener('click', () => { tts.stop(); pageFlip.flipPrev(); });
btnNext.addEventListener('click', () => { tts.stop(); pageFlip.flipNext(); });
btnTts.addEventListener('click', () => tts.speak(PAGES[pageFlip.getCurrentPageIndex()]?.text || ''));
btnStop.addEventListener('click', () => tts.stop());

// 鍵盤支援
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') btnNext.click();
  if (e.key === 'ArrowLeft')  btnPrev.click();
  if (e.key === ' ')          btnTts.click();
});
  </script>
</body>
</html>`;
}

// ── 下載 HTML ─────────────────────────────────────────────────────────
function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── 生成按鈕 ──────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (state.pages.length === 0) return;

  generateBtn.disabled    = true;
  generateBtn.textContent = '⏳ 生成中...';
  progressBar.style.display = 'block';
  progressFill.style.width  = '50%';

  try {
    const html = await assembleHTML();
    progressFill.style.width = '100%';

    const title    = document.getElementById('book-title').value.trim() || '我的電子書';
    const filename = title.replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';
    downloadHTML(html, filename);

  } catch (err) {
    alert(`生成失敗：${err.message}`);
    console.error('[ebook] generate error:', err);
  } finally {
    generateBtn.disabled    = false;
    generateBtn.textContent = '生成並下載電子書 HTML';
    progressBar.style.display = 'none';
    progressFill.style.width  = '0%';
  }
});
