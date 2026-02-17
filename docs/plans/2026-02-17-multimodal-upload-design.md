# 多模態素材上傳設計文件

## 目標

將 Step 3 素材輸入區改為拖曳上傳區，支援 PDF/TXT/音檔，透過 Gemini multimodal API 一次呼叫完成檔案理解+簡報生成。

## UI

- 拖曳/點擊上傳區（取代現有 textarea + 按鈕）
- 已上傳檔案顯示為可刪除標籤
- 下方 textarea 可同時輸入補充文字
- 支援多檔上傳
- 單檔上限 20MB（前端檢查）

## 檔案處理

| 類型 | MIME | 處理 |
|------|------|------|
| TXT | text/plain | readAsText → 填入 textarea（不走 multimodal） |
| PDF | application/pdf | readAsDataURL → base64 → inlineData part |
| MP3 | audio/mpeg | 同上 |
| MP4 | video/mp4 | 同上 |
| WAV | audio/wav | 同上 |

## API 格式

```javascript
contents: [{
  parts: [
    { text: prompt },
    { inlineData: { mimeType: "application/pdf", data: "base64..." } }
  ]
}]
```

- 有檔案 → multimodal 格式（text + inlineData parts）
- 無檔案 → 現有純文字格式
- TXT 內容併入 prompt 文字，不進 inlineData

## 模式差異

- AI 自動生成：拖曳 + textarea
- 現有大綱轉檔：純 textarea（不需檔案）
- 課文忠實模式：拖曳 + textarea

## 錯誤處理

- 檔案 > 20MB → toast 提示
- 不支援格式 → toast 提示
- base64 轉換失敗 → toast 提示
