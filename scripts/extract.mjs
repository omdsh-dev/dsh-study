#!/usr/bin/env node
// 从裸仓库全量提取：提交元数据 / 变更状态 / 过滤后 diff / 文件树 checkpoint+delta / 统计
// 输出到 public/data/，分片对齐：meta/delta/summary 每 500 提交一片，diff 每 200 提交一片。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  ROOT, UPSTREAM, PUBLIC_DATA, BRANCH, isDiffNoisePath, moduleOf,
  MAX_DIFF_BYTES, SHARD_META, SHARD_DIFF, TREE_CHECKPOINT_EVERY,
} from './config.mjs';

const COMMITS_DIR = path.join(PUBLIC_DATA, 'commits');
const DIFFS_DIR = path.join(PUBLIC_DATA, 'diffs');
const TREE_DIR = path.join(PUBLIC_DATA, 'tree');

const pad = (n, w = 5) => String(n).padStart(w, '0');
const clean = (s) => s.replace(/[\u0000-\u001f]/g, ' ').trim();

function git(args, { maxBuf = 512 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['--git-dir', UPSTREAM, ...args], { maxBuffer: maxBuf });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`git ${args[0]} failed: ${err.slice(0, 500)}`))));
  });
}

// 流式读取 git log，按 "\x01<40位sha>" 行切分记录
function streamGitLog(args, onRecord) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['--git-dir', UPSTREAM, ...args]);
    let buf = '', rec = null, total = 0;
    p.stdout.on('data', (d) => {
      buf += d.toString();
      const parts = buf.split('\n');
      buf = parts.pop(); // 保留不完整尾行
      for (const line of parts) {
        const isHeader = line.length === 41 && line.charCodeAt(0) === 1;
        if (isHeader) {
          if (rec) { onRecord(rec); total++; }
          rec = { sha: line.slice(1), body: [] };
        } else if (rec) rec.body.push(line);
      }
    });
    p.stderr.on('data', (d) => process.stderr.write(d));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`git ${args.join(' ')} exited ${code}`));
      if (rec) { onRecord(rec); total++; }
      resolve(total);
    });
  });
}

// ---------- Pass 1: 元数据 ----------
async function passMeta() {
  const commits = [];
  const F = '\x1f';
  const fmt = `%x01%H${F}%P${F}%an${F}%ae${F}%at${F}%s${F}%b%x1e`;
  const out = await git(['log', '--reverse', `--format=${fmt}`, BRANCH]);
  for (const recText of out.split('\x01')) {
    if (!recText.trim()) continue;
    const fields = recText.split('\x1e')[0].split(F);
    if (fields.length < 6) continue;
    const [sha, parents, an, ae, at, s, ...bodyRest] = fields;
    commits.push({
      h: sha,
      i: commits.length,
      t: parseInt(at, 10),
      an: clean(an),
      ae,
      s: clean(s).slice(0, 200),
      b: clean(bodyRest.join(F)).slice(0, 800),
      m: parents ? 1 : 0,
    });
  }
  return commits;
}

// ---------- Pass 2: 变更状态（全路径，含 blob sha） ----------
async function passStatus(shaSet) {
  const map = new Map(); // sha -> ops[]
  await streamGitLog(
    ['log', '--reverse', '--format=%x01%H', '--raw', '--no-abbrev', '-M', '--diff-merges=first-parent', BRANCH],
    (rec) => {
      if (!shaSet.has(rec.sha)) return;
      const ops = [];
      for (const line of rec.body) {
        if (!line.startsWith(':')) continue;
        // :100644 100644 old new ST<TAB>path[<TAB>newPath]
        const tab = line.indexOf('\t');
        const meta = line.slice(1, tab).split(' ');
        const paths = line.slice(tab + 1).split('\t');
        const st = meta[4][0]; // A M D T R C
        const op = { st, p: paths[0] };
        if (st === 'R' || st === 'C') op.np = paths[1];
        ops.push(op);
      }
      if (ops.length) map.set(rec.sha, ops);
    },
  );
  return map;
}

// ---------- Pass 3: numstat 总量（未过滤） ----------
async function passNumstat(shaSet) {
  const map = new Map();
  await streamGitLog(
    ['log', '--reverse', '--format=%x01%H', '--numstat', '--diff-merges=first-parent', BRANCH],
    (rec) => {
      if (!shaSet.has(rec.sha)) return;
      let f = 0, add = 0, del = 0;
      for (const line of rec.body) {
        if (!line || line.startsWith(':')) continue;
        const m = line.match(/^(\d+|-)\t(\d+|-)\t/);
        if (!m) continue;
        f++; if (m[1] !== '-') add += +m[1]; if (m[2] !== '-') del += +m[2];
      }
      map.set(rec.sha, [f, add, del]);
    },
  );
  return map;
}

// ---------- Pass 4: 过滤后 diff 正文，写分片 ----------
async function passDiffs(commits) {
  fs.mkdirSync(DIFFS_DIR, { recursive: true });
  const shardSize = SHARD_DIFF;
  let shard = {}, shardIdx = 0, count = 0;
  const flush = () => {
    if (!count) return;
    fs.writeFileSync(path.join(DIFFS_DIR, `diff-${pad(shardIdx)}.json`), JSON.stringify(shard));
    shard = {}; shardIdx++; count = 0;
  };
  const fmt = '%x01%H';
  await streamGitLog(
    ['log', '--reverse', `--format=${fmt}`, '--patch', '--no-color', '-M', '--diff-merges=first-parent', BRANCH],
    (rec) => {
      const text = rec.body.join('\n');
      if (!text) { count++; return; } // merge 无 diff 或空提交
      // 按文件切节
      const sections = [];
      let cur = null;
      for (const line of rec.body) {
        if (line.startsWith('diff --git ')) { if (cur) sections.push(cur); cur = [line]; }
        else if (cur) cur.push(line);
      }
      if (cur) sections.push(cur);
      let kept = [], add = 0, del = 0, filtered = 0;
      for (const sec of sections) {
        const header = sec[0];
        const mm = header.match(/^diff --git a\/(.*) b\/(.*)$/);
        const p1 = mm ? mm[1] : '', p2 = mm ? mm[2] : '';
        // 取 +++ 行的路径更可靠（rename 情况）
        const plus = sec.find((l) => l.startsWith('+++ '));
        const minus = sec.find((l) => l.startsWith('--- '));
        const pathA = minus && minus !== '--- /dev/null' ? minus.slice(6) : p1;
        const pathB = plus && plus !== '+++ /dev/null' ? plus.slice(6) : p2;
        const noisy = [pathA, pathB].some((p) => p && isDiffNoisePath(p));
        if (noisy) { filtered++; continue; }
        kept.push(sec.join('\n'));
        for (const l of sec) {
          if (l.startsWith('+') && !l.startsWith('+++')) add++;
          else if (l.startsWith('-') && !l.startsWith('---')) del++;
        }
      }
      let d = kept.length ? `diff --git-ds\n${kept.join('\n')}` : '';
      let tr = 0;
      if (Buffer.byteLength(d) > MAX_DIFF_BYTES) {
        // 按文件节降级截断：先整体截，标记 truncated
        d = Buffer.from(d).subarray(0, MAX_DIFF_BYTES).toString('utf8');
        // 不切断最后一行
        d = d.slice(0, d.lastIndexOf('\n') + 1);
        tr = 1;
      }
      shard[rec.sha] = { d, add, del, tr, fl: filtered };
      count++;
      if (count >= shardSize) flush();
    },
  );
  flush();
  return shardIdx;
}

// ---------- Pass 5: 文件树 checkpoint ----------
async function passTree(commits) {
  fs.mkdirSync(TREE_DIR, { recursive: true });
  const total = commits.length;
  // checkpoint i 覆盖提交 [0, i*500-1]；cp-00000 为空树
  const cpCount = Math.floor((total - 1) / TREE_CHECKPOINT_EVERY) + 1;
  fs.writeFileSync(path.join(TREE_DIR, 'cp-00000.json'), JSON.stringify({ t: '', f: [] }));
  for (let c = 1; c <= cpCount; c++) {
    const idx = c * TREE_CHECKPOINT_EVERY - 1;
    if (idx >= total) break;
    const sha = commits[idx].h;
    const out = await git(['ls-tree', '-r', '-z', '--long', sha]);
    const files = [];
    for (const entry of out.split('\0')) {
      if (!entry) continue;
      const tab = entry.indexOf('\t');
      const info = entry.slice(0, tab).split(/\s+/); // mode type sha size
      const p = entry.slice(tab + 1);
      if (isDiffNoisePath(p)) continue;
      files.push([p, info[2], parseInt(info[0], 8), info[3] === '-' ? -1 : parseInt(info[3], 10)]);
    }
    fs.writeFileSync(path.join(TREE_DIR, `cp-${pad(c)}.json`), JSON.stringify({ t: sha, f: files }));
    process.stdout.write(`  cp-${pad(c)} (${files.length} files)\n`);
  }
  // delta 分片（对齐 meta）
  const opsBySha = new Map();
  await streamGitLog(
    ['log', '--reverse', '--format=%x01%H', '--raw', '--no-abbrev', '-M', '--diff-merges=first-parent', BRANCH],
    (rec) => {
      const ops = [];
      for (const line of rec.body) {
        if (!line.startsWith(':')) continue;
        const tab = line.indexOf('\t');
        const meta = line.slice(1, tab).split(' ');
        const paths = line.slice(tab + 1).split('\t');
        const st = meta[4][0];
        const op = { s: st, p: paths[0], a: meta[3] };
        if ((st === 'R' || st === 'C') && paths[1]) op.np = paths[1];
        ops.push(op);
      }
      if (ops.length) opsBySha.set(rec.sha, ops);
    },
  );
  const deltas = commits.map((c) => opsBySha.get(c.h) || []);
  for (let s = 0; s * SHARD_META < deltas.length; s++) {
    const slice = deltas.slice(s * SHARD_META, (s + 1) * SHARD_META);
    fs.writeFileSync(path.join(TREE_DIR, `delta-${pad(s)}.json`), JSON.stringify(slice));
  }
  return cpCount;
}

// ---------- Pass 6: 统计 ----------
function passStats(commits, numstat) {
  const contributors = new Map(); // email -> {name最常用, names, count, first, last}
  const daily = new Map();
  const modules = new Map();
  let addTotal = 0, delTotal = 0;
  for (const c of commits) {
    const key = c.ae;
    let u = contributors.get(key);
    if (!u) { u = { n: new Map(), c: 0, first: c.t, last: c.t }; contributors.set(key, u); }
    u.n.set(c.an, (u.n.get(c.an) || 0) + 1);
    u.c++; u.first = Math.min(u.first, c.t); u.last = Math.max(u.last, c.t);
    const day = Math.floor(c.t / 86400);
    daily.set(day, (daily.get(day) || 0) + 1);
    const ns = numstat.get(c.h);
    if (ns) { addTotal += ns[1]; delTotal += ns[2]; }
    const ops = c.__ops || [];
    const mods = new Set();
    for (const op of ops) { mods.add(moduleOf(op.p)); if (op.np) mods.add(moduleOf(op.np)); }
    for (const m of mods) modules.set(m, (modules.get(m) || 0) + 1);
  }
  if (!daily.size) return { totalCommits: commits.length, first: 0, last: 0, dailyStart: 0, dailyCounts: [], addTotal: 0, delTotal: 0, authors: [], authorCount: 0, modules: [] };
  const day0 = Math.min(...daily.keys());
  const dayN = Math.floor(Date.now() / 1000 / 86400);
  const counts = new Array(dayN - day0 + 1).fill(0);
  for (const [d, n] of daily) counts[d - day0] = n;
  const authors = [...contributors.entries()]
    .map(([email, u]) => {
      const name = [...u.n.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { name, c: u.c, first: u.first, last: u.last };
    })
    .sort((a, b) => b.c - a.c);
  return {
    totalCommits: commits.length,
    first: day0 * 86400,
    last: Math.max(...commits.map((c) => c.t)),
    dailyStart: day0 * 86400,
    dailyCounts: counts,
    addTotal, delTotal,
    authors: authors.slice(0, 60),
    authorCount: authors.length,
    modules: [...modules.entries()].sort((a, b) => b[1] - a[1]).map(([m, c]) => ({ m, c })),
  };
}

// ---------- main ----------
async function main() {
  if (!fs.existsSync(UPSTREAM)) throw new Error(`upstream.git 不存在，先 git clone --bare`);
  fs.mkdirSync(COMMITS_DIR, { recursive: true });
  fs.mkdirSync(DIFFS_DIR, { recursive: true });
  fs.mkdirSync(TREE_DIR, { recursive: true });
  // 清理旧分片（提交可能被 force-push 重写）
  for (const dir of [COMMITS_DIR, DIFFS_DIR, TREE_DIR]) {
    for (const f of fs.readdirSync(dir)) if (/^(meta|diff|delta|cp)-.*\.json$/.test(f)) fs.unlinkSync(path.join(dir, f));
  }

  console.log('Pass 1/6 元数据…');
  let allCommits = await passMeta();
  const limit = parseInt(process.env.EXTRACT_LIMIT || '0', 10);
  const commits = limit ? allCommits.slice(0, limit) : allCommits;
  console.log(`  ${commits.length} commits${limit ? ` (限流测试，全量 ${allCommits.length})` : ''}`);
  allCommits = null;
  const shaSet = new Set(commits.map((c) => c.h));

  console.log('Pass 2/6 变更状态…');
  const status = await passStatus(shaSet);
  for (const c of commits) c.__ops = status.get(c.h) || [];

  console.log('Pass 3/6 numstat…');
  const numstat = await passNumstat(shaSet);

  console.log('Pass 4/6 diff 分片…');
  const diffShards = await passDiffs(commits);

  console.log('Pass 5/6 文件树…');
  const cpCount = await passTree(commits);

  console.log('Pass 6/6 统计…');
  const stats = passStats(commits, numstat);

  // 写 meta 分片（去掉内部字段，压缩路径信息）
  let idx = 0;
  for (let s = 0; s * SHARD_META < commits.length; s++) {
    const slice = commits.slice(s * SHARD_META, (s + 1) * SHARD_META).map((c) => {
      const ch = (c.__ops || []).map((op) => (op.np ? [op.st, op.p, op.np] : [op.st, op.p]));
      const ns = numstat.get(c.h) || [0, 0, 0];
      return { h: c.h, t: c.t, an: c.an, s: c.s, b: c.b, m: c.m, st: ns, ch };
    });
    fs.writeFileSync(path.join(COMMITS_DIR, `meta-${pad(s)}.json`), JSON.stringify(slice));
    idx++;
  }

  // sha 索引（供按 sha 跳转）
  fs.writeFileSync(path.join(TREE_DIR, 'sha-index.json'), JSON.stringify(commits.map((c) => c.h)));

  const head = commits[commits.length - 1];
  fs.writeFileSync(path.join(PUBLIC_DATA, 'overview.json'), JSON.stringify({
    totalCommits: commits.length,
    headSha: head.h,
    headTs: head.t,
    firstTs: commits[0].t,
    generatedAt: Date.now(),
    shards: { meta: idx, diff: diffShards, cp: cpCount },
    stats: { addTotal: stats.addTotal, delTotal: stats.delTotal, authorCount: stats.authorCount },
  }, null, 2));
  fs.writeFileSync(path.join(PUBLIC_DATA, 'stats.json'), JSON.stringify(stats));
  console.log(`完成：${commits.length} 提交，meta ${idx} 片，diff ${diffShards} 片，checkpoint ${cpCount} 个`);
}

main().catch((e) => { console.error(e); process.exit(1); });
