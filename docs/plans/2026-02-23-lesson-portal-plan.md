# 課文入口網站 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個 GitHub Pages 靜態入口網站，支援多階層課文目錄瀏覽 + 管理模式 CRUD。

**Architecture:** 純前端單頁應用，部署於 GitHub Pages。透過 GitHub REST API 實現檔案管理（上傳/刪除/分類 CRUD）。目錄結構存於 catalog.json，搭配本地 build.js 腳本做離線同步。

**Tech Stack:** Vanilla HTML/CSS/JS, GitHub REST API (Contents API), GitHub Pages

**Design Doc:** `docs/plans/2026-02-23-lesson-portal-design.md`

**Repo Location:** `/Users/cyclone/VibeCoding開發專案/edu-lessons-114/`（與 edu-studio 同層）

**Style Reference:** edu-studio 的 CSS 變數：
- `--bg-primary: #0a0a0f`, `--bg-card: #14141f`, `--bg-surface: #1a1a2e`
- `--accent: #00d4aa`, `--text-primary: #e8e8e8`, `--text-secondary: #a0a0b0`
- `--border: #2a2a3e`, `--radius: 12px`, `--font: 'Noto Sans TC'`

---

### Task 1: 初始化 Repo 結構

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `catalog.json`
- Create: `lessons/.gitkeep`

**Step 1: 建立 repo 目錄並初始化 git**

```bash
mkdir -p /Users/cyclone/VibeCoding開發專案/edu-lessons-114
cd /Users/cyclone/VibeCoding開發專案/edu-lessons-114
git init
```

**Step 2: 建立 .gitignore**

```
.DS_Store
node_modules/
```

**Step 3: 建立初始 catalog.json**

```json
{
  "title": "114 學年度課文總覽",
  "repo": {
    "owner": "",
    "name": "edu-lessons-114"
  },
  "categories": []
}
```

> `repo.owner` 在設定 GitHub 時填入使用者 GitHub 帳號。

**Step 4: 建立 lessons 目錄**

```bash
mkdir -p lessons
touch lessons/.gitkeep
```

**Step 5: 建立 README.md**

```markdown
# 114 學年度課文

由 [Cyclone Studio](https://github.com/your-user/edu-studio) 產出的互動式 HTML 課文。

## 使用方式

瀏覽入口頁：https://your-user.github.io/edu-lessons-114/
```

**Step 6: Commit**

```bash
git add .
git commit -m "chore: 初始化 114 學年度課文 repo"
```

---

### Task 2: 入口頁 HTML 骨架 + CSS 基礎樣式

**Files:**
- Create: `index.html`

**Step 1: 建立 index.html 骨架**

包含以下結構：
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>114 學年度課文總覽</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>/* 全部 CSS 內嵌 */</style>
</head>
<body>
  <header><!-- 標題 + 管理模式切換 --></header>
  <main id="app">
    <div id="catalog"><!-- 目錄區 --></div>
  </main>
  <div id="admin-bar" class="hidden"><!-- 管理工具列 --></div>
  <div id="toast"></div>
  <script>/* 全部 JS 內嵌 */</script>
</body>
</html>
```

**Step 2: 撰寫 CSS**

複用 edu-studio 的設計語言：
- CSS 變數（顏色、圓角、字體）
- 深色主題背景
- header 樣式
- 折疊目錄樣式（category-item, group-item, file-item）
- 管理模式按鈕、表單樣式
- toast 通知樣式
- 響應式設計（mobile-friendly）
- `.hidden` 工具類

**Step 3: 在瀏覽器開啟驗證**

```bash
open /Users/cyclone/VibeCoding開發專案/edu-lessons-114/index.html
```

確認：深色主題顯示正常、header 有標題。

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 入口頁 HTML 骨架與 CSS 基礎樣式"
```

---

### Task 3: 一般模式 — 目錄瀏覽功能

**Files:**
- Modify: `index.html`（JS 區塊）

**Step 1: 撰寫 catalog 載入與渲染邏輯**

JS 功能：
1. `loadCatalog()` — fetch `catalog.json`，解析後呼叫渲染
2. `renderCatalog(data)` — 產生多階層折疊式 HTML：
   - 科目層：可展開/收合，顯示檔案數量
   - 組別層：可展開/收合，顯示檔案數量
   - 檔案層：顯示檔案名稱 + 開啟連結 + 複製連結按鈕
3. `toggleCollapse(el)` — 切換展開/收合動畫
4. `copyLink(url)` — 複製連結到剪貼簿 + toast 提示

**Step 2: 實作檔案列表載入**

目錄中的檔案列表需要動態掃描。兩種策略：

- **離線模式**：catalog.json 包含完整 files 陣列（由 build.js 產生）
- **線上模式**：catalog.json 只有分類結構，檔案列表透過 GitHub API `GET /repos/{owner}/{repo}/contents/lessons/{category}/{group}` 動態載入

實作時兩者都支援：catalog.json 有 files 就用，沒有就 fetch GitHub API（公開 repo 不需 token）。

**Step 3: 加入測試用假資料**

在 catalog.json 中加入測試資料以便開發驗證：
```json
{
  "title": "114 學年度課文總覽",
  "repo": { "owner": "", "name": "edu-lessons-114" },
  "categories": [
    {
      "folder": "國語",
      "displayName": "國語",
      "order": 1,
      "groups": [
        {
          "folder": "A組",
          "displayName": "A組",
          "order": 1,
          "files": ["穿越時空的味道.html"]
        }
      ]
    }
  ]
}
```

**Step 4: 瀏覽器測試**

確認：
- 目錄顯示「國語 (1)」
- 點擊展開看到「A組 (1)」
- 點擊展開看到「穿越時空的味道」
- 複製連結按鈕可用

**Step 5: Commit**

```bash
git add .
git commit -m "feat: 一般模式目錄瀏覽功能"
```

---

### Task 4: 管理模式 — Token 驗證 + UI 切換

**Files:**
- Modify: `index.html`（JS + HTML 區塊）

**Step 1: 實作管理模式進入機制**

1. URL 帶 `?admin=true` 或點擊 header 標題 5 次觸發
2. 彈出 Token 輸入 modal：
   - 輸入框（password type）
   - 儲存按鈕（存入 localStorage `gh_token`）
   - 已有 token 時顯示「已設定」+ 清除按鈕
3. Token 驗證：呼叫 `GET /user` 確認有效

**Step 2: 實作 GitHub API 工具函式**

```javascript
const GitHubAPI = {
  token: null,
  owner: null,
  repo: null,

  init(token, owner, repo) { ... },
  async request(method, path, body) { ... },
  async getContents(path) { ... },
  async createOrUpdateFile(path, content, message, sha) { ... },
  async deleteFile(path, sha, message) { ... },
  async getUser() { ... }
};
```

**Step 3: 實作 UI 切換**

管理模式啟動後：
- header 顯示「管理模式」標籤
- 每個科目/組別旁邊出現：「重新命名」「刪除」「上下移動」按鈕
- 每個組別下方出現「上傳檔案」按鈕
- 頂部出現「新增科目」按鈕
- 每個檔案旁出現「刪除」按鈕

**Step 4: 瀏覽器測試**

確認：
- `?admin=true` 時出現 token 輸入框
- 輸入 token 後 UI 切換到管理模式
- 各管理按鈕出現在正確位置

**Step 5: Commit**

```bash
git add .
git commit -m "feat: 管理模式 Token 驗證與 UI 切換"
```

---

### Task 5: 管理模式 — 分類 CRUD（新增/重新命名/刪除）

**Files:**
- Modify: `index.html`（JS 區塊）

**Step 1: 實作新增科目**

1. 點擊「新增科目」→ 彈出輸入框
2. 輸入科目名稱 → 更新 catalog.json（加入新 category）
3. 透過 GitHub API 更新 catalog.json
4. 在 lessons/ 下建立對應資料夾（透過建立 `.gitkeep` 檔案）
5. 重新渲染目錄

**Step 2: 實作新增組別**

1. 點擊科目旁的「新增組別」→ 彈出輸入框
2. 輸入組別名稱 → 更新 catalog.json
3. 透過 GitHub API 更新 catalog.json + 建立資料夾
4. 重新渲染

**Step 3: 實作重新命名**

1. 點擊「重新命名」→ 行內編輯（input 取代文字）
2. 確認後更新 catalog.json 的 displayName（folder 名不變）
3. 透過 GitHub API 更新 catalog.json

**Step 4: 實作刪除分類**

1. 點擊「刪除」→ 確認對話框
2. 檢查是否有子項目（有檔案時警告，需二次確認）
3. 從 catalog.json 移除 + 透過 GitHub API 刪除資料夾內所有檔案
4. 重新渲染

**Step 5: 瀏覽器測試**

用有效 token 測試：
- 新增科目「英語」→ catalog.json 更新、GitHub 上出現 lessons/英語/.gitkeep
- 新增組別「C組」→ 正確新增在科目下
- 重新命名「A組」為「甲班」→ displayName 更新
- 刪除空分類 → 正確移除

**Step 6: Commit**

```bash
git add .
git commit -m "feat: 管理模式分類 CRUD（新增/重新命名/刪除）"
```

---

### Task 6: 管理模式 — 檔案上傳與刪除

**Files:**
- Modify: `index.html`（JS 區塊）

**Step 1: 實作檔案上傳**

1. 組別下方「上傳檔案」按鈕 → 觸發 `<input type="file" accept=".html">`
2. 讀取檔案為 base64（使用 FileReader）
3. 顯示上傳進度（檔名 + 進度條/spinner）
4. 透過 GitHub API `PUT /repos/{owner}/{repo}/contents/lessons/{cat}/{group}/{filename}` 上傳
5. 上傳成功後更新 catalog.json 的 files 陣列
6. 重新渲染目錄 + toast 成功通知

注意事項：
- 大檔案（>25MB）上傳可能較慢，需顯示進度提示
- 檔名衝突時提示是否覆蓋

**Step 2: 實作檔案刪除**

1. 檔案旁「刪除」按鈕 → 確認對話框
2. 透過 GitHub API `DELETE /repos/{owner}/{repo}/contents/lessons/{cat}/{group}/{filename}`（需提供 sha）
3. 從 catalog.json 的 files 陣列移除
4. 重新渲染 + toast 通知

**Step 3: 瀏覽器測試**

- 上傳一個小型 HTML 測試檔 → GitHub repo 出現檔案
- 刪除該檔案 → GitHub repo 檔案消失
- 目錄即時更新

**Step 4: Commit**

```bash
git add .
git commit -m "feat: 管理模式檔案上傳與刪除"
```

---

### Task 7: 管理模式 — 排序功能

**Files:**
- Modify: `index.html`（JS 區塊）

**Step 1: 實作上下移動按鈕排序**

管理模式下，每個科目/組別/檔案旁顯示 ▲▼ 按鈕：
1. 點擊 ▲ → 該項目 order - 1（與上方交換）
2. 點擊 ▼ → 該項目 order + 1（與下方交換）
3. 更新 catalog.json 的 order 值
4. 透過 GitHub API 更新 catalog.json
5. 重新渲染

**Step 2: 瀏覽器測試**

- 建立 3 個科目 → 調整順序 → 重新整理頁面確認排序持久化

**Step 3: Commit**

```bash
git add .
git commit -m "feat: 管理模式排序功能"
```

---

### Task 8: 本地腳本 build.js

**Files:**
- Create: `build.js`

**Step 1: 撰寫 build.js**

功能：掃描 `lessons/` 資料夾結構，產生/更新 `catalog.json`。

```javascript
// 使用 Node.js fs 模組
// 1. 讀取現有 catalog.json（如存在）→ 保留 displayName 和 order
// 2. 掃描 lessons/ 目錄結構
// 3. 合併：新資料夾加入、已刪除的移除、保留自訂設定
// 4. 寫入 catalog.json
```

執行方式：
```bash
node build.js
```

**Step 2: 測試**

1. 手動建立 `lessons/測試科目/測試組/test.html`
2. 執行 `node build.js`
3. 確認 catalog.json 正確產生

**Step 3: Commit**

```bash
git add .
git commit -m "feat: 本地 build.js 目錄掃描腳本"
```

---

### Task 9: GitHub Pages 設定 + 最終測試

**Files:**
- Modify: `README.md`（更新實際 URL）
- Modify: `catalog.json`（填入實際 repo owner）

**Step 1: 建立 GitHub repo**

```bash
cd /Users/cyclone/VibeCoding開發專案/edu-lessons-114
gh repo create edu-lessons-114 --public --source=. --push
```

**Step 2: 啟用 GitHub Pages**

```bash
gh api repos/{owner}/edu-lessons-114/pages -X POST -f source.branch=main -f source.path=/
```

或在 GitHub Settings → Pages → Source: main branch, / (root)

**Step 3: 更新 catalog.json 的 repo.owner**

填入實際 GitHub 使用者名稱。

**Step 4: 最終測試**

1. 瀏覽 `https://{owner}.github.io/edu-lessons-114/`
2. 確認一般模式目錄正常顯示
3. 加 `?admin=true` 進入管理模式
4. 測試完整流程：新增科目 → 新增組別 → 上傳 HTML → 瀏覽 → 複製連結 → 刪除

**Step 5: Commit**

```bash
git add .
git commit -m "chore: GitHub Pages 設定完成"
git push
```

---

## 任務摘要

| Task | 內容 | 預估步驟 |
|------|------|---------|
| 1 | 初始化 Repo 結構 | 6 步 |
| 2 | HTML 骨架 + CSS 樣式 | 4 步 |
| 3 | 一般模式目錄瀏覽 | 5 步 |
| 4 | 管理模式 Token + UI 切換 | 5 步 |
| 5 | 分類 CRUD | 6 步 |
| 6 | 檔案上傳與刪除 | 4 步 |
| 7 | 排序功能 | 3 步 |
| 8 | build.js 本地腳本 | 3 步 |
| 9 | GitHub Pages 設定 + 測試 | 5 步 |
