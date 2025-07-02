import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '61c'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'ba2'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '99a'),
            routes: [
              {
                path: '/docs/advanced-topics/',
                component: ComponentCreator('/docs/advanced-topics/', 'c3c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/',
                component: ComponentCreator('/docs/advanced-topics/', '5b4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/', '7bd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/', '6b1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/advanced-ai',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/advanced-ai', '696'),
                exact: true
              },
              {
                path: '/docs/advanced-topics/autonomous-agents/advanced-ai',
                component: ComponentCreator('/docs/advanced-topics/autonomous-agents/advanced-ai', '883'),
                exact: true
              },
              {
                path: '/docs/advanced-topics/custom-portals/',
                component: ComponentCreator('/docs/advanced-topics/custom-portals/', '133'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/custom-portals/',
                component: ComponentCreator('/docs/advanced-topics/custom-portals/', 'dae'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/fine-tuning/',
                component: ComponentCreator('/docs/advanced-topics/fine-tuning/', '78d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/fine-tuning/',
                component: ComponentCreator('/docs/advanced-topics/fine-tuning/', '399'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/multi-modal/',
                component: ComponentCreator('/docs/advanced-topics/multi-modal/', '55b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/advanced-topics/multi-modal/',
                component: ComponentCreator('/docs/advanced-topics/multi-modal/', '9c3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/',
                component: ComponentCreator('/docs/agents/', '0ee'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/',
                component: ComponentCreator('/docs/agents/', '7ad'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/character-system/',
                component: ComponentCreator('/docs/agents/character-system/', '2ea'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/character-system/',
                component: ComponentCreator('/docs/agents/character-system/', 'c55'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/communication/',
                component: ComponentCreator('/docs/agents/communication/', 'f20'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/communication/',
                component: ComponentCreator('/docs/agents/communication/', '400'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/configuration/',
                component: ComponentCreator('/docs/agents/configuration/', '4f3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/configuration/',
                component: ComponentCreator('/docs/agents/configuration/', '1ae'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/',
                component: ComponentCreator('/docs/agents/lifecycle/', 'd30'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/',
                component: ComponentCreator('/docs/agents/lifecycle/', 'f94'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/lifecycle/api',
                component: ComponentCreator('/docs/agents/lifecycle/api', 'd0a'),
                exact: true
              },
              {
                path: '/docs/agents/lifecycle/api',
                component: ComponentCreator('/docs/agents/lifecycle/api', '0d3'),
                exact: true
              },
              {
                path: '/docs/agents/multi-agent/',
                component: ComponentCreator('/docs/agents/multi-agent/', '17d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/agents/multi-agent/',
                component: ComponentCreator('/docs/agents/multi-agent/', 'a9e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api-reference/',
                component: ComponentCreator('/docs/api-reference/', '70a'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/',
                component: ComponentCreator('/docs/api-reference/', '0d7'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/graphql/',
                component: ComponentCreator('/docs/api-reference/graphql/', '58c'),
                exact: true
              },
              {
                path: '/docs/api-reference/graphql/',
                component: ComponentCreator('/docs/api-reference/graphql/', '760'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/',
                component: ComponentCreator('/docs/api-reference/openapi/', 'bd6'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/',
                component: ComponentCreator('/docs/api-reference/openapi/', '565'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/endpoints/',
                component: ComponentCreator('/docs/api-reference/openapi/endpoints/', '911'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/endpoints/',
                component: ComponentCreator('/docs/api-reference/openapi/endpoints/', 'e1e'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/examples/',
                component: ComponentCreator('/docs/api-reference/openapi/examples/', '702'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/examples/',
                component: ComponentCreator('/docs/api-reference/openapi/examples/', '31f'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/overview/',
                component: ComponentCreator('/docs/api-reference/openapi/overview/', 'b2c'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/overview/',
                component: ComponentCreator('/docs/api-reference/openapi/overview/', 'ee8'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/schemas/',
                component: ComponentCreator('/docs/api-reference/openapi/schemas/', '820'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi/schemas/',
                component: ComponentCreator('/docs/api-reference/openapi/schemas/', '6a0'),
                exact: true
              },
              {
                path: '/docs/api-reference/rest-api/',
                component: ComponentCreator('/docs/api-reference/rest-api/', '78d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/',
                component: ComponentCreator('/docs/api-reference/rest-api/', 'b63'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/agents/',
                component: ComponentCreator('/docs/api-reference/rest-api/agents/', '4d3'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/agents/',
                component: ComponentCreator('/docs/api-reference/rest-api/agents/', '3f6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/authentication/',
                component: ComponentCreator('/docs/api-reference/rest-api/authentication/', '227'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/authentication/',
                component: ComponentCreator('/docs/api-reference/rest-api/authentication/', 'cc4'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/chat/',
                component: ComponentCreator('/docs/api-reference/rest-api/chat/', '762'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/chat/',
                component: ComponentCreator('/docs/api-reference/rest-api/chat/', '7e5'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/events/',
                component: ComponentCreator('/docs/api-reference/rest-api/events/', '312'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/events/',
                component: ComponentCreator('/docs/api-reference/rest-api/events/', '166'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/extensions/',
                component: ComponentCreator('/docs/api-reference/rest-api/extensions/', '249'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/extensions/',
                component: ComponentCreator('/docs/api-reference/rest-api/extensions/', '091'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/health/',
                component: ComponentCreator('/docs/api-reference/rest-api/health/', '659'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/health/',
                component: ComponentCreator('/docs/api-reference/rest-api/health/', 'cf0'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/memory/',
                component: ComponentCreator('/docs/api-reference/rest-api/memory/', '955'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/rest-api/memory/',
                component: ComponentCreator('/docs/api-reference/rest-api/memory/', '3d1'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/', '93c'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/', 'eab'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/agents/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/agents/', '8f8'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/agents/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/agents/', 'abd'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/extensions/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/extensions/', '5a6'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/extensions/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/extensions/', '680'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/installation/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/installation/', 'c28'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/installation/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/installation/', '37d'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/modules/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/modules/', 'c29'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/modules/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/modules/', 'd37'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/runtime/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/runtime/', '9cf'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/runtime/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/runtime/', '14f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/types/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/types/', '5fc'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/typescript-sdk/types/',
                component: ComponentCreator('/docs/api-reference/typescript-sdk/types/', 'bab'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/',
                component: ComponentCreator('/docs/api-reference/websocket-api/', '199'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/',
                component: ComponentCreator('/docs/api-reference/websocket-api/', '97c'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/commands/',
                component: ComponentCreator('/docs/api-reference/websocket-api/commands/', '1bc'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/commands/',
                component: ComponentCreator('/docs/api-reference/websocket-api/commands/', '578'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/connection/',
                component: ComponentCreator('/docs/api-reference/websocket-api/connection/', '558'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/connection/',
                component: ComponentCreator('/docs/api-reference/websocket-api/connection/', 'b22'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/events/',
                component: ComponentCreator('/docs/api-reference/websocket-api/events/', '6c3'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/events/',
                component: ComponentCreator('/docs/api-reference/websocket-api/events/', 'b5f'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/streaming/',
                component: ComponentCreator('/docs/api-reference/websocket-api/streaming/', '5a1'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/api-reference/websocket-api/streaming/',
                component: ComponentCreator('/docs/api-reference/websocket-api/streaming/', '150'),
                exact: true,
                sidebar: "apiSidebar"
              },
              {
                path: '/docs/architecture/',
                component: ComponentCreator('/docs/architecture/', 'e1f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/',
                component: ComponentCreator('/docs/architecture/', 'bde'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/data-flow/',
                component: ComponentCreator('/docs/architecture/data-flow/', '67d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/data-flow/',
                component: ComponentCreator('/docs/architecture/data-flow/', 'ad9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/',
                component: ComponentCreator('/docs/architecture/patterns/', '938'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/',
                component: ComponentCreator('/docs/architecture/patterns/', '2db'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/patterns/mind-agents-architecture',
                component: ComponentCreator('/docs/architecture/patterns/mind-agents-architecture', 'f6a'),
                exact: true
              },
              {
                path: '/docs/architecture/patterns/mind-agents-architecture',
                component: ComponentCreator('/docs/architecture/patterns/mind-agents-architecture', '3c4'),
                exact: true
              },
              {
                path: '/docs/architecture/scalability/',
                component: ComponentCreator('/docs/architecture/scalability/', '1ed'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/scalability/',
                component: ComponentCreator('/docs/architecture/scalability/', '7a7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/system-design/',
                component: ComponentCreator('/docs/architecture/system-design/', '08d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/system-design/',
                component: ComponentCreator('/docs/architecture/system-design/', 'a78'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/',
                component: ComponentCreator('/docs/changelog/', '2a9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/',
                component: ComponentCreator('/docs/changelog/', '927'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/breaking-changes/',
                component: ComponentCreator('/docs/changelog/breaking-changes/', 'abb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/breaking-changes/',
                component: ComponentCreator('/docs/changelog/breaking-changes/', '674'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/migration-guides/',
                component: ComponentCreator('/docs/changelog/migration-guides/', '6cd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/migration-guides/',
                component: ComponentCreator('/docs/changelog/migration-guides/', '3a6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/releases/',
                component: ComponentCreator('/docs/changelog/releases/', '116'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/changelog/releases/',
                component: ComponentCreator('/docs/changelog/releases/', 'f0a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '083'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', 'f53'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/contributors/',
                component: ComponentCreator('/docs/community/contributors/', 'a8a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/contributors/',
                component: ComponentCreator('/docs/community/contributors/', '875'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/discord/',
                component: ComponentCreator('/docs/community/discord/', '6a2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/discord/',
                component: ComponentCreator('/docs/community/discord/', '2b5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/forums/',
                component: ComponentCreator('/docs/community/forums/', 'f7f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/forums/',
                component: ComponentCreator('/docs/community/forums/', '2de'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/showcase/',
                component: ComponentCreator('/docs/community/showcase/', '99d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/community/showcase/',
                component: ComponentCreator('/docs/community/showcase/', 'd99'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/',
                component: ComponentCreator('/docs/core-concepts/', '0f2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/',
                component: ComponentCreator('/docs/core-concepts/', 'fe7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/event-bus/',
                component: ComponentCreator('/docs/core-concepts/event-bus/', 'd91'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/event-bus/',
                component: ComponentCreator('/docs/core-concepts/event-bus/', 'de6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/lifecycle/',
                component: ComponentCreator('/docs/core-concepts/lifecycle/', 'b2f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/lifecycle/',
                component: ComponentCreator('/docs/core-concepts/lifecycle/', '576'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/plugin-system/',
                component: ComponentCreator('/docs/core-concepts/plugin-system/', '874'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/plugin-system/',
                component: ComponentCreator('/docs/core-concepts/plugin-system/', 'a0b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/registry/',
                component: ComponentCreator('/docs/core-concepts/registry/', '3cf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/registry/',
                component: ComponentCreator('/docs/core-concepts/registry/', '5ea'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/runtime/',
                component: ComponentCreator('/docs/core-concepts/runtime/', 'a62'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/core-concepts/runtime/',
                component: ComponentCreator('/docs/core-concepts/runtime/', 'a07'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/',
                component: ComponentCreator('/docs/deployment/', 'ab2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/',
                component: ComponentCreator('/docs/deployment/', '85c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/cloud/',
                component: ComponentCreator('/docs/deployment/cloud/', 'b2a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/cloud/',
                component: ComponentCreator('/docs/deployment/cloud/', 'b1c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/',
                component: ComponentCreator('/docs/deployment/configuration/', '961'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/',
                component: ComponentCreator('/docs/deployment/configuration/', '988'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/configuration/guide',
                component: ComponentCreator('/docs/deployment/configuration/guide', '866'),
                exact: true
              },
              {
                path: '/docs/deployment/configuration/guide',
                component: ComponentCreator('/docs/deployment/configuration/guide', '903'),
                exact: true
              },
              {
                path: '/docs/deployment/docker/',
                component: ComponentCreator('/docs/deployment/docker/', '061'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/docker/',
                component: ComponentCreator('/docs/deployment/docker/', '99c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/kubernetes/',
                component: ComponentCreator('/docs/deployment/kubernetes/', '8fa'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/kubernetes/',
                component: ComponentCreator('/docs/deployment/kubernetes/', '1cd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/on-premise/',
                component: ComponentCreator('/docs/deployment/on-premise/', '6e4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/on-premise/',
                component: ComponentCreator('/docs/deployment/on-premise/', '415'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/',
                component: ComponentCreator('/docs/development/', 'c5c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/',
                component: ComponentCreator('/docs/development/', 'b12'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/assets-organization',
                component: ComponentCreator('/docs/development/assets-organization', '3a3'),
                exact: true
              },
              {
                path: '/docs/development/assets-organization',
                component: ComponentCreator('/docs/development/assets-organization', '16a'),
                exact: true
              },
              {
                path: '/docs/development/code-style/',
                component: ComponentCreator('/docs/development/code-style/', 'af3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/code-style/',
                component: ComponentCreator('/docs/development/code-style/', '418'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/contributing/',
                component: ComponentCreator('/docs/development/contributing/', '347'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/contributing/',
                component: ComponentCreator('/docs/development/contributing/', '478'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/debugging/',
                component: ComponentCreator('/docs/development/debugging/', 'dee'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/debugging/',
                component: ComponentCreator('/docs/development/debugging/', '7a1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/',
                component: ComponentCreator('/docs/development/plugin-development/', 'fd4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/',
                component: ComponentCreator('/docs/development/plugin-development/', 'ee1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/plugin-development/guide',
                component: ComponentCreator('/docs/development/plugin-development/guide', 'db6'),
                exact: true
              },
              {
                path: '/docs/development/plugin-development/guide',
                component: ComponentCreator('/docs/development/plugin-development/guide', '4ac'),
                exact: true
              },
              {
                path: '/docs/examples/',
                component: ComponentCreator('/docs/examples/', '2f3'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/examples/',
                component: ComponentCreator('/docs/examples/', 'a7d'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/examples/advanced/',
                component: ComponentCreator('/docs/examples/advanced/', '0ec'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/advanced/',
                component: ComponentCreator('/docs/examples/advanced/', 'ad9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/basic/',
                component: ComponentCreator('/docs/examples/basic/', '20d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/basic/',
                component: ComponentCreator('/docs/examples/basic/', '907'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/templates/',
                component: ComponentCreator('/docs/examples/templates/', 'a0e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/templates/',
                component: ComponentCreator('/docs/examples/templates/', '405'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/use-cases/',
                component: ComponentCreator('/docs/examples/use-cases/', '394'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/use-cases/',
                component: ComponentCreator('/docs/examples/use-cases/', '3e2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/',
                component: ComponentCreator('/docs/extensions/', 'ff9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/',
                component: ComponentCreator('/docs/extensions/', '6a3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/',
                component: ComponentCreator('/docs/extensions/api-server/', '895'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/',
                component: ComponentCreator('/docs/extensions/api-server/', 'd88'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/api-server/extension-interface',
                component: ComponentCreator('/docs/extensions/api-server/extension-interface', '839'),
                exact: true
              },
              {
                path: '/docs/extensions/api-server/extension-interface',
                component: ComponentCreator('/docs/extensions/api-server/extension-interface', '5ef'),
                exact: true
              },
              {
                path: '/docs/extensions/cli/',
                component: ComponentCreator('/docs/extensions/cli/', 'ec4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/cli/',
                component: ComponentCreator('/docs/extensions/cli/', '93f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/discord/',
                component: ComponentCreator('/docs/extensions/discord/', '95c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/discord/',
                component: ComponentCreator('/docs/extensions/discord/', 'b4d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/slack/',
                component: ComponentCreator('/docs/extensions/slack/', '546'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/slack/',
                component: ComponentCreator('/docs/extensions/slack/', '7b2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/',
                component: ComponentCreator('/docs/extensions/telegram/', '9d9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/',
                component: ComponentCreator('/docs/extensions/telegram/', '930'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/telegram/setup',
                component: ComponentCreator('/docs/extensions/telegram/setup', '573'),
                exact: true
              },
              {
                path: '/docs/extensions/telegram/setup',
                component: ComponentCreator('/docs/extensions/telegram/setup', 'f42'),
                exact: true
              },
              {
                path: '/docs/extensions/twitter/',
                component: ComponentCreator('/docs/extensions/twitter/', '378'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/twitter/',
                component: ComponentCreator('/docs/extensions/twitter/', '83a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/web-ui/',
                component: ComponentCreator('/docs/extensions/web-ui/', 'a22'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/extensions/web-ui/',
                component: ComponentCreator('/docs/extensions/web-ui/', '419'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '924'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '966'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/first-agent/',
                component: ComponentCreator('/docs/getting-started/first-agent/', 'f52'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/first-agent/',
                component: ComponentCreator('/docs/getting-started/first-agent/', '3c0'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/installation/',
                component: ComponentCreator('/docs/getting-started/installation/', '1d2'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/installation/',
                component: ComponentCreator('/docs/getting-started/installation/', '6bd'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/prerequisites/',
                component: ComponentCreator('/docs/getting-started/prerequisites/', '9e3'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/prerequisites/',
                component: ComponentCreator('/docs/getting-started/prerequisites/', '16f'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/quick-start/',
                component: ComponentCreator('/docs/getting-started/quick-start/', '372'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/getting-started/quick-start/',
                component: ComponentCreator('/docs/getting-started/quick-start/', '548'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/integrations/',
                component: ComponentCreator('/docs/integrations/', '098'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/',
                component: ComponentCreator('/docs/integrations/', 'c02'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/databases/',
                component: ComponentCreator('/docs/integrations/databases/', '8ff'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/databases/',
                component: ComponentCreator('/docs/integrations/databases/', '0df'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/langchain/',
                component: ComponentCreator('/docs/integrations/langchain/', '3e6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/langchain/',
                component: ComponentCreator('/docs/integrations/langchain/', '790'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/llama-index/',
                component: ComponentCreator('/docs/integrations/llama-index/', 'b3e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/llama-index/',
                component: ComponentCreator('/docs/integrations/llama-index/', 'd38'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/',
                component: ComponentCreator('/docs/integrations/mcp/', '812'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/',
                component: ComponentCreator('/docs/integrations/mcp/', 'ede'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/mcp/api-integration',
                component: ComponentCreator('/docs/integrations/mcp/api-integration', '046'),
                exact: true
              },
              {
                path: '/docs/integrations/mcp/api-integration',
                component: ComponentCreator('/docs/integrations/mcp/api-integration', '36e'),
                exact: true
              },
              {
                path: '/docs/integrations/vector-stores/',
                component: ComponentCreator('/docs/integrations/vector-stores/', '40a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/vector-stores/',
                component: ComponentCreator('/docs/integrations/vector-stores/', 'aa0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/introduction',
                component: ComponentCreator('/docs/introduction', '4b9'),
                exact: true
              },
              {
                path: '/docs/migration/',
                component: ComponentCreator('/docs/migration/', '814'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/',
                component: ComponentCreator('/docs/migration/', '827'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/breaking-changes/',
                component: ComponentCreator('/docs/migration/breaking-changes/', '1a7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/breaking-changes/',
                component: ComponentCreator('/docs/migration/breaking-changes/', '068'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/data-migration/',
                component: ComponentCreator('/docs/migration/data-migration/', '1cf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/data-migration/',
                component: ComponentCreator('/docs/migration/data-migration/', 'a64'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/',
                component: ComponentCreator('/docs/migration/version-upgrades/', '010'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/',
                component: ComponentCreator('/docs/migration/version-upgrades/', 'ecf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/migration/version-upgrades/v1-migration',
                component: ComponentCreator('/docs/migration/version-upgrades/v1-migration', '0a4'),
                exact: true
              },
              {
                path: '/docs/migration/version-upgrades/v1-migration',
                component: ComponentCreator('/docs/migration/version-upgrades/v1-migration', '95a'),
                exact: true
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', 'd31'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', '9e3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/behavior/',
                component: ComponentCreator('/docs/modules/behavior/', 'e01'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/behavior/',
                component: ComponentCreator('/docs/modules/behavior/', '1fc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/',
                component: ComponentCreator('/docs/modules/cognition/', '506'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/',
                component: ComponentCreator('/docs/modules/cognition/', '317'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/api',
                component: ComponentCreator('/docs/modules/cognition/api', '965'),
                exact: true
              },
              {
                path: '/docs/modules/cognition/api',
                component: ComponentCreator('/docs/modules/cognition/api', '4db'),
                exact: true
              },
              {
                path: '/docs/modules/cognition/htn-planner/',
                component: ComponentCreator('/docs/modules/cognition/htn-planner/', 'd5a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/htn-planner/',
                component: ComponentCreator('/docs/modules/cognition/htn-planner/', 'e83'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/hybrid/',
                component: ComponentCreator('/docs/modules/cognition/hybrid/', '1f4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/hybrid/',
                component: ComponentCreator('/docs/modules/cognition/hybrid/', '47f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/reactive/',
                component: ComponentCreator('/docs/modules/cognition/reactive/', 'b86'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/cognition/reactive/',
                component: ComponentCreator('/docs/modules/cognition/reactive/', '16c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/consciousness/',
                component: ComponentCreator('/docs/modules/consciousness/', 'a7f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/consciousness/',
                component: ComponentCreator('/docs/modules/consciousness/', '761'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/',
                component: ComponentCreator('/docs/modules/emotion/', '8dd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/',
                component: ComponentCreator('/docs/modules/emotion/', '814'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/api',
                component: ComponentCreator('/docs/modules/emotion/api', '7eb'),
                exact: true
              },
              {
                path: '/docs/modules/emotion/api',
                component: ComponentCreator('/docs/modules/emotion/api', '26c'),
                exact: true
              },
              {
                path: '/docs/modules/emotion/custom-emotions/',
                component: ComponentCreator('/docs/modules/emotion/custom-emotions/', '0eb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/custom-emotions/',
                component: ComponentCreator('/docs/modules/emotion/custom-emotions/', '016'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/emotion-stack/',
                component: ComponentCreator('/docs/modules/emotion/emotion-stack/', '279'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/emotion/emotion-stack/',
                component: ComponentCreator('/docs/modules/emotion/emotion-stack/', 'c26'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/',
                component: ComponentCreator('/docs/modules/memory/', 'b11'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/',
                component: ComponentCreator('/docs/modules/memory/', '7be'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/neon/',
                component: ComponentCreator('/docs/modules/memory/neon/', 'a17'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/neon/',
                component: ComponentCreator('/docs/modules/memory/neon/', 'aca'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/postgres/',
                component: ComponentCreator('/docs/modules/memory/postgres/', '494'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/postgres/',
                component: ComponentCreator('/docs/modules/memory/postgres/', 'd4d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/',
                component: ComponentCreator('/docs/modules/memory/providers/', '093'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/',
                component: ComponentCreator('/docs/modules/memory/providers/', '34e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/providers/api',
                component: ComponentCreator('/docs/modules/memory/providers/api', '8fa'),
                exact: true
              },
              {
                path: '/docs/modules/memory/providers/api',
                component: ComponentCreator('/docs/modules/memory/providers/api', '5a3'),
                exact: true
              },
              {
                path: '/docs/modules/memory/sqlite/',
                component: ComponentCreator('/docs/modules/memory/sqlite/', '307'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/sqlite/',
                component: ComponentCreator('/docs/modules/memory/sqlite/', 'db3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/supabase/',
                component: ComponentCreator('/docs/modules/memory/supabase/', '386'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/memory/supabase/',
                component: ComponentCreator('/docs/modules/memory/supabase/', 'e66'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/tools/',
                component: ComponentCreator('/docs/modules/tools/', '0d2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/modules/tools/',
                component: ComponentCreator('/docs/modules/tools/', '697'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/',
                component: ComponentCreator('/docs/monitoring/', 'e34'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/',
                component: ComponentCreator('/docs/monitoring/', 'eed'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/alerts/',
                component: ComponentCreator('/docs/monitoring/alerts/', '566'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/alerts/',
                component: ComponentCreator('/docs/monitoring/alerts/', '7ec'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/dashboards/',
                component: ComponentCreator('/docs/monitoring/dashboards/', '949'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/dashboards/',
                component: ComponentCreator('/docs/monitoring/dashboards/', '10c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/logging/',
                component: ComponentCreator('/docs/monitoring/logging/', '4e3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/logging/',
                component: ComponentCreator('/docs/monitoring/logging/', '898'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/metrics/',
                component: ComponentCreator('/docs/monitoring/metrics/', '0cc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/metrics/',
                component: ComponentCreator('/docs/monitoring/metrics/', '884'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/tracing/',
                component: ComponentCreator('/docs/monitoring/tracing/', '0c3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/monitoring/tracing/',
                component: ComponentCreator('/docs/monitoring/tracing/', 'd78'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/',
                component: ComponentCreator('/docs/overview/', '4c2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/',
                component: ComponentCreator('/docs/overview/', 'e85'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/introduction/',
                component: ComponentCreator('/docs/overview/introduction/', '655'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/introduction/',
                component: ComponentCreator('/docs/overview/introduction/', '031'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/',
                component: ComponentCreator('/docs/overview/roadmap/', '2da'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/',
                component: ComponentCreator('/docs/overview/roadmap/', '314'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/roadmap/product-requirements',
                component: ComponentCreator('/docs/overview/roadmap/product-requirements', '8b8'),
                exact: true
              },
              {
                path: '/docs/overview/roadmap/product-requirements',
                component: ComponentCreator('/docs/overview/roadmap/product-requirements', '99c'),
                exact: true
              },
              {
                path: '/docs/overview/use-cases/',
                component: ComponentCreator('/docs/overview/use-cases/', '674'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview/use-cases/',
                component: ComponentCreator('/docs/overview/use-cases/', 'c1d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/',
                component: ComponentCreator('/docs/performance/', '818'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/',
                component: ComponentCreator('/docs/performance/', '8ec'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/benchmarks/',
                component: ComponentCreator('/docs/performance/benchmarks/', 'cbe'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/benchmarks/',
                component: ComponentCreator('/docs/performance/benchmarks/', '93a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/caching/',
                component: ComponentCreator('/docs/performance/caching/', '626'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/caching/',
                component: ComponentCreator('/docs/performance/caching/', '100'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/optimization/',
                component: ComponentCreator('/docs/performance/optimization/', 'b97'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/optimization/',
                component: ComponentCreator('/docs/performance/optimization/', '166'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/profiling/',
                component: ComponentCreator('/docs/performance/profiling/', '09c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/profiling/',
                component: ComponentCreator('/docs/performance/profiling/', 'da1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/scaling/',
                component: ComponentCreator('/docs/performance/scaling/', 'c8d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/performance/scaling/',
                component: ComponentCreator('/docs/performance/scaling/', '6e8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/',
                component: ComponentCreator('/docs/portals/', '954'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/',
                component: ComponentCreator('/docs/portals/', 'bf3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/anthropic/',
                component: ComponentCreator('/docs/portals/anthropic/', 'b92'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/anthropic/',
                component: ComponentCreator('/docs/portals/anthropic/', '4bc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/',
                component: ComponentCreator('/docs/portals/custom/', 'f37'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/',
                component: ComponentCreator('/docs/portals/custom/', 'b1e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/custom/api',
                component: ComponentCreator('/docs/portals/custom/api', '026'),
                exact: true
              },
              {
                path: '/docs/portals/custom/api',
                component: ComponentCreator('/docs/portals/custom/api', 'ab0'),
                exact: true
              },
              {
                path: '/docs/portals/google/',
                component: ComponentCreator('/docs/portals/google/', '837'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/google/',
                component: ComponentCreator('/docs/portals/google/', '964'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/groq/',
                component: ComponentCreator('/docs/portals/groq/', '96c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/groq/',
                component: ComponentCreator('/docs/portals/groq/', '2cb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/ollama/',
                component: ComponentCreator('/docs/portals/ollama/', '47b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/ollama/',
                component: ComponentCreator('/docs/portals/ollama/', 'b67'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/openai/',
                component: ComponentCreator('/docs/portals/openai/', '6ef'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/openai/',
                component: ComponentCreator('/docs/portals/openai/', 'b03'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/portal-switching',
                component: ComponentCreator('/docs/portals/portal-switching', '697'),
                exact: true
              },
              {
                path: '/docs/portals/portal-switching',
                component: ComponentCreator('/docs/portals/portal-switching', '3d4'),
                exact: true
              },
              {
                path: '/docs/portals/xai/',
                component: ComponentCreator('/docs/portals/xai/', 'f03'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/portals/xai/',
                component: ComponentCreator('/docs/portals/xai/', '5ac'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/',
                component: ComponentCreator('/docs/resources/', 'bd1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/',
                component: ComponentCreator('/docs/resources/', '5cd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/glossary/',
                component: ComponentCreator('/docs/resources/glossary/', '3fe'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/glossary/',
                component: ComponentCreator('/docs/resources/glossary/', 'e9a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/learning/',
                component: ComponentCreator('/docs/resources/learning/', '521'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/learning/',
                component: ComponentCreator('/docs/resources/learning/', 'a01'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/references/',
                component: ComponentCreator('/docs/resources/references/', '59e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/references/',
                component: ComponentCreator('/docs/resources/references/', 'fa2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/tools/',
                component: ComponentCreator('/docs/resources/tools/', 'a09'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/resources/tools/',
                component: ComponentCreator('/docs/resources/tools/', '6b1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/',
                component: ComponentCreator('/docs/roadmap/', 'd28'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/',
                component: ComponentCreator('/docs/roadmap/', '402'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/features/',
                component: ComponentCreator('/docs/roadmap/features/', 'ea4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/features/',
                component: ComponentCreator('/docs/roadmap/features/', '60c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/timeline/',
                component: ComponentCreator('/docs/roadmap/timeline/', 'a43'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/timeline/',
                component: ComponentCreator('/docs/roadmap/timeline/', 'd4e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/vision/',
                component: ComponentCreator('/docs/roadmap/vision/', '9f6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap/vision/',
                component: ComponentCreator('/docs/roadmap/vision/', 'c0c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/',
                component: ComponentCreator('/docs/security/', '40e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/',
                component: ComponentCreator('/docs/security/', '436'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authentication/',
                component: ComponentCreator('/docs/security/authentication/', '81c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authentication/',
                component: ComponentCreator('/docs/security/authentication/', 'f59'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authorization/',
                component: ComponentCreator('/docs/security/authorization/', '3a0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/authorization/',
                component: ComponentCreator('/docs/security/authorization/', '027'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/compliance/',
                component: ComponentCreator('/docs/security/compliance/', 'a07'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/compliance/',
                component: ComponentCreator('/docs/security/compliance/', '552'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/encryption/',
                component: ComponentCreator('/docs/security/encryption/', '72c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/encryption/',
                component: ComponentCreator('/docs/security/encryption/', '196'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/rbac/',
                component: ComponentCreator('/docs/security/rbac/', '432'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/security/rbac/',
                component: ComponentCreator('/docs/security/rbac/', '023'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/',
                component: ComponentCreator('/docs/support/', '17a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/',
                component: ComponentCreator('/docs/support/', '479'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/community/',
                component: ComponentCreator('/docs/support/community/', '924'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/community/',
                component: ComponentCreator('/docs/support/community/', '055'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/contact/',
                component: ComponentCreator('/docs/support/contact/', '48b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/contact/',
                component: ComponentCreator('/docs/support/contact/', '421'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/documentation/',
                component: ComponentCreator('/docs/support/documentation/', '8e1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/documentation/',
                component: ComponentCreator('/docs/support/documentation/', 'b80'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/enterprise/',
                component: ComponentCreator('/docs/support/enterprise/', '74f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/support/enterprise/',
                component: ComponentCreator('/docs/support/enterprise/', 'ef4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/',
                component: ComponentCreator('/docs/testing/', '75f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/',
                component: ComponentCreator('/docs/testing/', '8de'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/benchmarks/',
                component: ComponentCreator('/docs/testing/benchmarks/', '704'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/benchmarks/',
                component: ComponentCreator('/docs/testing/benchmarks/', '430'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/ci-cd/',
                component: ComponentCreator('/docs/testing/ci-cd/', 'a0a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/ci-cd/',
                component: ComponentCreator('/docs/testing/ci-cd/', '276'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/e2e-tests/',
                component: ComponentCreator('/docs/testing/e2e-tests/', '656'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/e2e-tests/',
                component: ComponentCreator('/docs/testing/e2e-tests/', '16d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/integration-tests/',
                component: ComponentCreator('/docs/testing/integration-tests/', '321'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/integration-tests/',
                component: ComponentCreator('/docs/testing/integration-tests/', 'bdb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/unit-tests/',
                component: ComponentCreator('/docs/testing/unit-tests/', '259'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/testing/unit-tests/',
                component: ComponentCreator('/docs/testing/unit-tests/', '061'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', 'ff0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', '484'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/common-issues/',
                component: ComponentCreator('/docs/troubleshooting/common-issues/', '691'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/common-issues/',
                component: ComponentCreator('/docs/troubleshooting/common-issues/', '446'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/debugging/',
                component: ComponentCreator('/docs/troubleshooting/debugging/', '503'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/debugging/',
                component: ComponentCreator('/docs/troubleshooting/debugging/', '720'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/faq/',
                component: ComponentCreator('/docs/troubleshooting/faq/', '161'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/troubleshooting/faq/',
                component: ComponentCreator('/docs/troubleshooting/faq/', 'e28'),
                exact: true,
                sidebar: "quickLinksSidebar"
              },
              {
                path: '/docs/troubleshooting/logs/',
                component: ComponentCreator('/docs/troubleshooting/logs/', '7cd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/troubleshooting/logs/',
                component: ComponentCreator('/docs/troubleshooting/logs/', '91c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/',
                component: ComponentCreator('/docs/tutorials/', '78a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/',
                component: ComponentCreator('/docs/tutorials/', 'abc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/advanced/',
                component: ComponentCreator('/docs/tutorials/advanced/', '011'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/advanced/',
                component: ComponentCreator('/docs/tutorials/advanced/', '857'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/beginner/',
                component: ComponentCreator('/docs/tutorials/beginner/', 'a98'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/beginner/',
                component: ComponentCreator('/docs/tutorials/beginner/', 'c52'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/intermediate/',
                component: ComponentCreator('/docs/tutorials/intermediate/', '1c0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/intermediate/',
                component: ComponentCreator('/docs/tutorials/intermediate/', '7df'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/video-tutorials/',
                component: ComponentCreator('/docs/tutorials/video-tutorials/', '66b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/tutorials/video-tutorials/',
                component: ComponentCreator('/docs/tutorials/video-tutorials/', 'ca2'),
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
