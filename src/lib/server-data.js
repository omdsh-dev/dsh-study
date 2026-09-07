// 服务端（Astro frontmatter 构建期）读取 public/data，兼容 .json 与 .json.gz
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

export const DATA_DIR = path.join(process.cwd(), 'public', 'data');

export function readShard(p) {
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  if (fs.existsSync(p + '.gz')) return JSON.parse(zlib.gunzipSync(fs.readFileSync(p + '.gz')));
  throw new Error(`shard 不存在: ${p}`);
}

export const dataFile = (...n) => path.join(DATA_DIR, ...n);
