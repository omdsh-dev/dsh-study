import { defineConfig } from 'astro/config';

// markdown 里以 / 开头的内链自动加上 base 前缀（GitHub Pages 项目站点）
function rehypeBaseLinks(base) {
  const prefix = (node) => {
    for (const child of node.children ?? []) {
      if (child.type === 'element') {
        if (child.tagName === 'a' && typeof child.properties?.href === 'string' && child.properties.href.startsWith('/') && !child.properties.href.startsWith('//')) {
          child.properties.href = base + child.properties.href.slice(1);
        }
        prefix(child);
      }
    }
  };
  return () => (tree) => prefix(tree);
}

export default defineConfig({
  site: 'https://omdsh-dev.github.io',
  base: '/dsh-study',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    rehypePlugins: [(() => rehypeBaseLinks('/dsh-study/'))()],
  },
});
