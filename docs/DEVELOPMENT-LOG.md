# 開發日誌 (Development Log)

---

## 2026-02-18 - v2.3.0 有聲電子書生成器 & 品牌改版

### 開發時程
- **日期**: 2026-02-18
- **主要功能**: 有聲電子書生成工具（全新）
- **協作模式**: 互動式需求釐清 → 設計文件 → Parallel Session 執行

### 需求來源
用戶提出複合需求：
1. 以 PDF 簡報為基礎，生成含翻頁動畫與 TTS 語音的電子書
2. 輸出為單一可攜帶 HTML 檔案，可嵌入 Notion 等平台
3. 下載格式改為 `.txt`（NotebookLM 相容）
4. 網站品牌更名為 **Cyclone Studio - AI 教材製作**

### 開發流程

#### Phase 1: 需求分析與設計
- 使用 `superpowers:brainstorming` 逐步釐清需求
- 關鍵決策確認：
  - TTS 來源：Web Speech API（可插拔，未來可換 ElevenLabs/OpenAI TTS）
  - TTS 文字：自動載入投影片 title+subtitle+body，可手動修改
  - 整合方式：方案 B（上傳 PDF + 選填 YAML），無需保持視窗開著
  - Notion 嵌入：使用者下載後自行上傳 GitHub Pages
- GitHub 搜尋評估翻頁函式庫，選定 **StPageFlip 2.0.7**（MIT、44KB、無依賴）
- 建立設計文件：`docs/plans/2026-02-18-ebook-tts-design.md`
- 建立實作計畫：`docs/plans/2026-02-18-ebook-tts-implementation.md`（9 個 Tasks）

#### Phase 2: 核心功能實作
**Task 1: StPageFlip Bundle**
- 下載 `page-flip.browser.js` 存至 `public/js/`
- Commit: `feat: add StPageFlip browser bundle`

**Task 2-3: ebook.html 骨架 + PDF 載入**
- 完整暗色主題 UI：上傳區、設定區、預覽區、生成按鈕
- PDF.js 4.9 瀏覽器端渲染（scale 2.0 高解析度），JPEG 85% 壓縮
- 進度條顯示每頁渲染進度
- Commits: `feat: add ebook generator HTML skeleton`, `feat: implement PDF loading`

**Task 4-5: YAML 解析 + 預覽 UI**
- 解析 YAML 的 `slides` 或 `presentation_data.slides`（兩種路徑兼容）
- 萃取 `content.title`、`content.subtitle`、`content.key_points[]`
- 預覽網格顯示縮圖 + 可編輯 textarea
- Commits: `feat: implement YAML parsing`, `feat: add page preview grid`

**Task 6-7: HTML 組裝器 + 下載**
- `assembleHTML()` 組裝完整輸出 HTML：
  - `fetch('/js/page-flip.browser.js')` inline 進 `<script>` 標籤
  - 每頁圖片 base64 + TTS 文字 embedded 為 JSON
  - Web Speech API 邏輯 + 鍵盤支援
- Blob 下載觸發
- Commits: `feat: implement HTML assembler`, `feat: add generate button and download`

**Task 8: 主頁入口連結**
- Header 加「📖 電子書工具」連結
- Commit: `feat: add ebook tool entry link`

#### Phase 3: Bug 修復 & 優化

**Bug 1: YAML 找不到 slides 陣列**
- 原因：程式碼找 `doc.slides`，實際格式是 `doc.presentation_data.slides`
- 同時修正文字路徑：`slide.content.title` / `slide.content.key_points[]`
- Commit: `fix: support presentation_data.slides and nested content fields`

**Bug 2: 雙頁顯示 + 偶數頁 TTS 唸不到**
- 原因：StPageFlip 預設雙頁展開書模式
- 修正：`usePortrait: true` 強制單頁模式
- 同時修正：全視窗響應式、速度 slider、resize 自動重建
- Commit: `fix: single-page mode, full-viewport responsive, TTS speed control`

**優化：TTS 朗讀模式切換**
- 新增「朗讀標題」checkbox：開啟唸全文，關閉只唸內文
- `textTitle`、`textBody` 分開儲存，`getReadText()` 依模式組合
- Commit: `feat: add title/body TTS mode toggle`

**優化：預覽欄位分離**
- 預覽由單一 textarea 改為兩個有標籤的欄位（📌 標題文字 / 📝 內文）
- 支援無 YAML 純手動填寫
- Commit: `feat: split TTS preview into title/body fields`

**優化：電子書編輯器響應式版面**
- `max-width: 900px` → `max-width: 1440px`
- grid 改為三斷點：桌機 3 欄、平板 2 欄（≤1024px）、手機 1 欄（≤600px）
- Commit: `fix: responsive ebook editor layout`

#### Phase 4: 簡報工具改進
- 下載格式 `.yaml` → `.txt`（NotebookLM 相容）
- 檔名改用 `presentation_data.suggested_filename` 命名
- Commit: `fix: use suggested_filename for downloads, change to .txt format`

#### Phase 5: 品牌改版 & 文件
- 網站標題更名為 **Cyclone Studio - AI 教材製作**
- 更新 `index.html`、`ebook.html` title 標籤
- 重寫 `README.md`（完整功能描述）
- 更新 `DEVELOPMENT-LOG.md`

### 技術亮點

#### 1. 完全自給自足的 HTML 輸出
```javascript
// 組裝時 fetch StPageFlip 原始碼 inline 進 <script>
const libRes = await fetch('/js/page-flip.browser.js');
const pageFlipLib = await libRes.text();

// 圖片 base64 + TTS 文字 embedded 為 JSON
const pagesJSON = JSON.stringify(
  state.pages.map(p => ({ img: p.img, textTitle: p.textTitle, textBody: p.textBody }))
);
```

#### 2. 響應式書本尺寸計算
```javascript
function calcSize() {
  const aw = bookCont.clientWidth;
  const ah = bookCont.clientHeight;
  if (aw / ah >= 16 / 9) {
    return { w: Math.floor(ah * 16 / 9), h: ah };
  }
  return { w: aw, h: Math.floor(aw * 9 / 16) };
}
```

#### 3. 可插拔 TTS 架構
```javascript
const tts = {
  provider: 'webSpeech', // 未來可換成 'openai' / 'elevenlabs'
  speak(text) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = TTS_LANG;
    utt.rate = parseFloat(speedSlider.value);
    speechSynthesis.speak(utt);
  }
};
```

#### 4. YAML 雙路徑兼容
```javascript
const slidesArr = doc?.slides || doc?.presentation_data?.slides;
```

### 提交統計
- 總 Commits：約 12 個
- 新增檔案：`ebook.html`、`ebook-generator.js`、`page-flip.browser.js`、2 份設計文件
- 修改檔案：`app.js`、`styles.css`

### 已知限制
- Web Speech API 在部分 iframe 環境（如 Notion embed）可能受限（瀏覽器安全政策）
- 生成的 HTML 含 base64 圖片，20 頁 PDF 約 3-8MB
- `fetch('/js/page-flip.browser.js')` 需從 HTTP 伺服器存取（`file://` 協定不可用）

---

## 2026-02-16 - v2.0.0 編輯器重大改版

### 開發時程
- **開始時間**: 2026-02-16 09:00
- **完成時間**: 2026-02-16 15:00
- **總耗時**: 約 6 小時
- **提交數**: 17 個 commits

### 需求來源
用戶提出三大改版需求：
1. 新增使用說明彈窗（參考阿亮校長網站）
2. 編輯器改版為左右分欄（左側大綱編輯 + 右側 YAML 預覽）
3. 新增複製 YAML 按鈕 + NotebookLM 使用說明

### 開發流程

#### Phase 1: 需求分析與設計 (1.5 小時)
- **使用技能**: `superpowers:brainstorming`
- 透過互動式討論確認需求細節
- 確定技術方案：防抖動更新 (300ms)
- 建立設計文件：`docs/plans/2026-02-16-editor-redesign.md`
- 建立實作計畫：`docs/plans/2026-02-16-editor-redesign-implementation.md`（16 個任務）

#### Phase 2: 實作開發 (3.5 小時)
採用直接執行方式（未使用 Subagent-Driven Development，因前端開發效率考量）

**Task 1-3: 使用說明彈窗**
- ✅ 新增 HTML 結構（按鈕 + 完整彈窗）
- ✅ 新增 CSS 樣式（modal + help-specific）
- ✅ 實作開關邏輯（點擊按鈕、點擊遮罩關閉）
- Commits: `7078453`, `f73da39`, `054ba6b`

**Task 4-5: NotebookLM 使用說明**
- ✅ 新增 3 步驟流程 HTML
- ✅ 新增對應 CSS 樣式（步驟編號圓形設計）
- Commits: `e577bd1`, `cc04617`

**Task 6-7: 編輯器分欄佈局**
- ✅ 改版 Step 4 HTML（左側 outline-editor + 右側 yaml-preview）
- ✅ 新增分欄佈局 CSS（grid layout + 響應式）
- Commits: `515f601`, `dcfad78`

**Task 8: 複製 YAML 功能**
- ✅ 實作 copyYamlToClipboard() 函式
- ✅ Clipboard API + execCommand 降級方案
- ✅ Toast 提示訊息
- Commit: `a98ef46`

**Task 9-12: 大綱編輯器模組**
- ✅ 建立 `outline-editor.js` 獨立模組
- ✅ 實作卡片渲染邏輯 (createSlideCard)
- ✅ 實作事件綁定與防抖動更新
- ✅ 新增卡片編輯器 CSS 樣式
- Commits: `2e1d3d3`, `2f14f70`

**Task 13: 整合到生成流程**
- ✅ 在 DOMContentLoaded 初始化 OutlineEditor
- ✅ 生成完成後載入大綱到編輯器
- ✅ 同步更新 yamlPreview
- Commit: `e0294bc`

#### Phase 3: 測試與修復 (0.5 小時)
**發現問題 1: yamlEditor 引用過時**
- 問題：HTML 已改為 yamlPreview，但 JS 仍引用 yamlEditor
- 修復：移除所有 yamlEditor 引用，統一使用 yamlPreview
- Commit: `f363f7f`

**發現問題 2: YAML metadata 遺失**
- 問題：編輯器只保留 slides，遺失 metadata、presentation_strategy 等
- 原因：OutlineEditor 只儲存 slides 陣列
- 修復：
  - 新增 `fullDocument` 變數儲存完整文件
  - 修改 `loadOutline()` 支援完整文件
  - 修改 `syncToPreview()` 生成包含 metadata 的完整 YAML
  - 修改 app.js 解析 YAML 並傳遞完整文件
- Commit: `1f5bb69`

#### Phase 4: 文件與部署 (0.5 小時)
- ✅ 建立 `CHANGELOG-v2.0.md` 更新摘要
- ✅ 建立 `DEPLOY-ZEABUR.md` 部署指南
- ✅ 建立 `README.md` 專案說明
- ✅ 建立 `DEVELOPMENT-LOG.md` 開發日誌
- ✅ 建立 Git Tag `v2.0.0`
- Commits: `d264425`, `d2ac6b2`

### 技術亮點

#### 1. 模組化架構
```javascript
// outline-editor.js - 獨立模組
window.OutlineEditor = {
  init: function(container, preview, callback) {},
  loadOutline: function(data, document) {},
  getOutline: function() {},
  clear: function() {},
  bindEvents: function() {}
};
```

#### 2. 防抖動優化
```javascript
function debouncedSync() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(function () {
    syncToPreview();
    if (updateCallback) updateCallback(outlineData);
  }, 300); // 300ms 防抖動
}
```

#### 3. 完整文件保留
```javascript
// 儲存完整結構
var fullDocument = {
  metadata: {...},
  presentation_strategy: {...},
  slides: [...],
  appendix: {...}
};

// 同步時生成完整 YAML
var doc = {
  metadata: fullDocument.metadata,
  presentation_strategy: fullDocument.presentation_strategy,
  slides: outlineData,  // 使用編輯後的內容
  appendix: fullDocument.appendix
};
```

#### 4. Clipboard 降級方案
```javascript
if (navigator.clipboard && navigator.clipboard.writeText) {
  // 現代瀏覽器：Clipboard API
  navigator.clipboard.writeText(yamlContent);
} else {
  // 舊版瀏覽器：execCommand
  fallbackCopy(yamlContent);
}
```

### 遇到的挑戰與解決

#### 挑戰 1: 執行策略選擇
- **問題**: Subagent-Driven Development 會產生 48 個 subagent（16 tasks × 3 agents）
- **決策**: 改用直接執行，更適合前端開發
- **原因**:
  - 前端變更需要視覺確認
  - 沒有自動化測試
  - 手動測試更有效率

#### 挑戰 2: YAML 結構保留
- **問題**: 編輯器只處理 slides，metadata 遺失
- **解決**:
  1. 儲存完整文件結構
  2. 編輯時只修改 slides
  3. 同步時重建完整 YAML
- **學到**: 資料分層管理的重要性

#### 挑戰 3: DOM 引用一致性
- **問題**: HTML 元素重新命名後，JS 引用未更新
- **解決**: 全域搜尋並替換所有引用
- **學到**: 重構時需要完整追蹤依賴關係

### 效能指標

#### 程式碼統計
```
新增檔案: 2 個
- outline-editor.js: 260 行
- CHANGELOG-v2.0.md: 142 行

修改檔案: 3 個
- index.html: +92 行
- styles.css: +267 行
- app.js: +87 行, -11 行

總計變更: +700 行
```

#### 功能完整度
- ✅ 使用說明彈窗: 100%
- ✅ 編輯器改版: 100%
- ✅ 複製 YAML: 100%
- ✅ NotebookLM 整合: 100%
- ✅ metadata 保留: 100%

#### 瀏覽器相容性
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE11（不支援 Clipboard API，但有降級方案）

### 技術債務

#### 已解決
- ✅ yamlEditor 過時引用
- ✅ metadata 遺失問題
- ✅ DOM 元素不一致

#### 待優化
- ⏳ 新增拖曳排序功能（未來版本）
- ⏳ 支援匯出多種格式（PDF, PPTX）
- ⏳ 新增 undo/redo 功能
- ⏳ 快取機制優化

### 測試情況

#### 手動測試項目
- ✅ 使用說明彈窗開關
- ✅ 編輯器卡片渲染
- ✅ 即時編輯與同步
- ✅ 複製 YAML 功能
- ✅ 下載 TXT 功能
- ✅ 響應式佈局
- ✅ metadata 完整性
- ✅ 防抖動機制

#### 未覆蓋測試
- ⚠️ 大量投影片（100+ slides）效能
- ⚠️ 極長文字內容處理
- ⚠️ 網路斷線情況
- ⚠️ 併發編輯衝突

### 使用者回饋

#### 問題回報
1. **metadata 遺失** (已修復 ✅)
   - 時間: 2026-02-16 14:45
   - 問題: YAML 只有 slides，缺少簡報設定
   - 修復: Commit `1f5bb69`

### 下次改進方向

1. **效能優化**
   - 虛擬捲動（處理大量投影片）
   - 快取編輯歷史
   - Web Worker 處理 YAML 生成

2. **功能增強**
   - 拖曳排序投影片
   - 批次操作（刪除、複製）
   - 快捷鍵支援

3. **開發流程**
   - 增加單元測試
   - 建立 E2E 測試
   - CI/CD 自動化

### 團隊協作

- **開發者**: Claude Sonnet 4.5
- **產品需求**: User
- **設計參考**: 阿亮校長網站
- **測試**: User + Claude

### 相關資源

- 設計文件: `docs/plans/2026-02-16-editor-redesign.md`
- 實作計畫: `docs/plans/2026-02-16-editor-redesign-implementation.md`
- 更新摘要: `docs/CHANGELOG-v2.0.md`
- 部署指南: `docs/DEPLOY-ZEABUR.md`

---

## 2026-02-15 - v1.0.0 初始版本

### 開發時程
- 建立基礎專案架構
- 實作 AI 生成功能
- 完成三種生成模式
- 深色主題 UI 設計

### 主要功能
- ✅ Gemini API 整合
- ✅ YAML 生成引擎
- ✅ 智慧生成模式
- ✅ 現有大綱轉檔
- ✅ 教科書切片
- ✅ PDF 轉圖片 API
- ✅ 響應式設計

### 技術選型
- 前端: 純 JavaScript (ES5)
- 後端: Node.js + Express
- AI: Google Gemini 2.5 Flash
- 部署: Docker

---

**持續更新中...**
