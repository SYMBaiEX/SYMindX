import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Manual sidebar for existing documentation only
  tutorialSidebar: [
    'introduction',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/your-first-agent',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guides',
      items: [
        'guides/plugin-development',
      ],
    },
  ],

  // API Reference sidebar - only existing files
  apiSidebar: [
    'api/overview',
    {
      type: 'category',
      label: 'OpenAPI',
      items: [
        'api/openapi/overview',
        'api/openapi/endpoints',
        'api/openapi/schemas',
        'api/openapi/examples',
      ],
    },
    {
      type: 'category',
      label: 'REST API',
      items: [
        'api/rest/authentication',
        'api/rest/agents',
        'api/rest/extensions',
        'api/rest/memory',
        'api/rest/events',
        'api/rest/health',
      ],
    },
    {
      type: 'category',
      label: 'WebSocket API',
      items: [
        'api/websocket/connection',
        'api/websocket/events',
        'api/websocket/commands',
        'api/websocket/streaming',
      ],
    },
    {
      type: 'category',
      label: 'TypeScript SDK',
      items: [
        'api/typescript/installation',
        'api/typescript/agents',
        'api/typescript/extensions',
        'api/typescript/modules',
        'api/typescript/runtime',
        'api/typescript/types',
      ],
    },
    {
      type: 'category',
      label: 'Plugin API',
      items: [
        'api/plugins/extension-interface',
        'api/plugins/memory-provider',
        'api/plugins/emotion-module',
        'api/plugins/cognition-module',
        'api/plugins/portal-interface',
        'api/plugins/lifecycle',
      ],
    },
  ],
};

export default sidebars;