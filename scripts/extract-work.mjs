#!/usr/bin/env node
// 重建 dsh 团队的 git worktree 工作流：
//   顶层交付流 = master 第一父线上的 merge（PR / 分支合入），收集各分支专属提交，
//   归出每条流的分支名、成员、规模、子系统；同时聚合每人的工作画像数据。
// 输出 public/data/work.json（+ search 兼容的作者索引）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PUBLIC_DATA, UPSTREAM, BRANCH, moduleOf } from './config.mjs';
import { readShard, writeShard } from './shard-io.mjs';

const F = '\x1f';
function git(args) {
  const r = spawnSync('git', ['--git-dir', UPSTREAM, ...args], { maxBuffer: 1 << 28, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.slice(0, 300)}`);
  return r.stdout;
}

// sha -> meta 索引
console.log('加载 meta 分片…');
const metaMap = new Map();
{
  const dir = path.join(PUBLIC_DATA, 'commits');
  const files = fs.readdirSync(dir).filter((f) => /^meta-\d+\.json(\.gz)?$/.test(f)).map((f) => f.replace(/\.gz$/, ''));
  for (const f of files) {
    const metas = readShard(path.join(dir, f));
    for (const m of metas) metaMap.set(m.h, m);
  }
  console.log(`  ${metaMap.size} 提交元数据`);
}

console.log('遍历 master 第一父线…');
const fpOut = git(['log', '--first-parent', `--format=%H${F}%P${F}%at${F}%s%x1e`, BRANCH]);
const fp = fpOut.split('\x1e').filter((s) => s.trim()).map((rec) => {
  const [h, P, at, s] = rec.trim().split(F);
  return { h, parents: P ? P.split(' ') : [], at: +at, s: s || '' };
});

function branchOf(subject) {
  let m = subject.match(/^Merge pull request #\d+ from ([^/\s]+)\/(.+)$/);
  if (m) return m[2];
  m = subject.match(/^Merge branch '([^']+)'/);
  if (m) return m[1].replace(/^origin\//, '');
  m = subject.match(/^Merge remote-tracking branch '([^']+)'/);
  if (m) return m[1].replace(/^origin\//, '');
  m = subject.match(/^Merge release (.+?)( and| into|:|$)/);
  if (m) return `release/${m[1]}`;
  return '(direct)';
}

const subsystemsOf = (meta) => {
  const set = new Set();
  for (const ch of meta.ch || []) { set.add(moduleOf(ch[1])); if (ch[2]) set.add(moduleOf(ch[2])); }
  return [...set];
};

console.log(`解析 ${fp.length} 个第一父线提交…`);
const streams = [];
const authorAgg = new Map(); // name -> agg
const ensureAuthor = (name) => {
  let a = authorAgg.get(name);
  if (!a) { a = { name, commits: 0, direct: 0, streamCount: 0, streamCommits: 0, subs: new Map(), first: Infinity, last: 0, subjects: [] }; authorAgg.set(name, a); }
  return a;
};
const addSub = (a, subs) => { for (const s of subs || []) a.subs.set(s, (a.subs.get(s) || 0) + 1); };

let syncCount = 0;
for (const c of fp) {
  const isMerge = c.parents.length >= 2;
  if (!isMerge) {
    // master 直推
    const meta = metaMap.get(c.h);
    if (meta) {
      const a = ensureAuthor(meta.an);
      a.commits++; a.direct++; a.first = Math.min(a.first, meta.t); a.last = Math.max(a.last, meta.t);
      addSub(a, subsystemsOf(meta));
      if (a.subjects.length < 12) a.subjects.push(meta.s);
    }
    continue;
  }
  // 顶层 merge = 一条 worktree 流
  const [P1, P2] = c.parents;
  const br = branchOf(c.s);
  const rl = git(['rev-list', '--no-merges', `${c.h}^2`, '--not', `${c.h}^1`]).split('\n').filter(Boolean);
  const members = new Map(); // name -> count
  const subs = new Map();
  let st = [0, 0, 0], minT = Infinity, maxT = 0, cids = [];
  for (const sha of rl) {
    const meta = metaMap.get(sha);
    if (!meta) continue;
    members.set(meta.an, (members.get(meta.an) || 0) + 1);
    minT = Math.min(minT, meta.t); maxT = Math.max(maxT, meta.t);
    st[0] += meta.st[0]; st[1] += meta.st[1]; st[2] += meta.st[2];
    for (const s of subsystemsOf(meta)) subs.set(s, (subs.get(s) || 0) + 1);
    if (cids.length < 100) cids.push(sha);
    const a = ensureAuthor(meta.an);
    a.commits++; a.streamCommits++; a.first = Math.min(a.first, meta.t); a.last = Math.max(a.last, meta.t);
    addSub(a, subsystemsOf(meta));
    if (a.subjects.length < 12) a.subjects.push(meta.s);
  }
  const owner = [...members.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || '(unknown)';
  if (owner) authorAgg.get(owner).streamCount++;
  if (br === 'master' || rl.length === 0) syncCount++;
  // 分叉点：master 线与分支线的最近公共祖先
  let fork = '', forkTs = 0;
  try {
    fork = git(['merge-base', `${c.h}^1`, `${c.h}^2`]).trim();
    const fm = metaMap.get(fork);
    if (fm) forkTs = fm.t;
  } catch { /* 罕见：找不到公共祖先 */ }
  const subjects = cids.map((sha) => metaMap.get(sha)?.s).filter(Boolean).slice(0, 20);
  streams.push({
    h: c.h, br, at: c.at, owner, fork, forkTs,
    members: [...members.entries()].sort((x, y) => y[1] - x[1]),
    n: rl.length, st, minT, maxT,
    subs: [...subs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([s]) => s),
    cids, subjects, subj: c.s.slice(0, 160),
  });
}

streams.sort((a, b) => b.at - a.at);
const authors = [...authorAgg.values()]
  .map((a) => ({
    name: a.name, commits: a.commits, direct: a.direct, streamCount: a.streamCount, streamCommits: a.streamCommits,
    first: a.first === Infinity ? 0 : a.first, last: a.last,
    subs: [...a.subs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([s]) => s),
    subjects: a.subjects.slice(0, 10),
  }))
  .sort((a, b) => b.commits - a.commits);

const data = {
  generatedAt: Date.now(),
  totals: { streams: streams.length, syncStreams: syncCount, authors: authors.length, branchCommits: streams.reduce((s, x) => s + x.n, 0) },
  streams,
  authors,
};
writeShard(path.join(PUBLIC_DATA, 'work.json'), data);
console.log(`工作流：${streams.length} 条流（其中 sync ${syncCount}），作者 ${authors.length} 人`);
console.log(`最大流：${[...streams].sort((a, b) => b.n - a.n)[0]?.br} (${[...streams].sort((a, b) => b.n - a.n)[0]?.n} commits)`);
