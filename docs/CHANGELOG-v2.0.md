# NBLM YAML Generator - 更新日誌

---

## v2.2.0 - 單頁佈局改版

### 發布日期
2026-02-18

### 重大更新

#### 1. 4 步驟精靈合併為單頁佈局
**問題**：原本的 4 步驟精靈（選擇維度 → 額外參數 → 輸入素材 → 預覽匯出）操作繁瑣，用戶需要多次「下一步」。Step 1 的卡片選擇器佔用大量空間（8+10+9+15 = 42 張卡片）。

**解法**：Steps 1-3 合併為單頁垂直排列，Step 4 預覽區在生成後顯示在下方。

佈局結構：
```
[AI 智慧生成] [課文忠實模式] [完全自訂]    ← 模式切換（不變）
├─ 簡報維度設定（4 個下拉選單，2×2 grid）
├─ 額外參數（頁數、語言、互動程度，3 欄橫排）
├─ 輸入素材（AI/課文切換，拖曳上傳+文字輸入）
├─ [開始生成] 按鈕（置中）
└─ 預覽與匯出（生成後顯示，含編輯器+YAML 預覽）
```

#### 2. 卡片選擇器改為下拉選單
- 42 張 preset-card 改為 4 個 `<select>` 下拉選單
- `#roleSelect` — 簡報者角色（8 選項，含角色語氣描述）
- `#audienceSelect` — 受眾面向（10 選項，用 `<optgroup>` 分教育類/職場類）
- `#contextSelect` — 簡報場景（9 選項）
- `#styleSelect` — 視覺風格（15 選項）
- `populateDropdowns()` 從 PRESETS 動態填充選項
- `initDropdownBindings()` 綁定 change 事件更新 state

#### 3. 參數區改為橫向排列
- 原本 2 欄 `form-grid` 改為 3 欄 `params-row`
- 互動程度改為橫向 radio（`radio-group-horizontal`），標籤簡化為「低/中/高」
- 自訂 Prompt textarea 獨立一行

#### 4. 預覽區生成後顯示
- 新增 `showPreview()` 函式
- 生成完成後預覽區自動取消 hidden + smooth scroll 到位
- 取代原本的 `goToStep(4)` 邏輯

#### 5. 模式切換邏輯更新
- `setMode()` 改為控制各 section 的顯示/隱藏（取代 step panel 切換）
- AI 模式：顯示維度+參數+素材+生成按鈕
- 課文模式：同 AI 模式，切換素材輸入區
- 完全自訂：隱藏所有設定區，直接顯示編輯器

### 移除項目

#### HTML
- `#stepProgress` 進度條
- 4 個 `step-panel` section wrapper
- `#roleCards`, `#audienceCardsEdu/Work`, `#scenarioCards`, `#styleCards` card 容器
- 所有 `step-nav` div（上一步/下一步按鈕）

#### CSS（約 190 行）
- `.step-progress`, `.step-item`, `.step-dot`, `.step-label`, `.step-line`
- `.step-panel`, `.panel-title`, `.panel-desc`
- `.card-section`, `.card-section-title`, `.category-badge`
- `.card-grid`, `.preset-card` 及所有相關樣式
- `.step-nav`, `.export-buttons`
- 響應式媒體查詢中的步驟/卡片相關樣式

#### JavaScript
- `state.step` 屬性
- `goToStep()` 函數
- `renderCards()`, `createCard()`, `parseLabel()` 函數
- `initCardGroup()`, `initAudienceGroups()` 函數
- `initStepNavigation()` 函數
- DOM refs: `stepProgress`, `stepPanels`, `roleCards`, `audienceCardsEdu/Work`, `scenarioCards`, `styleCards`, `step1Next`, `step2Prev/Next`, `step3Prev`, `step4Prev`

### 新增項目

#### CSS（約 60 行）
- `.form-section` — 區塊間距與動畫
- `.section-title` — 區塊標題（帶底線）
- `.dimension-grid` — `grid-template-columns: 1fr 1fr`
- `.params-row` — `grid-template-columns: 1fr 1fr 1fr`
- `.radio-group-horizontal` — 橫向 radio 排列
- `.generate-row` — 置中生成按鈕
- `@media (max-width: 768px)` — 維度/參數改為單欄

#### JavaScript
- `populateDropdowns()` — 從 PRESETS 填充 4 個 select
- `initDropdownBindings()` — change event → 更新 state
- `showPreview()` — 顯示預覽區 + smooth scroll
- DOM refs: `roleSelect`, `audienceSelect`, `contextSelect`, `styleSelect`, `dimensionsSection`, `paramsSection`, `materialSection`, `generateRow`, `previewSection`

### 修改檔案
| 檔案 | 變更內容 |
|------|---------|
| `public/index.html` | 移除步驟精靈，改為單頁垂直佈局（維度下拉+參數+素材+生成+預覽） |
| `public/css/styles.css` | 刪除 ~190 行步驟/卡片樣式，新增 ~60 行佈局樣式 |
| `public/js/app.js` | 刪除步驟邏輯，新增下拉選單邏輯，更新 setMode/generate 流程 |

### 未修改檔案
- `presets.js` — 資料結構不變，下拉選單直接讀取
- `gemini.js` — API 呼叫不變
- `yaml-engine.js` — YAML 生成不變
- `outline-editor.js` — 編輯器不變

### 驗證清單
- [x] 頁面載入後單頁佈局正確顯示
- [x] 4 個下拉選單從 PRESETS 正確填充
- [x] 受眾下拉使用 optgroup 分類
- [x] 切換 AI/課文模式，素材區正確切換
- [x] 完全自訂模式直接顯示編輯器
- [x] 生成後預覽區出現並捲動到位
- [x] 維度未選時點擊生成，toast 提示
- [x] 響應式：768px 以下改為單欄

---

## v2.1.0 - NotebookLM 排版優化 & 編輯器增強

### 發布日期
2026-02-17

### 重大更新

#### 1. 卡片編輯器全面改版
- 頁面類型分類：封面頁（COVER）、內容頁（CONTENT）、結尾頁（CLOSING），以彩色標籤區分
- 六欄位編輯：title、subtitle（封面專用）、key_points（內容頁）、script、visual_description、layout_style
- 講者講綱（script）在編輯器可見可編輯，但 YAML 輸出自動排除（不影響 NotebookLM）
- `addField()` 共用元件，減少重複程式碼

#### 2. NotebookLM 排版優化
**問題**：中文排版關鍵字（如「圖片左+文字右」）無法被 NotebookLM 有效執行

**解法**：
- `layout_style` 改用英文關鍵字（如 `left-aligned title, text on left visual on right, asymmetrical split`）
- `system_instructions` 以英文撰寫，包含 NotebookLM 有效格式：
  - `[Absolutely Prohibited Output Format Rules]` - 禁止 Markdown 符號
  - `[Typography Hierarchy]` - 字型大小跳躍比 5:1、標題佔 25-40% 面積
  - `[Layout Rules]` - 左對齊、大量留白、禁止置中排版
- `global_design` 新增：
  - `color_palette`（bg/text/accent hex codes）
  - `common_layout_rules`（陣列格式排版規則）
  - `tone`（英文風格描述）
  - `jump_ratio`（字型大小跳躍比）

#### 3. YAML 格式升級
- 輸出格式改為 `presentation_data` 結構（對齊阿亮校長的 NBLM 工具架構）
- `buildYaml()` 回傳 JavaScript 物件（非字串），方便後續處理
- 新增 `toNblmYaml(doc)` 函式：深拷貝後刪除 script 欄位，輸出純淨 YAML
- 新增 `buildMarkdownOutline(slides, docTitle)` 函式：生成含所有欄位的 Markdown 大綱

#### 4. 16 種視覺風格完整色彩配置
每種風格（`NBLM_STYLE_MAP`）現包含：
- `style_name` - 風格識別名稱
- `visual_keywords` - 中文視覺關鍵字
- `title_font` / `body_font` - 字型配置
- `bg` / `text` / `accent` - Hex 色碼
- `tone` - 英文風格描述（用於 NotebookLM image prompt）

#### 5. Gemini Prompt 更新
三種模式（智慧生成、課文忠實、大綱轉檔）的 prompt 全面更新：
- 要求輸出 `layout_style` 使用英文排版描述
- 要求 `visual_description` 具體描述場景、物件、構圖
- 統一 JSON 輸出格式為 6 欄位

#### 6. UI 調整
- 操作按鈕（複製 YAML、下載 YAML、下載 MD）移至編輯器上方居中
- 編輯器面板固定高度 520px，支援滾動
- 新增頁面類型標籤樣式（綠/藍/橘）
- 新增 CSS 變數 `--radius-md`、`--radius-lg`

### 技術架構

#### 資料流
```
Gemini JSON (6欄位) → buildYaml() → 完整物件（含 script）
                                      ├→ toNblmYaml() → YAML 字串（無 script）→ 右側預覽 / 複製 / 下載 YAML
                                      ├→ buildMarkdownOutline() → MD 字串（含 script）→ 下載 MD
                                      └→ OutlineEditor.loadOutline() → 左側卡片編輯器
```

#### 修改檔案
| 檔案 | 變更內容 |
|------|---------|
| `public/js/gemini.js` | 三種 prompt 更新為 6 欄位格式，要求英文 layout_style |
| `public/js/yaml-engine.js` | NBLM_STYLE_MAP 擴充、buildYaml 改回物件、新增 toNblmYaml/buildMarkdownOutline |
| `public/js/outline-editor.js` | 完全重寫，支援頁面類型分類和 6 欄位編輯 |
| `public/js/app.js` | 更新生成流程，整合新 API，新增 extractDocTitle |
| `public/index.html` | Step 4 按鈕重新排列，移除 YAML 面板內複製按鈕 |
| `public/css/styles.css` | 固定高度面板、頁面類型標籤、新增 CSS 變數 |

---

# v2.0 更新摘要

## 發布日期
2026-02-16

## 重大更新

### 1. 使用說明彈窗 (Help Modal)
- 新增頁面內彈窗式使用說明，取代原本的頁面跳轉
- 包含四大區塊：
  - **使用流程**：4步驟視覺化流程圖
  - **API Key 設定**：Gemini API Key 申請與設定說明
  - **三種生成模式**：智慧生成、現有大綱、教科書切片
  - **NotebookLM 製作簡報**：整合使用指南
- 支援點擊遮罩或按鈕關閉
- 響應式設計，手機版自動調整佈局

### 2. 編輯器改版 (Editor Redesign)
**左右分欄佈局：**
- **左側**：卡片式大綱編輯器 (Outline Editor)
  - 每張投影片一張卡片
  - 可編輯標題和重點/內容
  - 即時編輯，自動儲存
- **右側**：YAML 預覽區 (YAML Preview)
  - 唯讀顯示生成的 YAML
  - 自動同步左側編輯變更
  - 防抖動更新機制 (300ms)

**新增功能：**
- 複製 YAML 按鈕（一鍵複製到剪貼簿）
- Clipboard API + execCommand 降級方案
- 複製成功/失敗提示訊息

### 3. NotebookLM 整合指南
新增 3 步驟使用流程說明：
1. 下載 TXT 檔案
2. 上傳到 NotebookLM
3. 生成簡報

提供 NotebookLM 官網連結，簡化使用流程。

### 4. UI/UX 優化
- 保持原有深色主題配色 (--accent: #00d4aa)
- 卡片 hover 效果增強視覺回饋
- 聚焦時顯示 accent 色邊框與淺色陰影
- 響應式設計：
  - 1024px 以下：編輯器改為單欄佈局
  - 768px 以下：調整卡片間距和字體大小

## 技術實作

### 新增檔案
- `public/js/outline-editor.js` - 大綱編輯器模組
  - 卡片渲染邏輯
  - 事件綁定與防抖動更新
  - YAML 同步功能

### 修改檔案
- `public/index.html`
  - 新增使用說明彈窗 HTML 結構
  - 新增 NotebookLM 使用說明區塊
  - 改版 Step 4 為左右分欄佈局

- `public/css/styles.css`
  - 新增彈窗樣式 (.modal, .help-modal-content)
  - 新增 NotebookLM 說明區塊樣式
  - 新增編輯器分欄佈局樣式
  - 新增卡片編輯器樣式 (.outline-card, .outline-field-*)
  - 複製按鈕樣式 (.btn-copy)

- `public/js/app.js`
  - 初始化使用說明彈窗
  - 初始化大綱編輯器
  - 整合編輯器到生成流程
  - 實作複製 YAML 功能
  - 移除 yamlEditor 過時引用，統一使用 yamlPreview

### Bug 修復
- 修復 yamlEditor 元素引用問題（已改為 yamlPreview）
- 確保所有 DOM 元素正確引用
- 新增 OutlineEditor 存在性檢查

## 架構優化

### 三層架構
```
Editor (左側卡片) → Data Object (outlineData) → YAML Preview (右側預覽)
```

### 資料流
1. 用戶編輯卡片欄位
2. 防抖動更新 (300ms)
3. 更新 outlineData 陣列
4. 同步生成 YAML
5. 更新右側預覽區

### 模組化設計
- OutlineEditor 獨立模組，提供清晰 API：
  - `init(container, preview, callback)` - 初始化
  - `loadOutline(slides)` - 載入大綱
  - `getOutline()` - 取得當前大綱
  - `clear()` - 清空編輯器
  - `bindEvents()` - 綁定事件

## 使用方式

### 基本流程
1. 點擊「使用說明」按鈕查看完整指南
2. 設定 Gemini API Key
3. 選擇生成模式並輸入素材
4. 點擊「生成簡報」
5. 在左側編輯大綱，右側即時預覽 YAML
6. 點擊「複製 YAML」或「下載 TXT」
7. 上傳到 NotebookLM 生成簡報

### 鍵盤快捷鍵
- ESC：關閉彈窗
- 點擊遮罩：關閉彈窗

## 相容性
- 現代瀏覽器（Chrome, Firefox, Safari, Edge）
- Clipboard API 支援
- execCommand 降級方案（舊版瀏覽器）
- 響應式設計（支援手機/平板）

## Git Commits
完整實作歷程請參考 git log：
```bash
git log --oneline --grep="feat:" --grep="fix:" --since="2026-02-16"
```

## 下一步計畫
- [ ] 新增拖曳排序功能
- [x] 支援匯出多種格式（v2.1 已新增 YAML + MD）
- [ ] 整合更多 AI 模型選項
- [ ] 效能優化與快取機制
- [x] 單頁佈局改版（v2.2 完成）
- [ ] 自訂風格色彩配置

---

**最新版本**：2.2.0
**最後更新**：2026-02-18
