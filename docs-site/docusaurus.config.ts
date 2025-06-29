import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SYMindX',
  tagline: 'Modular AI Agent Framework - Build Intelligent, Emotionally Reactive Characters',
  favicon: 'img/favicon.ico',

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
        gtag: {
          trackingID: 'G-XXXXXXXXXX',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/symindx-social-card.jpg',
    navbar: {
      title: 'SYMindX',
      logo: {
        alt: 'SYMindX Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        // Temporarily removed API Reference and Examples due to MDX compilation issues
        // {
        //   to: '/docs/api/',
        //   label: 'API Reference',
        //   position: 'left',
        // },
        // {
        //   to: '/docs/examples/',
        //   label: 'Examples',
        //   position: 'left',
        // },
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
        {
          type: 'search',
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
              to: '/docs/getting-started',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/',
            },
            // Temporarily removed API Reference and Examples links
            // {
            //   label: 'API Reference',
            //   to: '/docs/api/',
            // },
            // {
            //   label: 'Examples',
            //   to: '/docs/examples/',
            // },
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
              href: 'https://github.com/symindx/symindx/releases',
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
    algolia: {
      // The application ID provided by Algolia
      appId: 'YOUR_APP_ID',
      // Public API key: it is safe to commit it
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'symindx',
      // Optional: see doc section below
      contextualSearch: true,
      // Optional: Specify domains where the navigation should occur through window.location instead on history.push
      externalUrlRegex: 'external\\.com|domain\\.com',
      // Optional: Replace parts of the item URLs from Algolia. Useful when using the same search index for multiple deployments using a different baseUrl. You can use regexp or string in the `from` param. For example: localhost:3000 vs myCompany.com/docs
      replaceSearchResultPathname: {
        from: '/docs/', // or as RegExp: /\/docs\//
        to: '/',
      },
      // Optional: Algolia search parameters
      searchParameters: {},
      // Optional: path for search page that enabled by default (`false` to disable it)
      searchPagePath: 'search',
    },
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