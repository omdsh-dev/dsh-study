#!/usr/bin/env node
// 构建时抓取 GitHub 元数据快照：repo 数据、releases、tags、社区讨论。
// 说明：dsh 仓库关闭了 Issues/PR（主干直推），社区动态来自 Discussions（GraphQL）。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PUBLIC_DATA, UPSTREAM_REPO } from './config.mjs';

const token = process.env.GITHUB_TOKEN || execSync('gh auth token').toString().trim();
const api = async (p) => {
  const res = await fetch(`https://api.github.com${p}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`${p} → HTTP ${res.status}`);
  return res.json();
};
const gql = async (query) => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(`GraphQL: ${JSON.stringify(j.errors).slice(0, 300)}`);
  return j.data;
};

const repo = await api(`/repos/${UPSTREAM_REPO}`);
const [releases, tags] = await Promise.all([
  api(`/repos/${UPSTREAM_REPO}/releases?per_page=100`),
  api(`/repos/${UPSTREAM_REPO}/tags?per_page=100`),
]);

const GQL_DISCUSSIONS = `query{
  repository(owner:"deepseek-ai", name:"deepseek-harness"){
    discussions(first:100, orderBy:{field:UPDATED_AT, direction:DESC}){
      totalCount
      nodes{ number title createdAt updatedAt url upvoteCount
        category{name}
        author{login}
        comments{totalCount} }
    }
  }
}`;
const discussionsData = await gql(GQL_DISCUSSIONS);
const d = discussionsData.repository.discussions;

const data = {
  generatedAt: Date.now(),
  repo: {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.subscribers_count,
    openIssues: repo.open_issues_count,
    pushedAt: repo.pushed_at,
    description: repo.description,
    homepage: repo.homepage,
    discussionsTotal: d.totalCount,
  },
  releases: releases.map((r) => ({
    tag: r.tag_name, name: r.name, at: r.published_at, prerelease: r.prerelease,
    url: r.html_url, body: (r.body || '').slice(0, 4000),
  })),
  tags: tags.map((t) => ({ name: t.name, sha: t.commit.sha })),
  discussions: d.nodes.map((x) => ({
    n: x.number, title: x.title, cat: x.category?.name || '',
    at: x.updatedAt, created: x.createdAt, user: x.author?.login || '',
    comments: x.comments.totalCount, votes: x.upvoteCount, url: x.url,
  })),
};

fs.writeFileSync(path.join(PUBLIC_DATA, 'github.json'), JSON.stringify(data));
console.log(`GitHub 快照：★${data.repo.stars} | releases ${data.releases.length} | discussions ${data.discussions.length}/${d.totalCount}`);
