#!/usr/bin/env node
// 每日速览：按天聚合提交（确定性数据）+ DeepSeek 生成日省流（幂等，只补缺）。
// 输出 public/data/daily.json.gz：[{d, n, add, del, authors[], imp, s, d2}]
import fs from 'node:fs';
import path from 'node:path';
import {
  PUBLIC_DATA, DEEPSEEK_API, DEEPSEEK_MODEL,
} from './config.mjs';
import { readShard, writeShard, shardExists } from './shard-io.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const apiKey = process.env.DEEPSEEK_API_KEY;
const day = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);

async function chat(body, tries = 5) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status === 429) { await sleep(2000 * (t + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return JSON.parse((await res.json()).choices[0].message.content);
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1500 * (t + 1));
    }
  }
}

async function main() {
  // 1) 聚合
  const dir = path.join(PUBLIC_DATA, 'commits');
  const metaFiles = [...new Set(fs.readdirSync(dir).filter((f) => /^meta-\d+\.json(\.gz)?$/.test(f)).map((f) => f.replace(/\.gz$/, '')))].sort();
  const sumsMap = new Map();
  for (let i = 0; i < metaFiles.length; i++) {
    try {
      const s = readShard(path.join(dir, `sum-${String(i).padStart(5, '0')}.json`));
      for (const [h, v] of Object.entries(s)) sumsMap.set(h, v);
    } catch { /* 摘要分片可能缺失 */ }
  }
  const days = new Map();
  for (const f of metaFiles) {
    for (const m of readShard(path.join(dir, f))) {
      const d = day(m.t);
      if (!days.has(d)) days.set(d, { d, n: 0, add: 0, del: 0, imp: 0, authors: new Map(), subjects: [], important: [] });
      const o = days.get(d);
      o.n++; o.add += m.st[1]; o.del += m.st[2];
      o.authors.set(m.an, (o.authors.get(m.an) || 0) + 1);
      if (o.subjects.length < 120) o.subjects.push(m.s);
      const sm = sumsMap.get(m.h);
      if (sm && sm.i >= 4) { o.imp++; if (o.important.length < 10) o.important.push(sm.s); }
    }
  }
  const list = [...days.values()].map((o) => ({
    ...o,
    authors: [...o.authors.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}(${c})`).slice(0, 8),
  })).sort((a, b) => (a.d < b.d ? 1 : -1));
  console.log(`聚合 ${list.length} 天`);

  // 2) AI 日省流（幂等）
  const outPath = path.join(PUBLIC_DATA, 'daily.json');
  const existing = shardExists(outPath) ? readShard(outPath) : [];
  const haveS = new Map(existing.map((o) => [o.d, o]));
  const missing = list.filter((o) => !haveS.get(o.d)?.s);
  console.log(`日省流待生成：${missing.length}`);

  const jobs = [...missing];
  const results = new Array(jobs.length);
  let cursor = 0, failed = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= jobs.length) return;
      const o = jobs[i];
      try {
        const out = await chat({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: '你是开源仓库 deepseek-ai/deepseek-harness (dsh) 的日报作者。根据当天提交标题汇总这一天的工作，输出严格 JSON：{"s":"≤40字中文日省流","d":"≤120字要点补充（做了什么/为什么）"}' },
            { role: 'user', content: `日期 ${o.d}：${o.n} 次提交，改动 ${o.add}+/−${o.del}，活跃: ${o.authors.join(' ')}\n重要变更:\n${o.important.join('\n') || '（无 4 级以上）'}\n提交标题:\n${o.subjects.slice(0, 60).join('\n')}` },
          ],
          temperature: 0.3, max_tokens: 300, response_format: { type: 'json_object' },
        });
        results[i] = { s: String(out.s || '').slice(0, 80), d2: String(out.d || '').slice(0, 220) };
      } catch (e) { failed++; console.error(`  失败 ${o.d}: ${e.message}`); results[i] = null; }
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker));

  // 3) 合并输出
  const byDay = new Map(list.map((o) => [o.d, { ...o, s: haveS.get(o.d)?.s || '', d2: haveS.get(o.d)?.d2 || '' }]));
  jobs.forEach((o, i) => {
    if (results[i]) { byDay.get(o.d).s = results[i].s; byDay.get(o.d).d2 = results[i].d2; }
  });
  const out = [...byDay.values()].sort((a, b) => (a.d < b.d ? 1 : -1));
  writeShard(outPath, out);
  console.log(`每日速览完成：${out.length} 天（失败 ${failed}）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
