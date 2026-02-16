# NBLM 簡報生成助手｜Cyclone — 設計文件

## 專案概述

一個 Web 應用，讓使用者透過多維度參數設定，搭配 Gemini API 分析素材，生成結構化 YAML 檔案供 Google NotebookLM 匯入生成簡報。

## 決策記錄

| 項目 | 決定 | 理由 |
|------|------|------|
| 後端框架 | Node.js + Express | 輕量、Zeabur 原生支援 |
| API Key | 使用者自帶，前端直呼 Gemini | 安全性較高，Key 不經伺服器 |
| 課文模式 | AI 分段，原文一字不改 | 使用者核心需求 |
| PDF 轉圖 | 後端處理，輸出 PNG | 前端無法高品質轉圖 |
| UI 語言 | 繁體中文 | 主要使用者為台灣教育工作者 |
| 部署 | Zeabur | 使用者已有 server |
| 標題 | NBLM 簡報生成助手｜Cyclone | 使用者指定 |
| 版權 | © 2026 Cyclone. All rights reserved. | 使用者指定 |

## 架構

```
nblm-gem/
├── server.js                # Express 伺服器（靜態檔 + PDF API）
├── package.json
├── Dockerfile               # Zeabur 部署
├── public/                  # 前端靜態檔案
│   ├── index.html           # 主頁面 SPA
│   ├── css/
│   │   └── styles.css       # 暗色主題 + 青綠 accent
│   └── js/
│       ├── app.js           # 主邏輯、步驟流程控制
│       ├── gemini.js        # Gemini API 整合（前端直呼）
│       ├── yaml-engine.js   # YAML 生成引擎
│       ├── editor.js        # 大綱編輯器
│       ├── pdf-splitter.js  # PDF 上傳 + 下載圖片
│       └── presets.js       # 四維度預設資料
└── routes/
    └── pdf.js               # POST /api/pdf-to-images
```

## 三大功能模組

### 1. AI 智慧生成
- 上傳素材（PDF/TXT）或手動輸入文字
- 選擇四維度：簡報者角色(8)、受眾面向(10)、簡報場景(9)、視覺風格(15)
- 額外參數：頁數(5-30)、語言、互動程度、自訂 prompt
- Gemini 原子化分析 → 結構化 YAML

### 2. 課文忠實模式
- 貼上課文原文
- AI 只負責「分段」，決定每頁放哪些句子
- 原文一字不改、一字不漏地塞入 YAML
- 同樣搭配四維度設定

### 3. PDF 轉圖片
- 上傳 NBLM 產出的 PDF
- 後端每頁轉為獨立 PNG
- 打包成 ZIP 下載

## UI 設計

- 暗色主題 + 青綠色 accent（不用紫色漸層）
- 卡片式選擇器（hover 浮起、選中高亮邊框）
- 左右分欄：左側參數 / 右側即時預覽
- 手機版垂直堆疊 + 水平滑動卡片
- 字體：Noto Sans TC
- 4 步驟流程：選模式 → 設參數 → 輸入素材 → 預覽匯出

## YAML 輸出格式

```yaml
metadata:
  title: "簡報標題"
  presenter_role: "educator"
  audience: "special_education"
  context: "classroom"
  visual_style: "warm_hand_drawn"
  slide_count: 12
  language: "zh-TW"
  interaction_level: "high"
  generated_at: "2026-02-16T12:00:00+08:00"

presentation_strategy:
  opening_hook: "..."
  core_message: "..."
  audience_adaptation: "..."
  closing_action: "..."

slides:
  - slide_number: 1
    type: "title"
    title: "投影片標題"
    subtitle: "副標題"
    visual_direction: "..."
    speaker_notes: "..."
  # ...

appendix:
  references: []
  additional_resources: []
```

## PDF 轉圖片 API

```
POST /api/pdf-to-images
Content-Type: multipart/form-data
Body: { file: <PDF> }
Response: ZIP（slide-01.png, slide-02.png, ...）
```

## 部署

- Zeabur 連接 GitHub repo → 自動偵測 Node.js → 部署
- 無需伺服器端環境變數（API Key 在使用者前端）
