# 電子書 + TTS 功能設計文件

## 概述

在現有 NBLM 簡報生成助手中新增「電子書生成工具」，讓使用者上傳 PDF（NotebookLM 產出的簡報）和選填 YAML，在瀏覽器端生成一個自給自足的 HTML 電子書，內含翻頁動畫與 TTS 語音功能。

---

## 決策記錄

| 項目 | 決定 | 理由 |
|------|------|------|
| PDF 轉圖 | 前端 PDF.js | 後端無 PDF 處理能力，純靜態伺服器 |
| 翻頁動畫庫 | StPageFlip（page-flip） | MIT 授權、44KB、原生圖片支援、無依賴 |
| 函式庫注入方式 | inline 進輸出 HTML | 真正自給自足，完全離線可用 |
| TTS 來源 | Web Speech API（可插拔） | 免費、無 API Key、架構設計成可未來替換 |
| TTS 文字來源 | 自動從投影片 title+subtitle+body 組合，可手動修改 | 最自然的整合 |
| 翻頁觸發音訊 | 使用者可切換（自動/手動） | 使用情境不同需要彈性 |
| 輸出格式 | 單一 HTML 檔案（圖片 base64 內嵌） | 可攜帶、可嵌入 Notion/外部平台 |
| Notion 嵌入 | 使用者下載後自行上傳 GitHub Pages/CDN | 後端零負擔 |
| 後端改動 | 無 | 現有純靜態伺服器不需修改 |

---

## 架構

```
nblm-gem/
├── public/
│   ├── index.html              # 現有主頁面（加入電子書工具連結）
│   ├── ebook.html              # 新增：電子書生成工具頁面
│   ├── js/
│   │   ├── ...（現有 JS 不動）
│   │   ├── page-flip.browser.js    # 新增：StPageFlip bundle（下載自 npm）
│   │   └── ebook-generator.js      # 新增：電子書生成主邏輯
│   └── css/
│       └── styles.css              # 現有樣式（ebook 工具共用暗色主題）
```

---

## 電子書生成工具（ebook.html）

### 使用者流程

```
1. 上傳 PDF
       ↓
   PDF.js 在瀏覽器渲染每頁 → Canvas → base64 PNG
   顯示縮圖預覽
       ↓
2. 上傳 YAML（選填）
       ↓
   js-yaml（CDN）解析 slides 陣列
   自動填入每頁 TTS 文字：title + subtitle + content/body
       ↓
3. 使用者可逐頁手動修改 TTS 文字
       ↓
4. 設定選項
   - 書名
   - 自動播放語音（翻頁後自動朗讀）/ 手動觸發
   - 語音語言（zh-TW / en-US / 其他）
       ↓
5. 點擊「生成電子書」
       ↓
   組裝 HTML 字串並下載
```

### TTS 文字自動對應規則

從 YAML 的 slides 陣列，按 slide_number 順序對應 PDF 頁碼：

```
每頁 TTS 文字 = [title] + [subtitle] + [content/body]
（以空白行分隔，空值跳過）
```

---

## 輸出 HTML 結構

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>{{書名}}</title>
  <style>
    /* 翻頁器容器、控制列、響應式樣式 */
  </style>
</head>
<body>
  <!-- 控制列 -->
  <div id="controls">
    <button id="prev">◀ 上一頁</button>
    <span id="page-info">1 / N</span>
    <button id="next">下一頁 ▶</button>
    <button id="tts-toggle">▶ 朗讀</button>
    <label>
      <input type="checkbox" id="auto-play"> 翻頁自動朗讀
    </label>
  </div>

  <!-- 翻頁書容器 -->
  <div id="book-container">
    <div id="book"></div>
  </div>

  <script>
    /* StPageFlip 完整程式碼 inline（44KB） */
  </script>

  <script>
    /* 電子書資料 */
    const BOOK_DATA = {
      title: "{{書名}}",
      autoPlay: {{true/false}},
      language: "{{zh-TW}}",
      pages: [
        {
          img: "data:image/png;base64,{{base64}}",
          text: "{{每頁 TTS 文字}}"
        },
        // ...
      ]
    };

    /* 翻頁邏輯 + TTS 控制（Web Speech API） */
    /* TTS 後端接口預留：BOOK_DATA.ttsProvider（預設 'webSpeech'） */
  </script>
</body>
</html>
```

---

## TTS 可插拔架構

```javascript
// 統一介面，未來換 TTS 後端只需替換這個物件
const TTS = {
  provider: 'webSpeech', // 未來可換成 'openai' / 'elevenlabs'
  speak(text, lang) {
    if (this.provider === 'webSpeech') {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  },
  stop() {
    speechSynthesis.cancel();
  }
};
```

---

## 主要元件職責（ebook-generator.js）

| 函式 | 職責 |
|------|------|
| `loadPDF(file)` | PDF.js 載入 PDF，逐頁渲染 Canvas → base64 |
| `parseYAML(file)` | js-yaml 解析，萃取每頁 title/subtitle/body |
| `matchPagesToSlides(pages, slides)` | 按頁碼對應圖片與文字 |
| `renderPreview()` | 顯示每頁縮圖 + TTS 文字編輯欄 |
| `assembleHTML(bookData)` | 組裝完整 HTML 字串 |
| `downloadHTML(html, filename)` | 觸發瀏覽器下載 |

---

## 依賴項（僅在生成工具頁面使用，不進入輸出 HTML）

| 函式庫 | 用途 | 載入方式 |
|--------|------|---------|
| PDF.js | PDF 渲染 | CDN（`pdfjs-dist`） |
| js-yaml | YAML 解析 | CDN |

| 函式庫 | 用途 | 載入方式 |
|--------|------|---------|
| StPageFlip | 翻頁動畫 | 下載至 `public/js/page-flip.browser.js`，inline 進輸出 HTML |

---

## Notion 嵌入流程

```
生成並下載 HTML
    ↓
上傳到 GitHub Pages 或任意靜態 CDN
    ↓
取得公開 URL
    ↓
在 Notion 使用 /embed 區塊貼入 URL
```

---

## 超出範圍（YAGNI）

- 電子書管理系統（儲存、列表）
- 多人協作
- 電子書後端儲存
- 非 Web Speech API 的 TTS（留作未來升級）
- PDF 頁面裁切/旋轉功能
