const express = require('express');
const path = require('path');
const shell = require('shelljs');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/webhook', (req, res) => {
  const deployScript = path.join(__dirname, '../deploy.sh');
  const shellStr = `bash ${deployScript}`; 
  shell.exec(shellStr, { slient: false }, () => {
    shell.echo(`执行：${shellStr}，已经执行完毕`);
  });
  res.json({ message: 'Webhook received' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
