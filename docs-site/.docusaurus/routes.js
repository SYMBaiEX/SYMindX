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
    component: ComponentCreator('/docs', '38c'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '74b'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '9af'),
            routes: [
              {
                path: '/docs/advanced-topics/',
                component: ComponentCreator('/docs/advanced-topics/', 'b27'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/',
                component: ComponentCreator('/docs/advanced-topics/', '62e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/', '6b7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/', '88b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/advanced-ai',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/advanced-ai', 'd78'),
                exact: true
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/advanced-ai',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/advanced-ai', 'd5c'),
                exact: true
              },
              {
                path: '/docs/advanced-topics/custom-portals/',
                component: ComponentCreator('/docs/advanced-topics/custom-portals/', '26d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/custom-portals/',
                component: ComponentCreator('/docs/advanced-topics/custom-portals/', 'e89'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/fine-tuning/',
                component: ComponentCreator('/docs/advanced-topics/fine-tuning/', '166'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/fine-tuning/',
                component: ComponentCreator('/docs/advanced-topics/fine-tuning/', '9e6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/multi-modal/',
                component: ComponentCreator('/docs/advanced-topics/multi-modal/', '6f6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/multi-modal/',
                component: ComponentCreator('/docs/advanced-topics/multi-modal/', '555'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/',
                component: ComponentCreator('/docs/agents/', '708'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/',
                component: ComponentCreator('/docs/agents/', '3e8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/character-system/',
                component: ComponentCreator('/docs/agents/character-system/', '390'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/character-system/',
                component: ComponentCreator('/docs/agents/character-system/', '7fe'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/communication/',
                component: ComponentCreator('/docs/agents/communication/', '96f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/communication/',
                component: ComponentCreator('/docs/agents/communication/', 'e05'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/configuration/',
                component: ComponentCreator('/docs/agents/configuration/', '1f1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/configuration/',
                component: ComponentCreator('/docs/agents/configuration/', '61a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/',
                component: ComponentCreator('/docs/agents/lifecycle/', '400'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/',
                component: ComponentCreator('/docs/agents/lifecycle/', 'c0b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/api',
                component: ComponentCreator('/docs/agents/lifecycle/api', '0db'),
                exact: true
              },
              {
                path: '/docs/agents/lifecycle/api',
                component: ComponentCreator('/docs/agents/lifecycle/api', '41b'),
                exact: true
              },
              {
                path: '/docs/agents/multi-agent/',
                component: ComponentCreator('/docs/agents/multi-agent/', '6fc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/multi-agent/',
                component: ComponentCreator('/docs/agents/multi-agent/', 'af7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api-reference/',
                component: ComponentCreator('/docs/api-reference/', '304'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/',
                component: ComponentCreator('/docs/api-reference/', 'ec6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/graphql/',
                component: ComponentCreator('/docs/api-reference/graphql/', 'd75'),
                exact: true
              },
              {
                path: '/docs/api-reference/graphql/',
                component: ComponentCreator('/docs/api-reference/graphql/', '208'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/',
                component: ComponentCreator('/docs/api-reference/openapi/', '1e1'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/',
                component: ComponentCreator('/docs/api-reference/openapi/', '504'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/endpoints/',
                component: ComponentCreator('/docs/api-reference/openapi/endpoints/', '777'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/endpoints/',
                component: ComponentCreator('/docs/api-reference/openapi/endpoints/', '3d4'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/examples/',
                component: ComponentCreator('/docs/api-reference/openapi/examples/', 'b0c'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/examples/',
                component: ComponentCreator('/docs/api-reference/openapi/examples/', '1af'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/overview/',
                component: ComponentCreator('/docs/api-reference/openapi/overview/', '762'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/overview/',
                component: ComponentCreator('/docs/api-reference/openapi/overview/', 'df3'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/schemas/',
                component: ComponentCreator('/docs/api-reference/openapi/schemas/', '760'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/schemas/',
                component: ComponentCreator('/docs/api-reference/openapi/schemas/', '8ee'),
                exact: true
              },
              {
                path: '/docs/api-reference/rest-api/',
                component: ComponentCreator('/docs/api-reference/rest-api/', 'd37'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/',
                component: ComponentCreator('/docs/api-reference/rest-api/', '833'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/agents/',
                component: ComponentCreator('/docs/api-reference/rest-api/agents/', '94e'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/agents/',
                component: ComponentCreator('/docs/api-reference/rest-api/agents/', '18c'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/authentication/',
                component: ComponentCreator('/docs/api-reference/rest-api/authentication/', '129'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/authentication/',
                component: ComponentCreator('/docs/api-reference/rest-api/authentication/', '054'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/chat/',
                component: ComponentCreator('/docs/api-reference/rest-api/chat/', '710'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/chat/',
                component: ComponentCreator('/docs/api-reference/rest-api/chat/', '892'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/events/',
                component: ComponentCreator('/docs/api-reference/rest-api/events/', '1f8'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/events/',
                component: ComponentCreator('/docs/api-reference/rest-api/events/', '44f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/extensions/',
                component: ComponentCreator('/docs/api-reference/rest-api/extensions/', '9f0'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/extensions/',
                component: ComponentCreator('/docs/api-reference/rest-api/extensions/', 'e9d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/health/',
                component: ComponentCreator('/docs/api-reference/rest-api/health/', '09b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/health/',
                component: ComponentCreator('/docs/api-reference/rest-api/health/', 'efd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/memory/',
                component: ComponentCreator('/docs/api-reference/rest-api/memory/', '10f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/memory/',
                component: ComponentCreator('/docs/api-reference/rest-api/memory/', '3ba'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/', 'ac5'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/', '2c5'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/agents/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/agents/', 'd24'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/agents/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/agents/', '1c6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/extensions/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/extensions/', '59f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/extensions/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/extensions/', '954'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/installation/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/installation/', '93b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/installation/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/installation/', '6f6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/modules/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/modules/', 'd1b'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/modules/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/modules/', 'd7d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/runtime/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/runtime/', 'efb'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/runtime/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/runtime/', 'c67'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/types/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/types/', 'cd9'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/types/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/types/', 'c4a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/',
                component: ComponentCreator('/docs/api-reference/websocket-api/', 'b28'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/',
                component: ComponentCreator('/docs/api-reference/websocket-api/', '7ea'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/commands/',
                component: ComponentCreator('/docs/api-reference/websocket-api/commands/', '2fe'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/commands/',
                component: ComponentCreator('/docs/api-reference/websocket-api/commands/', 'bec'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/connection/',
                component: ComponentCreator('/docs/api-reference/websocket-api/connection/', '51e'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/connection/',
                component: ComponentCreator('/docs/api-reference/websocket-api/connection/', 'ad9'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/events/',
                component: ComponentCreator('/docs/api-reference/websocket-api/events/', '940'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/events/',
                component: ComponentCreator('/docs/api-reference/websocket-api/events/', 'a95'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/streaming/',
                component: ComponentCreator('/docs/api-reference/websocket-api/streaming/', '060'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/streaming/',
                component: ComponentCreator('/docs/api-reference/websocket-api/streaming/', '174'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/architecture/',
                component: ComponentCreator('/docs/architecture/', '60d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/',
                component: ComponentCreator('/docs/architecture/', '372'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/data-flow/',
                component: ComponentCreator('/docs/architecture/data-flow/', '5fe'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/data-flow/',
                component: ComponentCreator('/docs/architecture/data-flow/', 'd1c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/',
                component: ComponentCreator('/docs/architecture/patterns/', '460'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/',
                component: ComponentCreator('/docs/architecture/patterns/', 'e19'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/mind-agents-architecture',
                component: ComponentCreator('/docs/architecture/patterns/mind-agents-architecture', 'e3a'),
                exact: true
              },
              {
                path: '/docs/architecture/patterns/mind-agents-architecture',
                component: ComponentCreator('/docs/architecture/patterns/mind-agents-architecture', '345'),
                exact: true
              },
              {
                path: '/docs/architecture/scalability/',
                component: ComponentCreator('/docs/architecture/scalability/', '062'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/scalability/',
                component: ComponentCreator('/docs/architecture/scalability/', 'ff4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/system-design/',
                component: ComponentCreator('/docs/architecture/system-design/', '9cd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/system-design/',
                component: ComponentCreator('/docs/architecture/system-design/', 'a3e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/',
                component: ComponentCreator('/docs/changelog/', 'cb8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/',
                component: ComponentCreator('/docs/changelog/', '1f7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/breaking-changes/',
                component: ComponentCreator('/docs/changelog/breaking-changes/', '48f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/breaking-changes/',
                component: ComponentCreator('/docs/changelog/breaking-changes/', 'd38'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/migration-guides/',
                component: ComponentCreator('/docs/changelog/migration-guides/', '4b3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/migration-guides/',
                component: ComponentCreator('/docs/changelog/migration-guides/', '5ee'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/releases/',
                component: ComponentCreator('/docs/changelog/releases/', '551'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/releases/',
                component: ComponentCreator('/docs/changelog/releases/', '2c0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', 'a92'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '756'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/contributors/',
                component: ComponentCreator('/docs/community/contributors/', 'a15'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/contributors/',
                component: ComponentCreator('/docs/community/contributors/', '89d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/discord/',
                component: ComponentCreator('/docs/community/discord/', 'f52'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/discord/',
                component: ComponentCreator('/docs/community/discord/', 'bf2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/forums/',
                component: ComponentCreator('/docs/community/forums/', '36e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/forums/',
                component: ComponentCreator('/docs/community/forums/', '10d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/showcase/',
                component: ComponentCreator('/docs/community/showcase/', 'aa1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/showcase/',
                component: ComponentCreator('/docs/community/showcase/', '7e7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/',
                component: ComponentCreator('/docs/core-concepts/', '3bc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/',
                component: ComponentCreator('/docs/core-concepts/', 'd07'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/event-bus/',
                component: ComponentCreator('/docs/core-concepts/event-bus/', 'd17'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/event-bus/',
                component: ComponentCreator('/docs/core-concepts/event-bus/', '12c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/lifecycle/',
                component: ComponentCreator('/docs/core-concepts/lifecycle/', '404'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/lifecycle/',
                component: ComponentCreator('/docs/core-concepts/lifecycle/', 'f73'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/plugin-system/',
                component: ComponentCreator('/docs/core-concepts/plugin-system/', 'bfd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/plugin-system/',
                component: ComponentCreator('/docs/core-concepts/plugin-system/', '078'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/registry/',
                component: ComponentCreator('/docs/core-concepts/registry/', 'd1b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/registry/',
                component: ComponentCreator('/docs/core-concepts/registry/', 'bae'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/runtime/',
                component: ComponentCreator('/docs/core-concepts/runtime/', '10e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/runtime/',
                component: ComponentCreator('/docs/core-concepts/runtime/', '315'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/',
                component: ComponentCreator('/docs/deployment/', 'cfa'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/',
                component: ComponentCreator('/docs/deployment/', 'd0c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/cloud/',
                component: ComponentCreator('/docs/deployment/cloud/', 'd18'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/cloud/',
                component: ComponentCreator('/docs/deployment/cloud/', '4a4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/',
                component: ComponentCreator('/docs/deployment/configuration/', 'd2b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/',
                component: ComponentCreator('/docs/deployment/configuration/', 'd61'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/guide',
                component: ComponentCreator('/docs/deployment/configuration/guide', '2f5'),
                exact: true
              },
              {
                path: '/docs/deployment/configuration/guide',
                component: ComponentCreator('/docs/deployment/configuration/guide', 'fec'),
                exact: true
              },
              {
                path: '/docs/deployment/docker/',
                component: ComponentCreator('/docs/deployment/docker/', '56a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/docker/',
                component: ComponentCreator('/docs/deployment/docker/', '42b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/kubernetes/',
                component: ComponentCreator('/docs/deployment/kubernetes/', '194'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/kubernetes/',
                component: ComponentCreator('/docs/deployment/kubernetes/', 'c07'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/on-premise/',
                component: ComponentCreator('/docs/deployment/on-premise/', '4b5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/on-premise/',
                component: ComponentCreator('/docs/deployment/on-premise/', '54c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/',
                component: ComponentCreator('/docs/development/', 'abd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/',
                component: ComponentCreator('/docs/development/', 'c45'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/code-style/',
                component: ComponentCreator('/docs/development/code-style/', 'b8c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/code-style/',
                component: ComponentCreator('/docs/development/code-style/', '0fd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/contributing/',
                component: ComponentCreator('/docs/development/contributing/', 'a50'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/contributing/',
                component: ComponentCreator('/docs/development/contributing/', '1a0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/debugging/',
                component: ComponentCreator('/docs/development/debugging/', 'c91'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/debugging/',
                component: ComponentCreator('/docs/development/debugging/', '493'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/',
                component: ComponentCreator('/docs/development/plugin-development/', 'ff9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/',
                component: ComponentCreator('/docs/development/plugin-development/', '94d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/guide',
                component: ComponentCreator('/docs/development/plugin-development/guide', '267'),
                exact: true
              },
              {
                path: '/docs/development/plugin-development/guide',
                component: ComponentCreator('/docs/development/plugin-development/guide', '49c'),
                exact: true
              },
              {
                path: '/docs/examples/',
                component: ComponentCreator('/docs/examples/', 'bfa'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/examples/',
                component: ComponentCreator('/docs/examples/', 'ed7'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/examples/advanced/',
                component: ComponentCreator('/docs/examples/advanced/', '269'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/advanced/',
                component: ComponentCreator('/docs/examples/advanced/', '07c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/basic/',
                component: ComponentCreator('/docs/examples/basic/', '2ab'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/basic/',
                component: ComponentCreator('/docs/examples/basic/', '362'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/templates/',
                component: ComponentCreator('/docs/examples/templates/', '1a7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/templates/',
                component: ComponentCreator('/docs/examples/templates/', '3ec'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/use-cases/',
                component: ComponentCreator('/docs/examples/use-cases/', '2dd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/use-cases/',
                component: ComponentCreator('/docs/examples/use-cases/', '3ba'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/',
                component: ComponentCreator('/docs/extensions/', 'f32'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/',
                component: ComponentCreator('/docs/extensions/', 'e50'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/',
                component: ComponentCreator('/docs/extensions/api-server/', 'c92'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/',
                component: ComponentCreator('/docs/extensions/api-server/', 'aa7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/extension-interface',
                component: ComponentCreator('/docs/extensions/api-server/extension-interface', '865'),
                exact: true
              },
              {
                path: '/docs/extensions/api-server/extension-interface',
                component: ComponentCreator('/docs/extensions/api-server/extension-interface', '29c'),
                exact: true
              },
              {
                path: '/docs/extensions/cli/',
                component: ComponentCreator('/docs/extensions/cli/', '561'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/cli/',
                component: ComponentCreator('/docs/extensions/cli/', 'b95'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/discord/',
                component: ComponentCreator('/docs/extensions/discord/', 'd96'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/discord/',
                component: ComponentCreator('/docs/extensions/discord/', 'c89'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/slack/',
                component: ComponentCreator('/docs/extensions/slack/', '413'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/slack/',
                component: ComponentCreator('/docs/extensions/slack/', 'a35'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/',
                component: ComponentCreator('/docs/extensions/telegram/', 'c9d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/',
                component: ComponentCreator('/docs/extensions/telegram/', 'f16'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/setup',
                component: ComponentCreator('/docs/extensions/telegram/setup', '432'),
                exact: true
              },
              {
                path: '/docs/extensions/telegram/setup',
                component: ComponentCreator('/docs/extensions/telegram/setup', '67e'),
                exact: true
              },
              {
                path: '/docs/extensions/twitter/',
                component: ComponentCreator('/docs/extensions/twitter/', 'b71'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/twitter/',
                component: ComponentCreator('/docs/extensions/twitter/', 'a16'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/web-ui/',
                component: ComponentCreator('/docs/extensions/web-ui/', '45f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/web-ui/',
                component: ComponentCreator('/docs/extensions/web-ui/', '329'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '1f1'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '8a4'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/first-agent/',
                component: ComponentCreator('/docs/getting-started/first-agent/', 'b14'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/first-agent/',
                component: ComponentCreator('/docs/getting-started/first-agent/', '141'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/installation/',
                component: ComponentCreator('/docs/getting-started/installation/', '61d'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/installation/',
                component: ComponentCreator('/docs/getting-started/installation/', 'e02'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/prerequisites/',
                component: ComponentCreator('/docs/getting-started/prerequisites/', '17a'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/prerequisites/',
                component: ComponentCreator('/docs/getting-started/prerequisites/', '7d4'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/quick-start/',
                component: ComponentCreator('/docs/getting-started/quick-start/', '81a'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/quick-start/',
                component: ComponentCreator('/docs/getting-started/quick-start/', '03f'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/integrations/',
                component: ComponentCreator('/docs/integrations/', '6c6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/',
                component: ComponentCreator('/docs/integrations/', '9f6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/databases/',
                component: ComponentCreator('/docs/integrations/databases/', 'fb9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/databases/',
                component: ComponentCreator('/docs/integrations/databases/', '695'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/langchain/',
                component: ComponentCreator('/docs/integrations/langchain/', 'ebe'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/langchain/',
                component: ComponentCreator('/docs/integrations/langchain/', '6da'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/llama-index/',
                component: ComponentCreator('/docs/integrations/llama-index/', '9c5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/llama-index/',
                component: ComponentCreator('/docs/integrations/llama-index/', '97c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/',
                component: ComponentCreator('/docs/integrations/mcp/', 'f31'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/',
                component: ComponentCreator('/docs/integrations/mcp/', '910'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/api-integration',
                component: ComponentCreator('/docs/integrations/mcp/api-integration', '756'),
                exact: true
              },
              {
                path: '/docs/integrations/mcp/api-integration',
                component: ComponentCreator('/docs/integrations/mcp/api-integration', '924'),
                exact: true
              },
              {
                path: '/docs/integrations/vector-stores/',
                component: ComponentCreator('/docs/integrations/vector-stores/', 'f19'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/vector-stores/',
                component: ComponentCreator('/docs/integrations/vector-stores/', '45f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/introduction',
                component: ComponentCreator('/docs/introduction', '50a'),
                exact: true
              },
              {
                path: '/docs/migration/',
                component: ComponentCreator('/docs/migration/', 'dcc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/',
                component: ComponentCreator('/docs/migration/', '556'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/breaking-changes/',
                component: ComponentCreator('/docs/migration/breaking-changes/', '34b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/breaking-changes/',
                component: ComponentCreator('/docs/migration/breaking-changes/', '02a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/data-migration/',
                component: ComponentCreator('/docs/migration/data-migration/', '3a1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/data-migration/',
                component: ComponentCreator('/docs/migration/data-migration/', '7d1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/',
                component: ComponentCreator('/docs/migration/version-upgrades/', '28e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/',
                component: ComponentCreator('/docs/migration/version-upgrades/', '132'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/v1-migration',
                component: ComponentCreator('/docs/migration/version-upgrades/v1-migration', 'bc8'),
                exact: true
              },
              {
                path: '/docs/migration/version-upgrades/v1-migration',
                component: ComponentCreator('/docs/migration/version-upgrades/v1-migration', 'b30'),
                exact: true
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', '51a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', '546'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/behavior/',
                component: ComponentCreator('/docs/modules/behavior/', '401'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/behavior/',
                component: ComponentCreator('/docs/modules/behavior/', 'bba'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/',
                component: ComponentCreator('/docs/modules/cognition/', '559'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/',
                component: ComponentCreator('/docs/modules/cognition/', 'ea7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/api',
                component: ComponentCreator('/docs/modules/cognition/api', '446'),
                exact: true
              },
              {
                path: '/docs/modules/cognition/api',
                component: ComponentCreator('/docs/modules/cognition/api', 'edf'),
                exact: true
              },
              {
                path: '/docs/modules/cognition/htn-planner/',
                component: ComponentCreator('/docs/modules/cognition/htn-planner/', '935'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/htn-planner/',
                component: ComponentCreator('/docs/modules/cognition/htn-planner/', 'fa3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/hybrid/',
                component: ComponentCreator('/docs/modules/cognition/hybrid/', '81f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/hybrid/',
                component: ComponentCreator('/docs/modules/cognition/hybrid/', 'f68'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/reactive/',
                component: ComponentCreator('/docs/modules/cognition/reactive/', 'd63'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/reactive/',
                component: ComponentCreator('/docs/modules/cognition/reactive/', '7d6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/consciousness/',
                component: ComponentCreator('/docs/modules/consciousness/', '912'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/consciousness/',
                component: ComponentCreator('/docs/modules/consciousness/', '7de'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/',
                component: ComponentCreator('/docs/modules/emotion/', 'f15'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/',
                component: ComponentCreator('/docs/modules/emotion/', '915'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/api',
                component: ComponentCreator('/docs/modules/emotion/api', '711'),
                exact: true
              },
              {
                path: '/docs/modules/emotion/api',
                component: ComponentCreator('/docs/modules/emotion/api', 'eea'),
                exact: true
              },
              {
                path: '/docs/modules/emotion/custom-emotions/',
                component: ComponentCreator('/docs/modules/emotion/custom-emotions/', '688'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/custom-emotions/',
                component: ComponentCreator('/docs/modules/emotion/custom-emotions/', 'dba'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/emotion-stack/',
                component: ComponentCreator('/docs/modules/emotion/emotion-stack/', 'fa0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/emotion-stack/',
                component: ComponentCreator('/docs/modules/emotion/emotion-stack/', '7b9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/',
                component: ComponentCreator('/docs/modules/memory/', '7fc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/',
                component: ComponentCreator('/docs/modules/memory/', '3f6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/neon/',
                component: ComponentCreator('/docs/modules/memory/neon/', '1cf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/neon/',
                component: ComponentCreator('/docs/modules/memory/neon/', '87a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/postgres/',
                component: ComponentCreator('/docs/modules/memory/postgres/', 'c92'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/postgres/',
                component: ComponentCreator('/docs/modules/memory/postgres/', 'e8c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/',
                component: ComponentCreator('/docs/modules/memory/providers/', 'f2e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/',
                component: ComponentCreator('/docs/modules/memory/providers/', '9f1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/api',
                component: ComponentCreator('/docs/modules/memory/providers/api', 'cf8'),
                exact: true
              },
              {
                path: '/docs/modules/memory/providers/api',
                component: ComponentCreator('/docs/modules/memory/providers/api', '251'),
                exact: true
              },
              {
                path: '/docs/modules/memory/sqlite/',
                component: ComponentCreator('/docs/modules/memory/sqlite/', '335'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/sqlite/',
                component: ComponentCreator('/docs/modules/memory/sqlite/', '2ba'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/supabase/',
                component: ComponentCreator('/docs/modules/memory/supabase/', '355'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/supabase/',
                component: ComponentCreator('/docs/modules/memory/supabase/', '24e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/tools/',
                component: ComponentCreator('/docs/modules/tools/', '688'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/tools/',
                component: ComponentCreator('/docs/modules/tools/', 'bda'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/',
                component: ComponentCreator('/docs/monitoring/', '544'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/',
                component: ComponentCreator('/docs/monitoring/', '4f1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/alerts/',
                component: ComponentCreator('/docs/monitoring/alerts/', 'ceb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/alerts/',
                component: ComponentCreator('/docs/monitoring/alerts/', '9af'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/dashboards/',
                component: ComponentCreator('/docs/monitoring/dashboards/', 'aae'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/dashboards/',
                component: ComponentCreator('/docs/monitoring/dashboards/', 'eb3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/logging/',
                component: ComponentCreator('/docs/monitoring/logging/', '289'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/logging/',
                component: ComponentCreator('/docs/monitoring/logging/', '053'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/metrics/',
                component: ComponentCreator('/docs/monitoring/metrics/', '484'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/metrics/',
                component: ComponentCreator('/docs/monitoring/metrics/', 'c4c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/tracing/',
                component: ComponentCreator('/docs/monitoring/tracing/', '908'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/tracing/',
                component: ComponentCreator('/docs/monitoring/tracing/', '1bc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/',
                component: ComponentCreator('/docs/overview/', 'c5c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/',
                component: ComponentCreator('/docs/overview/', '226'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/introduction/',
                component: ComponentCreator('/docs/overview/introduction/', '3fc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/introduction/',
                component: ComponentCreator('/docs/overview/introduction/', 'cd7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/',
                component: ComponentCreator('/docs/overview/roadmap/', '96f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/',
                component: ComponentCreator('/docs/overview/roadmap/', '160'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/product-requirements',
                component: ComponentCreator('/docs/overview/roadmap/product-requirements', '59b'),
                exact: true
              },
              {
                path: '/docs/overview/roadmap/product-requirements',
                component: ComponentCreator('/docs/overview/roadmap/product-requirements', 'f09'),
                exact: true
              },
              {
                path: '/docs/overview/use-cases/',
                component: ComponentCreator('/docs/overview/use-cases/', 'c66'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/use-cases/',
                component: ComponentCreator('/docs/overview/use-cases/', 'f69'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/',
                component: ComponentCreator('/docs/performance/', '61a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/',
                component: ComponentCreator('/docs/performance/', '73c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/benchmarks/',
                component: ComponentCreator('/docs/performance/benchmarks/', 'd7e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/benchmarks/',
                component: ComponentCreator('/docs/performance/benchmarks/', 'dc8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/caching/',
                component: ComponentCreator('/docs/performance/caching/', '313'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/caching/',
                component: ComponentCreator('/docs/performance/caching/', 'ec3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/optimization/',
                component: ComponentCreator('/docs/performance/optimization/', '3f8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/optimization/',
                component: ComponentCreator('/docs/performance/optimization/', '1a3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/profiling/',
                component: ComponentCreator('/docs/performance/profiling/', '434'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/profiling/',
                component: ComponentCreator('/docs/performance/profiling/', 'dab'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/scaling/',
                component: ComponentCreator('/docs/performance/scaling/', 'f59'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/scaling/',
                component: ComponentCreator('/docs/performance/scaling/', '858'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/',
                component: ComponentCreator('/docs/portals/', '859'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/',
                component: ComponentCreator('/docs/portals/', '54e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/anthropic/',
                component: ComponentCreator('/docs/portals/anthropic/', '052'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/anthropic/',
                component: ComponentCreator('/docs/portals/anthropic/', '4db'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/',
                component: ComponentCreator('/docs/portals/custom/', 'a3d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/',
                component: ComponentCreator('/docs/portals/custom/', '608'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/api',
                component: ComponentCreator('/docs/portals/custom/api', 'b3b'),
                exact: true
              },
              {
                path: '/docs/portals/custom/api',
                component: ComponentCreator('/docs/portals/custom/api', '0b6'),
                exact: true
              },
              {
                path: '/docs/portals/google/',
                component: ComponentCreator('/docs/portals/google/', 'f2c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/google/',
                component: ComponentCreator('/docs/portals/google/', '4a4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/groq/',
                component: ComponentCreator('/docs/portals/groq/', 'b53'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/groq/',
                component: ComponentCreator('/docs/portals/groq/', '3c1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/ollama/',
                component: ComponentCreator('/docs/portals/ollama/', '333'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/ollama/',
                component: ComponentCreator('/docs/portals/ollama/', '5a1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/openai/',
                component: ComponentCreator('/docs/portals/openai/', 'f83'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/openai/',
                component: ComponentCreator('/docs/portals/openai/', '3df'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/portal-switching',
                component: ComponentCreator('/docs/portals/portal-switching', '317'),
                exact: true
              },
              {
                path: '/docs/portals/portal-switching',
                component: ComponentCreator('/docs/portals/portal-switching', 'e70'),
                exact: true
              },
              {
                path: '/docs/portals/xai/',
                component: ComponentCreator('/docs/portals/xai/', 'a64'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/xai/',
                component: ComponentCreator('/docs/portals/xai/', 'bd9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/',
                component: ComponentCreator('/docs/resources/', '289'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/',
                component: ComponentCreator('/docs/resources/', '582'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/glossary/',
                component: ComponentCreator('/docs/resources/glossary/', '4db'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/glossary/',
                component: ComponentCreator('/docs/resources/glossary/', '9e8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/learning/',
                component: ComponentCreator('/docs/resources/learning/', '6bb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/learning/',
                component: ComponentCreator('/docs/resources/learning/', '1cc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/references/',
                component: ComponentCreator('/docs/resources/references/', 'dd1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/references/',
                component: ComponentCreator('/docs/resources/references/', '2b0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/tools/',
                component: ComponentCreator('/docs/resources/tools/', '02e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/tools/',
                component: ComponentCreator('/docs/resources/tools/', '300'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/',
                component: ComponentCreator('/docs/roadmap/', '0f3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/',
                component: ComponentCreator('/docs/roadmap/', '986'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/features/',
                component: ComponentCreator('/docs/roadmap/features/', '6d4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/features/',
                component: ComponentCreator('/docs/roadmap/features/', 'cca'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/timeline/',
                component: ComponentCreator('/docs/roadmap/timeline/', '8db'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/timeline/',
                component: ComponentCreator('/docs/roadmap/timeline/', 'cd5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/vision/',
                component: ComponentCreator('/docs/roadmap/vision/', 'f02'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/vision/',
                component: ComponentCreator('/docs/roadmap/vision/', '628'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/',
                component: ComponentCreator('/docs/security/', 'a0e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/',
                component: ComponentCreator('/docs/security/', 'd3b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authentication/',
                component: ComponentCreator('/docs/security/authentication/', '4ed'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authentication/',
                component: ComponentCreator('/docs/security/authentication/', '04f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authorization/',
                component: ComponentCreator('/docs/security/authorization/', '815'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authorization/',
                component: ComponentCreator('/docs/security/authorization/', 'b35'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/compliance/',
                component: ComponentCreator('/docs/security/compliance/', '1d5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/compliance/',
                component: ComponentCreator('/docs/security/compliance/', '97c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/encryption/',
                component: ComponentCreator('/docs/security/encryption/', '91c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/encryption/',
                component: ComponentCreator('/docs/security/encryption/', '267'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/rbac/',
                component: ComponentCreator('/docs/security/rbac/', 'dab'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/rbac/',
                component: ComponentCreator('/docs/security/rbac/', 'e5d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/',
                component: ComponentCreator('/docs/support/', 'be6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/',
                component: ComponentCreator('/docs/support/', 'b79'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/community/',
                component: ComponentCreator('/docs/support/community/', '6da'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/community/',
                component: ComponentCreator('/docs/support/community/', '669'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/contact/',
                component: ComponentCreator('/docs/support/contact/', '2bf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/contact/',
                component: ComponentCreator('/docs/support/contact/', 'e0a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/documentation/',
                component: ComponentCreator('/docs/support/documentation/', '43c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/documentation/',
                component: ComponentCreator('/docs/support/documentation/', '8b5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/enterprise/',
                component: ComponentCreator('/docs/support/enterprise/', 'bcf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/enterprise/',
                component: ComponentCreator('/docs/support/enterprise/', 'cfd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/',
                component: ComponentCreator('/docs/testing/', '4ed'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/',
                component: ComponentCreator('/docs/testing/', 'ce1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/benchmarks/',
                component: ComponentCreator('/docs/testing/benchmarks/', 'a35'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/benchmarks/',
                component: ComponentCreator('/docs/testing/benchmarks/', '969'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/ci-cd/',
                component: ComponentCreator('/docs/testing/ci-cd/', '8dd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/ci-cd/',
                component: ComponentCreator('/docs/testing/ci-cd/', 'cb9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/e2e-tests/',
                component: ComponentCreator('/docs/testing/e2e-tests/', '4a7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/e2e-tests/',
                component: ComponentCreator('/docs/testing/e2e-tests/', '52a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/integration-tests/',
                component: ComponentCreator('/docs/testing/integration-tests/', '71e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/integration-tests/',
                component: ComponentCreator('/docs/testing/integration-tests/', '76e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/unit-tests/',
                component: ComponentCreator('/docs/testing/unit-tests/', 'd2b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/unit-tests/',
                component: ComponentCreator('/docs/testing/unit-tests/', '4a2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', 'b70'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', '07d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/common-issues/',
                component: ComponentCreator('/docs/troubleshooting/common-issues/', '6ba'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/common-issues/',
                component: ComponentCreator('/docs/troubleshooting/common-issues/', '04b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/debugging/',
                component: ComponentCreator('/docs/troubleshooting/debugging/', 'b57'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/debugging/',
                component: ComponentCreator('/docs/troubleshooting/debugging/', '22a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/faq/',
                component: ComponentCreator('/docs/troubleshooting/faq/', '1e6'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/troubleshooting/faq/',
                component: ComponentCreator('/docs/troubleshooting/faq/', 'e77'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/troubleshooting/logs/',
                component: ComponentCreator('/docs/troubleshooting/logs/', '167'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/logs/',
                component: ComponentCreator('/docs/troubleshooting/logs/', '8d5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/',
                component: ComponentCreator('/docs/tutorials/', '3e6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/',
                component: ComponentCreator('/docs/tutorials/', '5d7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/advanced/',
                component: ComponentCreator('/docs/tutorials/advanced/', '475'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/advanced/',
                component: ComponentCreator('/docs/tutorials/advanced/', 'aeb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/beginner/',
                component: ComponentCreator('/docs/tutorials/beginner/', '07a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/beginner/',
                component: ComponentCreator('/docs/tutorials/beginner/', '574'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/intermediate/',
                component: ComponentCreator('/docs/tutorials/intermediate/', 'fd6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/intermediate/',
                component: ComponentCreator('/docs/tutorials/intermediate/', '825'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/video-tutorials/',
                component: ComponentCreator('/docs/tutorials/video-tutorials/', 'da6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/video-tutorials/',
                component: ComponentCreator('/docs/tutorials/video-tutorials/', '115'),
                exact: true,
                sidebar: "docsSidebar"
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
