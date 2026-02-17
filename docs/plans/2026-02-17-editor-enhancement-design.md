# 編輯器增強 & 完全自訂模式 — 設計文件

## 目標

增強 Step 4 編輯器，開放全域風格微調，新增「完全自訂」模式讓使用者從零建立投影片。

## 三大改版項目

### 1. 全域風格微調區

位於編輯器最上方（可收合面板），所有欄位對應 YAML 的 `global_design` 和 `system_instructions`。

| 欄位 | 類型 | 對應 YAML |
|------|------|-----------|
| style_name | text | global_design.style_name |
| tone | text | global_design.tone |
| visual_keywords | text | global_design.visual_keywords |
| background | color + hex | global_design.color_palette.background |
| text color | color + hex | global_design.color_palette.text |
| accent | color + hex | global_design.color_palette.accent |
| title_font | text | global_design.typography.title_font |
| body_font | text | global_design.typography.body_font |
| title_size | number (px) | global_design.typography.title_size（新增欄位） |
| body_size | number (px) | global_design.typography.body_size（新增欄位） |
| subtitle_size | number (px) | global_design.typography.subtitle_size（新增欄位） |
| jump_ratio | text | global_design.typography.jump_ratio |
| common_layout_rules | textarea (一行一條) | global_design.common_layout_rules |

- AI/課文模式生成後：自動填入 `NBLM_STYLE_MAP` 的值
- 完全自訂模式：可從下拉選單載入預設風格，或手動填寫
- 修改任何欄位 → debounce 300ms → 重建 `system_instructions` + `global_design` → 更新 YAML 預覽

### 2. 投影片卡片增強

現有六欄位不變（title, subtitle, key_points, script, visual_description, layout_style），新增：

- **卡片操作按鈕**：每張卡片右上角加上 ↑ 上移 / ↓ 下移 / 複製 / 刪除 按鈕
- **新增投影片按鈕**：底部「+ 新增投影片」按鈕，點擊彈出範本選擇：
  - 封面頁：預填 title="簡報標題" + subtitle="副標題"
  - 內容頁：預填 title="頁面標題" + key_points placeholder
  - 結尾頁：預填 title="總結" + key_points placeholder
  - 空白頁：全部欄位空白
- **複製投影片**：複製現有卡片內容作為新投影片
- 上移/下移/新增/刪除/複製後自動重新計算 page type（index 0 = COVER, 最後 = CLOSING）

### 3. 完全自訂模式

作為第三個頂層 Mode Tab：

```
[ AI 智慧生成 ] [ 課文忠實模式 ] [ 完全自訂 ]
```

流程：
1. 選擇「完全自訂」tab
2. 跳過 Step 1-3，直接進入 Step 4 編輯器
3. 全域風格區：可選預設風格當起點（下拉選單），或留空手動填
4. 投影片區：空白，需手動點「+ 新增投影片」
5. 右側 YAML 即時更新
6. suggested_filename 欄位讓使用者自訂檔名

## 資料流

```
全域風格微調 ──→ rebuildGlobalDesign() ──→ fullDocument.presentation_data.global_design
                                        ──→ fullDocument.presentation_data.system_instructions
投影片卡片編輯 ──→ handleFieldChange() ──→ fullDocument.presentation_data.slides[i]
卡片操作 ──→ addSlide/removeSlide/moveSlide/duplicateSlide ──→ outlineData[] 更新 → renderCards()
                                                                                    ↓
                                                              toNblmYaml(fullDocument) → YAML 預覽
```

## 技術實作要點

- `yaml-engine.js`：`buildYaml()` 新增 `title_size`/`body_size`/`subtitle_size` 到 typography
- `yaml-engine.js`：新增 `rebuildSystemInstructions(globalDesign)` 函式，根據可編輯欄位重建 system_instructions
- `outline-editor.js`：新增全域風格面板渲染 + 事件綁定
- `outline-editor.js`：新增 addSlide / removeSlide / moveSlide / duplicateSlide 方法
- `app.js`：新增 `custom` mode 處理，直接跳到 Step 4
- `index.html`：新增第三個 mode tab + suggested_filename 輸入欄位
- `presets.js`：不變（已有完整風格資料）

## 不做的事

- 拖曳排序（用上下移動按鈕代替）
- 新增外部依賴
- 修改 Gemini API prompt（已完善）
