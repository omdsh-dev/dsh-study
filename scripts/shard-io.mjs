// 分片读写工具：兼容 .json 与 .json.gz
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function readShard(p) {
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  if (fs.existsSync(p + '.gz')) return JSON.parse(zlib.gunzipSync(fs.readFileSync(p + '.gz')));
  throw new Error(`shard 不存在: ${p}`);
}

export function shardExists(p) {
  return fs.existsSync(p) || fs.existsSync(p + '.gz');
}

export function writeShard(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p + '.gz', zlib.gzipSync(Buffer.from(JSON.stringify(data)), { level: 6 }));
}
