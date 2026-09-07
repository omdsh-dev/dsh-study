#!/usr/bin/env node
// DeepSeek 省流摘要回填：读 meta 分片，为缺摘要的提交生成 {s,d,i,c} 并写 sum-*.json 分片。
// 幂等可续跑：已存在的 sum 分片里已有的 sha 直接跳过。
import fs from 'node:fs';
import path from 'node:path';
import {
  PUBLIC_DATA, DEEPSEEK_API, DEEPSEEK_MODEL, SUMMARY_CONCURRENCY, DIFF_SNIPPET_FOR_AI, SHARD_META, SHARD_DIFF,
} from './config.mjs';
import { readShard, writeShard, shardExists } from './shard-io.mjs';

const COMMITS_DIR = path.join(PUBLIC_DATA, 'commits');
const DIFFS_DIR = path.join(PUBLIC_DATA, 'diffs');
const pad = (n, w = 5) => String(n).padStart(w, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('缺少 DEEPSEEK_API_KEY（.env 或环境变量）');
  process.exit(1);
}

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
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      return json.choices[0].message.content;
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1500 * (t + 1));
    }
  }
}

const SYSTEM = `你是开源仓库 deepseek-ai/deepseek-harness (dsh) 的提交解说员。dsh 是 TypeScript 插件化 AI agent 框架（everything-is-a-plugin，基于 Cordis）。
根据提交信息、改动统计和 diff 片段，输出严格 JSON（不要 markdown 代码块）：
{"s":"≤40字的中文一句话省流","d":"80字内中文补充说明：动机/方案/影响面","i":1到5的重要性,"c":"类别"}
类别 c 只能是：feature/fix/refactor/docs/test/build/ci/chore/benchmark/perf。
重要性标准：5=架构级变更或影响核心运行时；4=重要功能/行为变更；3=常规功能或修复；2=小修小补；1=杂务。
只输出 JSON。`;

function buildPrompt(meta, diffText) {
  const files = (meta.ch || []).slice(0, 40).map(([st, p, np]) => `${st} ${p}${np ? ` -> ${np}` : ''}`).join('\n');
  const diff = diffText ? diffText.slice(0, DIFF_SNIPPET_FOR_AI) : '（merge 提交或改动均为锁文件/快照等噪音，无有效 diff）';
  return `提交: ${meta.h.slice(0, 10)}${meta.m ? ' (merge)' : ''}
作者: ${meta.an}
标题: ${meta.s}
${meta.b ? `描述: ${meta.b}\n` : ''}
改动统计: ${meta.st[0]} 个文件, +${meta.st[1]} -${meta.st[2]}
涉及文件:
${files}

diff 片段:
\`\`\`
${diff}
\`\`\``;
}

async function summarizeBatch(jobs) {
  const results = new Array(jobs.length);
  let cursor = 0, done = 0, failed = 0;
  async function worker() {
    while (true) {
      const my = cursor++;
      if (my >= jobs.length) return;
      const { meta, diffText, shardIdx, pos } = jobs[my];
      try {
        const raw = await chat({
          model: DEEPSEEK_MODEL,
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt(meta, diffText) }],
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(raw);
        results[my] = {
          s: String(parsed.s || '').slice(0, 80),
          d: String(parsed.d || '').slice(0, 200),
          i: Math.min(5, Math.max(1, parseInt(parsed.i, 10) || 3)),
          c: String(parsed.c || 'chore'),
        };
      } catch (e) {
        failed++;
        console.error(`  失败 ${meta.h.slice(0, 8)}: ${e.message}`);
        results[my] = null;
      }
      done++;
      if (done % 100 === 0) console.log(`  进度 ${done}/${jobs.length}（失败 ${failed}）`);
    }
  }
  await Promise.all(Array.from({ length: SUMMARY_CONCURRENCY }, worker));
  // 写回分片
  const byShard = new Map();
  jobs.forEach((j, idx) => {
    if (!results[idx]) return;
    if (!byShard.has(j.shardIdx)) byShard.set(j.shardIdx, {});
    byShard.get(j.shardIdx)[j.meta.h] = results[idx];
  });
  return { byShard, failed };
}

async function main() {
  const only = process.argv[2] ? parseInt(process.argv[2], 10) : 0; // 只跑前 N 个 meta 分片
  const metaFiles = fs.readdirSync(COMMITS_DIR)
    .filter((f) => /^meta-\d+\.json(\.gz)?$/.test(f))
    .map((f) => f.replace(/\.gz$/, ''))
    .sort();
  if (!metaFiles.length) throw new Error('无 meta 分片，先跑 extract');

  let totalJobs = 0, totalFailed = 0;
  for (let s = 0; s < metaFiles.length; s++) {
    if (only && s >= only) break;
    const metas = readShard(path.join(COMMITS_DIR, metaFiles[s]));
    const sumPath = path.join(COMMITS_DIR, `sum-${pad(s)}.json`);
    const existing = shardExists(sumPath) ? readShard(sumPath) : {};
    const missing = metas.filter((m) => !existing[m.h]);
    if (!missing.length) { console.log(`shard ${s}: 已完整，跳过`); continue; }
    console.log(`shard ${s}: ${missing.length}/${metas.length} 待摘要`);

    // 拉对应 diff 分片（1 个 meta 分片 ≈ 2.5 个 diff 分片）
    const startIdx = s * SHARD_META, endIdx = startIdx + metas.length;
    const diffTexts = new Map();
    for (let dsh = Math.floor(startIdx / SHARD_DIFF); dsh * SHARD_DIFF < endIdx; dsh++) {
      const dp = path.join(DIFFS_DIR, `diff-${pad(dsh)}.json`);
      if (!shardExists(dp)) continue;
      const shard = readShard(dp);
      for (const [k, v] of Object.entries(shard)) diffTexts.set(k, v.d);
    }

    const jobs = missing.map((meta, pos) => ({
      meta, pos, shardIdx: s, diffText: diffTexts.get(meta.h) || '',
    }));
    const { byShard, failed } = await summarizeBatch(jobs);
    totalJobs += jobs.length; totalFailed += failed;
    for (const [si, add] of byShard) {
      const p = path.join(COMMITS_DIR, `sum-${pad(si)}.json`);
      const cur = shardExists(p) ? readShard(p) : {};
      Object.assign(cur, add);
      writeShard(p, cur);
    }
    console.log(`shard ${s} 完成（失败 ${failed}）→ sum-${pad(s)}.json`);
  }
  console.log(`摘要回填结束：处理 ${totalJobs}，失败 ${totalFailed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
