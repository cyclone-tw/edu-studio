const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// PDF API route（後續 Task 實作）
// app.use('/api', require('./routes/pdf'));

app.listen(PORT, () => {
  console.log(`NBLM 簡報生成助手 running on port ${PORT}`);
});
