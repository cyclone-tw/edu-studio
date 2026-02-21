// flashcard-generator.js — 閃卡生成工具主邏輯
// ES Module（flashcard.html 以 type="module" 載入）

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

// ── 狀態 ──────────────────────────────────────────────────────────────
const state = {
  type: 'character',    // 'character' | 'vocabulary'
  cards: [],            // [{ img, frontText, backText, ttsText }]
  cardTexts: [],        // from YAML
};

// ── DOM 元素 ──────────────────────────────────────────────────────────
const typeTabs        = document.getElementById('typeTabs');
const pdfInput        = document.getElementById('fc-pdf-input');
const yamlInput       = document.getElementById('fc-yaml-input');
const pdfStatus       = document.getElementById('fc-pdf-status');
const yamlStatus      = document.getElementById('fc-yaml-status');
const previewEmpty    = document.getElementById('fc-preview-empty');
const previewGrid     = document.getElementById('fc-preview-grid');
const generateBtn     = document.getElementById('fc-generate-btn');
const progressBar     = document.getElementById('fc-progress-bar');
const progressFill    = document.getElementById('fc-progress-fill');

// ── 類型切換 ──────────────────────────────────────────────────────────
typeTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.type-tab');
  if (!tab) return;
  const type = tab.dataset.type;
  if (type) {
    state.type = type;
    typeTabs.querySelectorAll('.type-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.type === type)
    );
    // Toggle PDF required indicator
    const pdfCard = pdfInput?.closest('.upload-card');
    if (pdfCard) {
      const requiredSpan = pdfCard.querySelector('.pdf-required-hint');
      if (requiredSpan) requiredSpan.style.display = 'inline';
    }
    if (state.cards.length > 0) renderPreview();
  }
});

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
    state.cards = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
      }).promise;

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      const ct = state.cardTexts[i - 1] || { frontText: '', backText: '', ttsText: '' };

      state.cards.push({
        img: base64,
        frontText: ct.frontText,
        backText: ct.backText,
        ttsText: ct.ttsText
      });

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
    console.error('[flashcard] PDF load error:', err);
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

    const slidesArr = doc?.slides || doc?.presentation_data?.slides;
    if (!slidesArr || !Array.isArray(slidesArr)) {
      throw new Error('找不到 slides 陣列');
    }

    const sorted = [...slidesArr].sort(
      (a, b) => (a.slide_number ?? Infinity) - (b.slide_number ?? Infinity)
    );

    state.cardTexts = sorted.map((slide) => {
      const c = slide.content || {};
      const title = c.title || slide.title || '';
      const keyPoints = Array.isArray(c.key_points)
        ? c.key_points.filter(Boolean).join('\n')
        : (c.key_points || '');

      return {
        frontText: title,
        backText: keyPoints,
        ttsText: title + (keyPoints ? '\n' + keyPoints : '')
      };
    });

    yamlStatus.textContent = `✓ 已載入 ${state.cardTexts.length} 張卡片文字`;
    yamlStatus.className = 'upload-status success';

    // Update existing cards if PDF already loaded
    if (state.cards.length > 0) {
      state.cards.forEach((card, i) => {
        const ct = state.cardTexts[i] || { frontText: '', backText: '', ttsText: '' };
        if (!card.frontText) card.frontText = ct.frontText;
        if (!card.backText) card.backText = ct.backText;
        if (!card.ttsText) card.ttsText = ct.ttsText;
      });
      renderPreview();
    }

  } catch (err) {
    yamlStatus.textContent = `✗ 解析失敗：${err.message}`;
    yamlStatus.className = 'upload-status error';
    console.error('[flashcard] YAML parse error:', err);
  }
});

// ── 預覽渲染 ──────────────────────────────────────────────────────────
let _previewBtn = null;

function stopEditorPreview() {
  speechSynthesis.cancel();
  speechSynthesis.resume();
  if (_previewBtn) { _previewBtn.textContent = '▶ 試聽'; _previewBtn = null; }
}

function makeField(label, value, placeholder, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'card-field';

  const lbl = document.createElement('div');
  lbl.className = 'card-field-label';
  lbl.textContent = label;

  const ta = document.createElement('textarea');
  ta.className = 'card-text-input';
  ta.placeholder = placeholder;
  ta.value = value || '';
  ta.addEventListener('input', () => onChange(ta.value));

  wrap.appendChild(lbl);
  wrap.appendChild(ta);
  return wrap;
}

function renderPreview() {
  previewEmpty.style.display = 'none';
  previewGrid.style.display  = 'grid';
  previewGrid.innerHTML = '';

  state.cards.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'card-preview';

    const img = document.createElement('img');
    img.className = 'card-thumbnail';
    img.src = card.img;
    img.alt = `第 ${i + 1} 張`;

    const body = document.createElement('div');
    body.className = 'card-preview-body';

    const num = document.createElement('div');
    num.className = 'card-num';
    num.textContent = `第 ${i + 1} 張`;

    // Front text (big display)
    if (card.frontText) {
      const bigText = document.createElement('div');
      bigText.className = 'card-big-text';
      bigText.textContent = card.frontText;
      body.appendChild(bigText);
    }

    body.appendChild(num);

    const frontField = makeField(
      '正面文字（大字）',
      card.frontText,
      state.type === 'character' ? '生字（如：菊）' : '語詞（如：菊花）',
      (v) => { state.cards[i].frontText = v; }
    );
    body.appendChild(frontField);

    const backField = makeField(
      '背面文字（解釋+例句）',
      card.backText,
      state.type === 'character' ? '注音：...\n部首：...\n造詞：...' : '解釋：...\n例句：...',
      (v) => { state.cards[i].backText = v; }
    );
    body.appendChild(backField);

    const ttsField = makeField(
      'TTS 朗讀文字（翻面時念）',
      card.ttsText,
      '朗讀內容（預設 = 正面文字 + 背面文字）',
      (v) => { state.cards[i].ttsText = v; }
    );
    body.appendChild(ttsField);

    // Preview button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'card-preview-btn';
    previewBtn.textContent = '▶ 試聽';
    previewBtn.addEventListener('click', () => {
      if (_previewBtn === previewBtn) { stopEditorPreview(); return; }
      stopEditorPreview();
      const text = state.cards[i].ttsText || state.cards[i].frontText || '';
      if (!text) return;
      _previewBtn = previewBtn;
      previewBtn.textContent = '■ 停止';
      // Delay speak after cancel() to avoid Chrome speechSynthesis bug
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = document.getElementById('fc-tts-lang').value;
        utt.onend = utt.onerror = () => {
          if (_previewBtn === previewBtn) { previewBtn.textContent = '▶ 試聽'; _previewBtn = null; }
        };
        speechSynthesis.speak(utt);
      }, 50);
    });
    body.appendChild(previewBtn);

    el.appendChild(img);
    el.appendChild(body);
    previewGrid.appendChild(el);
  });
}

// ══════════════════════════════════════════════════════════════════════
// 閃卡 HTML 組裝 — 三種模式 + 翻牌方向反轉 + 滿版響應式
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
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
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
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
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

function buildFlashcardScript(cardsJSON, lang) {
  return `
const CARDS = ${cardsJSON};
const ORIG = CARDS.map((_,i)=>i);
const TTS_LANG = ${JSON.stringify(lang)};

// ── Sound Effects (Web Audio API) ──
const _ac = new (window.AudioContext || window.webkitAudioContext)();
function _sfx(type) {
  try {
    const o = _ac.createOscillator();
    const g = _ac.createGain();
    o.connect(g);
    g.connect(_ac.destination);
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
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
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

// ── Utility ──
function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTTS(speedId) {
  let _timer = null;
  return {
    speak(text) {
      if (!text) return;
      this.stop();
      // Delay speak after cancel() to avoid Chrome speechSynthesis bug
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

function initSpeed(sid, vid) {
  const s = document.getElementById(sid);
  const v = document.getElementById(vid);
  if (s && v) s.addEventListener('input', () => { v.textContent = parseFloat(s.value).toFixed(1) + 'x'; });
}

// ── Mode switching ──
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('mode-' + btn.dataset.mode)?.classList.add('active');
    speechSynthesis.cancel();
    speechSynthesis.resume();
  });
});

// ═══════════════════════════════════
// Practice Mode
// ═══════════════════════════════════
const pracTTS = makeTTS('prac-speed');
initSpeed('prac-speed', 'prac-speed-val');

function pracFontSize(text) {
  const len = (text || '').length;
  if (len <= 1) return 'clamp(3rem, 12cqi, 6rem)';
  if (len <= 2) return 'clamp(2rem, 10cqi, 5rem)';
  if (len <= 4) return 'clamp(1.5rem, 8cqi, 3.5rem)';
  return 'clamp(1rem, 6cqi, 2.5rem)';
}

const pracGrid = document.getElementById('prac-grid');
CARDS.forEach((card, i) => {
  const el = document.createElement('div');
  el.className = 'practice-card';
  el.dataset.idx = i;
  el.innerHTML =
    '<div class="practice-card-inner">' +
      '<div class="practice-card-face practice-card-front">' +
        '<div class="front-char" style="font-size:' + pracFontSize(card.frontText) + '">' + escH(card.frontText) + '</div>' +
      '</div>' +
      '<div class="practice-card-face practice-card-back">' +
        '<img src="' + card.img + '" alt="">' +
      '</div>' +
    '</div>';

  let clickCount = 0;
  let clickTimer = null;
  el.addEventListener('click', () => {
    clickCount++;
    if (clickCount === 1) {
      clickTimer = setTimeout(() => {
        // Single click: TTS
        pracTTS.speak(card.frontText);
        clickCount = 0;
      }, 300);
    } else {
      // Double click: flip
      clearTimeout(clickTimer);
      clickCount = 0;
      el.classList.toggle('flipped');
      if (el.classList.contains('flipped')) {
        pracTTS.speak(card.ttsText || card.frontText);
      }
    }
  });

  // Long press to flip
  let pressTimer = null;
  el.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => {
      el.classList.toggle('flipped');
      if (el.classList.contains('flipped')) {
        pracTTS.speak(card.ttsText || card.frontText);
      }
      clickCount = 0;
      clearTimeout(clickTimer);
    }, 500);
  });
  el.addEventListener('pointerup', () => clearTimeout(pressTimer));
  el.addEventListener('pointerleave', () => clearTimeout(pressTimer));

  pracGrid.appendChild(el);
});

// ═══════════════════════════════════
// Quiz Mode
// ═══════════════════════════════════
const quizTTS = makeTTS('quiz-speed');
initSpeed('quiz-speed', 'quiz-speed-val');

let quizOrder = [];
let quizCurrent = 0;
let quizErrors = 0;
let quizStartTime = 0;
let quizEliminated = new Set();

const quizGrid = document.getElementById('quiz-grid');
const quizPrompt = document.getElementById('quiz-prompt');
const quizScore = document.getElementById('quiz-score');
const quizResultEl = document.getElementById('quiz-result');

function buildQuizGrid() {
  quizGrid.innerHTML = '';
  CARDS.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'quiz-card' + (quizEliminated.has(i) ? ' eliminated' : '');
    el.dataset.idx = i;
    el.innerHTML = '<div class="quiz-char" style="font-size:' + pracFontSize(card.frontText) + '">' + escH(card.frontText) + '</div>';
    el.addEventListener('click', () => quizSelect(i, el));
    quizGrid.appendChild(el);
  });
}

function quizStart() {
  quizOrder = fisherYates(ORIG);
  quizCurrent = 0;
  quizErrors = 0;
  quizEliminated = new Set();
  quizStartTime = Date.now();
  quizResultEl.style.display = 'none';
  buildQuizGrid();
  quizPlayCurrent();
}

function quizPlayCurrent() {
  if (quizCurrent >= quizOrder.length) {
    quizFinish();
    return;
  }
  const card = CARDS[quizOrder[quizCurrent]];
  quizPrompt.textContent = '聽音選字 — 第 ' + (quizCurrent + 1) + '/' + quizOrder.length + ' 題';
  quizScore.textContent = '錯誤：' + quizErrors;
  setTimeout(() => quizTTS.speak(card.frontText), 400);
}

function quizSelect(idx, el) {
  if (quizEliminated.has(idx)) return;
  if (idx === quizOrder[quizCurrent]) {
    // Correct
    _sfx('correct');
    el.classList.add('correct');
    quizEliminated.add(idx);
    setTimeout(() => {
      el.classList.remove('correct');
      el.classList.add('eliminated');
      quizCurrent++;
      quizPlayCurrent();
    }, 800);
  } else {
    // Wrong
    _sfx('wrong');
    quizErrors++;
    quizScore.textContent = '錯誤：' + quizErrors;
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 600);
  }
}

function quizFinish() {
  const elapsed = Math.round((Date.now() - quizStartTime) / 1000);
  const total = quizOrder.length;
  const pct = Math.round(((total * total) / (total * total + quizErrors * total)) * 100);
  _sfx('fanfare');
  quizPrompt.textContent = '測驗完成！';
  quizResultEl.style.display = 'flex';
  quizResultEl.innerHTML =
    '<h2>測驗結果</h2>' +
    '<div class="stat">總題數：' + total + '</div>' +
    '<div class="stat">錯誤次數：' + quizErrors + '</div>' +
    '<div class="stat">耗時：' + elapsed + ' 秒</div>' +
    '<div class="stat">正確率：' + pct + '%</div>' +
    '<button class="retry-btn" id="quiz-retry">重新開始</button>';
  document.getElementById('quiz-retry').addEventListener('click', quizStart);
}

document.getElementById('quiz-start')?.addEventListener('click', quizStart);
document.getElementById('quiz-replay')?.addEventListener('click', () => {
  if (quizCurrent < quizOrder.length) {
    quizTTS.speak(CARDS[quizOrder[quizCurrent]].frontText);
  }
});
buildQuizGrid();

// ═══════════════════════════════════
// Immersive Mode
// ═══════════════════════════════════
const immTTS = makeTTS('imm-speed');
initSpeed('imm-speed', 'imm-speed-val');

let immOrder = [...ORIG];
let immIdx = 0;
let immFlipped = false;

const immWrapper = document.getElementById('imm-wrapper');
const immChar = document.getElementById('imm-char');
const immImg = document.getElementById('imm-img');
const immInfo = document.getElementById('imm-info');

function immShow(idx) {
  immIdx = idx;
  immFlipped = false;
  immWrapper.classList.remove('flipped');
  const c = CARDS[immOrder[idx]];
  immChar.textContent = c.frontText;
  immImg.src = c.img;
  immInfo.textContent = (idx+1) + ' / ' + immOrder.length;
  immTTS.stop();
}
function immFlip() {
  immFlipped = !immFlipped;
  immWrapper.classList.toggle('flipped', immFlipped);
}

immWrapper?.addEventListener('click', immFlip);
document.getElementById('imm-prev')?.addEventListener('click', () => { immTTS.stop(); if(immIdx>0) immShow(immIdx-1); });
document.getElementById('imm-next')?.addEventListener('click', () => { immTTS.stop(); if(immIdx<immOrder.length-1) immShow(immIdx+1); });
document.getElementById('imm-tts')?.addEventListener('click', () => {
  const c = CARDS[immOrder[immIdx]];
  if (immFlipped) { immTTS.speak(c.ttsText || (c.frontText + '\\n' + c.backText)); }
  else { immTTS.speak(c.frontText); }
});
document.getElementById('imm-shuffle')?.addEventListener('click', () => { immOrder = fisherYates(immOrder); immShow(0); });
document.getElementById('imm-reset')?.addEventListener('click', () => { immOrder = [...ORIG]; immShow(0); });

if (CARDS.length > 0) immShow(0);

// ── Keyboard (active mode) ──
document.addEventListener('keydown', (e) => {
  const active = document.querySelector('.mode-panel.active');
  if (!active) return;
  const id = active.id;
  if (id === 'mode-immersive') {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('imm-next')?.click(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('imm-prev')?.click(); }
    if (e.key === ' ') { e.preventDefault(); immFlip(); }
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('imm-tts')?.click(); }
  }
  if (id === 'mode-quiz') {
    if (e.key === 'r' || e.key === 'R') { document.getElementById('quiz-replay')?.click(); }
  }
});
  `;
}

function assembleFlashcardHTML(cards, title, lang, type) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const cardsJSON = JSON.stringify(
    cards.map(c => ({
      img: c.img,
      frontText: c.frontText || '',
      backText: c.backText || '',
      ttsText: c.ttsText || (c.frontText + (c.backText ? '\n' + c.backText : ''))
    }))
  );

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>${buildFlashcardCSS()}</style>
</head>
<body>
  <nav class="mode-nav">
    <button class="mode-btn active" data-mode="practice">練習模式</button>
    <button class="mode-btn" data-mode="quiz">測驗模式</button>
    <button class="mode-btn" data-mode="immersive">沈浸式</button>
  </nav>

  <!-- ═══ 練習模式 ═══ -->
  <div class="mode-panel active" id="mode-practice">
    <div class="ctrl-bar">
      <div class="title-row">${esc(title)} — 練習模式</div>
      <div class="controls">
        <span class="info-text">點擊讀音｜雙擊/長按翻牌</span>
        <div class="speed-row">
          <span>速度</span>
          <input type="range" id="prac-speed" min="0.5" max="2" step="0.1" value="1">
          <span id="prac-speed-val">1.0x</span>
        </div>
      </div>
    </div>
    <div class="practice-grid" id="prac-grid"></div>
  </div>

  <!-- ═══ 測驗模式 ═══ -->
  <div class="mode-panel" id="mode-quiz">
    <div class="ctrl-bar">
      <div class="title-row">${esc(title)} — 測驗模式</div>
      <div class="controls">
        <button class="ctrl-btn" id="quiz-start">重新開始</button>
        <button class="ctrl-btn" id="quiz-replay">重播讀音</button>
        <div class="speed-row">
          <span>速度</span>
          <input type="range" id="quiz-speed" min="0.5" max="2" step="0.1" value="1">
          <span id="quiz-speed-val">1.0x</span>
        </div>
      </div>
    </div>
    <div class="quiz-area" style="position:relative">
      <div class="quiz-status">
        <div class="quiz-prompt" id="quiz-prompt">點擊「重新開始」開始測驗</div>
        <div class="quiz-score" id="quiz-score"></div>
      </div>
      <div class="quiz-grid" id="quiz-grid"></div>
      <div class="quiz-result" id="quiz-result" style="display:none"></div>
    </div>
  </div>

  <!-- ═══ 沈浸式 ═══ -->
  <div class="mode-panel" id="mode-immersive">
    <div class="ctrl-bar">
      <div class="title-row">${esc(title)}</div>
      <div class="controls">
        <button class="ctrl-btn" id="imm-prev">◀ 上一張</button>
        <span class="info-text" id="imm-info">1 / ${cards.length}</span>
        <button class="ctrl-btn" id="imm-next">下一張 ▶</button>
        <button class="ctrl-btn" id="imm-tts">▶ 朗讀</button>
        <button class="ctrl-btn" id="imm-shuffle">隨機</button>
        <button class="ctrl-btn" id="imm-reset">原序</button>
        <div class="speed-row">
          <span>速度</span>
          <input type="range" id="imm-speed" min="0.5" max="2" step="0.1" value="1">
          <span id="imm-speed-val">1.0x</span>
        </div>
      </div>
    </div>
    <div class="immersive-area">
      <div class="imm-wrapper" id="imm-wrapper">
        <div class="imm-face imm-front">
          <div class="imm-char" id="imm-char"></div>
        </div>
        <div class="imm-face imm-back">
          <img id="imm-img" src="" alt="">
        </div>
      </div>
    </div>
  </div>

  <script>
function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
${buildFlashcardScript(cardsJSON, lang)}
  </script>
</body>
</html>`;
}

// ── 生成按鈕 ──────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (state.cards.length === 0) return;

  generateBtn.disabled    = true;
  generateBtn.textContent = '⏳ 生成中...';

  try {
    const title = document.getElementById('fc-title').value.trim() || '我的閃卡';
    const lang  = document.getElementById('fc-tts-lang').value;
    const html  = assembleFlashcardHTML(state.cards, title, lang, state.type);

    const filename = title.replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';
    downloadHTML(html, filename);

  } catch (err) {
    alert(`生成失敗：${err.message}`);
    console.error('[flashcard] generate error:', err);
  } finally {
    generateBtn.disabled    = false;
    generateBtn.textContent = '生成並下載閃卡 HTML';
  }
});

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

