#!/usr/bin/env node
// 工作流 AI 摘要：给重要 worktree 流生成省流（s/d），给头部成员生成工作画像。
// 幂等：work-sum.json 已有的 sha/name 跳过。
import fs from 'node:fs';
import path from 'node:path';
import {
  PUBLIC_DATA, DEEPSEEK_API, DEEPSEEK_MODEL,
} from './config.mjs';
import { readShard, writeShard, shardExists } from './shard-io.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1); }

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
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
      return JSON.parse((await res.json()).choices[0].message.content);
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1500 * (t + 1));
    }
  }
}

async function batch(jobs, concurrency, fn) {
  const results = new Array(jobs.length);
  let cursor = 0, done = 0, failed = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= jobs.length) return;
      try { results[i] = await fn(jobs[i]); } catch (e) { failed++; console.error(`  失败 ${jobs[i].key}: ${e.message}`); results[i] = null; }
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${jobs.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { results, failed };
}

const STREAM_SYSTEM = `你是开源仓库 deepseek-ai/deepseek-harness (dsh) 的工作流解说员。团队用 git worktree 方式并行开发：每个分支是一条工作流，完成后合入 master。
根据分支名、提交标题和改动规模，输出严格 JSON：{"s":"≤40字中文省流：这条分支交付了什么","d":"80字内补充：动机/方案/影响面"}`;
const AUTHOR_SYSTEM = `你是开源仓库 deepseek-ai/deepseek-harness (dsh) 的团队观察员。根据一位成员的提交数、活跃子系统、代表性提交标题，输出严格 JSON：{"s":"≤30字中文一句话画像：这个人主要负责什么","d":"100字内画像：工作重心、风格、代表性贡献"}`;

async function main() {
  const work = readShard(path.join(PUBLIC_DATA, 'work.json'));
  const sumPath = path.join(PUBLIC_DATA, 'work-sum.json');
  const sums = shardExists(sumPath) ? readShard(sumPath) : { streams: {}, authors: {} };
  let dirty = false;

  // 流摘要：规模前 600 条（提交数或文件数显著）
  const streamJobs = work.streams
    .filter((s) => s.n >= 2 || s.st[0] >= 10)
    .sort((a, b) => (b.n * 2 + b.st[0] / 10) - (a.n * 2 + a.st[0] / 10))
    .slice(0, 600)
    .filter((s) => !sums.streams[s.h])
    .map((s) => ({ key: s.h, s }));
  console.log(`流摘要待生成：${streamJobs.length}`);

  const { results: streamResults, failed: f1 } = await batch(streamJobs, 12, async ({ s }) => {
    const out = await chat({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: STREAM_SYSTEM },
        { role: 'user', content: `分支: ${s.br}\n合入说明: ${s.subj}\n成员: ${s.members.map(([n, c]) => `${n}(${c})`).join(', ')}\n提交数: ${s.n}, 改动 ${s.st[0]} 文件 +${s.st[1]} -${s.st[2]}\n子系统: ${s.subs.join(', ')}\n提交标题:\n${(s.subjects || []).slice(0, 20).join('\n')}` },
      ],
      temperature: 0.3, max_tokens: 300, response_format: { type: 'json_object' },
    });
    return { s: String(out.s || '').slice(0, 80), d: String(out.d || '').slice(0, 200) };
  });
  streamJobs.forEach(({ key }, i) => {
    if (streamResults[i]) { sums.streams[key] = streamResults[i]; dirty = true; }
  });

  // 成员画像：前 24 人
  const authorJobs = work.authors.slice(0, 24).filter((a) => !sums.authors[a.name]);
  console.log(`成员画像待生成：${authorJobs.length}`);
  const { results: authorResults, failed: f2 } = await batch(authorJobs, 8, async (a) => {
    const out = await chat({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: AUTHOR_SYSTEM },
        { role: 'user', content: `成员: ${a.name}\n提交数: ${a.commits}（其中 master 直推 ${a.direct}，worktree 分支提交 ${a.streamCommits}）\n负责 worktree 流: ${a.streamCount} 条\n活跃子系统: ${a.subs.join(', ')}\n代表性提交标题:\n${a.subjects.join('\n')}` },
      ],
      temperature: 0.3, max_tokens: 300, response_format: { type: 'json_object' },
    });
    return { s: String(out.s || '').slice(0, 60), d: String(out.d || '').slice(0, 250) };
  });
  authorJobs.forEach((a, i) => {
    if (authorResults[i]) { sums.authors[a.name] = authorResults[i]; dirty = true; }
  });

  if (dirty) writeShard(sumPath, sums);
  console.log(`完成：流摘要 ${sums.streams ? Object.keys(sums.streams).length : 0}（失败 ${f1}），画像 ${Object.keys(sums.authors).length}（失败 ${f2}）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
