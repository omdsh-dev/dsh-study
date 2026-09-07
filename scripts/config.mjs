import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const UPSTREAM = path.join(ROOT, 'upstream.git');
export const PUBLIC_DATA = path.join(ROOT, 'public', 'data');
export const BRANCH = 'master';

export const UPSTREAM_REPO = 'deepseek-ai/deepseek-harness';
export const UPSTREAM_GITHUB_URL = `https://github.com/${UPSTREAM_REPO}`;
export const UPSTREAM_RAW_URL = `https://raw.githubusercontent.com/${UPSTREAM_REPO}`;

// 提交 diff 中剔除的噪音路径：锁文件、快照、vendored 代码（在脚本内按前缀/文件名过滤）
export const DIFF_EXCLUDE_PREFIXES = [
  'snapshots/', 'vendor/', 'patches/',
];
export const DIFF_EXCLUDE_BASENAMES = [
  'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'Cargo.lock', 'go.sum', 'poetry.lock', 'flake.lock',
];

export const MAX_DIFF_BYTES = 64 * 1024;      // 单提交 diff 上限
export const SHARD_META = 500;                // 元数据分片大小
export const SHARD_DIFF = 200;                // diff 分片大小
export const SHARD_SUMMARY = SHARD_META;      // 摘要分片与元数据对齐
export const TREE_CHECKPOINT_EVERY = 500;     // 每 500 提交存一个全树快照

// DeepSeek
export const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_MODEL = 'deepseek-chat';
export const SUMMARY_CONCURRENCY = 12;
export const DIFF_SNIPPET_FOR_AI = 4000;      // 给 AI 看的 diff 片段长度

export function isDiffNoisePath(p) {
  const base = p.split('/').pop();
  if (DIFF_EXCLUDE_BASENAMES.includes(base)) return true;
  return DIFF_EXCLUDE_PREFIXES.some((pre) => p === pre.slice(0, -1) || p.startsWith(pre));
}

// 顶层模块归类
export function moduleOf(p) {
  const top = p.split('/')[0];
  if (['apps', 'packages', 'python', 'native', 'docs', 'benchmarks', 'scripts', 'website', 'vendor', 'snapshots', 'patches'].includes(top)) return top;
  if (top.startsWith('.')) return '.config';
  return '(root)';
}
