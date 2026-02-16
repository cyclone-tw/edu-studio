const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`NBLM 簡報生成助手 running on port ${PORT}`);
});
