(function() {
  const dropzone = document.getElementById('pdfDropzone');
  const fileInput = document.getElementById('pdfFileInput');
  const progressContainer = document.getElementById('pdfProgress');
  const progressBar = document.getElementById('pdfProgressBar');
  const progressText = document.getElementById('pdfProgressText');
  const resultsContainer = document.getElementById('pdfResults');
  const resultsGrid = document.getElementById('pdfResultsGrid');
  const downloadAllBtn = document.getElementById('btnDownloadAllImages');

  // Guard: if PDF panel elements are missing, skip initialization
  if (!dropzone || !fileInput || !downloadAllBtn) {
    console.warn('[pdf-splitter] PDF panel elements not found, skipping initialization');
    return;
  }

  let lastZipBlob = null;
  let lastFileName = '';

  // Drag and drop events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadPdf(file);
    } else {
      window.showToast('請上傳 PDF 格式檔案', 'error');
    }
  });

  // Click to select file
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadPdf(file);
  });

  // Download all button
  downloadAllBtn.addEventListener('click', () => {
    if (lastZipBlob) {
      const url = URL.createObjectURL(lastZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = lastFileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  async function uploadPdf(file) {
    // Show progress, hide results
    progressContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    resultsGrid.innerHTML = '';
    progressBar.style.width = '0%';
    progressText.textContent = '上傳中...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use XMLHttpRequest for upload progress tracking
      const zipBlob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/pdf-to-images');
        xhr.responseType = 'blob';

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 50); // Upload is 0-50%
            progressBar.style.width = pct + '%';
            progressText.textContent = `上傳中... ${pct}%`;
          }
        };

        xhr.onprogress = (e) => {
          // Download progress 50-90%
          progressBar.style.width = '70%';
          progressText.textContent = '轉換中...';
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            progressBar.style.width = '100%';
            progressText.textContent = '完成！';
            resolve(xhr.response);
          } else {
            // Try to parse error
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const err = JSON.parse(reader.result);
                reject(new Error(err.error || '轉換失敗'));
              } catch {
                reject(new Error('轉換失敗'));
              }
            };
            reader.readAsText(xhr.response);
          }
        };

        xhr.onerror = () => reject(new Error('網路錯誤'));
        xhr.send(formData);
      });

      lastZipBlob = zipBlob;
      lastFileName = file.name.replace('.pdf', '') + '-slides.zip';

      // Extract and display thumbnails from ZIP
      // Use JSZip if available, otherwise just show download button
      await displayResults(zipBlob);

      window.showToast('PDF 轉換完成！', 'success');

    } catch (err) {
      progressText.textContent = '轉換失敗';
      progressBar.style.width = '0%';
      window.showToast(err.message || 'PDF 轉換失敗', 'error');
    }
  }

  async function displayResults(zipBlob) {
    resultsContainer.classList.remove('hidden');
    resultsGrid.innerHTML = '';

    // Try to extract images from ZIP for preview
    // If JSZip is not available, just show the download button
    try {
      // Dynamically load JSZip if not present
      if (typeof JSZip === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js');
      }

      const zip = await JSZip.loadAsync(zipBlob);
      const entries = Object.keys(zip.files).filter(n => n.endsWith('.png')).sort();

      for (const name of entries) {
        const blob = await zip.files[name].async('blob');
        const url = URL.createObjectURL(blob);

        const card = document.createElement('div');
        card.className = 'pdf-result-card';
        card.innerHTML = `
          <img src="${url}" alt="${name}" class="pdf-result-img">
          <div class="pdf-result-info">
            <span class="pdf-result-name">${name}</span>
            <a href="${url}" download="${name}" class="btn btn-secondary btn-xs">下載</a>
          </div>
        `;
        resultsGrid.appendChild(card);
      }
    } catch (e) {
      // If JSZip fails, just show download all button
      resultsGrid.innerHTML = '<p style="color: var(--text-secondary);">圖片預覽不可用，請點擊「全部下載」取得 ZIP 檔案</p>';
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
})();
