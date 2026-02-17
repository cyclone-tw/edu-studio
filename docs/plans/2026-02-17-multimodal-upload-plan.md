# Multimodal Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the textarea+button upload with a drag-drop zone supporting PDF/TXT/audio, using Gemini multimodal API in a single call.

**Architecture:** Add `files` parameter to `callGemini()` for `inlineData` parts. Create a drag-drop upload component that manages file state (base64 blobs). Wire into existing generate flow so files are passed alongside text to Gemini.

**Tech Stack:** Vanilla JS, FileReader API, Gemini multimodal `inlineData`, existing CSS variables

---

### Task 1: gemini.js — Add multimodal support to callGemini

**Files:**
- Modify: `public/js/gemini.js:34-60` (callGemini function)
- Modify: `public/js/gemini.js:121-173` (generatePresentation)
- Modify: `public/js/gemini.js:178-235` (splitTextbook)

**What to do:**

Add optional `files` parameter to `callGemini()`. When files are present, build multimodal `parts` array with both text and `inlineData` objects. Update `generatePresentation` and `splitTextbook` to accept and pass files. `generateFromOutline` stays text-only (no file upload needed for outline mode).

**Implementation — callGemini:**

Change signature from `callGemini(apiKey, prompt)` to `callGemini(apiKey, prompt, files)`.

Replace the request body building (lines 51-59) with:

```javascript
    // Build parts array
    var parts = [{ text: prompt }];

    // Add file parts for multimodal
    if (files && files.length > 0) {
      for (var fi = 0; fi < files.length; fi++) {
        parts.push({
          inlineData: {
            mimeType: files[fi].mimeType,
            data: files[fi].data  // base64 string (no data URI prefix)
          }
        });
      }
    }

    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json'
        }
      })
    });
```

**Implementation — generatePresentation:**

Change signature from `generatePresentation(text, state)` to `generatePresentation(text, state, files)`.

Update the prompt section to note when files are attached:

```javascript
    // If files are attached, tell the model about them
    var materialSection;
    if (files && files.length > 0) {
      materialSection = '## 素材\n\n'
        + '以下附加了 ' + files.length + ' 個檔案（PDF/音檔等），請分析其內容作為素材。\n';
      if (text) {
        materialSection += '使用者另外補充的文字：\n' + text + '\n';
      }
    } else {
      materialSection = '## 素材\n\n' + text + '\n';
    }
```

Replace `'## 素材\n\n' + text + '\n\n'` with `materialSection + '\n'` in the prompt string.

Change the last line from:
```javascript
    return await callGemini(state.apiKey, prompt);
```
to:
```javascript
    return await callGemini(state.apiKey, prompt, files);
```

Also update the validation at the top — when files are provided, text can be empty:

```javascript
    if ((!text || !text.trim()) && (!files || files.length === 0)) {
      throw new Error('請輸入素材內容或上傳檔案');
    }
```

**Implementation — splitTextbook:**

Same pattern: change signature to `splitTextbook(text, state, files)`, update validation, update prompt's `## 課文` section to handle file attachments, pass `files` to `callGemini`.

For the prompt material section:
```javascript
    var courseSection;
    if (files && files.length > 0) {
      courseSection = '## 課文\n\n'
        + '以下附加了課文檔案，請分析其完整內容。\n';
      if (text) {
        courseSection += '使用者另外補充的文字：\n' + text + '\n';
      }
    } else {
      courseSection = '## 課文\n\n' + text;
    }
```

Replace `'## 課文\n\n' + text` with `courseSection`.

**generateFromOutline stays unchanged** — outline mode is text-only by design.

**Verify:** In browser console, confirm `window.generatePresentation.length === 3` (3 parameters). Call with no files: same behavior as before. Call with a small test file: confirm API request body contains `inlineData`.

**Commit:**
```bash
git add public/js/gemini.js
git commit -m "feat: add multimodal file support to callGemini and generate functions"
```

---

### Task 2: index.html — Replace upload UI with drag-drop zone

**Files:**
- Modify: `public/index.html:226-242` (smartInputPanel)
- Modify: `public/index.html:251-255` (textbookInputArea)

**What to do:**

Replace the current `smartInputPanel` content (textarea + file button) with a drag-drop zone + file tags area + supplementary textarea. Do the same for `textbookInputArea`.

**Implementation — smartInputPanel (replace lines 227-242):**

```html
        <div class="ai-input-panel" id="smartInputPanel">
          <!-- Drag & drop zone -->
          <div class="drop-zone" id="smartDropZone">
            <div class="drop-zone-content">
              <svg class="drop-zone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p class="drop-zone-text">拖曳檔案至此，支援 PDF、TXT、MP3、MP4、WAV</p>
              <p class="drop-zone-hint">或點擊此處上傳檔案</p>
            </div>
            <input type="file" class="drop-zone-input" id="smartFileInput" multiple accept=".pdf,.txt,.mp3,.mp4,.wav,.m4a,.ogg,.webm" hidden>
          </div>
          <!-- Uploaded file tags -->
          <div class="file-tags" id="smartFileTags"></div>
          <!-- Supplementary text input -->
          <textarea class="form-textarea form-textarea-lg" id="materialText"
            placeholder="在這裡補充文字說明（選填），或直接打字作為素材..." rows="6"></textarea>
        </div>
```

**Implementation — textbookInputArea (replace lines 252-254):**

```html
      <div class="input-area hidden" id="textbookInputArea">
        <!-- Drag & drop zone -->
        <div class="drop-zone" id="textbookDropZone">
          <div class="drop-zone-content">
            <svg class="drop-zone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p class="drop-zone-text">拖曳課文檔案至此，支援 PDF、TXT、MP3</p>
            <p class="drop-zone-hint">或點擊此處上傳檔案</p>
          </div>
          <input type="file" class="drop-zone-input" id="textbookFileInput" multiple accept=".pdf,.txt,.mp3,.mp4,.wav,.m4a,.ogg,.webm" hidden>
        </div>
        <!-- Uploaded file tags -->
        <div class="file-tags" id="textbookFileTags"></div>
        <!-- Supplementary text input -->
        <textarea class="form-textarea form-textarea-lg" id="textbookText"
          placeholder="貼上課文原文（選填），或直接拖曳課文檔案..." rows="6"></textarea>
      </div>
```

Also remove the old `materialFile`, `fileName` elements and the `file-upload-row` div. Remove the pdfjs-dist CDN script tags from the `<head>` (lines 20-21) since we no longer need them — Gemini handles PDF natively.

**Verify:** Open browser, confirm drop zones render correctly. No JS errors in console.

**Commit:**
```bash
git add public/index.html
git commit -m "feat: replace file upload UI with drag-drop zones for smart and textbook modes"
```

---

### Task 3: app.js — Drag-drop controller and file state management

**Files:**
- Modify: `public/js/app.js`

**What to do:**

Create a `DropZoneManager` that handles drag-drop events, file reading (base64), file tag rendering, and size validation. Manage a `state.uploadedFiles` array of `{ name, mimeType, data, size }` objects. Wire into the generate flow.

**Implementation — add file state to state object (line 12 area):**

```javascript
  const state = {
    // ... existing fields ...
    uploadedFiles: [],       // Array of { name, mimeType, data, size }
    textbookFiles: []        // Separate array for textbook mode
  };
```

**Implementation — add DOM refs (line 35 area):**

```javascript
    smartDropZone:     $('#smartDropZone'),
    smartFileInput:    $('#smartFileInput'),
    smartFileTags:     $('#smartFileTags'),
    textbookDropZone:  $('#textbookDropZone'),
    textbookFileInput: $('#textbookFileInput'),
    textbookFileTags:  $('#textbookFileTags'),
```

Remove the old `materialFile` and `fileName` refs.

**Implementation — DropZone initialization function:**

```javascript
  // ──────────────────────────────────────────────
  // File Upload — Drag & Drop
  // ──────────────────────────────────────────────

  var ALLOWED_TYPES = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'audio/mpeg': 'MP3',
    'audio/mp4': 'MP4',
    'video/mp4': 'MP4',
    'audio/wav': 'WAV',
    'audio/x-wav': 'WAV',
    'audio/ogg': 'OGG',
    'audio/webm': 'WEBM',
    'audio/x-m4a': 'M4A',
    'audio/mp3': 'MP3'
  };

  var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  function initDropZone(dropZoneEl, fileInputEl, fileTagsEl, filesArray, filesKey) {
    if (!dropZoneEl) return;

    // Click to open file picker
    dropZoneEl.addEventListener('click', function (e) {
      if (e.target === fileInputEl) return;
      fileInputEl.click();
    });

    // File input change
    fileInputEl.addEventListener('change', function () {
      handleFiles(this.files, filesArray, filesKey, fileTagsEl);
      this.value = ''; // Reset so same file can be re-selected
    });

    // Drag & drop events
    dropZoneEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZoneEl.classList.add('drop-zone-hover');
    });

    dropZoneEl.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZoneEl.classList.remove('drop-zone-hover');
    });

    dropZoneEl.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZoneEl.classList.remove('drop-zone-hover');
      handleFiles(e.dataTransfer.files, filesArray, filesKey, fileTagsEl);
    });
  }

  function handleFiles(fileList, filesArray, filesKey, fileTagsEl) {
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];

      // Validate type
      var mimeType = file.type;
      // Fallback: detect from extension if MIME is empty
      if (!mimeType) {
        var ext = file.name.split('.').pop().toLowerCase();
        var extMap = { pdf: 'application/pdf', txt: 'text/plain', mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', m4a: 'audio/x-m4a', ogg: 'audio/ogg', webm: 'audio/webm' };
        mimeType = extMap[ext] || '';
      }

      if (!ALLOWED_TYPES[mimeType]) {
        showToast('不支援的檔案格式：' + file.name + '。請上傳 PDF、TXT 或音檔。', 'error');
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        showToast('檔案 ' + file.name + ' 超過 20MB 限制', 'error');
        continue;
      }

      // Read file
      (function (f, mime) {
        if (mime === 'text/plain') {
          // TXT: read as text, append to textarea
          var reader = new FileReader();
          reader.onload = function (ev) {
            // Find the associated textarea
            var textarea;
            if (filesKey === 'uploadedFiles') {
              textarea = dom.materialText;
            } else {
              textarea = dom.textbookText;
            }
            if (textarea) {
              var existing = textarea.value;
              textarea.value = existing + (existing ? '\n\n' : '') + ev.target.result;
            }
            showToast('已載入 ' + f.name + ' 的文字內容', 'success');
          };
          reader.readAsText(f, 'UTF-8');
        } else {
          // Binary files: read as base64 for Gemini multimodal
          var reader = new FileReader();
          reader.onload = function (ev) {
            // ev.target.result is "data:mime;base64,XXXX"
            // Strip the prefix to get raw base64
            var base64 = ev.target.result.split(',')[1];

            state[filesKey].push({
              name: f.name,
              mimeType: mime,
              data: base64,
              size: f.size
            });

            renderFileTags(fileTagsEl, state[filesKey], filesKey);
          };
          reader.onerror = function () {
            showToast('檔案 ' + f.name + ' 讀取失敗', 'error');
          };
          reader.readAsDataURL(f);
        }
      })(file, mimeType);
    }
  }

  function renderFileTags(container, filesArray, filesKey) {
    if (!container) return;
    container.innerHTML = '';

    filesArray.forEach(function (f, index) {
      var tag = document.createElement('span');
      tag.className = 'file-tag';

      var icon = '📄';
      if (f.mimeType.startsWith('audio/') || f.mimeType === 'video/mp4') icon = '🎵';
      if (f.mimeType === 'application/pdf') icon = '📕';

      var sizeStr = f.size < 1024 * 1024
        ? Math.round(f.size / 1024) + 'KB'
        : (f.size / (1024 * 1024)).toFixed(1) + 'MB';

      tag.innerHTML = '<span class="file-tag-icon">' + icon + '</span>'
        + '<span class="file-tag-name">' + f.name + '</span>'
        + '<span class="file-tag-size">' + sizeStr + '</span>';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'file-tag-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = '移除';
      (function (idx) {
        removeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          state[filesKey].splice(idx, 1);
          renderFileTags(container, state[filesKey], filesKey);
        });
      })(index);

      tag.appendChild(removeBtn);
      container.appendChild(tag);
    });
  }
```

**Implementation — update getInputText and generate flow:**

Update `getInputText()` to also return files:

```javascript
  function getInputData() {
    var text = '';
    var files = [];

    if (state.mode === 'ai') {
      if (state.aiInputMode === 'smart') {
        text = (dom.materialText.value || '').trim();
        files = state.uploadedFiles || [];
      } else {
        text = (dom.outlineText.value || '').trim();
        // Outline mode: no files
      }
    } else if (state.mode === 'textbook') {
      text = (dom.textbookText.value || '').trim();
      files = state.textbookFiles || [];
    }

    return { text: text, files: files };
  }
```

Update `initGenerateButton` to use the new function. Replace the validation and call sections:

```javascript
      // Validate input
      var input = getInputData();
      if (!input.text && input.files.length === 0) {
        showToast('請輸入素材或上傳檔案', 'error');
        return;
      }

      // ... in the try block:
      if (state.mode === 'ai') {
        if (state.aiInputMode === 'smart' && typeof window.generatePresentation === 'function') {
          result = await window.generatePresentation(input.text, state, input.files);
        } else if (state.aiInputMode === 'outline' && typeof window.generateFromOutline === 'function') {
          result = await window.generateFromOutline(input.text, state);
        }
      } else if (state.mode === 'textbook' && typeof window.splitTextbook === 'function') {
        result = await window.splitTextbook(input.text, state, input.files);
      }
```

**Implementation — remove old file upload code:**

Delete the entire `initFileUpload()` function (lines 391-413). Remove the `initFileUpload()` call from `DOMContentLoaded`.

**Implementation — add initDropZone calls to DOMContentLoaded:**

```javascript
    // Init drop zones
    initDropZone(dom.smartDropZone, dom.smartFileInput, dom.smartFileTags, state.uploadedFiles, 'uploadedFiles');
    initDropZone(dom.textbookDropZone, dom.textbookFileInput, dom.textbookFileTags, state.textbookFiles, 'textbookFiles');
```

**Verify:** Drag a PDF into the drop zone → file tag appears. Drag a TXT → text fills into textarea. Drag an MP3 → file tag appears with audio icon. Click "開始生成" → API call includes `inlineData` parts in request body (check Network tab). Remove file tag → removed from state.

**Commit:**
```bash
git add public/js/app.js
git commit -m "feat: add drop zone controller with drag-drop, file reading, and multimodal integration"
```

---

### Task 4: styles.css — Drop zone and file tag styles

**Files:**
- Modify: `public/css/styles.css`

**What to do:**

Add CSS for the drag-drop zone, hover/active states, file tags, and responsive layout.

**Implementation:**

```css
/* ── Drop Zone ── */
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-surface);
  margin-bottom: 12px;
}

.drop-zone:hover {
  border-color: var(--accent);
  background: rgba(0, 212, 170, 0.03);
}

.drop-zone-hover {
  border-color: var(--accent) !important;
  background: rgba(0, 212, 170, 0.08) !important;
  box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.15);
}

.drop-zone-content {
  pointer-events: none;
}

.drop-zone-icon {
  color: var(--text-secondary);
  margin-bottom: 12px;
  opacity: 0.6;
}

.drop-zone-text {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 6px;
}

.drop-zone-hint {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

/* ── File Tags ── */
.file-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 0;
}

.file-tags:empty {
  display: none;
}

.file-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.15s;
}

.file-tag:hover {
  border-color: var(--accent);
}

.file-tag-icon {
  font-size: 14px;
}

.file-tag-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tag-size {
  color: var(--text-secondary);
  font-size: 11px;
}

.file-tag-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  margin-left: 2px;
  line-height: 1;
  transition: color 0.15s;
}

.file-tag-remove:hover {
  color: #e74c3c;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .drop-zone {
    padding: 24px 16px;
  }

  .drop-zone-text {
    font-size: 13px;
  }

  .file-tag-name {
    max-width: 100px;
  }
}
```

**Verify:** Check drop zone renders with dashed border, hover highlights, file tags show pill-shaped design with remove button. Test mobile view.

**Commit:**
```bash
git add public/css/styles.css
git commit -m "feat: add drop zone and file tag styles with dark theme support"
```

---

### Task 5: Integration testing and edge cases

**Files:**
- Possibly modify: `public/js/app.js`, `public/js/gemini.js` (minor fixes)

**What to do:**

Test all scenarios end-to-end and fix any issues:

1. **Text only (no files)** — same behavior as before, no regression
2. **PDF only (no text)** — drop PDF → generate → Gemini reads PDF content → JSON output
3. **Audio only** — drop MP3 → generate → Gemini transcribes → JSON output
4. **PDF + text** — drop PDF + type supplementary text → both sent to Gemini
5. **TXT file** — drop TXT → content fills textarea (no multimodal, same as typing)
6. **Multiple files** — drop PDF + MP3 → both appear as tags → both sent as inlineData
7. **File > 20MB** — toast error, file not added
8. **Unsupported format** — toast error
9. **Remove file tag** — file removed from state, re-render tags
10. **Mode switching** — switch AI → textbook → files should be independent per mode
11. **Outline mode** — no drop zone, only textarea (unchanged)
12. **Custom mode** — no input step (Step 3 skipped), no drop zone needed

Edge case fixes:
- Clear `state.uploadedFiles` and `state.textbookFiles` and re-render tags when mode switches (prevent stale files from previous mode)
- Ensure loading text changes to "分析檔案中..." when files are attached
- Handle edge case where user drops file then immediately clicks generate before FileReader finishes (disable generate during file reading, or show loading)

**Verify:** All 12 scenarios work without console errors. Network tab shows correct request body format for multimodal calls. YAML output is valid after file-based generation.

**Commit:**
```bash
git add public/js/app.js public/js/gemini.js
git commit -m "fix: integration testing — multimodal upload edge cases and mode switching"
```
