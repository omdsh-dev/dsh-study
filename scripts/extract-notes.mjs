#!/usr/bin/env node
// 提取 .agents/notes/** 的 Agent Notes（设计决策记录）：
// 路径编码 {lifecycle}/{class}/yyyy-mm-dd-slug.md(+.zh.md/.i18n.yaml)
// 输出 public/data/notes.json（索引），正文由前端按需从 raw CDN 拉取。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { UPSTREAM, PUBLIC_DATA, BRANCH } from './config.mjs';

function git(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['--git-dir', UPSTREAM, ...args], { maxBuffer: 1 << 28 });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    if (input) p.stdin.write(input);
    p.stdin.end();
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`git failed: ${err.slice(0, 300)}`))));
  });
}

const NOTES_PATH = '.agents/notes';

async function main() {
  const tree = await git(['ls-tree', '-r', BRANCH, '--', NOTES_PATH]);
  // sha -> {paths}
  const blobs = new Map();
  const notes = [];
  for (const line of tree.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    const [mode, type, sha] = line.slice(0, tab).split(/\s+/);
    const p = line.slice(tab + 1);
    if (type !== 'blob') continue;
    const rel = p.slice(NOTES_PATH.length + 1);
    const m = rel.match(/^(proposed|implemented|rejected|archived)\/([a-z-]+)\/(\d{4}-\d{2}-\d{2})-(.+?)(\.zh)?\.md$/);
    if (!m) continue;
    const [, lifecycle, cls, date, slug, zh] = m;
    if (!zh) {
      const n = { lifecycle, cls, date, slug, sha, tEn: '', tZh: '', status: lifecycle };
      notes.push(n);
      blobs.set(sha, { n, lang: 'en' });
    } else {
      // 找到对应 en 记录
      const en = notes.find((x) => x.slug === slug && x.cls === cls && x.date === date && x.lifecycle === lifecycle);
      if (en) { blobs.set(sha, { n: en, lang: 'zh' }); }
    }
  }

  // cat-file --batch 批量取内容头部（字节游标解析：<sha> blob <size>\n<content>\n）
  const shas = [...blobs.keys()];
  const text = await git(['cat-file', '--batch'], { input: shas.join('\n') + '\n' });
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf('\n', pos);
    if (nl < 0) break;
    const header = text.slice(pos, nl);
    const hm = header.match(/^([0-9a-f]{40}) blob (\d+)$/);
    if (!hm) { pos = nl + 1; continue; } // "<sha> missing" 等异常行
    const size = parseInt(hm[2], 10);
    const body = text.substr(nl + 1, size);
    pos = nl + 1 + size + 1;
    const entry = blobs.get(hm[1]);
    if (!entry) continue;
    const lines = body.split('\n');
    const title = (lines[0] || '').replace(/^#\s*(Agent Note:)?\s*/, '').trim();
    const statusLine = lines.find((l) => l.startsWith('Status:'));
    const archivedLine = lines.find((l) => l.startsWith('Archived:'));
    if (entry.lang === 'en') {
      entry.n.tEn = title;
      if (statusLine) entry.n.status = statusLine.split(':')[1].trim();
      if (archivedLine) entry.n.arch = archivedLine.split(':')[1].trim();
    } else {
      entry.n.tZh = title;
    }
  }

  // 排序：日期倒序
  notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1));
  const summary = {
    generatedAt: Date.now(),
    headSha: (await git(['rev-parse', BRANCH])).trim(),
    total: notes.length,
    byLifecycle: {},
    byClass: {},
  };
  for (const n of notes) {
    summary.byLifecycle[n.lifecycle] = (summary.byLifecycle[n.lifecycle] || 0) + 1;
    summary.byClass[n.cls] = (summary.byClass[n.cls] || 0) + 1;
  }
  fs.writeFileSync(path.join(PUBLIC_DATA, 'notes.json'), JSON.stringify({ ...summary, notes }, null, 1));
  console.log(`Agent Notes：${notes.length} 篇`, JSON.stringify(summary.byLifecycle), JSON.stringify(summary.byClass));
}

main().catch((e) => { console.error(e); process.exit(1); });
