import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '5de'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '12c'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '68f'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'a0d'),
            routes: [
              {
                path: '/docs/api/openapi/endpoints',
                component: ComponentCreator('/docs/api/openapi/endpoints', '32d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/examples',
                component: ComponentCreator('/docs/api/openapi/examples', 'c82'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/overview',
                component: ComponentCreator('/docs/api/openapi/overview', '4d4'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/openapi/schemas',
                component: ComponentCreator('/docs/api/openapi/schemas', 'c44'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/overview',
                component: ComponentCreator('/docs/api/overview', '4a6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/cognition-module',
                component: ComponentCreator('/docs/api/plugins/cognition-module', '005'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/emotion-module',
                component: ComponentCreator('/docs/api/plugins/emotion-module', '951'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/extension-interface',
                component: ComponentCreator('/docs/api/plugins/extension-interface', 'bdd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/lifecycle',
                component: ComponentCreator('/docs/api/plugins/lifecycle', 'd1f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/memory-provider',
                component: ComponentCreator('/docs/api/plugins/memory-provider', 'f69'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/plugins/portal-interface',
                component: ComponentCreator('/docs/api/plugins/portal-interface', '6e7'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/agents',
                component: ComponentCreator('/docs/api/rest/agents', 'b75'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/authentication',
                component: ComponentCreator('/docs/api/rest/authentication', '0f3'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/events',
                component: ComponentCreator('/docs/api/rest/events', 'a2a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/extensions',
                component: ComponentCreator('/docs/api/rest/extensions', '0b5'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/health',
                component: ComponentCreator('/docs/api/rest/health', '960'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/rest/memory',
                component: ComponentCreator('/docs/api/rest/memory', '9ff'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/agents',
                component: ComponentCreator('/docs/api/typescript/agents', '280'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/extensions',
                component: ComponentCreator('/docs/api/typescript/extensions', '55a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/installation',
                component: ComponentCreator('/docs/api/typescript/installation', '17c'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/modules',
                component: ComponentCreator('/docs/api/typescript/modules', '34a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/runtime',
                component: ComponentCreator('/docs/api/typescript/runtime', '69a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/typescript/types',
                component: ComponentCreator('/docs/api/typescript/types', 'a39'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/commands',
                component: ComponentCreator('/docs/api/websocket/commands', '185'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/connection',
                component: ComponentCreator('/docs/api/websocket/connection', '22e'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/events',
                component: ComponentCreator('/docs/api/websocket/events', '35f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api/websocket/streaming',
                component: ComponentCreator('/docs/api/websocket/streaming', '03a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/architecture/overview',
                component: ComponentCreator('/docs/architecture/overview', '14b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/installation',
                component: ComponentCreator('/docs/getting-started/installation', 'afe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/quick-start',
                component: ComponentCreator('/docs/getting-started/quick-start', '51d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/your-first-agent',
                component: ComponentCreator('/docs/getting-started/your-first-agent', '7f8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/plugin-development',
                component: ComponentCreator('/docs/guides/plugin-development', 'dd8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/introduction',
                component: ComponentCreator('/docs/introduction', '727'),
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
