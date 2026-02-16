# NBLM YAML Generator - v2.0 更新摘要

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
- [ ] 支援匯出多種格式
- [ ] 整合更多 AI 模型選項
- [ ] 效能優化與快取機制

---

**版本**：2.0.0
**日期**：2026-02-16
**作者**：Claude Sonnet 4.5 + User
