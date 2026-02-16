const express = require('express');
const router = express.Router();
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('只接受 PDF 檔案'));
  }
});

// Lazy-load pdfjs-dist (ESM module) and canvas
let pdfjsLib = null;
let createCanvasFn = null;

async function getPdfLib() {
  if (!pdfjsLib) {
    const pdfjs = await import('pdfjs-dist');
    pdfjsLib = pdfjs;
    // Disable worker for Node.js environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
  if (!createCanvasFn) {
    createCanvasFn = require('canvas').createCanvas;
  }
  return { pdfjsLib, createCanvas: createCanvasFn };
}

router.post('/pdf-to-images', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '請上傳 PDF 檔案' });
  }

  const pdfPath = req.file.path;
  const outputDir = path.join('uploads', `output-${Date.now()}`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const { pdfjsLib, createCanvas } = await getPdfLib();

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfDoc = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
    const numPages = pdfDoc.numPages;

    const imageFiles = [];
    const scale = 2.0; // High resolution

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      const pngBuffer = canvas.toBuffer('image/png');
      const filename = `slide-${String(i).padStart(2, '0')}.png`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, pngBuffer);
      imageFiles.push({ filepath, filename });
    }

    // Create ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace('.pdf', '')}-slides.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const { filepath, filename } of imageFiles) {
      archive.file(filepath, { name: filename });
    }

    await archive.finalize();

    // Cleanup after response
    res.on('finish', () => {
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
        fs.unlinkSync(pdfPath);
      } catch (e) { /* ignore */ }
    });

  } catch (err) {
    // Cleanup on error
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.unlinkSync(pdfPath);
    } catch (e) { /* ignore */ }

    console.error('PDF conversion error:', err);
    res.status(500).json({ error: 'PDF 轉換失敗: ' + err.message });
  }
});

module.exports = router;
