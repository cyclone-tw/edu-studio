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
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = document.getElementById('fc-tts-lang').value;
      _previewBtn = previewBtn;
      previewBtn.textContent = '■ 停止';
      utt.onend = utt.onerror = () => {
        if (_previewBtn === previewBtn) { previewBtn.textContent = '▶ 試聽'; _previewBtn = null; }
      };
      speechSynthesis.speak(utt);
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
  return {
    speak(text) {
      if (!text) return;
      this.stop();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = TTS_LANG;
      const s = document.getElementById(speedId);
      utt.rate = s ? parseFloat(s.value) : 1;
      speechSynthesis.speak(utt);
      return utt;
    },
    stop() { speechSynthesis.cancel(); }
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

// ══════════════════════════════════════════════════════════════════════
// 三合一整合
// ══════════════════════════════════════════════════════════════════════

const comboState = {
  ebook:  { pages: [], texts: [] },
  char:   { pages: [], texts: [] },
  vocab:  { pages: [], texts: [] }
};

// Helper: load PDF into pages array
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

// Helper: parse YAML for texts
function parseYamlTexts(yamlText) {
  const doc = jsyaml.load(yamlText);
  const slidesArr = doc?.slides || doc?.presentation_data?.slides;
  if (!slidesArr || !Array.isArray(slidesArr)) return [];

  return slidesArr.map((slide) => {
    const c = slide.content || {};
    const title = c.title || slide.title || '';
    const keyPoints = Array.isArray(c.key_points)
      ? c.key_points.filter(Boolean).join('\n')
      : (c.key_points || '');
    const body = keyPoints || c.body || slide.body || '';
    return { title, body };
  });
}

// Combo PDF uploads
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

// Init combo uploads
initComboUpload('combo-ebook-pdf',  'combo-ebook-pdf-status',  'ebook', false);
initComboUpload('combo-ebook-yaml', 'combo-ebook-yaml-status', 'ebook', true);
initComboUpload('combo-char-pdf',   'combo-char-pdf-status',   'char',  false);
initComboUpload('combo-char-yaml',  'combo-char-yaml-status',  'char',  true);
initComboUpload('combo-vocab-pdf',  'combo-vocab-pdf-status',  'vocab', false);
initComboUpload('combo-vocab-yaml', 'combo-vocab-yaml-status', 'vocab', true);

// ── 三合一 HTML 組裝（含三種模式）────────────────────────────────────
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
    setTimeout(()=>quizTTS.speak(CARDS[qOrder[qCur]].frontText),400);
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

  // Immersive
  const immTTS=makeTTS(P+'-imm-speed');
  initSpeedSlider(P+'-imm-speed', P+'-imm-speed-val');
  let iOrder=[...ORIG],iIdx=0,iFlip=false;
  const iW=document.getElementById(P+'-imm-wrapper');
  function iShow(idx){
    iIdx=idx;iFlip=false;iW.classList.remove('flipped');
    const c=CARDS[iOrder[idx]];
    document.getElementById(P+'-imm-char').textContent=c.frontText;
    document.getElementById(P+'-imm-img').src=c.img;
    document.getElementById(P+'-imm-info').textContent=(idx+1)+' / '+iOrder.length;
    immTTS.stop();
  }
  function iFlipFn(){
    iFlip=!iFlip;iW.classList.toggle('flipped',iFlip);
  }
  iW?.addEventListener('click',iFlipFn);
  document.getElementById(P+'-imm-prev')?.addEventListener('click',()=>{immTTS.stop();if(iIdx>0)iShow(iIdx-1);});
  document.getElementById(P+'-imm-next')?.addEventListener('click',()=>{immTTS.stop();if(iIdx<iOrder.length-1)iShow(iIdx+1);});
  document.getElementById(P+'-imm-tts')?.addEventListener('click',()=>{const c=CARDS[iOrder[iIdx]];if(iFlip){immTTS.speak(c.ttsText||(c.frontText+'\\n'+c.backText));}else{immTTS.speak(c.frontText);}});
  document.getElementById(P+'-imm-shuffle')?.addEventListener('click',()=>{iOrder=fisherYates(iOrder);iShow(0);});
  document.getElementById(P+'-imm-reset')?.addEventListener('click',()=>{iOrder=[...ORIG];iShow(0);});
  if(CARDS.length>0)iShow(0);
})();
`;
}

function assembleComboHTML(comboData, title, lang) {
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

  // Build flashcard data — front=text, back=image
  const charCards = comboData.char.pages.map((img, i) => {
    const t = comboData.char.texts[i] || { title: '', body: '' };
    return { img, frontText: t.title, backText: t.body, ttsText: t.title + (t.body ? '\n' + t.body : '') };
  });

  const vocabCards = comboData.vocab.pages.map((img, i) => {
    const t = comboData.vocab.texts[i] || { title: '', body: '' };
    return { img, frontText: t.title, backText: t.body, ttsText: t.title + (t.body ? '\n' + t.body : '') };
  });

  const hasEbook = ebookPages.length > 0;
  const hasChar  = charCards.length > 0;
  const hasVocab = vocabCards.length > 0;

  const tabs = [];
  if (hasEbook) tabs.push({ id: 'ebook', label: '電子書' });
  if (hasChar)  tabs.push({ id: 'char',  label: '生字閃卡' });
  if (hasVocab) tabs.push({ id: 'vocab', label: '語詞閃卡' });

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
      padding: 0.45rem 0.75rem;
    }
    .ebook-ctrl .controls {
      display: flex; align-items: center; gap: 0.45rem; justify-content: center; flex-wrap: wrap;
    }
    .ebook-area {
      flex: 1; overflow: hidden;
      display: flex; justify-content: center; align-items: center;
    }
    .ebook-area img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .tts-bar { font-size: 0.78rem; color: #a0a0b0; text-align: center; padding: 0.2rem 0.5rem; }

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
        <div class="speed-row"><span>速度</span><input type="range" id="eb-speed" min="0.5" max="2" step="0.1" value="1"><span id="eb-speed-val">1.0x</span></div>
      </div>
      <div class="tts-bar" id="eb-tts-bar">—</div>
    </div>
    <div class="ebook-area"><img id="eb-img" src="" alt=""></div>
  </div>` : ''}

  ${hasChar ? buildFlashcardSection('ch', charCards, '生字閃卡', !hasEbook && tabs[0]?.id === 'char') : ''}
  ${hasVocab ? buildFlashcardSection('vc', vocabCards, '語詞閃卡', !hasEbook && !hasChar && tabs[0]?.id === 'vocab') : ''}

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
  });
});

function makeTTS(speedId) {
  return {
    speak(text) {
      if (!text) return;
      this.stop();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = TTS_LANG;
      const s = document.getElementById(speedId);
      utt.rate = s ? parseFloat(s.value) : 1;
      speechSynthesis.speak(utt);
    },
    stop() { speechSynthesis.cancel(); }
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
const eb_tts = makeTTS('eb-speed');
initSpeedSlider('eb-speed', 'eb-speed-val');

function eb_show(idx) {
  eb_idx = idx;
  eb_tts.stop();
  document.getElementById('eb-img').src = ebook_PAGES[idx].img;
  document.getElementById('eb-info').textContent = (idx+1) + ' / ' + ebook_PAGES.length;
  const t = ebook_PAGES[idx];
  document.getElementById('eb-tts-bar').textContent = [t.textTitle, t.textBody].filter(Boolean).join('。') || '—';
}
document.getElementById('eb-prev').addEventListener('click', () => { if(eb_idx>0) eb_show(eb_idx-1); });
document.getElementById('eb-next').addEventListener('click', () => { if(eb_idx<ebook_PAGES.length-1) eb_show(eb_idx+1); });
document.getElementById('eb-tts').addEventListener('click', () => {
  const t = ebook_PAGES[eb_idx];
  eb_tts.speak([t.textTitle, t.textBody].filter(Boolean).join('。'));
});
eb_show(0);
` : ''}

${hasChar ? buildFlashcardSectionScript('ch', JSON.stringify(charCards)) : ''}
${hasVocab ? buildFlashcardSectionScript('vc', JSON.stringify(vocabCards)) : ''}

// ── Keyboard (active panel) ──
document.addEventListener('keydown', (e) => {
  const active = document.querySelector('.tab-panel.active');
  if (!active) return;
  const id = active.id;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-next')?.click();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-prev')?.click();
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (id === 'panel-ebook') document.getElementById('eb-tts')?.click();
  }
});
  </script>
</body>
</html>`;
}

// ── 三合一生成按鈕 ───────────────────────────────────────────────────
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
    const html = assembleComboHTML(comboState, title, lang);
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
