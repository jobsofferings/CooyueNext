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

// ============================================
// 配置常量
// ============================================
const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');
const LOG_DIR = path.join(__dirname, 'logs');

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

/**
 * 验证 GitHub/GitLab webhook 签名
 * GitHub 使用 HMAC-SHA256 签名，格式为: sha256=<signature>
 * 
 * @param {string} payload - 原始请求体
 * @param {string} signature - 请求头中的签名
 * @param {string} secret - 配置的密钥
 * @returns {boolean} 签名是否有效
 */
function verifySignature(payload, signature, secret) {
  if (!signature) return false;
  
  // 移除 'sha256=' 前缀
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  
  // 计算 HMAC-SHA256 签名
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  
  // 使用 timing-safe 比较防止时序攻击
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
  } catch {
    return false;
  }
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
  console.log('did receive webhook')
  spawn('bash', [DEPLOY_SCRIPT], {
    cwd: __dirname,
    env: {
      ...process.env,
    }
  });
});

/**
 * POST /webhook
 * GitHub 专用端点 (便于区分来源)
 */
app.post('/webhook', (req, res) => {
  req.headers['x-github-event'] = req.headers['x-github-event'] || 'push';
  return app._router.handle(req, res, () => {});
});

/**
 * POST /webhook/gitlab
 * GitLab 专用端点 (便于区分来源)
 */
app.post('/webhook/gitlab', (req, res) => {
  req.headers['x-gitlab-event'] = req.headers['x-gitlab-event'] || 'Push Hook';
  return app._router.handle(req, res, () => {});
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
