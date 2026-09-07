#!/usr/bin/env node
// CI/本地统一的同步编排器：fetch 上游 → 全量重提取 → 摘要增量回填 → 压缩 → 构建就绪
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, UPSTREAM } from './config.mjs';

const run = (cmd, args, env = {}) => {
  console.log(`\n=== ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} 失败（exit ${r.status}）`);
};

// 1) 上游仓库：有缓存就 fetch，否则裸 clone
if (fs.existsSync(path.join(UPSTREAM, 'config'))) {
  run('git', ['--git-dir', UPSTREAM, 'fetch', 'origin', '+refs/heads/*:refs/heads/*', '--prune']);
} else {
  run('git', ['clone', '--bare', 'https://github.com/deepseek-ai/deepseek-harness', UPSTREAM]);
}

// 2) 数据管线（extract 全量重跑，幂等；摘要只补缺分片）
run('node', ['scripts/extract.mjs']);
run('node', ['scripts/extract-notes.mjs']);
run('node', ['scripts/extract-work.mjs']);
run('node', ['scripts/build-search-index.mjs']);
if (!process.env.SKIP_GITHUB_META) run('node', ['scripts/github-meta.mjs']);
if (process.env.DEEPSEEK_API_KEY) {
  run('node', ['scripts/summarize.mjs']);
  run('node', ['scripts/summarize-work.mjs']);
} else {
  console.warn('未设 DEEPSEEK_API_KEY，跳过摘要增量（仅更新元数据）');
}

// 3) 压缩 + 构建
run('node', ['scripts/compress.mjs']);
run('pnpm', ['build']);
console.log('\n同步完成 ✓');
