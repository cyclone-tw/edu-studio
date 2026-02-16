const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// PDF API route
app.use('/api', require('./routes/pdf'));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: '檔案上傳錯誤: ' + err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.listen(PORT, () => {
  console.log(`NBLM 簡報生成助手 running on port ${PORT}`);
});
