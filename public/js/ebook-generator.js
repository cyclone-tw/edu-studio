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

    // 支援兩種 YAML 結構：頂層 slides 或 presentation_data.slides
    const slidesArr = doc?.slides || doc?.presentation_data?.slides;
    if (!slidesArr || !Array.isArray(slidesArr)) {
      throw new Error('找不到 slides 陣列（支援頂層 slides 或 presentation_data.slides）');
    }

    // 依 slide_number 排序（無 slide_number 則保持原順序）
    const sorted = [...slidesArr].sort(
      (a, b) => (a.slide_number ?? Infinity) - (b.slide_number ?? Infinity)
    );

    state.slideTexts = sorted.map((slide) => {
      // 支援兩種文字結構：
      //   舊格式：slide.title / slide.subtitle / slide.body
      //   新格式：slide.content.title / slide.content.subtitle / slide.content.key_points[]
      const c = slide.content || {};
      const keyPoints = Array.isArray(c.key_points)
        ? c.key_points.filter(Boolean).join('。')
        : (c.key_points || '');

      const parts = [
        c.title    || slide.title,
        c.subtitle || slide.subtitle,
        keyPoints  || c.body || slide.body || slide.content,
      ].filter(p => p && typeof p === 'string');
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
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
      background: #0a0a0f;
      color: #e8e8e8;
    }
    body { display: flex; flex-direction: column; }

    /* ── 頂部控制列 ── */
    #top-bar {
      flex-shrink: 0;
      background: #14141f;
      border-bottom: 1px solid #2a2a3e;
      padding: 0.45rem 0.75rem 0.35rem;
    }
    .title-row {
      text-align: center;
      font-size: 0.95rem;
      font-weight: 700;
      color: #00d4aa;
      margin-bottom: 0.35rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #controls {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .ctrl-btn {
      padding: 0.3rem 0.8rem;
      background: #1a1a2e;
      border: 1px solid #2a2a3e;
      border-radius: 8px;
      color: #e8e8e8;
      cursor: pointer;
      font-size: 0.82rem;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .ctrl-btn:hover { border-color: #00d4aa; color: #00d4aa; }
    #page-info {
      color: #a0a0b0;
      font-size: 0.82rem;
      min-width: 55px;
      text-align: center;
    }
    .speed-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      color: #a0a0b0;
    }
    #speed-slider {
      width: 72px;
      accent-color: #00d4aa;
      cursor: pointer;
    }
    .auto-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      color: #a0a0b0;
      cursor: pointer;
      white-space: nowrap;
    }
    #tts-bar {
      margin-top: 0.3rem;
      font-size: 0.78rem;
      color: #a0a0b0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 0.5rem;
    }

    /* ── 書本區域 ── */
    #book-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    /* StPageFlip 的 canvas 自動撐滿 #book */
    #book canvas { display: block; }
  </style>
</head>
<body>
  <div id="top-bar">
    <div class="title-row">${esc(title)}</div>
    <div id="controls">
      <button class="ctrl-btn" id="btn-prev">◀ 上一頁</button>
      <span id="page-info">1 / ${state.pages.length}</span>
      <button class="ctrl-btn" id="btn-next">下一頁 ▶</button>
      <button class="ctrl-btn" id="btn-tts">▶ 朗讀</button>
      <button class="ctrl-btn" id="btn-stop" style="display:none">■ 停止</button>
      <div class="speed-row">
        <span>速度</span>
        <input type="range" id="speed-slider" min="0.5" max="2" step="0.1" value="1">
        <span id="speed-val">1.0x</span>
      </div>
      <label class="auto-label">
        <input type="checkbox" id="chk-auto" ${autoPlay ? 'checked' : ''}>
        翻頁自動朗讀
      </label>
    </div>
    <div id="tts-bar">—</div>
  </div>

  <div id="book-container">
    <div id="book"></div>
  </div>

  <script>
/* ====== StPageFlip ====== */
${pageFlipLib}
  </script>
  <script>
/* ====== Book Data ====== */
const PAGES    = ${pagesJSON};
const TTS_LANG = ${JSON.stringify(lang)};

/* ====== DOM refs ====== */
const bookEl      = document.getElementById('book');
const bookCont    = document.getElementById('book-container');
const pageInfo    = document.getElementById('page-info');
const ttsBar      = document.getElementById('tts-bar');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const btnTts      = document.getElementById('btn-tts');
const btnStop     = document.getElementById('btn-stop');
const chkAuto     = document.getElementById('chk-auto');
const speedSlider = document.getElementById('speed-slider');
const speedVal    = document.getElementById('speed-val');

/* ====== 速度滑桿 ====== */
speedSlider.addEventListener('input', () => {
  speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
});

/* ====== TTS (Web Speech API — pluggable) ====== */
const tts = {
  provider: 'webSpeech',
  speak(text) {
    if (!text) return;
    this.stop();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = TTS_LANG;
    utt.rate = parseFloat(speedSlider.value);
    utt.onstart = () => { btnStop.style.display = ''; btnTts.style.display = 'none'; };
    utt.onend = utt.onerror = () => { btnStop.style.display = 'none'; btnTts.style.display = ''; };
    speechSynthesis.speak(utt);
  },
  stop() {
    speechSynthesis.cancel();
    btnStop.style.display = 'none';
    btnTts.style.display  = '';
  },
};

/* ====== 計算單頁尺寸（維持 16:9，填滿容器）====== */
function calcSize() {
  const aw = bookCont.clientWidth;
  const ah = bookCont.clientHeight;
  // 選擇以寬或高為基準，不超出容器且保持 16:9
  if (aw / ah >= 16 / 9) {
    return { w: Math.floor(ah * 16 / 9), h: ah };
  }
  return { w: aw, h: Math.floor(aw * 9 / 16) };
}

/* ====== PageFlip 初始化（單頁模式）====== */
let pf;

function initFlip() {
  // 清除舊的 canvas（resize 時重建）
  bookEl.innerHTML = '';

  const { w, h } = calcSize();

  // 插入每頁 div
  PAGES.forEach((p, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;height:100%;background:#000;overflow:hidden;';
    const img = document.createElement('img');
    img.src = p.img;
    img.alt = '第' + (i + 1) + '頁';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
    div.appendChild(img);
    bookEl.appendChild(div);
  });

  pf = new St.PageFlip(bookEl, {
    width: w,
    height: h,
    size: 'fixed',
    usePortrait: true,   // ← 強制單頁模式，所有裝置一致
    showCover: false,
    flippingTime: 450,
    useMouseEvents: true,
    swipeDistance: 30,
  });

  pf.loadFromHTML(bookEl.querySelectorAll('div'));

  pf.on('flip', (e) => {
    tts.stop();
    updateUI(e.data);
  });

  updateUI(0);
}

function updateUI(idx) {
  pageInfo.textContent = (idx + 1) + ' / ' + PAGES.length;
  const text = PAGES[idx]?.text || '';
  ttsBar.textContent = text || '（此頁無語音文字）';
  if (chkAuto.checked && text) tts.speak(text);
}

/* ====== 響應式 resize ====== */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const curIdx = pf ? pf.getCurrentPageIndex() : 0;
    tts.stop();
    initFlip();
    // 跳回原頁（翻頁動畫結束後）
    if (curIdx > 0) setTimeout(() => pf.flip(curIdx, 'top'), 50);
  }, 250);
});

/* ====== 初次啟動 ====== */
initFlip();

/* ====== 按鈕事件 ====== */
btnPrev.addEventListener('click', () => { tts.stop(); pf.flipPrev(); });
btnNext.addEventListener('click', () => { tts.stop(); pf.flipNext(); });
btnTts.addEventListener('click',  () => tts.speak(PAGES[pf.getCurrentPageIndex()]?.text || ''));
btnStop.addEventListener('click', () => tts.stop());

/* ====== 鍵盤支援 ====== */
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); btnNext.click(); }
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); btnPrev.click(); }
  if (e.key === ' ')                                    { e.preventDefault(); btnTts.click(); }
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
