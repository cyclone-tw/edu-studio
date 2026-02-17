# NBLM YAML Generator - 更新日誌

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
- [ ] 單頁重新生成功能
- [ ] 自訂風格色彩配置

---

**最新版本**：2.1.0
**最後更新**：2026-02-17
