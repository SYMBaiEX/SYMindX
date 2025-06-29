import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '5de'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'eba'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '99c'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'e8c'),
            routes: [
              {
                path: '/docs/api/openapi/endpoints',
                component: ComponentCreator('/docs/api/openapi/endpoints', '445'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/examples',
                component: ComponentCreator('/docs/api/openapi/examples', '375'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/overview',
                component: ComponentCreator('/docs/api/openapi/overview', '831'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/schemas',
                component: ComponentCreator('/docs/api/openapi/schemas', '587'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/overview',
                component: ComponentCreator('/docs/api/overview', '483'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/cognition-module',
                component: ComponentCreator('/docs/api/plugins/cognition-module', '0ed'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/emotion-module',
                component: ComponentCreator('/docs/api/plugins/emotion-module', '5d0'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/extension-interface',
                component: ComponentCreator('/docs/api/plugins/extension-interface', '78e'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/lifecycle',
                component: ComponentCreator('/docs/api/plugins/lifecycle', '569'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/memory-provider',
                component: ComponentCreator('/docs/api/plugins/memory-provider', 'c23'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/portal-interface',
                component: ComponentCreator('/docs/api/plugins/portal-interface', 'a5d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/agents',
                component: ComponentCreator('/docs/api/rest/agents', '92b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/authentication',
                component: ComponentCreator('/docs/api/rest/authentication', 'fdb'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/events',
                component: ComponentCreator('/docs/api/rest/events', '34a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/extensions',
                component: ComponentCreator('/docs/api/rest/extensions', '7df'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/health',
                component: ComponentCreator('/docs/api/rest/health', '51b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/memory',
                component: ComponentCreator('/docs/api/rest/memory', 'e9b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/agents',
                component: ComponentCreator('/docs/api/typescript/agents', '7fd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/extensions',
                component: ComponentCreator('/docs/api/typescript/extensions', '3a8'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/installation',
                component: ComponentCreator('/docs/api/typescript/installation', 'e87'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/modules',
                component: ComponentCreator('/docs/api/typescript/modules', '7d9'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/runtime',
                component: ComponentCreator('/docs/api/typescript/runtime', 'ff1'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/types',
                component: ComponentCreator('/docs/api/typescript/types', '893'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/commands',
                component: ComponentCreator('/docs/api/websocket/commands', 'eb6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/connection',
                component: ComponentCreator('/docs/api/websocket/connection', '494'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/events',
                component: ComponentCreator('/docs/api/websocket/events', '8ee'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/streaming',
                component: ComponentCreator('/docs/api/websocket/streaming', '079'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/architecture/overview',
                component: ComponentCreator('/docs/architecture/overview', '2f6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/installation',
                component: ComponentCreator('/docs/getting-started/installation', '7cb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/quick-start',
                component: ComponentCreator('/docs/getting-started/quick-start', '713'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/your-first-agent',
                component: ComponentCreator('/docs/getting-started/your-first-agent', '460'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/plugin-development',
                component: ComponentCreator('/docs/guides/plugin-development', '259'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/introduction',
                component: ComponentCreator('/docs/introduction', '5d3'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
