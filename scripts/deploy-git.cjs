const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync, lstatSync } = require('node:fs');
const path = require('node:path');

function git(root, args, inherited = false) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: inherited ? 'inherit' : 'pipe' });
}

function sensitivePath(filename) {
  return filename.split('/').some(part => /^\.env(?:\.|$)|^\.npmrc$|^credentials|(?:^|[._-])(?:secrets?|tokens?)(?:[._-]|$)|^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)|\.(?:pem|key|p12|pfx)$/i.test(part));
}

function sensitiveText(text) {
  if (/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/.test(text) || /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{25,})\b/.test(text)) return true;
  const assignment = /(?:[A-Za-z0-9_]*(?:api[_-]?key|password|passwd|secret|access[_-]?token|auth[_-]?token)[A-Za-z0-9_]*)["']?\s*[:=]\s*(["'`])([^"'`\r\n]{8,})\1/gi;
  for (const match of text.matchAll(assignment)) {
    if (!/\$\{|process\.env|^your[-_]|^replace[-_]|^example|^<|^\*+$/.test(match[2])) return true;
  }
  return /^\s*[A-Z0-9_]*(?:API_KEY|PASSWORD|SECRET|TOKEN)\s*=\s*(?!["']|\$|$|your[-_]|replace[-_]|<)[^\s#]{8,}\s*$/m.test(text);
}

function auditFiles(root, paths, base) {
  const fingerprint = createHash('sha256');
  for (const filename of paths) {
    if (sensitivePath(filename)) throw new Error(`敏感文件禁止自动提交: ${filename}`);
    let content;
    try {
      if (lstatSync(path.join(root, filename)).isSymbolicLink()) throw new Error(`符号链接需要人工审核: ${filename}`);
      content = readFileSync(path.join(root, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      content = Buffer.alloc(0);
    }
    fingerprint.update(filename).update(content);
    const tracked = git(root, ['ls-files', '--', filename]).trim();
    const text = tracked
      ? git(root, ['diff', '--no-ext-diff', '--unified=0', base, '--', filename]).split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n')
      : content.includes(0) ? '' : content.toString('utf8');
    if (sensitiveText(text)) throw new Error(`疑似凭据内容，停止提交；请人工检查: ${filename}`);
  }
  return fingerprint.digest('hex');
}

function inspectChanges(root) {
  const status = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const paths = [...new Set([
    ...git(root, ['diff', '--name-only', '-z', 'HEAD']).split('\0'),
    ...git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean))].sort();
  return { status, paths, fingerprint: auditFiles(root, paths, 'HEAD') };
}

function prepareChanges(root, mode = 'publish') {
  const before = inspectChanges(root);
  if (mode === 'pull-only') {
    if (before.status) throw new Error('Webhook 只拉取部署：工作区或暂存区有改动，未 stash、提交或覆盖；请手动执行 bash deploy.sh。');
    return;
  }
  if (mode === 'check') {
    console.log(`检查通过；待提交 ${before.paths.length} 个文件（包含暂存、未暂存和新增文件，不包含 Git 忽略文件）。`);
    for (const filename of before.paths) console.log(`  ${filename}`);
    return;
  }
  const unpublished = Number(git(root, ['rev-list', '--count', 'origin/main..HEAD']).trim());
  if (unpublished) {
    const paths = git(root, ['diff', '--name-only', '-z', 'origin/main', 'HEAD']).split('\0').filter(Boolean);
    auditFiles(root, paths, 'origin/main');
    const history = git(root, ['log', '-p', '--format=', '--no-ext-diff', '--diff-filter=AM', 'origin/main..HEAD']);
    const additions = history.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n');
    if (sensitiveText(additions)) throw new Error('未推送提交中存在疑似凭据，请人工检查提交历史；未执行推送。');
  }
  if (before.status) {
    const current = inspectChanges(root);
    if (current.status !== before.status || current.fingerprint !== before.fingerprint) throw new Error('检查期间文件发生变化，停止自动提交，请重试。');
    git(root, ['add', '-A'], true);
    git(root, ['commit', '-m', 'chore: deploy Cooyue'], true);
  }
  if (before.status || unpublished) git(root, ['push', 'origin', 'HEAD'], true);
  if (git(root, ['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('提交/推送后出现新改动，停止部署，请检查工作区。');
  console.log(before.status || unpublished ? '✓ 本地变更已提交并推送' : '✓ 工作区干净，无待推送提交');
}

function validateRepository(root) {
  if (root !== '/root/CooyueNext' || git(root, ['rev-parse', '--show-toplevel']).trim() !== root) throw new Error('部署目录必须是 /root/CooyueNext');
  if (git(root, ['branch', '--show-current']).trim() !== 'main') throw new Error('只能部署 main 分支');
  const remotes = ['https://github.com/jobsofferings/CooyueNext.git', 'git@github.com:jobsofferings/CooyueNext.git', 'ssh://git@github.com/jobsofferings/CooyueNext.git'];
  if (!remotes.includes(git(root, ['remote', 'get-url', 'origin']).trim())) throw new Error('origin 不是允许的 Cooyue 仓库');
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const mode = process.argv[2] || 'publish';
    if (!['publish', 'pull-only', 'check'].includes(mode)) throw new Error('未知部署模式');
    validateRepository(root);
    prepareChanges(root, mode);
  } catch (error) {
    console.error(`部署前检查失败: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspectChanges, prepareChanges, sensitivePath, sensitiveText, validateRepository };
