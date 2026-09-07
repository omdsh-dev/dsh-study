// 客户端数据工具：.json.gz 透明解压 + 格式化
import { ungzip } from 'pako';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const B = BASE;
export const DATA = (f) => `${BASE}data/${f}`;

export async function fetchJSON(file) {
  const res = await fetch(DATA(file));
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // 兼容两种服务器行为：有的对 .gz 自动 Content-Encoding 解压（魔数已不是 1f8b）
  const isGz = buf[0] === 0x1f && buf[1] === 0x8b;
  const text = isGz ? ungzip(buf, { to: 'string' }) : new TextDecoder().decode(buf);
  return JSON.parse(text);
}

export const shardN = (n, w = 5) => String(n).padStart(w, '0');

export function fmtDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}
export function fmtDateTime(ts) {
  const d = new Date(ts * 1000);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}
export function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Number(n).toLocaleString('en-US');
}
export function ago(ts) {
  const s = Date.now() / 1000 - ts;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} 分钟前`;
  if (s < 86400) return `${Math.round(s / 3600)} 小时前`;
  return `${Math.round(s / 86400)} 天前`;
}

export const REPO = 'deepseek-ai/deepseek-harness';
export const githubCommit = (sha) => `https://github.com/${REPO}/commit/${sha}`;
export const rawAt = (sha, path) => `https://raw.githubusercontent.com/${REPO}/${sha}/${path}`;
