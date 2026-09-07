#!/usr/bin/env node
// 将 public/data/**.json 压缩为 .json.gz（浏览器端用 DecompressionStream 透明解压）。
// 摘要/提取脚本读写时同时兼容两种后缀。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PUBLIC_DATA } from './config.mjs';

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let rawBytes = 0, gzBytes = 0, n = 0;
for (const p of walk(PUBLIC_DATA)) {
  if (!p.endsWith('.json')) continue;
  // 已有 .gz 也重新压缩覆盖（数据可能已更新）
  const buf = fs.readFileSync(p);
  const gz = zlib.gzipSync(buf, { level: 6 });
  fs.writeFileSync(p + '.gz', gz);
  fs.unlinkSync(p);
  rawBytes += buf.length; gzBytes += gz.length; n++;
  process.stdout.write(`\r${n} 文件`);
}
console.log(`\n压缩 ${n} 个分片：${(rawBytes / 1048576).toFixed(1)}MB → ${(gzBytes / 1048576).toFixed(1)}MB`);
