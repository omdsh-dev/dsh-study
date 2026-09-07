#!/usr/bin/env node
// 构建提交流搜索索引：{authors:[], rows:[[sha8, ts, authorIdx, subject], ...]}（老→新）
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PUBLIC_DATA } from './config.mjs';
import { readShard } from './shard-io.mjs';

const COMMITS_DIR = path.join(PUBLIC_DATA, 'commits');
const metaFiles = [...new Set(
  fs.readdirSync(COMMITS_DIR)
    .filter((f) => /^meta-\d+\.json(\.gz)?$/.test(f))
    .map((f) => f.replace(/\.gz$/, '')),
)].sort();
const authors = [];
const authorIdx = new Map();
const rows = [];
for (const f of metaFiles) {
  const metas = readShard(path.join(COMMITS_DIR, f));
  for (const m of metas) {
    let ai = authorIdx.get(m.an);
    if (ai === undefined) { ai = authors.length; authors.push(m.an); authorIdx.set(m.an, ai); }
    rows.push([m.h.slice(0, 8), m.t, ai, m.s]);
  }
}
const out = JSON.stringify({ authors, rows });
fs.writeFileSync(path.join(PUBLIC_DATA, 'search-index.json.gz'), zlib.gzipSync(Buffer.from(out), { level: 6 }));
console.log(`search-index: ${rows.length} rows, ${authors.length} authors, ${(Buffer.byteLength(out) / 1048576).toFixed(1)}MB raw`);
