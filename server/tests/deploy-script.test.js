const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { prepareChanges, sensitiveText, sensitivePath, validateRepository } = require('../../scripts/deploy-git.cjs');

function repository(context) {
  const base = mkdtempSync(path.join(tmpdir(), 'cooyue-deploy-test-'));
  context.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'work');
  const remote = path.join(base, 'remote.git');
  mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main');
  git('init', '--bare', remote);
  git('config', 'user.name', 'Deployment Test');
  git('config', 'user.email', 'test@example.invalid');
  writeFileSync(path.join(root, 'README.md'), 'initial\n');
  writeFileSync(path.join(root, '.gitignore'), '.env\n');
  git('add', '-A'); git('commit', '-m', 'initial');
  git('remote', 'add', 'origin', remote); git('push', '-u', 'origin', 'main');
  return { root, remote, git };
}

test('one-button preparation commits staged, unstaged and untracked ordinary files, leaving ignored env untouched', context => {
  const { root, git } = repository(context);
  writeFileSync(path.join(root, 'staged.txt'), 'staged'); git('add', 'staged.txt');
  writeFileSync(path.join(root, 'README.md'), 'updated');
  writeFileSync(path.join(root, 'new.txt'), 'new');
  writeFileSync(path.join(root, '.env'), 'private local configuration');
  prepareChanges(root);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'));
  assert.equal(git('log', '-1', '--format=%s'), 'chore: deploy Cooyue');
  assert.equal(git('show', 'HEAD:staged.txt'), 'staged');
  assert.equal(git('show', 'HEAD:README.md'), 'updated');
  assert.equal(git('show', 'HEAD:new.txt'), 'new');
  assert.equal(readFileSync(path.join(root, '.env'), 'utf8'), 'private local configuration');
  assert.equal(git('ls-files', '.env'), '');
  const head = git('rev-parse', 'HEAD');
  prepareChanges(root);
  assert.equal(git('rev-parse', 'HEAD'), head);
});

test('check mode is nonmutating and webhook mode refuses to stash or commit local changes', context => {
  const { root, git } = repository(context);
  writeFileSync(path.join(root, 'README.md'), 'staged work'); git('add', 'README.md');
  const before = git('status', '--porcelain');
  const head = git('rev-parse', 'HEAD');
  prepareChanges(root, 'check');
  assert.throws(() => prepareChanges(root, 'pull-only'), /Webhook/);
  assert.equal(git('status', '--porcelain'), before);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('stash', 'list'), '');
});

test('sensitive filename or added literal credentials stop before staging or committing', context => {
  const { root, git } = repository(context);
  const head = git('rev-parse', 'HEAD');
  writeFileSync(path.join(root, 'private.key'), 'must not be published');
  assert.throws(() => prepareChanges(root), /敏感文件/);
  rmSync(path.join(root, 'private.key'));
  const credential = ['const ', 'providerApiKey', ' = ', '"', 'real-credential-value-123456', '";'].join('');
  writeFileSync(path.join(root, 'config.js'), credential);
  assert.throws(() => prepareChanges(root), /疑似凭据/);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached', '--name-only'), '');
  assert(sensitiveText(credential));
  assert(sensitivePath('nested/.env.production'));
  assert(sensitivePath('nested/id_ed25519'));
  assert.equal(sensitivePath('server/src/modules/agent/security.js'), false);
});

test('push rejection stops the release but preserves the new local commit for recovery', context => {
  const { root, remote, git } = repository(context);
  const previous = git('rev-parse', 'origin/main');
  writeFileSync(path.join(remote, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  writeFileSync(path.join(root, 'README.md'), 'new release');
  assert.throws(() => prepareChanges(root));
  assert.notEqual(git('rev-parse', 'HEAD'), previous);
  assert.equal(git('rev-parse', 'origin/main'), previous);
  assert.equal(git('status', '--porcelain'), '');
  rmSync(path.join(remote, 'hooks/pre-receive'));
  prepareChanges(root);
  assert.equal(git('rev-parse', 'origin/main'), git('rev-parse', 'HEAD'));
});

test('entry rejects wrong repository and script only fast-forwards without stash or destructive reset', context => {
  const { root } = repository(context);
  assert.throws(() => validateRepository(root), /部署目录/);
  const script = readFileSync(path.resolve(__dirname, '../../deploy.sh'), 'utf8');
  assert.match(script, /git pull --ff-only origin main/);
  assert.doesNotMatch(script, /git stash|git reset|git clean/);
  execFileSync('sh', ['-n', path.resolve(__dirname, '../../deploy.sh')]);
  const help = execFileSync('bash', [path.resolve(__dirname, '../../deploy.sh'), '--help'], { encoding: 'utf8' });
  assert.match(help, /暂存区/);
});

test('Compose uses the production Dockerfile with locked dependencies and bounded build memory', () => {
  const root = path.resolve(__dirname, '../..');
  const compose = readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
  assert.match(compose, /next-app:\s+build:\s+context: \.\/next\s+dockerfile: docker\/Dockerfile/);
  const dockerfile = readFileSync(path.join(root, 'next/docker/Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY package\.json yarn\.lock \.\//);
  assert.match(dockerfile, /SCARF_ANALYTICS=false DO_NOT_TRACK=1 yarn install --frozen-lockfile/);
  assert.match(dockerfile, /NODE_OPTIONS=--max-old-space-size=1024 yarn build/);
});
