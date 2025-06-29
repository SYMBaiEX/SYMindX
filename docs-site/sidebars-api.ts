import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebarApi: SidebarsConfig = {
  apiSidebar: [
    'overview',
    {
      type: 'category',
      label: 'REST API',
      items: [
        'rest/authentication',
        'rest/agents',
        'rest/extensions',
        'rest/memory',
        'rest/events',
        'rest/health',
      ],
    },
    {
      type: 'category',
      label: 'WebSocket API',
      items: [
        'websocket/connection',
        'websocket/events',
        'websocket/commands',
        'websocket/streaming',
      ],
    },
    {
      type: 'category',
      label: 'TypeScript SDK',
      items: [
        'typescript/installation',
        'typescript/runtime',
        'typescript/agents',
        'typescript/modules',
        'typescript/extensions',
        'typescript/types',
      ],
    },
    {
      type: 'category',
      label: 'Plugin Development API',
      items: [
        'plugins/extension-interface',
        'plugins/memory-provider',
        'plugins/emotion-module',
        'plugins/cognition-module',
        'plugins/portal-interface',
        'plugins/lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'OpenAPI Specification',
      items: [
        'openapi/overview',
        'openapi/endpoints',
        'openapi/schemas',
        'openapi/examples',
      ],
    },
  ],
};

export default sidebarApi;