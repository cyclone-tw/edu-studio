# NBLM 簡報生成助手 - 編輯器改版設計文件

**日期：** 2026-02-16
**版本：** 1.0
**狀態：** 設計確認完成

---

## 📋 改版目標

### 三大核心功能

1. **使用說明彈窗**
   - 提供簡潔步驟式說明
   - 包含 Gemini API Key 申請連結
   - 彈窗設計，不跳轉頁面

2. **編輯器改版（Step 4）**
   - 左側：卡片式簡報大綱編輯器
   - 右側：YAML 即時預覽（唯讀）
   - 左側編輯內容，右側連動更新（防抖動機制）

3. **NotebookLM 整合**
   - 複製 YAML 到剪貼簿按鈕
   - NotebookLM 使用說明與連結

---

## 🎯 設計原則

1. **符合現有設計風格**
   - 使用專案現有的 CSS 變數（深色主題）
   - 保持視覺一致性，不引入突兀的新顏色

2. **對新手友善**
   - 結構化編輯介面，避免直接編輯 YAML
   - 清楚的使用說明和引導

3. **效能優化**
   - 使用防抖動機制（300ms）避免頻繁更新
   - 大型簡報優化（20+ 頁時考慮虛擬滾動）

---

## 🏗️ 整體架構

### 目前架構（改版前）

```
Step 4: 預覽與匯出
  ├─ [左] YAML 編輯器（使用者直接編輯 YAML 文字）
  └─ [右] 簡報預覽（解析 YAML 顯示）
```

### 改版後架構

```
Step 4: 預覽與匯出
  ├─ [上] NotebookLM 使用說明區塊
  │    └─ 三步驟流程圖 + 前往 NotebookLM 連結
  │
  ├─ [左] 簡報大綱編輯器（卡片式）
  │    ├─ 每頁一張卡片
  │    ├─ 可編輯：標題、重點、視覺指示、講稿
  │    └─ 滾動瀏覽所有頁面
  │
  └─ [右] YAML 預覽（唯讀）
       ├─ 標題列：「👀 YAML 預覽」
       ├─ [複製 YAML] 按鈕（右上角）
       └─ YAML 文字顯示區域
```

---

## 📊 資料流設計

### 資料流向

```
使用者輸入（卡片編輯器）
  ↓
更新 JavaScript 資料物件（window.presentationData）
  ↓
觸發 debounce 計時器（300ms）
  ↓
使用 js-yaml.dump() 生成 YAML 字串
  ↓
更新右側 YAML 預覽區
```

### 資料結構

```javascript
window.presentationData = {
  title: "簡報標題",
  presentation_strategy: {
    opening_hook: "...",
    core_message: "...",
    audience_adaptation: "...",
    closing_action: "..."
  },
  slides: [
    {
      slide_number: 1,
      type: "title|content|activity",
      title: "頁面標題",
      subtitle: "副標題（可選）",
      key_points: ["重點1", "重點2", "重點3"],
      visual_direction: "視覺設計指示文字",
      speaker_notes: "完整講稿內容"
    }
    // ... 更多投影片
  ]
}
```

---

## 🎨 UI 元件設計

### 1. 使用說明彈窗

**觸發：** 點擊右上角「📖 使用說明」按鈕

**結構：**
```
[遮罩層（半透明，覆蓋全畫面）]
  └─ [彈窗卡片（最大寬度 900px，居中）]
       ├─ 標題列
       │    ├─ 「📖 使用說明」
       │    └─ [✕] 關閉按鈕
       │
       ├─ 內容區域（可滾動）
       │    ├─ 四步驟流程圖
       │    │    1. 上傳素材 → 2. 生成結構 → 3. 匯入 NBLM → 4. 生成簡報
       │    │
       │    ├─ 設定 API Key 說明
       │    │    - 步驟文字
       │    │    - 🔗 [前往申請 Gemini API Key] 連結
       │    │      (https://aistudio.google.com/apikey)
       │    │
       │    ├─ 三種模式說明
       │    │    - ✨ AI 智慧生成：AI 分析素材並設計架構
       │    │    - 📝 現有大綱轉檔：保留使用者大綱結構
       │    │    - 📚 課文忠實模式：原文一字不改
       │    │
       │    └─ NotebookLM 使用流程
       │         - 下載 TXT 檔案
       │         - 上傳到 NotebookLM
       │         - 生成簡報內容
       │
       └─ 底部按鈕
            └─ [我知道了] 按鈕
```

**關閉方式：**
- 點擊 ✕ 按鈕
- 點擊遮罩層（彈窗外部）
- 點擊「我知道了」按鈕

**樣式：**
- 使用 `var(--bg-surface)` 作為卡片背景
- 遮罩層：`rgba(0, 0, 0, 0.7)`
- 按鈕使用現有的 `.btn` 樣式

---

### 2. 簡報大綱編輯器（左側）

**每張卡片結構：**

```
┌─────────────────────────────────┐
│ SLIDE 1                          │
│ [標題輸入框]                      │
├─────────────────────────────────┤
│ 📌 重點 (Key Points)             │
│ • [輸入框 1]                     │
│ • [輸入框 2]                     │
│ • [輸入框 3]                     │
│ [+ 新增重點] 按鈕                │
├─────────────────────────────────┤
│ 🎨 視覺指示 (Visual Direction)   │
│ [多行文字區域]                   │
├─────────────────────────────────┤
│ 📝 講稿 (Speaker Notes)          │
│ [大型文字區域，最大高度 300px]    │
└─────────────────────────────────┘
```

**卡片樣式：**
- 背景：`var(--bg-surface)`
- 邊框：`1px solid var(--border)`
- 圓角：`var(--radius-md)`
- 間距：卡片之間 16px
- Hover 效果：`box-shadow: 0 4px 12px rgba(0, 212, 170, 0.1)`

**功能：**
- 不支援拖曳排序（簡化功能）
- 每個欄位監聽 `input` 事件
- 觸發 debounce 更新機制

---

### 3. YAML 預覽區（右側）

**結構：**
```
┌─────────────────────────────────┐
│ 👀 YAML 預覽    [複製 YAML] 按鈕 │
├─────────────────────────────────┤
│                                 │
│  [YAML 文字顯示區域（唯讀）]     │
│                                 │
│  - 使用 <pre> 或 <textarea>     │
│  - 只讀屬性                      │
│  - 深色主題語法高亮（可選）      │
│                                 │
└─────────────────────────────────┘
```

**複製按鈕功能：**
```javascript
function copyYamlToClipboard() {
  var yamlContent = dom.yamlEditor.value;

  navigator.clipboard.writeText(yamlContent)
    .then(function() {
      showToast('已複製到剪貼簿', 'success');
    })
    .catch(function() {
      // 降級方案（舊瀏覽器）
      fallbackCopyToClipboard(yamlContent);
    });
}
```

---

### 4. NotebookLM 使用說明區塊

**位置：** Step 4 最上方（編輯器之前）

**結構：**
```
┌────────────────────────────────────────────────┐
│ ℹ️ 接下來該怎麼做？(NotebookLM 轉檔教學)        │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐  │
│  │ 📥       │  →   │ ☁️       │  →   │ 🎤       │  │
│  │ 1. 下載  │      │ 2. 上傳  │      │ 3. 生成  │  │
│  │ 施工圖   │      │ NotebookLM │    │ 簡報內容 │  │
│  └──────────┘      └──────────┘      └──────────┘  │
│                                                │
│  點擊下方的「下載 TXT (.yaml)」按鈕。           │
│                                                │
│  打開 Google NotebookLM，建立新筆記本。         │
│  🔗 [前往 NotebookLM](https://notebooklm.google.com) │
│                                                │
│  將剛下載的 .txt 檔案上傳作為來源 (Source)。    │
└────────────────────────────────────────────────┘
```

**樣式：**
- 背景：`var(--bg-surface)` 加上淡淡的邊框
- 圓角卡片設計
- 三步驟以 inline-flex 水平排列
- 箭頭使用 → 符號或 SVG icon

---

## ⚙️ 技術實作

### 防抖動機制

```javascript
let updateTimer = null;

function onEditorChange() {
  // 清除之前的計時器
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  // 設定新的計時器（300ms 後更新）
  updateTimer = setTimeout(function() {
    updateYamlPreview();
  }, 300);
}

function updateYamlPreview() {
  try {
    var yamlString = jsyaml.dump(window.presentationData);
    dom.yamlPreview.value = yamlString;
  } catch (err) {
    console.error('[YAML Generation Error]', err);
    showToast('YAML 生成失敗，請檢查內容', 'error');
  }
}
```

### 卡片編輯器事件綁定

```javascript
function bindCardEvents(cardElement, slideIndex) {
  // 標題
  var titleInput = cardElement.querySelector('.slide-title-input');
  titleInput.addEventListener('input', function() {
    window.presentationData.slides[slideIndex].title = this.value;
    onEditorChange();
  });

  // 重點
  var keyPointInputs = cardElement.querySelectorAll('.key-point-input');
  keyPointInputs.forEach(function(input, pointIndex) {
    input.addEventListener('input', function() {
      window.presentationData.slides[slideIndex].key_points[pointIndex] = this.value;
      onEditorChange();
    });
  });

  // 視覺指示
  var visualInput = cardElement.querySelector('.visual-input');
  visualInput.addEventListener('input', function() {
    window.presentationData.slides[slideIndex].visual_direction = this.value;
    onEditorChange();
  });

  // 講稿
  var notesInput = cardElement.querySelector('.notes-input');
  notesInput.addEventListener('input', function() {
    window.presentationData.slides[slideIndex].speaker_notes = this.value;
    onEditorChange();
  });
}
```

---

## 📁 檔案結構

### 新增檔案

```
public/js/outline-editor.js        # 大綱編輯器模組
  - renderOutlineEditor()          # 渲染卡片編輯器
  - bindCardEvents()               # 綁定事件監聽
  - onEditorChange()               # 防抖動觸發更新
  - updateYamlPreview()            # 更新 YAML 預覽
```

### 修改檔案

```
public/index.html                  # Step 4 UI 大改版
  - 新增使用說明彈窗 HTML 結構
  - 改版 Step 4 為左右分欄佈局
  - 新增 NotebookLM 說明區塊

public/css/styles.css              # 新增樣式
  - .help-modal, .help-modal-content
  - .outline-editor, .slide-card
  - .yaml-preview-header, .copy-yaml-btn
  - .notebooklm-guide

public/js/app.js                   # 整合編輯器模組
  - 引入 outline-editor.js
  - 新增使用說明彈窗邏輯
  - 新增複製 YAML 功能
```

---

## 🔄 使用者流程

### 流程 1：首次使用

```
進入網站
  ↓
看到右上角「📖 使用說明」
  ↓
點擊開啟彈窗 → 閱讀四步驟說明
  ↓
點擊「前往申請 Gemini API Key」連結
  ↓
取得 API Key → 回到網站 → 設定 Key
  ↓
開始使用
```

### 流程 2：生成與編輯簡報

```
Step 1-3: 設定參數、輸入素材、點擊生成
  ↓
等待 AI 生成（顯示 Loading）
  ↓
Step 4: 顯示編輯器
  ├─ 上方：NotebookLM 使用說明
  ├─ 左側：自動載入所有簡報卡片
  └─ 右側：顯示生成的 YAML
  ↓
使用者編輯卡片（標題、重點、講稿等）
  ↓
300ms 後，右側 YAML 自動更新
  ↓
使用者可以：
  - 繼續編輯其他卡片
  - 點擊「複製 YAML」複製到剪貼簿
  - 點擊「下載 TXT」下載檔案
  - 點擊「下載 MD 大綱」下載 Markdown
```

### 流程 3：使用 NotebookLM

```
閱讀 Step 4 上方的說明區塊
  ↓
點擊「下載 TXT」下載 YAML 檔案
  ↓
點擊「前往 NotebookLM」連結（新分頁開啟）
  ↓
在 NotebookLM 中建立新筆記本
  ↓
上傳剛下載的 .txt 檔案作為 Source
  ↓
NotebookLM 分析內容並生成簡報
```

---

## 🛡️ 錯誤處理與邊界情況

### 1. 空白簡報（0 頁）
- **情況：** 使用者尚未生成簡報就進入 Step 4
- **處理：** 顯示提示訊息「尚未生成簡報，請先完成前面步驟」
- **UI：** 左側編輯器不顯示，右側顯示空狀態

### 2. 超長文字輸入
- **講稿區域：** 最大高度 300px，超過顯示滾動條
- **重點輸入：** 單行最多 200 字元（軟限制，提示但不阻擋）
- **標題輸入：** 最多 100 字元

### 3. 重點項目過多
- **預設：** 顯示 3 個重點輸入框
- **新增：** 點擊「+ 新增重點」動態增加
- **上限：** 最多 10 個重點（避免簡報過於擁擠）
- **提示：** 超過 10 個時顯示「建議將重點分散到多頁簡報」

### 4. 複製功能失敗
- **現代瀏覽器：** 使用 `navigator.clipboard.writeText()`
- **降級方案：** 建立隱藏 textarea → select → execCommand('copy')
- **失敗時：** 顯示 Toast「複製失敗，請手動選取文字複製」

### 5. YAML 生成錯誤
- **原因：** 資料結構異常導致 `jsyaml.dump()` 失敗
- **處理：**
  - 捕捉錯誤並 console.error 記錄
  - 顯示 Toast「YAML 生成失敗，請檢查內容」
  - 保留上一次成功生成的 YAML（不更新預覽區）

### 6. 大型簡報（20+ 頁）
- **效能優化：**
  - 考慮使用虛擬滾動（只渲染可見卡片）
  - 或：預設只渲染前 10 張，滾動時載入更多
- **當前方案：** 全部渲染（20 頁內效能可接受）

---

## 🎯 成功指標

### 使用者體驗改善
- ✅ 新手使用者不需要了解 YAML 語法
- ✅ 編輯簡報內容更直觀（表單式而非文字編輯）
- ✅ 提供清楚的使用說明和引導
- ✅ NotebookLM 整合流程明確

### 技術指標
- ✅ 編輯回應時間 < 500ms（包含 300ms debounce）
- ✅ 支援 20 頁簡報不卡頓
- ✅ 複製功能在主流瀏覽器都能正常運作
- ✅ YAML 生成準確率 100%（與原本直接編輯一致）

---

## 📝 備註

### 未來可能的擴充功能（本次不實作）
- 卡片拖曳排序（改變投影片順序）
- 新增/刪除投影片
- 簡報範本庫
- 匯入現有 YAML 到編輯器
- 深色主題語法高亮（YAML 預覽區）

### 設計決策紀錄
1. **為何選擇防抖動而非節流？**
   - 防抖動確保使用者停止輸入後才更新，避免頻繁生成 YAML
   - 節流會在輸入過程中定期更新，可能造成視覺干擾

2. **為何右側 YAML 設為唯讀？**
   - 避免雙向編輯的同步衝突
   - 簡化邏輯，左側是唯一資料來源
   - 進階使用者仍可複製後在外部編輯

3. **為何不支援拖曳排序？**
   - 簡化實作（不需要拖曳庫如 Sortable.js）
   - 使用者場景中較少需要重新排序
   - 保持介面簡潔

---

**文件版本：** 1.0
**最後更新：** 2026-02-16
**作者：** Claude Opus 4.6 + Cyclone
