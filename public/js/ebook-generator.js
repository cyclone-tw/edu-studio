// ebook-generator.js — 電子書生成工具主邏輯
// 使用 ES Module 語法（ebook.html 以 type="module" 載入）

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

// ── 狀態 ──────────────────────────────────────────────────────────────
const state = {
  pages: [],      // [{ img, textTitle(標題+副標), textBody(純內文) }]
  slideTexts: [], // [{ title: '標題+副標', body: '純內文' }]
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

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      const st = state.slideTexts[i - 1] || { title: '', body: '' };

      state.pages.push({ img: base64, textTitle: st.title, textBody: st.body });

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

      const body = keyPoints || c.body || slide.body || '';
      const titleParts = [
        c.title    || slide.title,
        c.subtitle || slide.subtitle,
      ].filter(p => p && typeof p === 'string');
      const title = titleParts.join('。');

      return { title, body };
    });

    yamlStatus.textContent = `✓ 已載入 ${state.slideTexts.length} 頁文字`;
    yamlStatus.className = 'upload-status success';

    // 若 PDF 已載入，更新每頁文字（不覆蓋手動編輯過的內容）
    if (state.pages.length > 0) {
      state.pages.forEach((page, i) => {
        const st = state.slideTexts[i] || { title: '', body: '' };
        if (!page.textTitle) page.textTitle = st.title;
        if (!page.textBody)  page.textBody  = st.body;
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
function makeField(label, value, placeholder, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'page-field';

  const lbl = document.createElement('div');
  lbl.className = 'page-field-label';
  lbl.textContent = label;

  const ta = document.createElement('textarea');
  ta.className = 'page-text-input';
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

  state.pages.forEach((page, i) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    const img = document.createElement('img');
    img.className = 'page-thumbnail';
    img.src = page.img;
    img.alt = `第 ${i + 1} 頁`;

    const cardBody = document.createElement('div');
    cardBody.className = 'page-card-body';

    const num = document.createElement('div');
    num.className = 'page-num';
    num.textContent = `第 ${i + 1} 頁`;

    const titleField = makeField(
      '📌 標題文字',
      page.textTitle,
      '（選填）此頁標題，開啟「朗讀標題」時會唸',
      (v) => { state.pages[i].textTitle = v; }
    );

    const bodyField = makeField(
      '📝 內文',
      page.textBody,
      '此頁內文，關閉「朗讀標題」時只唸這段',
      (v) => { state.pages[i].textBody = v; }
    );

    cardBody.appendChild(num);
    cardBody.appendChild(titleField);
    cardBody.appendChild(bodyField);
    card.appendChild(img);
    card.appendChild(cardBody);
    previewGrid.appendChild(card);
  });
}

// ── 多音字解析 ────────────────────────────────────────────────────────
// 語法：不（布）→ display="不", tts="布"（1:1 字元映射）
function parsePolyphonic(rawText) {
  const POLY_RE = /(.)\uff08(.)\uff09/g;
  const display = rawText.replace(POLY_RE, (_, shown) => shown);
  const tts     = rawText.replace(POLY_RE, (_, _shown, reading) => reading);
  return { display, tts };
}

// ── 注音符號轉換 ──────────────────────────────────────────────────────
const TONE_REPLACE = {
  'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],
  'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],
  'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],
  'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],
  'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],
  'ǖ':['v',1],'ǘ':['v',2],'ǚ':['v',3],'ǜ':['v',4],
};
// 注音聲調：index [0]=2nd ˊ [1]=3rd ˇ [2]=4th ˋ [3]=neutral ˙
const BPMF_TONE = ['ˊ','ˇ','ˋ','˙'];

const PINYIN_TO_BPMF = {
  // 零聲母
  'a':'ㄚ','o':'ㄛ','e':'ㄜ','ai':'ㄞ','ei':'ㄟ','ao':'ㄠ','ou':'ㄡ',
  'an':'ㄢ','en':'ㄣ','ang':'ㄤ','eng':'ㄥ','er':'ㄦ',
  // b
  'ba':'ㄅㄚ','bo':'ㄅㄛ','bai':'ㄅㄞ','bei':'ㄅㄟ','bao':'ㄅㄠ',
  'ban':'ㄅㄢ','ben':'ㄅㄣ','bang':'ㄅㄤ','beng':'ㄅㄥ',
  'bi':'ㄅㄧ','bie':'ㄅㄧㄝ','biao':'ㄅㄧㄠ','bian':'ㄅㄧㄢ',
  'bin':'ㄅㄧㄣ','bing':'ㄅㄧㄥ','bu':'ㄅㄨ',
  // p
  'pa':'ㄆㄚ','po':'ㄆㄛ','pai':'ㄆㄞ','pei':'ㄆㄟ','pao':'ㄆㄠ','pou':'ㄆㄡ',
  'pan':'ㄆㄢ','pen':'ㄆㄣ','pang':'ㄆㄤ','peng':'ㄆㄥ',
  'pi':'ㄆㄧ','pie':'ㄆㄧㄝ','piao':'ㄆㄧㄠ','pian':'ㄆㄧㄢ',
  'pin':'ㄆㄧㄣ','ping':'ㄆㄧㄥ','pu':'ㄆㄨ',
  // m
  'ma':'ㄇㄚ','mo':'ㄇㄛ','me':'ㄇㄜ','mai':'ㄇㄞ','mei':'ㄇㄟ','mao':'ㄇㄠ','mou':'ㄇㄡ',
  'man':'ㄇㄢ','men':'ㄇㄣ','mang':'ㄇㄤ','meng':'ㄇㄥ',
  'mi':'ㄇㄧ','mie':'ㄇㄧㄝ','miao':'ㄇㄧㄠ','miu':'ㄇㄧㄡ','mian':'ㄇㄧㄢ',
  'min':'ㄇㄧㄣ','ming':'ㄇㄧㄥ','mu':'ㄇㄨ',
  // f
  'fa':'ㄈㄚ','fo':'ㄈㄛ','fei':'ㄈㄟ','fou':'ㄈㄡ','fan':'ㄈㄢ','fen':'ㄈㄣ',
  'fang':'ㄈㄤ','feng':'ㄈㄥ','fu':'ㄈㄨ',
  // d
  'da':'ㄉㄚ','de':'ㄉㄜ','dai':'ㄉㄞ','dei':'ㄉㄟ','dao':'ㄉㄠ','dou':'ㄉㄡ',
  'dan':'ㄉㄢ','den':'ㄉㄣ','dang':'ㄉㄤ','deng':'ㄉㄥ',
  'di':'ㄉㄧ','die':'ㄉㄧㄝ','diao':'ㄉㄧㄠ','diu':'ㄉㄧㄡ','dian':'ㄉㄧㄢ','ding':'ㄉㄧㄥ',
  'du':'ㄉㄨ','dua':'ㄉㄨㄚ','duo':'ㄉㄨㄛ','dui':'ㄉㄨㄟ','duan':'ㄉㄨㄢ','dun':'ㄉㄨㄣ','dong':'ㄉㄨㄥ',
  // t
  'ta':'ㄊㄚ','te':'ㄊㄜ','tai':'ㄊㄞ','tao':'ㄊㄠ','tou':'ㄊㄡ',
  'tan':'ㄊㄢ','tang':'ㄊㄤ','teng':'ㄊㄥ',
  'ti':'ㄊㄧ','tie':'ㄊㄧㄝ','tiao':'ㄊㄧㄠ','tian':'ㄊㄧㄢ','ting':'ㄊㄧㄥ',
  'tu':'ㄊㄨ','tuo':'ㄊㄨㄛ','tui':'ㄊㄨㄟ','tuan':'ㄊㄨㄢ','tun':'ㄊㄨㄣ','tong':'ㄊㄨㄥ',
  // n
  'na':'ㄋㄚ','ne':'ㄋㄜ','nai':'ㄋㄞ','nei':'ㄋㄟ','nao':'ㄋㄠ','nou':'ㄋㄡ',
  'nan':'ㄋㄢ','nen':'ㄋㄣ','nang':'ㄋㄤ','neng':'ㄋㄥ',
  'ni':'ㄋㄧ','nie':'ㄋㄧㄝ','niao':'ㄋㄧㄠ','niu':'ㄋㄧㄡ','nian':'ㄋㄧㄢ',
  'nin':'ㄋㄧㄣ','niang':'ㄋㄧㄤ','ning':'ㄋㄧㄥ',
  'nu':'ㄋㄨ','nuo':'ㄋㄨㄛ','nuan':'ㄋㄨㄢ','nong':'ㄋㄨㄥ',
  'nv':'ㄋㄩ','nve':'ㄋㄩㄝ',
  // l
  'la':'ㄌㄚ','lo':'ㄌㄛ','le':'ㄌㄜ','lai':'ㄌㄞ','lei':'ㄌㄟ','lao':'ㄌㄠ','lou':'ㄌㄡ',
  'lan':'ㄌㄢ','lang':'ㄌㄤ','leng':'ㄌㄥ',
  'li':'ㄌㄧ','lia':'ㄌㄧㄚ','lie':'ㄌㄧㄝ','liao':'ㄌㄧㄠ','liu':'ㄌㄧㄡ','lian':'ㄌㄧㄢ',
  'lin':'ㄌㄧㄣ','liang':'ㄌㄧㄤ','ling':'ㄌㄧㄥ',
  'lu':'ㄌㄨ','luo':'ㄌㄨㄛ','luan':'ㄌㄨㄢ','lun':'ㄌㄨㄣ','long':'ㄌㄨㄥ',
  'lv':'ㄌㄩ','lve':'ㄌㄩㄝ',
  // g
  'ga':'ㄍㄚ','ge':'ㄍㄜ','gai':'ㄍㄞ','gei':'ㄍㄟ','gao':'ㄍㄠ','gou':'ㄍㄡ',
  'gan':'ㄍㄢ','gen':'ㄍㄣ','gang':'ㄍㄤ','geng':'ㄍㄥ',
  'gu':'ㄍㄨ','gua':'ㄍㄨㄚ','guo':'ㄍㄨㄛ','guai':'ㄍㄨㄞ','gui':'ㄍㄨㄟ',
  'guan':'ㄍㄨㄢ','gun':'ㄍㄨㄣ','guang':'ㄍㄨㄤ','gong':'ㄍㄨㄥ',
  // k
  'ka':'ㄎㄚ','ke':'ㄎㄜ','kai':'ㄎㄞ','kei':'ㄎㄟ','kao':'ㄎㄠ','kou':'ㄎㄡ',
  'kan':'ㄎㄢ','ken':'ㄎㄣ','kang':'ㄎㄤ','keng':'ㄎㄥ',
  'ku':'ㄎㄨ','kua':'ㄎㄨㄚ','kuo':'ㄎㄨㄛ','kuai':'ㄎㄨㄞ','kui':'ㄎㄨㄟ',
  'kuan':'ㄎㄨㄢ','kun':'ㄎㄨㄣ','kuang':'ㄎㄨㄤ','kong':'ㄎㄨㄥ',
  // h
  'ha':'ㄏㄚ','he':'ㄏㄜ','hai':'ㄏㄞ','hei':'ㄏㄟ','hao':'ㄏㄠ','hou':'ㄏㄡ',
  'han':'ㄏㄢ','hen':'ㄏㄣ','hang':'ㄏㄤ','heng':'ㄏㄥ',
  'hu':'ㄏㄨ','hua':'ㄏㄨㄚ','huo':'ㄏㄨㄛ','huai':'ㄏㄨㄞ','hui':'ㄏㄨㄟ',
  'huan':'ㄏㄨㄢ','hun':'ㄏㄨㄣ','huang':'ㄏㄨㄤ','hong':'ㄏㄨㄥ',
  // j
  'ji':'ㄐㄧ','jia':'ㄐㄧㄚ','jie':'ㄐㄧㄝ','jiao':'ㄐㄧㄠ','jiu':'ㄐㄧㄡ','jian':'ㄐㄧㄢ',
  'jin':'ㄐㄧㄣ','jiang':'ㄐㄧㄤ','jing':'ㄐㄧㄥ','jiong':'ㄐㄩㄥ',
  'ju':'ㄐㄩ','jue':'ㄐㄩㄝ','juan':'ㄐㄩㄢ','jun':'ㄐㄩㄣ',
  // q
  'qi':'ㄑㄧ','qia':'ㄑㄧㄚ','qie':'ㄑㄧㄝ','qiao':'ㄑㄧㄠ','qiu':'ㄑㄧㄡ','qian':'ㄑㄧㄢ',
  'qin':'ㄑㄧㄣ','qiang':'ㄑㄧㄤ','qing':'ㄑㄧㄥ','qiong':'ㄑㄩㄥ',
  'qu':'ㄑㄩ','que':'ㄑㄩㄝ','quan':'ㄑㄩㄢ','qun':'ㄑㄩㄣ',
  // x
  'xi':'ㄒㄧ','xia':'ㄒㄧㄚ','xie':'ㄒㄧㄝ','xiao':'ㄒㄧㄠ','xiu':'ㄒㄧㄡ','xian':'ㄒㄧㄢ',
  'xin':'ㄒㄧㄣ','xiang':'ㄒㄧㄤ','xing':'ㄒㄧㄥ','xiong':'ㄒㄩㄥ',
  'xu':'ㄒㄩ','xue':'ㄒㄩㄝ','xuan':'ㄒㄩㄢ','xun':'ㄒㄩㄣ',
  // zh
  'zha':'ㄓㄚ','zhe':'ㄓㄜ','zhi':'ㄓ','zhai':'ㄓㄞ','zhei':'ㄓㄟ','zhao':'ㄓㄠ','zhou':'ㄓㄡ',
  'zhan':'ㄓㄢ','zhen':'ㄓㄣ','zhang':'ㄓㄤ','zheng':'ㄓㄥ',
  'zhu':'ㄓㄨ','zhua':'ㄓㄨㄚ','zhuo':'ㄓㄨㄛ','zhuai':'ㄓㄨㄞ','zhui':'ㄓㄨㄟ',
  'zhuan':'ㄓㄨㄢ','zhun':'ㄓㄨㄣ','zhuang':'ㄓㄨㄤ','zhong':'ㄓㄨㄥ',
  // ch
  'cha':'ㄔㄚ','che':'ㄔㄜ','chi':'ㄔ','chai':'ㄔㄞ','chao':'ㄔㄠ','chou':'ㄔㄡ',
  'chan':'ㄔㄢ','chen':'ㄔㄣ','chang':'ㄔㄤ','cheng':'ㄔㄥ',
  'chu':'ㄔㄨ','chua':'ㄔㄨㄚ','chuo':'ㄔㄨㄛ','chuai':'ㄔㄨㄞ','chui':'ㄔㄨㄟ',
  'chuan':'ㄔㄨㄢ','chun':'ㄔㄨㄣ','chuang':'ㄔㄨㄤ','chong':'ㄔㄨㄥ',
  // sh
  'sha':'ㄕㄚ','she':'ㄕㄜ','shi':'ㄕ','shai':'ㄕㄞ','shei':'ㄕㄟ','shao':'ㄕㄠ','shou':'ㄕㄡ',
  'shan':'ㄕㄢ','shen':'ㄕㄣ','shang':'ㄕㄤ','sheng':'ㄕㄥ',
  'shu':'ㄕㄨ','shua':'ㄕㄨㄚ','shuo':'ㄕㄨㄛ','shuai':'ㄕㄨㄞ','shui':'ㄕㄨㄟ',
  'shuan':'ㄕㄨㄢ','shun':'ㄕㄨㄣ','shuang':'ㄕㄨㄤ',
  // r
  're':'ㄖㄜ','ri':'ㄖ','rao':'ㄖㄠ','rou':'ㄖㄡ',
  'ran':'ㄖㄢ','ren':'ㄖㄣ','rang':'ㄖㄤ','reng':'ㄖㄥ',
  'ru':'ㄖㄨ','ruo':'ㄖㄨㄛ','rui':'ㄖㄨㄟ','ruan':'ㄖㄨㄢ','run':'ㄖㄨㄣ','rong':'ㄖㄨㄥ',
  // z
  'za':'ㄗㄚ','ze':'ㄗㄜ','zi':'ㄗ','zai':'ㄗㄞ','zei':'ㄗㄟ','zao':'ㄗㄠ','zou':'ㄗㄡ',
  'zan':'ㄗㄢ','zen':'ㄗㄣ','zang':'ㄗㄤ','zeng':'ㄗㄥ',
  'zu':'ㄗㄨ','zuo':'ㄗㄨㄛ','zui':'ㄗㄨㄟ','zuan':'ㄗㄨㄢ','zun':'ㄗㄨㄣ','zong':'ㄗㄨㄥ',
  // c
  'ca':'ㄘㄚ','ce':'ㄘㄜ','ci':'ㄘ','cai':'ㄘㄞ','cao':'ㄘㄠ','cou':'ㄘㄡ',
  'can':'ㄘㄢ','cen':'ㄘㄣ','cang':'ㄘㄤ','ceng':'ㄘㄥ',
  'cu':'ㄘㄨ','cuo':'ㄘㄨㄛ','cui':'ㄘㄨㄟ','cuan':'ㄘㄨㄢ','cun':'ㄘㄨㄣ','cong':'ㄘㄨㄥ',
  // s
  'sa':'ㄙㄚ','se':'ㄙㄜ','si':'ㄙ','sai':'ㄙㄞ','sao':'ㄙㄠ','sou':'ㄙㄡ',
  'san':'ㄙㄢ','sen':'ㄙㄣ','sang':'ㄙㄤ','seng':'ㄙㄥ',
  'su':'ㄙㄨ','suo':'ㄙㄨㄛ','sui':'ㄙㄨㄟ','suan':'ㄙㄨㄢ','sun':'ㄙㄨㄣ','song':'ㄙㄨㄥ',
  // y 介音
  'ya':'ㄧㄚ','yo':'ㄧㄛ','ye':'ㄧㄝ','yao':'ㄧㄠ','you':'ㄧㄡ','yan':'ㄧㄢ',
  'yin':'ㄧㄣ','yang':'ㄧㄤ','ying':'ㄧㄥ','yi':'ㄧ',
  'yu':'ㄩ','yue':'ㄩㄝ','yuan':'ㄩㄢ','yun':'ㄩㄣ','yong':'ㄩㄥ',
  // w 介音
  'wa':'ㄨㄚ','wo':'ㄨㄛ','wai':'ㄨㄞ','wei':'ㄨㄟ','wan':'ㄨㄢ','wen':'ㄨㄣ',
  'wang':'ㄨㄤ','weng':'ㄨㄥ','wu':'ㄨ',
};

function pinyinToBopomofo(syllable) {
  if (!syllable) return '';
  let tone = 0;
  let bare = syllable.toLowerCase();
  for (const [diac, [base, num]] of Object.entries(TONE_REPLACE)) {
    if (bare.includes(diac)) {
      bare = bare.replace(diac, base);
      tone = num;
      break;
    }
  }
  bare = bare.replace('ü','v').replace('u:','v');
  const bpmf = PINYIN_TO_BPMF[bare];
  if (!bpmf) return '';
  if (tone === 0 || tone === 1) return bpmf;
  if (tone === 5) return '˙' + bpmf;
  return bpmf + BPMF_TONE[tone - 2];  // 2nd→[0]=ˊ, 3rd→[1]=ˇ, 4th→[2]=ˋ
}

// ── 注音標注 HTML 生成 ─────────────────────────────────────────────────
const PUNCT_RE = /[\u3000-\u303f\uff00-\uffef，。！？、；：「」『』【】《》〈〉…—～·]/;
const CJK_RE   = /[\u4e00-\u9fff\u3400-\u4dbf]/;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildAnnotatedHTML(display, tts, showBpmf) {
  if (!display) return '';
  const bpmfEnabled = showBpmf && typeof pinyinPro !== 'undefined';

  let html = '';
  let ttsIdx = 0;

  for (let i = 0; i < display.length; i++) {
    const ch = display[i];
    const escaped = escHtml(ch);

    if (PUNCT_RE.test(ch)) {
      html += `<span class="p">${escaped}</span>`;
    } else if (CJK_RE.test(ch)) {
      let bpmfHtml = '';
      if (bpmfEnabled) {
        try {
          const ttsChar = (tts && tts[i]) ? tts[i] : ch;
          const syl = pinyinPro.pinyin(ttsChar, { type: 'array', toneType: 'symbol' })[0];
          const bpmf = syl ? pinyinToBopomofo(syl) : '';
          if (bpmf) bpmfHtml = `<span class="bpmf">${escHtml(bpmf)}</span>`;
        } catch (e) { /* skip annotation on error */ }
      }
      html += `<span class="c" data-i="${ttsIdx}">${escaped}${bpmfHtml}</span>`;
    } else {
      if (ch === '\n') { html += '<br>'; }
      else { html += `<span class="c" data-i="${ttsIdx}">${escaped}</span>`; }
    }
    ttsIdx++;
  }
  return html;
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
  const showBpmf = document.getElementById('chk-bpmf').checked;

  const pagesJSON = JSON.stringify(
    state.pages.map((p) => {
      const titlePoly = parsePolyphonic(p.textTitle || '');
      const bodyPoly  = parsePolyphonic(p.textBody  || '');
      return {
        img:       p.img,
        textTitle: p.textTitle || '',
        textBody:  p.textBody  || '',
        ttsTitle:  titlePoly.tts,
        ttsBody:   bodyPoly.tts,
        htmlTitle: buildAnnotatedHTML(titlePoly.display, titlePoly.tts, showBpmf),
        htmlBody:  buildAnnotatedHTML(bodyPoly.display,  bodyPoly.tts,  showBpmf),
      };
    })
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
    /* ── 書本區域 ── */
    #book-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    /* ── 字幕疊層 ── */
    #subtitle {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: rgba(0, 0, 0, 0.70);
      color: #f0f0f0;
      padding: 0.5rem 1.5rem 0.6rem;
      font-size: 1rem;
      line-height: 2.6;
      text-align: center;
      pointer-events: none;
      z-index: 10;
      word-break: break-all;
      min-height: 2.8rem;
    }
    /* ── 注音符號 ── */
    .bpmf {
      writing-mode: vertical-rl;
      font-size: 0.42em;
      line-height: 1.1;
      margin-left: 0.06em;
      margin-bottom: 0.08em;
      vertical-align: middle;
      display: inline-block;
      color: #90caf9;
      user-select: none;
    }
    /* ── 字元 span ── */
    .c { display: inline-flex; flex-direction: row; align-items: flex-end; }
    .p { display: inline; opacity: 0.7; }
    /* ── 即時高亮 ── */
    .c.speaking {
      color: #00d4aa;
      text-shadow: 0 0 8px rgba(0,212,170,0.55);
    }
    .c.speaking .bpmf { color: #00d4aa; }
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
      <label class="auto-label" title="關閉時只朗讀內文，不唸標題">
        <input type="checkbox" id="chk-title" checked>
        朗讀標題
      </label>
    </div>
  </div>

  <div id="book-container">
    <div id="book"></div>
    <div id="subtitle">—</div>
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
const subtitleEl  = document.getElementById('subtitle');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const btnTts      = document.getElementById('btn-tts');
const btnStop     = document.getElementById('btn-stop');
const chkAuto     = document.getElementById('chk-auto');
const chkTitle    = document.getElementById('chk-title');
const speedSlider = document.getElementById('speed-slider');
const speedVal    = document.getElementById('speed-val');

/* ====== 速度滑桿 ====== */
speedSlider.addEventListener('input', () => {
  speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
});

/* ====== TTS (Web Speech API — pluggable) ====== */
const tts = {
  provider: 'webSpeech',
  _spans: null,
  speak(ttsText, subtitleHTML) {
    if (!ttsText) return;
    this.stop();
    subtitleEl.innerHTML = subtitleHTML || ttsText;
    this._spans = subtitleEl.querySelectorAll('.c');
    const utt = new SpeechSynthesisUtterance(ttsText);
    utt.lang = TTS_LANG;
    utt.rate = parseFloat(speedSlider.value);
    utt.onstart = () => { btnStop.style.display=''; btnTts.style.display='none'; };
    utt.onboundary = (ev) => {
      if (ev.name !== 'word' && ev.name !== 'char') return;
      const start = ev.charIndex, end = start + (ev.charLength || 1);
      if (this._spans) this._spans.forEach(el => {
        const i = parseInt(el.dataset.i, 10);
        el.classList.toggle('speaking', i >= start && i < end);
      });
    };
    utt.onend = utt.onerror = () => {
      btnStop.style.display='none'; btnTts.style.display='';
      this._clearHighlight();
    };
    speechSynthesis.speak(utt);
  },
  stop() {
    speechSynthesis.cancel();
    btnStop.style.display = 'none';
    btnTts.style.display  = '';
    this._clearHighlight();
  },
  _clearHighlight() {
    if (this._spans) this._spans.forEach(s => s.classList.remove('speaking'));
    this._spans = null;
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

function getReadData(idx) {
  const p = PAGES[idx];
  if (!p) return { tts: '', html: '' };
  if (chkTitle.checked) {
    const tts  = [p.ttsTitle,  p.ttsBody ].filter(Boolean).join('。');
    const html = [p.htmlTitle, p.htmlBody].filter(Boolean)
      .join('<span class="p">。</span><br>');
    return { tts, html };
  }
  if (p.ttsBody) return { tts: p.ttsBody, html: p.htmlBody };
  return { tts: p.ttsTitle || '', html: p.htmlTitle || '' };
}

function updateUI(idx) {
  pageInfo.textContent = (idx + 1) + ' / ' + PAGES.length;
  const rd = getReadData(idx);
  subtitleEl.innerHTML = rd.html || '<span style="color:#555">（此頁無語音文字）</span>';
  if (chkAuto.checked && rd.tts) tts.speak(rd.tts, rd.html);
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
btnTts.addEventListener('click',  () => { const rd = getReadData(pf.getCurrentPageIndex()); tts.speak(rd.tts, rd.html); });
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
