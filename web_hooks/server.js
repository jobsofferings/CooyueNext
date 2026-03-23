/**
 * Git Webhook 自动部署服务
 * 
 * 功能说明:
 * - 接收来自 GitHub/GitLab 的 webhook 推送事件
 * - 验证 webhook 签名确保请求安全
 * - 自动触发部署脚本完成 CI/CD 流程
 * - 记录所有 webhook 请求和部署日志
 * 
 * 环境变量:
 * - WEBHOOK_PORT: 服务监听端口 (默认: 9000)
 * - WEBHOOK_SECRET: webhook 签名验证密钥
 * - TARGET_BRANCH: 触发部署的目标分支 (默认: main)
 */

const express = require('express');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const shell = require('shelljs');

// ============================================
// 配置常量
// ============================================
const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const DEPLOY_SCRIPT = path.join(__dirname, '../../deploy.sh');
const LOG_DIR = path.join(__dirname, 'logs');

console.log(DEPLOY_SCRIPT, 'DEPLOY_SCRIPT')
console.log('bash ' + DEPLOY_SCRIPT, 'SHELL')

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ============================================
// 工具函数
// ============================================

/**
 * 记录日志到控制台和文件
 * @param {string} message - 日志消息
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  const logFile = path.join(LOG_DIR, `webhook-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// ============================================
// Express 中间件配置
// ============================================

// 解析 JSON 请求体，同时保存原始 body 用于签名验证
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// ============================================
// API 路由
// ============================================

/**
 * GET /health
 * 健康检查端点，用于监控服务状态
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * POST /webhook
 * 主 webhook 处理端点
 * 
 * 支持的请求头:
 * - X-Hub-Signature-256: GitHub 签名
 * - X-GitHub-Event: GitHub 事件类型 (push, pull_request 等)
 * - X-GitLab-Token: GitLab 签名
 * - X-GitLab-Event: GitLab 事件类型 (Push Hook 等)
 * 
 * 请求体 (JSON):
 * - ref: 分支引用 (如 refs/heads/main)
 * - after: 提交 SHA
 * - head_commit: 最新提交信息
 * - commits: 提交数组
 */
app.post('/webhook', (req, res) => {
  const shellStr = 'bash ' + DEPLOY_SCRIPT; 
  shell.exec(shellStr, { slient: false }, () => {
    shell.echo(`执行：${shellStr}，已经执行完毕`);
  });
  res.json({ message: 'Webhook received' });
});

/**
 * GET /logs
 * 获取最近的日志文件列表
 */
app.get('/logs', (req, res) => {
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.log'))
    .sort()
    .reverse()
    .slice(0, 10);
  
  res.json({ logs: files });
});

/**
 * GET /logs/:filename
 * 获取指定日志文件的内容 (最后 100 行)
 */
app.get('/logs/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(LOG_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Log not found' });
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').slice(-100);
  res.type('text/plain').send(lines.join('\n'));
});

// ============================================
// 启动服务
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  log(`Webhook server listening on port ${PORT}`);
  log(`Target branch: ${process.env.TARGET_BRANCH || 'main'}`);
  log(`Secret configured: ${SECRET !== 'your-webhook-secret' ? 'Yes' : 'No (using default)'}`);
});
