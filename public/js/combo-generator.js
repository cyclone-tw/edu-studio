// combo-generator.js — 三合一整合工具主邏輯
// ES Module（combo.html 以 type="module" 載入）

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

// ── 狀態 ──────────────────────────────────────────────────────────────
const comboState = {
  ebook: { pages: [], texts: [] },   // pages=[base64], texts=[{title, body}]
  char:  { pages: [], texts: [] },
  vocab: { pages: [], texts: [] }
};

// ── TTS 試聽 ─────────────────────────────────────────────────────────
let _previewBtn = null;

function stopEditorPreview() {
  speechSynthesis.cancel();
  speechSynthesis.resume();
  if (_previewBtn) { _previewBtn.textContent = '▶ 試聽'; _previewBtn = null; }
}

// ── 頁籤切換 ─────────────────────────────────────────────────────────
document.querySelectorAll('.preview-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.preview-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('preview-' + tab.dataset.section)?.classList.add('active');
  });
});

function updateTabCount(key, count) {
  const labels = { ebook: '電子書', char: '生字閃卡', vocab: '語詞閃卡' };
  const tab = document.querySelector(`.preview-tab[data-section="${key}"]`);
  if (tab) tab.textContent = `${labels[key]} (${count} 頁)`;
}

// ── PDF 載入 ─────────────────────────────────────────────────────────
async function loadPdfPages(file, progressFillEl) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.85));
    if (progressFillEl) {
      progressFillEl.style.width = Math.round((i / totalPages) * 100) + '%';
    }
  }
  return pages;
}

// ── YAML 解析 ────────────────────────────────────────────────────────
function parseYamlTexts(yamlText) {
  const doc = jsyaml.load(yamlText);
  const slidesArr = doc?.slides || doc?.presentation_data?.slides;
  if (!slidesArr || !Array.isArray(slidesArr)) return [];

  const sorted = [...slidesArr].sort(
    (a, b) => (a.slide_number ?? Infinity) - (b.slide_number ?? Infinity)
  );

  return sorted.map((slide) => {
    const c = slide.content || {};
    const title = c.title || slide.title || '';
    const keyPoints = Array.isArray(c.key_points)
      ? c.key_points.filter(Boolean).join('\n')
      : (c.key_points || '');
    const body = keyPoints || c.body || slide.body || '';
    return { title, body };
  });
}

// ── 上傳事件綁定 ─────────────────────────────────────────────────────
function initComboUpload(inputId, statusId, stateKey, isYaml) {
  const input  = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  if (!input) return;

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.textContent = isYaml ? '解析中...' : '載入中...';
    status.className = 'upload-status';

    try {
      if (isYaml) {
        const text = await file.text();
        comboState[stateKey].texts = parseYamlTexts(text);
        status.textContent = `✓ ${comboState[stateKey].texts.length} 頁文字`;
      } else {
        comboState[stateKey].pages = await loadPdfPages(file);
        status.textContent = `✓ ${comboState[stateKey].pages.length} 頁`;
      }
      status.className = 'upload-status success';
      renderSectionPreview(stateKey);
      checkComboReady();
    } catch (err) {
      status.textContent = `✗ ${err.message}`;
      status.className = 'upload-status error';
    }
  });
}

function checkComboReady() {
  const comboBtn = document.getElementById('combo-generate-btn');
  const hasAny = comboState.ebook.pages.length > 0 ||
                 comboState.char.pages.length > 0 ||
                 comboState.vocab.pages.length > 0;
  comboBtn.disabled = !hasAny;
}

// Init all uploads
initComboUpload('combo-ebook-pdf',  'combo-ebook-pdf-status',  'ebook', false);
initComboUpload('combo-ebook-yaml', 'combo-ebook-yaml-status', 'ebook', true);
initComboUpload('combo-char-pdf',   'combo-char-pdf-status',   'char',  false);
initComboUpload('combo-char-yaml',  'combo-char-yaml-status',  'char',  true);
initComboUpload('combo-vocab-pdf',  'combo-vocab-pdf-status',  'vocab', false);
initComboUpload('combo-vocab-yaml', 'combo-vocab-yaml-status', 'vocab', true);

// ── 預覽渲染工具 ─────────────────────────────────────────────────────
function makeField(label, value, placeholder, onChange, cssClass) {
  const wrap = document.createElement('div');
  wrap.className = cssClass === 'page' ? 'page-field' : 'card-field';

  const lbl = document.createElement('div');
  lbl.className = cssClass === 'page' ? 'page-field-label' : 'card-field-label';
  lbl.textContent = label;

  const ta = document.createElement('textarea');
  ta.className = cssClass === 'page' ? 'page-text-input' : 'card-text-input';
  ta.placeholder = placeholder;
  ta.value = value || '';
  ta.addEventListener('input', () => onChange(ta.value));

  wrap.appendChild(lbl);
  wrap.appendChild(ta);
  return wrap;
}

function makeTtsButton(getText) {
  const btn = document.createElement('button');
  btn.className = 'card-preview-btn';
  btn.textContent = '▶ 試聽';
  btn.addEventListener('click', () => {
    if (_previewBtn === btn) { stopEditorPreview(); return; }
    stopEditorPreview();
    const text = getText();
    if (!text) return;
    _previewBtn = btn;
    btn.textContent = '■ 停止';
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = document.getElementById('combo-tts-lang').value;
      utt.onend = utt.onerror = () => {
        if (_previewBtn === btn) { btn.textContent = '▶ 試聽'; _previewBtn = null; }
      };
      speechSynthesis.speak(utt);
    }, 50);
  });
  return btn;
}

// ── 預覽渲染 ─────────────────────────────────────────────────────────
function renderSectionPreview(key) {
  const grid  = document.getElementById(`preview-${key}-grid`);
  const empty = document.getElementById(`preview-${key}-empty`);
  const { pages, texts } = comboState[key];

  if (pages.length === 0) {
    grid.style.display = 'none';
    empty.style.display = '';
    updateTabCount(key, 0);
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML = '';

  if (key === 'ebook') {
    // 電子書預覽 — 用 page-card 模式
    pages.forEach((imgSrc, i) => {
      const t = texts[i] || { title: '', body: '' };
      // 確保 texts[i] 存在
      if (!texts[i]) texts[i] = { title: '', body: '' };

      const card = document.createElement('div');
      card.className = 'page-card';

      const img = document.createElement('img');
      img.className = 'page-thumbnail';
      img.src = imgSrc;
      img.alt = `第 ${i + 1} 頁`;

      const body = document.createElement('div');
      body.className = 'page-card-body';

      const num = document.createElement('div');
      num.className = 'page-num';
      num.textContent = `第 ${i + 1} 頁`;

      const titleField = makeField(
        '標題文字', t.title, '此頁標題',
        (v) => { comboState.ebook.texts[i].title = v; },
        'page'
      );
      const bodyField = makeField(
        '內文', t.body, '此頁內文',
        (v) => { comboState.ebook.texts[i].body = v; },
        'page'
      );

      const ttsBtn = makeTtsButton(() => {
        const tt = comboState.ebook.texts[i] || {};
        return [tt.title, tt.body].filter(Boolean).join('。');
      });
      ttsBtn.className = 'page-preview-btn';

      body.appendChild(num);
      body.appendChild(titleField);
      body.appendChild(bodyField);
      body.appendChild(ttsBtn);
      card.appendChild(img);
      card.appendChild(body);
      grid.appendChild(card);
    });
  } else {
    // 閃卡預覽 — 用 card-preview 模式
    pages.forEach((imgSrc, i) => {
      const t = texts[i] || { title: '', body: '' };
      if (!texts[i]) texts[i] = { title: '', body: '' };

      const el = document.createElement('div');
      el.className = 'card-preview';

      const img = document.createElement('img');
      img.className = 'card-thumbnail';
      img.src = imgSrc;
      img.alt = `第 ${i + 1} 張`;

      const body = document.createElement('div');
      body.className = 'card-preview-body';

      // 正面大字顯示
      if (t.title) {
        const bigText = document.createElement('div');
        bigText.className = 'card-big-text';
        bigText.textContent = t.title;
        body.appendChild(bigText);
      }

      const num = document.createElement('div');
      num.className = 'card-num';
      num.textContent = `第 ${i + 1} 張`;
      body.appendChild(num);

      const frontField = makeField(
        '正面文字（大字）', t.title,
        key === 'char' ? '生字（如：菊）' : '語詞（如：菊花）',
        (v) => { comboState[key].texts[i].title = v; },
        'card'
      );
      body.appendChild(frontField);

      const backField = makeField(
        '背面文字（解釋+例句）', t.body,
        key === 'char' ? '注音：...\n部首：...\n造詞：...' : '解釋：...\n例句：...',
        (v) => { comboState[key].texts[i].body = v; },
        'card'
      );
      body.appendChild(backField);

      // TTS 朗讀文字（獨立欄位，預設 = title + body）
      const ttsText = t.title + (t.body ? '\n' + t.body : '');
      if (!texts[i].ttsText) texts[i].ttsText = ttsText;

      const ttsField = makeField(
        'TTS 朗讀文字', texts[i].ttsText,
        '朗讀內容（預設 = 正面 + 背面文字）',
        (v) => { comboState[key].texts[i].ttsText = v; },
        'card'
      );
      body.appendChild(ttsField);

      const ttsBtn = makeTtsButton(() => {
        const tt = comboState[key].texts[i] || {};
        return tt.ttsText || tt.title || '';
      });
      body.appendChild(ttsBtn);

      el.appendChild(img);
      el.appendChild(body);
      grid.appendChild(el);
    });
  }

  updateTabCount(key, pages.length);
}

// ══════════════════════════════════════════════════════════════════════
// 三合一 HTML 組裝
// ══════════════════════════════════════════════════════════════════════

function buildFlashcardCSS() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
      background: #0a0a0f;
      color: #e8e8e8;
    }
    body { display: flex; flex-direction: column; overflow: hidden; }

    /* ── 模式導航 ── */
    .mode-nav {
      flex-shrink: 0;
      display: flex;
      gap: 2px;
      background: #14141f;
      padding: 4px;
      border-bottom: 1px solid #2a2a3e;
    }
    .mode-btn {
      flex: 1;
      padding: 10px 16px;
      background: transparent;
      border: none;
      color: #a0a0b0;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .mode-btn:hover { background: #1a1a2e; color: #e8e8e8; }
    .mode-btn.active { background: #00d4aa; color: #000; font-weight: 700; }

    .mode-panel { display: none; flex: 1; overflow: hidden; flex-direction: column; }
    .mode-panel.active { display: flex; }

    /* ── 共用控制列 ── */
    .ctrl-bar {
      flex-shrink: 0;
      background: #14141f;
      border-bottom: 1px solid #2a2a3e;
      padding: 0.45rem 0.75rem;
    }
    .ctrl-bar .title-row {
      text-align: center;
      font-size: 0.9rem;
      font-weight: 700;
      color: #00d4aa;
      margin-bottom: 0.3rem;
    }
    .ctrl-bar .controls {
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
      font-family: inherit;
    }
    .ctrl-btn:hover { border-color: #00d4aa; color: #00d4aa; }
    .ctrl-btn.active { background: #00d4aa; color: #000; border-color: #00d4aa; }
    .info-text { color: #a0a0b0; font-size: 0.82rem; min-width: 55px; text-align: center; }
    .speed-row { display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: #a0a0b0; }
    .speed-row input[type="range"] { width: 72px; accent-color: #00d4aa; }

    /* ── 練習模式 格線 ── */
    .practice-grid {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
      align-content: start;
    }
    .practice-card {
      background: #14141f;
      border: 2px solid #2a2a3e;
      border-radius: 16px;
      cursor: pointer;
      overflow: hidden;
      position: relative;
      perspective: 800px;
      aspect-ratio: 3/4;
      transition: border-color 0.2s;
      container-type: inline-size;
    }
    .practice-card:hover { border-color: #00d4aa; }
    .practice-card-inner {
      width: 100%; height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.5s ease;
    }
    .practice-card.flipped .practice-card-inner { transform: rotateY(180deg); }
    .practice-card-face {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      display: flex; align-items: center; justify-content: center;
      border-radius: 14px;
      overflow: hidden;
    }
    .practice-card-front {
      background: #14141f;
      flex-direction: column;
      padding: 1rem;
      text-align: center;
    }
    .practice-card-front .front-char {
      font-weight: 700;
      color: #00d4aa;
      line-height: 1.3;
      word-break: break-all;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1;
    }
    .practice-card-back {
      transform: rotateY(180deg);
      background: #111;
    }
    .practice-card-back img {
      width: 100%; height: 100%;
      object-fit: contain;
    }

    /* ── 測驗模式 ── */
    .quiz-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .quiz-status {
      text-align: center;
      padding: 0.75rem;
      background: #14141f;
      border-bottom: 1px solid #2a2a3e;
    }
    .quiz-status .quiz-prompt {
      font-size: 1.1rem;
      color: #00d4aa;
      font-weight: 700;
    }
    .quiz-status .quiz-score {
      font-size: 0.85rem;
      color: #a0a0b0;
      margin-top: 0.3rem;
    }
    .quiz-grid {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
      align-content: start;
    }
    .quiz-card {
      background: #14141f;
      border: 2px solid #2a2a3e;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 3/4;
      transition: all 0.3s;
      padding: 0.75rem;
      text-align: center;
      container-type: inline-size;
      overflow: hidden;
      position: relative;
    }
    .quiz-card:hover { border-color: #00d4aa; }
    .quiz-card .quiz-char {
      font-weight: 700;
      color: #e8e8e8;
      word-break: break-all;
      overflow: hidden;
    }
    .quiz-card.correct {
      animation: correctPop 0.7s ease forwards;
      border-color: #00d4aa;
    }
    .quiz-card.correct::after {
      content: '⭕';
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: clamp(3rem, 15cqi, 6rem);
      animation: symbolPop 0.5s ease;
      pointer-events: none;
    }
    .quiz-card.wrong {
      animation: shakeCard 0.5s ease;
      border-color: #ff4466;
    }
    .quiz-card.wrong::after {
      content: '✕';
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: clamp(3rem, 15cqi, 6rem);
      color: #ff4466;
      animation: symbolPop 0.4s ease;
      pointer-events: none;
      font-weight: 900;
    }
    .quiz-card.eliminated {
      opacity: 0.12;
      pointer-events: none;
      transform: scale(0.85);
    }
    @keyframes correctPop {
      0% { transform: scale(1); opacity: 1; }
      30% { transform: scale(1.12); border-color: #00d4aa; background: rgba(0,212,170,0.15); }
      100% { transform: scale(0.85); opacity: 0.12; }
    }
    @keyframes shakeCard {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-10px) rotate(-2deg); }
      30% { transform: translateX(10px) rotate(2deg); }
      45% { transform: translateX(-8px) rotate(-1deg); }
      60% { transform: translateX(8px) rotate(1deg); }
      75% { transform: translateX(-4px); }
      90% { transform: translateX(4px); }
    }
    @keyframes symbolPop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .quiz-result {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(10,10,15,0.95);
      z-index: 10;
    }
    .quiz-result h2 { font-size: 2rem; color: #00d4aa; margin-bottom: 1rem; }
    .quiz-result .stat { font-size: 1.2rem; color: #e8e8e8; margin: 0.3rem 0; }
    .quiz-result .retry-btn {
      margin-top: 1.5rem;
      padding: 0.7rem 2rem;
      background: #00d4aa;
      color: #000;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }

    /* ── 沈浸式模式 ── */
    .immersive-area {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      perspective: 1200px;
      overflow: hidden;
      padding: 0.5rem;
    }
    .imm-wrapper {
      width: 100%;
      max-width: 90vw;
      height: 80vh;
      position: relative;
      cursor: pointer;
      transform-style: preserve-3d;
      transition: transform 0.6s ease;
    }
    .imm-wrapper.flipped { transform: rotateY(180deg); }
    .imm-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .imm-front {
      background: #14141f;
      border: 2px solid #2a2a3e;
      flex-direction: column;
      padding: 2rem;
      text-align: center;
    }
    .imm-front .imm-char {
      font-size: clamp(2rem, 8vw, 6rem);
      font-weight: 700;
      color: #00d4aa;
      line-height: 1.2;
    }
    .imm-back {
      transform: rotateY(180deg);
      background: #111;
    }
    .imm-back img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    @media (max-width: 600px) {
      .practice-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; padding: 0.75rem; }
      .quiz-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; padding: 0.75rem; }
      .imm-wrapper { max-width: 95vw; height: 75vh; }
    }
  `;
}

function buildFlashcardSection(prefix, cards, title, isActive) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `
  <div class="tab-panel${isActive ? ' active' : ''}" id="panel-${prefix}">
    <nav class="mode-nav">
      <button class="mode-btn active" data-mode="${prefix}-practice">${esc(title)} — 練習</button>
      <button class="mode-btn" data-mode="${prefix}-quiz">測驗</button>
      <button class="mode-btn" data-mode="${prefix}-immersive">沈浸式</button>
    </nav>

    <div class="mode-panel active" id="mode-${prefix}-practice">
      <div class="ctrl-bar">
        <div class="controls">
          <span class="info-text">點擊讀音｜雙擊/長按翻牌</span>
          <div class="speed-row"><span>速度</span><input type="range" id="${prefix}-prac-speed" min="0.5" max="2" step="0.1" value="1"><span id="${prefix}-prac-speed-val">1.0x</span></div>
        </div>
      </div>
      <div class="practice-grid" id="${prefix}-prac-grid"></div>
    </div>

    <div class="mode-panel" id="mode-${prefix}-quiz">
      <div class="ctrl-bar">
        <div class="controls">
          <button class="ctrl-btn" id="${prefix}-quiz-start">重新開始</button>
          <button class="ctrl-btn" id="${prefix}-quiz-replay">重播讀音</button>
          <div class="speed-row"><span>速度</span><input type="range" id="${prefix}-quiz-speed" min="0.5" max="2" step="0.1" value="1"><span id="${prefix}-quiz-speed-val">1.0x</span></div>
        </div>
      </div>
      <div class="quiz-area" style="position:relative">
        <div class="quiz-status">
          <div class="quiz-prompt" id="${prefix}-quiz-prompt">點擊「重新開始」</div>
          <div class="quiz-score" id="${prefix}-quiz-score"></div>
        </div>
        <div class="quiz-grid" id="${prefix}-quiz-grid"></div>
        <div class="quiz-result" id="${prefix}-quiz-result" style="display:none"></div>
      </div>
    </div>

    <div class="mode-panel" id="mode-${prefix}-immersive">
      <div class="ctrl-bar">
        <div class="controls">
          <button class="ctrl-btn" id="${prefix}-imm-prev">◀</button>
          <span class="info-text" id="${prefix}-imm-info">1 / ${cards.length}</span>
          <button class="ctrl-btn" id="${prefix}-imm-next">▶</button>
          <button class="ctrl-btn" id="${prefix}-imm-tts">朗讀</button>
          <button class="ctrl-btn" id="${prefix}-imm-shuffle">隨機</button>
          <button class="ctrl-btn" id="${prefix}-imm-reset">原序</button>
          <div class="speed-row"><span>速度</span><input type="range" id="${prefix}-imm-speed" min="0.5" max="2" step="0.1" value="1"><span id="${prefix}-imm-speed-val">1.0x</span></div>
          <label class="auto-label"><input type="checkbox" id="${prefix}-imm-auto">翻頁自動朗讀</label>
        </div>
      </div>
      <div class="immersive-area">
        <div class="imm-wrapper" id="${prefix}-imm-wrapper">
          <div class="imm-face imm-front">
            <div class="imm-char" id="${prefix}-imm-char"></div>
          </div>
          <div class="imm-face imm-back">
            <img id="${prefix}-imm-img" src="" alt="">
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildFlashcardSectionScript(prefix, cardsJSON) {
  return `
// ═══ ${prefix} Flashcard Section ═══
(function(){
  const CARDS = ${cardsJSON};
  const ORIG = CARDS.map((_,i)=>i);
  const P = '${prefix}';

  // Mode switching within this section
  document.querySelectorAll('#panel-${prefix} .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#panel-${prefix} .mode-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#panel-${prefix} .mode-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('mode-' + btn.dataset.mode)?.classList.add('active');
      speechSynthesis.cancel();
      speechSynthesis.resume();
    });
  });

  // Practice
  function pracFS(t){var l=(t||'').length;if(l<=1)return'clamp(3rem,12cqi,6rem)';if(l<=2)return'clamp(2rem,10cqi,5rem)';if(l<=4)return'clamp(1.5rem,8cqi,3.5rem)';return'clamp(1rem,6cqi,2.5rem)';}
  const pracTTS = makeTTS(P+'-prac-speed');
  initSpeedSlider(P+'-prac-speed', P+'-prac-speed-val');
  const pracGrid = document.getElementById(P+'-prac-grid');
  CARDS.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'practice-card';
    el.innerHTML = '<div class="practice-card-inner"><div class="practice-card-face practice-card-front"><div class="front-char" style="font-size:'+pracFS(card.frontText)+'">'+escH(card.frontText)+'</div></div><div class="practice-card-face practice-card-back"><img src="'+card.img+'" alt=""></div></div>';
    let cc=0, ct=null;
    el.addEventListener('click', ()=>{
      cc++;
      if(cc===1){ct=setTimeout(()=>{pracTTS.speak(card.frontText);cc=0;},300);}
      else{clearTimeout(ct);cc=0;el.classList.toggle('flipped');if(el.classList.contains('flipped'))pracTTS.speak(card.ttsText||card.frontText);}
    });
    let pt=null;
    el.addEventListener('pointerdown',()=>{pt=setTimeout(()=>{el.classList.toggle('flipped');if(el.classList.contains('flipped'))pracTTS.speak(card.ttsText||card.frontText);cc=0;clearTimeout(ct);},500);});
    el.addEventListener('pointerup',()=>clearTimeout(pt));
    el.addEventListener('pointerleave',()=>clearTimeout(pt));
    pracGrid.appendChild(el);
  });

  // Quiz
  const quizTTS = makeTTS(P+'-quiz-speed');
  initSpeedSlider(P+'-quiz-speed', P+'-quiz-speed-val');
  let qOrder=[], qCur=0, qErr=0, qStart=0, qElim=new Set();
  const qGrid=document.getElementById(P+'-quiz-grid');
  const qPrompt=document.getElementById(P+'-quiz-prompt');
  const qScore=document.getElementById(P+'-quiz-score');
  const qResult=document.getElementById(P+'-quiz-result');

  function buildQGrid(){
    qGrid.innerHTML='';
    CARDS.forEach((card,i)=>{
      const el=document.createElement('div');
      el.className='quiz-card'+(qElim.has(i)?' eliminated':'');
      el.innerHTML='<div class="quiz-char" style="font-size:'+pracFS(card.frontText)+'">'+escH(card.frontText)+'</div>';
      el.addEventListener('click',()=>qSelect(i,el));
      qGrid.appendChild(el);
    });
  }
  function qBegin(){
    qOrder=fisherYates(ORIG);qCur=0;qErr=0;qElim=new Set();qStart=Date.now();
    qResult.style.display='none';buildQGrid();qPlay();
  }
  function qPlay(){
    if(qCur>=qOrder.length){qFinish();return;}
    qPrompt.textContent='聽音選字 — '+(qCur+1)+'/'+qOrder.length;
    qScore.textContent='錯誤：'+qErr;
    quizTTS.speak(CARDS[qOrder[qCur]].frontText);
  }
  function qSelect(idx,el){
    if(qElim.has(idx))return;
    if(idx===qOrder[qCur]){_sfx('correct');el.classList.add('correct');qElim.add(idx);setTimeout(()=>{el.classList.remove('correct');el.classList.add('eliminated');qCur++;qPlay();},800);}
    else{_sfx('wrong');qErr++;qScore.textContent='錯誤：'+qErr;el.classList.add('wrong');setTimeout(()=>el.classList.remove('wrong'),600);}
  }
  function qFinish(){
    const t=Math.round((Date.now()-qStart)/1000),n=qOrder.length,pct=Math.round((n*n)/(n*n+qErr*n)*100);
    _sfx('fanfare');qPrompt.textContent='完成！';
    qResult.style.display='flex';
    qResult.innerHTML='<h2>測驗結果</h2><div class="stat">總題數：'+n+'</div><div class="stat">錯誤：'+qErr+'</div><div class="stat">耗時：'+t+'秒</div><div class="stat">正確率：'+pct+'%</div><button class="retry-btn" id="'+P+'-quiz-retry">重新開始</button>';
    document.getElementById(P+'-quiz-retry')?.addEventListener('click',qBegin);
  }
  document.getElementById(P+'-quiz-start')?.addEventListener('click',qBegin);
  document.getElementById(P+'-quiz-replay')?.addEventListener('click',()=>{if(qCur<qOrder.length)quizTTS.speak(CARDS[qOrder[qCur]].frontText);});
  buildQGrid();

  // Immersive
  const immTTS=makeTTS(P+'-imm-speed');
  initSpeedSlider(P+'-imm-speed', P+'-imm-speed-val');
  let iOrder=[...ORIG],iIdx=0,iFlip=false;
  const iW=document.getElementById(P+'-imm-wrapper');
  function iShow(idx, autoSpeak){
    iIdx=idx;iFlip=false;iW.classList.remove('flipped');
    const c=CARDS[iOrder[idx]];
    document.getElementById(P+'-imm-char').textContent=c.frontText;
    document.getElementById(P+'-imm-img').src=c.img;
    document.getElementById(P+'-imm-info').textContent=(idx+1)+' / '+iOrder.length;
    immTTS.stop();
    const chkAuto=document.getElementById(P+'-imm-auto');
    if(autoSpeak && chkAuto && chkAuto.checked){ immTTS.speak(c.frontText); }
  }
  function iFlipFn(){
    iFlip=!iFlip;iW.classList.toggle('flipped',iFlip);
  }
  iW?.addEventListener('click',iFlipFn);
  document.getElementById(P+'-imm-prev')?.addEventListener('click',()=>{immTTS.stop();if(iIdx>0)iShow(iIdx-1,true);});
  document.getElementById(P+'-imm-next')?.addEventListener('click',()=>{immTTS.stop();if(iIdx<iOrder.length-1)iShow(iIdx+1,true);});
  document.getElementById(P+'-imm-tts')?.addEventListener('click',()=>{const c=CARDS[iOrder[iIdx]];if(iFlip){immTTS.speak(c.ttsText||(c.frontText+'\\n'+c.backText));}else{immTTS.speak(c.frontText);}});
  document.getElementById(P+'-imm-shuffle')?.addEventListener('click',()=>{iOrder=fisherYates(iOrder);iShow(0);});
  document.getElementById(P+'-imm-reset')?.addEventListener('click',()=>{iOrder=[...ORIG];iShow(0);});
  if(CARDS.length>0)iShow(0);
})();
`;
}

async function assembleComboHTML(comboData, title, lang) {
  // 載入 StPageFlip 庫（電子書翻頁特效）
  let pageFlipLib = '';
  if (comboData.ebook.pages.length > 0) {
    try {
      const libRes = await fetch('/js/page-flip.browser.js');
      if (libRes.ok) pageFlipLib = await libRes.text();
    } catch (e) { console.warn('[combo] page-flip.browser.js load failed, using simple viewer'); }
  }
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Build ebook pages data
  const ebookPages = comboData.ebook.pages.map((img, i) => {
    const t = comboData.ebook.texts[i] || { title: '', body: '' };
    return { img, textTitle: t.title, textBody: t.body };
  });

  // Build flashcard data
  const charCards = comboData.char.pages.map((img, i) => {
    const t = comboData.char.texts[i] || { title: '', body: '' };
    return { img, frontText: t.title, backText: t.body, ttsText: t.ttsText || (t.title + (t.body ? '\n' + t.body : '')) };
  });

  const vocabCards = comboData.vocab.pages.map((img, i) => {
    const t = comboData.vocab.texts[i] || { title: '', body: '' };
    return { img, frontText: t.title, backText: t.body, ttsText: t.ttsText || (t.title + (t.body ? '\n' + t.body : '')) };
  });

  const hasEbook = ebookPages.length > 0;
  const hasChar  = charCards.length > 0;
  const hasVocab = vocabCards.length > 0;

  const tabs = [];
  if (hasEbook) tabs.push({ id: 'ebook', label: '電子書' });
  if (hasChar)  tabs.push({ id: 'ch',    label: '生字閃卡' });
  if (hasVocab) tabs.push({ id: 'vc',    label: '語詞閃卡' });

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
      font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
      background: #0a0a0f;
      color: #e8e8e8;
    }
    body { display: flex; flex-direction: column; overflow: hidden; }

    .tab-nav {
      flex-shrink: 0;
      display: flex;
      gap: 2px;
      background: #14141f;
      padding: 4px;
      border-bottom: 1px solid #2a2a3e;
    }
    .tab-btn {
      flex: 1;
      padding: 10px 16px;
      background: transparent;
      border: none;
      color: #a0a0b0;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: #1a1a2e; color: #e8e8e8; }
    .tab-btn.active { background: #00d4aa; color: #000; font-weight: 700; }

    .tab-panel { display: none; flex: 1; overflow: hidden; flex-direction: column; }
    .tab-panel.active { display: flex; }

    /* Ebook */
    .ebook-ctrl {
      flex-shrink: 0;
      background: #14141f;
      border-bottom: 1px solid #2a2a3e;
      padding: 0.45rem 0.75rem 0.35rem;
    }
    .ebook-ctrl .controls {
      display: flex; align-items: center; gap: 0.45rem; justify-content: center; flex-wrap: wrap;
    }
    .ebook-area {
      flex: 1; overflow: hidden;
      display: flex; justify-content: center; align-items: center;
    }
    .ebook-area img { max-width: 100%; max-height: 100%; object-fit: contain; }
    #eb-book canvas { display: block; }
    .tts-bar { font-size: 0.78rem; color: #a0a0b0; text-align: center; padding: 0.2rem 0.5rem; }
    .auto-label {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.78rem; color: #a0a0b0; cursor: pointer; white-space: nowrap;
    }

    ${buildFlashcardCSS()}
  </style>
</head>
<body>
  <nav class="tab-nav">
    ${tabs.map((t, i) => `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('\n    ')}
  </nav>

  ${hasEbook ? `
  <div class="tab-panel${tabs[0]?.id === 'ebook' ? ' active' : ''}" id="panel-ebook">
    <div class="ebook-ctrl">
      <div class="controls">
        <button class="ctrl-btn" id="eb-prev">◀ 上一頁</button>
        <span class="info-text" id="eb-info">1 / ${ebookPages.length}</span>
        <button class="ctrl-btn" id="eb-next">下一頁 ▶</button>
        <button class="ctrl-btn" id="eb-tts">▶ 朗讀</button>
        <button class="ctrl-btn" id="eb-stop" style="display:none">■ 停止</button>
        <div class="speed-row"><span>速度</span><input type="range" id="eb-speed" min="0.5" max="2" step="0.1" value="1"><span id="eb-speed-val">1.0x</span></div>
        <label class="auto-label"><input type="checkbox" id="eb-chk-auto">翻頁自動朗讀</label>
        <label class="auto-label" title="關閉時只朗讀內文，不唸標題"><input type="checkbox" id="eb-chk-title" checked>朗讀標題</label>
      </div>
      <div class="tts-bar" id="eb-tts-bar">—</div>
    </div>
    <div class="ebook-area">${pageFlipLib ? '<div id="eb-book"></div>' : '<img id="eb-img" src="" alt="">'}</div>
  </div>` : ''}

  ${hasChar ? buildFlashcardSection('ch', charCards, '生字閃卡', !hasEbook && tabs[0]?.id === 'ch') : ''}
  ${hasVocab ? buildFlashcardSection('vc', vocabCards, '語詞閃卡', !hasEbook && !hasChar && tabs[0]?.id === 'vc') : ''}

  ${pageFlipLib ? `<script>${pageFlipLib}</script>` : ''}
  <script>
const TTS_LANG = ${JSON.stringify(lang)};

function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Sound Effects ──
const _ac = new (window.AudioContext || window.webkitAudioContext)();
function _sfx(type) {
  try {
    const o = _ac.createOscillator();
    const g = _ac.createGain();
    o.connect(g); g.connect(_ac.destination);
    const t = _ac.currentTime;
    if (type === 'correct') {
      o.type = 'sine';
      o.frequency.setValueAtTime(523, t);
      o.frequency.setValueAtTime(659, t + 0.1);
      o.frequency.setValueAtTime(784, t + 0.2);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      o.start(t); o.stop(t + 0.4);
    } else if (type === 'wrong') {
      o.type = 'square';
      o.frequency.setValueAtTime(200, t);
      o.frequency.setValueAtTime(150, t + 0.15);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      o.start(t); o.stop(t + 0.35);
    } else if (type === 'fanfare') {
      [523, 659, 784, 1047].forEach((f, i) => {
        const oo = _ac.createOscillator();
        const gg = _ac.createGain();
        oo.connect(gg); gg.connect(_ac.destination);
        oo.type = 'sine';
        oo.frequency.setValueAtTime(f, t + i * 0.15);
        gg.gain.setValueAtTime(0.25, t + i * 0.15);
        gg.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.4);
        oo.start(t + i * 0.15); oo.stop(t + i * 0.15 + 0.4);
      });
    }
  } catch(e) {}
}

// ── Tab switching ──
document.querySelectorAll('.tab-nav > .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-nav > .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('body > .tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab)?.classList.add('active');
    speechSynthesis.cancel();
    speechSynthesis.resume();
  });
});

function makeTTS(speedId) {
  let _timer = null;
  return {
    speak(text) {
      if (!text) return;
      this.stop();
      _timer = setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = TTS_LANG;
        const s = document.getElementById(speedId);
        utt.rate = s ? parseFloat(s.value) : 1;
        speechSynthesis.speak(utt);
      }, 50);
    },
    stop() { clearTimeout(_timer); speechSynthesis.cancel(); speechSynthesis.resume(); }
  };
}
function initSpeedSlider(sid, vid) {
  const s = document.getElementById(sid);
  const v = document.getElementById(vid);
  if (s && v) s.addEventListener('input', () => { v.textContent = parseFloat(s.value).toFixed(1) + 'x'; });
}
function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

${hasEbook ? `
// ═══ Ebook ═══
const ebook_PAGES = ${JSON.stringify(ebookPages)};
let eb_idx = 0;
const eb_btnTts = document.getElementById('eb-tts');
const eb_btnStop = document.getElementById('eb-stop');
const eb_tts = {
  _timer: null,
  speak(text) {
    if (!text) return;
    this.stop();
    if (eb_btnStop) { eb_btnStop.style.display = ''; }
    if (eb_btnTts) { eb_btnTts.style.display = 'none'; }
    this._timer = setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = TTS_LANG;
      const s = document.getElementById('eb-speed');
      utt.rate = s ? parseFloat(s.value) : 1;
      utt.onend = utt.onerror = () => {
        if (eb_btnStop) eb_btnStop.style.display = 'none';
        if (eb_btnTts) eb_btnTts.style.display = '';
      };
      speechSynthesis.speak(utt);
    }, 50);
  },
  stop() {
    clearTimeout(this._timer);
    speechSynthesis.cancel();
    speechSynthesis.resume();
    if (eb_btnStop) eb_btnStop.style.display = 'none';
    if (eb_btnTts) eb_btnTts.style.display = '';
  }
};
initSpeedSlider('eb-speed', 'eb-speed-val');

function eb_getText(idx) {
  const p = ebook_PAGES[idx];
  if (!p) return '';
  const chkTitle = document.getElementById('eb-chk-title');
  if (chkTitle && chkTitle.checked) {
    return [p.textTitle, p.textBody].filter(Boolean).join('。');
  }
  return p.textBody || p.textTitle || '';
}
function eb_updateUI(idx) {
  eb_idx = idx;
  document.getElementById('eb-info').textContent = (idx+1) + ' / ' + ebook_PAGES.length;
  document.getElementById('eb-tts-bar').textContent = eb_getText(idx) || '—';
  const chkAuto = document.getElementById('eb-chk-auto');
  if (chkAuto && chkAuto.checked) {
    const text = eb_getText(idx);
    if (text) eb_tts.speak(text);
  }
}
` + (pageFlipLib ? `
// PageFlip mode
const eb_bookEl = document.getElementById('eb-book');
const eb_bookCont = eb_bookEl.parentElement;
let eb_pf;
function eb_calcSize() {
  const aw = eb_bookCont.clientWidth;
  const ah = eb_bookCont.clientHeight;
  if (aw / ah >= 16 / 9) return { w: Math.floor(ah * 16 / 9), h: ah };
  return { w: aw, h: Math.floor(aw * 9 / 16) };
}
function eb_initFlip() {
  eb_bookEl.innerHTML = '';
  const { w, h } = eb_calcSize();
  ebook_PAGES.forEach((p, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;height:100%;background:#000;overflow:hidden;';
    const img = document.createElement('img');
    img.src = p.img;
    img.alt = '第' + (i+1) + '頁';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
    div.appendChild(img);
    eb_bookEl.appendChild(div);
  });
  eb_pf = new St.PageFlip(eb_bookEl, {
    width: w, height: h, size: 'fixed',
    usePortrait: true, showCover: false, flippingTime: 450,
    useMouseEvents: true, swipeDistance: 30
  });
  eb_pf.loadFromHTML(eb_bookEl.querySelectorAll('div'));
  eb_pf.on('flip', (e) => { eb_tts.stop(); eb_updateUI(e.data); });
  eb_updateUI(0);
}
let eb_resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(eb_resizeTimer);
  eb_resizeTimer = setTimeout(() => {
    const curIdx = eb_pf ? eb_pf.getCurrentPageIndex() : 0;
    eb_tts.stop();
    eb_initFlip();
    if (curIdx > 0) setTimeout(() => eb_pf.flip(curIdx, 'top'), 50);
  }, 250);
});
eb_initFlip();
document.getElementById('eb-prev').addEventListener('click', () => { eb_tts.stop(); eb_pf.flipPrev(); });
document.getElementById('eb-next').addEventListener('click', () => { eb_tts.stop(); eb_pf.flipNext(); });
eb_btnTts.addEventListener('click', () => eb_tts.speak(eb_getText(eb_pf.getCurrentPageIndex())));
eb_btnStop.addEventListener('click', () => eb_tts.stop());
` : `
// Simple image viewer (no PageFlip)
function eb_show(idx) {
  eb_updateUI(idx);
  document.getElementById('eb-img').src = ebook_PAGES[idx].img;
}
document.getElementById('eb-prev').addEventListener('click', () => { if(eb_idx>0) { eb_tts.stop(); eb_show(eb_idx-1); } });
document.getElementById('eb-next').addEventListener('click', () => { if(eb_idx<ebook_PAGES.length-1) { eb_tts.stop(); eb_show(eb_idx+1); } });
eb_btnTts.addEventListener('click', () => eb_tts.speak(eb_getText(eb_idx)));
eb_btnStop.addEventListener('click', () => eb_tts.stop());
eb_show(0);
`) + `
` : ''}

${hasChar ? buildFlashcardSectionScript('ch', JSON.stringify(charCards)) : ''}
${hasVocab ? buildFlashcardSectionScript('vc', JSON.stringify(vocabCards)) : ''}

// ── Keyboard (active panel) ──
document.addEventListener('keydown', (e) => {
  const active = document.querySelector('.tab-panel.active');
  if (!active) return;
  const id = active.id;
  // 找出當前面板中處於 active 的子模式
  const activeMode = active.querySelector('.mode-panel.active');
  const modeId = activeMode ? activeMode.id : '';
  const isImmersive = modeId.endsWith('-immersive');
  // 取得閃卡 prefix（ch 或 vc）
  const fcPrefix = (id === 'panel-ch') ? 'ch' : (id === 'panel-vc') ? 'vc' : '';

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-next')?.click();
    else if (fcPrefix && isImmersive) document.getElementById(fcPrefix+'-imm-next')?.click();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-prev')?.click();
    else if (fcPrefix && isImmersive) document.getElementById(fcPrefix+'-imm-prev')?.click();
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-tts')?.click();
    else if (fcPrefix && isImmersive) document.getElementById(fcPrefix+'-imm-tts')?.click();
  }
});
  </script>
</body>
</html>`;
}

// ── 下載 HTML ────────────────────────────────────────────────────────
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

// ── 生成按鈕 ─────────────────────────────────────────────────────────
const comboBtn = document.getElementById('combo-generate-btn');

comboBtn.addEventListener('click', async () => {
  comboBtn.disabled    = true;
  comboBtn.textContent = '⏳ 生成中...';

  const progressBarEl  = document.getElementById('combo-progress-bar');
  const progressFillEl = document.getElementById('combo-progress-fill');
  progressBarEl.style.display = 'block';
  progressFillEl.style.width = '30%';

  try {
    const title = document.getElementById('combo-title').value.trim() || '我的教材';
    const lang  = document.getElementById('combo-tts-lang').value;

    progressFillEl.style.width = '60%';
    const html = await assembleComboHTML(comboState, title, lang);
    progressFillEl.style.width = '100%';

    const filename = title.replace(/[^\w\u4e00-\u9fff-]/g, '_') + '_三合一.html';
    downloadHTML(html, filename);

  } catch (err) {
    alert(`生成失敗：${err.message}`);
    console.error('[combo] generate error:', err);
  } finally {
    comboBtn.disabled    = false;
    comboBtn.textContent = '生成三合一 HTML';
    progressBarEl.style.display = 'none';
    progressFillEl.style.width = '0%';
  }
});
