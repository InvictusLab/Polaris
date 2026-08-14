import { defineConfig } from 'vitepress'

// VitePress docs site for Polaris.
// Deployed as a GitHub Pages project site at https://invictuslab.github.io/Polaris/
// i18n: English is the default locale at the site root (no /en/ URL prefix).
// English source files live in docs/en/ but are served at the root via `rewrites`,
// so the URL never shows /en/ while the files stay organized under docs/en/.
export default defineConfig({
  base: '/Polaris/',
  lang: 'en-US',
  title: 'Polaris',
  description: 'A Tauri v2 desktop application.',

  // Shared across all locales (shallow-merged into each locale's themeConfig).
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/InvictusLab/Polaris' }],
  },

  // Map English source files (docs/en/**) to root URLs (/**), hiding the /en/ prefix.
  rewrites: {
    'en/:rest*': ':rest*',
  },

  locales: {
    // English — default locale at the site root (URLs have no /en/ prefix).
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/getting-started' },
          { text: 'Structure', link: '/structure' },
        ],
        sidebar: [
          {
            text: 'Documentation',
            items: [
              { text: 'Getting Started', link: '/getting-started' },
              { text: 'Project Structure', link: '/structure' },
            ],
          },
        ],
      },
    },
    // Chinese — served under /zh/.
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'Polaris',
      description: '一个 Tauri v2 桌面应用。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/getting-started' },
          { text: '结构', link: '/zh/structure' },
        ],
        sidebar: {
          '/zh/': [
            {
              text: '文档',
              items: [
                { text: '快速开始', link: '/zh/getting-started' },
                { text: '项目结构', link: '/zh/structure' },
              ],
            },
          ],
        },
      },
    },
  },
})
