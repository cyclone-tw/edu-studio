# 課文入口網站設計

## 目標

建立一個靜態入口網站，管理和展示 edu-studio 產出的 HTML 課文檔案。老師可透過網頁介面管理分類和上傳檔案，學生可直接在瀏覽器中開啟課文。

## 架構

- 一個學年度一個 GitHub repo（如 `edu-lessons-114`）
- GitHub Pages 部署，純前端靜態站
- GitHub REST API 實現管理功能（CRUD）

## Repo 結構

```
edu-lessons-114/
├── lessons/
│   ├── 國語/
│   │   ├── A組/
│   │   │   └── 穿越時空的味道.html
│   │   └── B組/
│   └── 數學/
│       └── ...
├── index.html        ← 入口頁（一般模式 + 管理模式）
├── catalog.json      ← 目錄結構 + 顯示名稱 + 排序
└── build.js          ← 本地腳本：初始化 / 離線用
```

## catalog.json 結構

```json
{
  "title": "114 學年度課文總覽",
  "categories": [
    {
      "folder": "國語",
      "displayName": "國語",
      "order": 1,
      "groups": [
        {
          "folder": "A組",
          "displayName": "A組",
          "order": 1
        }
      ]
    }
  ]
}
```

## 一般模式（學生/瀏覽）

- 深色主題，與 edu-studio 風格一致（#0a0a0f 背景、#00d4aa 主色）
- 多階層折疊目錄（科目 → 組別 → 檔案列表）
- 預設全部收合，點擊展開，顯示每層檔案數量
- 點擊檔案名稱 → 新分頁開啟 HTML 課文
- 每個檔案旁有「複製連結」按鈕

## 管理模式（老師）

進入方式：`?admin=true` 或隱藏按鈕，需輸入 GitHub Personal Access Token（存 localStorage）。

### 功能清單

| 功能 | 說明 |
|------|------|
| 新增分類 | 新增科目、組別（建立資料夾 + 更新 catalog.json） |
| 重新命名 | 修改科目/組別的顯示名稱 |
| 刪除分類 | 刪除空的分類（有檔案時提示警告） |
| 上傳檔案 | 選擇分類後上傳 HTML 檔（透過 GitHub Contents API） |
| 刪除檔案 | 刪除指定課文檔案 |
| 調整排序 | 上下箭頭或拖拉調整科目/組別/檔案的顯示順序 |

## 技術要點

- 零後端：全部透過 GitHub REST API（Contents API）操作
- GitHub Token 存 localStorage，僅老師的瀏覽器可用
- 上傳大檔：GitHub API 單檔限制 100MB，HTML 檔（~30MB）可支援
- 自動部署：push 後 GitHub Pages 自動更新
- build.js 為本地輔助腳本，掃描 lessons/ 資料夾產生 catalog.json，用於初始化或離線場景

## 使用流程

### 一般使用（透過管理模式）
1. 開啟入口頁 → 進入管理模式
2. 新增科目/組別分類
3. 上傳 HTML 課文到指定分類
4. 複製個別課文連結分享給學生

### 離線 / 批次使用
1. 將 HTML 檔放入 `lessons/科目/組別/` 資料夾
2. 執行 `node build.js` 重新生成 catalog.json
3. git push → GitHub Pages 自動部署
