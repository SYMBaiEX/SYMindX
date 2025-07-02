import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SYMindX',
  tagline: 'Modular AI Agent Framework - Build Intelligent, Emotionally Reactive Characters',
  favicon: 'assets/images/symindx.png',

  // Set the production url of your site here
  url: 'https://symindx.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'symindx',
  projectName: 'symindx',

  onBrokenLinks: 'warn', // Changed from 'throw' to 'warn' for development
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to set it to "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
  
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/symindx/symindx/tree/main/docs-site/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/symindx/symindx/tree/main/docs-site/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        // Google Analytics disabled for development - replace with real tracking ID for production
        // gtag: {
        //   trackingID: 'G-XXXXXXXXXX',
        //   anonymizeIP: true,
        // },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'assets/images/symindx-logo.png',
    navbar: {
      title: 'SYMindX',
      logo: {
        alt: 'SYMindX Logo',
        src: 'assets/images/symindx-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'docSidebar',
          sidebarId: 'quickLinksSidebar',
          position: 'left',
          label: 'Quick Start',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/symindx/symindx',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference/',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/',
            },
            {
              label: 'Examples',
              to: '/docs/examples/',
            },
            {
              label: 'Tutorials',
              to: '/docs/tutorials/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/symindx',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/symindx_ai',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/symindx/symindx/discussions',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/symindx/symindx',
            },
            {
              label: 'Changelog',
              to: '/docs/changelog/',
            },
            {
              label: 'Roadmap',
              to: '/docs/roadmap/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SYMindX. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'javascript', 'typescript'],
    },
    // Algolia search disabled - using local search instead
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'symindx',
    //   contextualSearch: true,
    //   searchPagePath: 'search',
    // },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'support_us',
      content:
        '⭐️ If you like SYMindX, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/symindx/symindx">GitHub</a>! ⭐️',
      backgroundColor: '#fafbfc',
      textColor: '#091E42',
      isCloseable: false,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    // Local search plugin for better search experience
    [
      '@easyops-cn/docusaurus-search-local',
      {
        // Whether to index docs pages
        indexDocs: true,
        // Whether to index blog pages
        indexBlog: true,
        // Whether to index static pages
        indexPages: false,
        // Language of your documentation
        language: "en",
        // Highlight the search terms on the target page
        highlightSearchTermsOnTargetPage: true,
        // Include translations in search
        explicitSearchResultPath: true,
      },
    ],
    // API docs plugin disabled due to MDX compilation issues with function declarations
    // The content needs to be restructured to avoid ES module parsing conflicts
    // [
    //   '@docusaurus/plugin-content-docs',
    //   {
    //     id: 'api',
    //     path: 'docs/api',
    //     routeBasePath: 'api',
    //     sidebarPath: './sidebars-api.ts',
    //   },
    // ],
  ],
};

export default config;