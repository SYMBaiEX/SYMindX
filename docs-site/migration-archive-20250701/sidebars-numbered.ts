import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * SYMindX Documentation Structure
 * 26 Main Categories with Subcategories
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  docsSidebar: [
    {
      type: 'category',
      label: '01. Overview',
      collapsed: false,
      items: [
        '01-overview/index',
        '01-overview/introduction/index',
        '01-overview/use-cases/index',
        '01-overview/roadmap/index',
      ],
    },
    {
      type: 'category',
      label: '02. Getting Started',
      collapsed: false,
      items: [
        '02-getting-started/index',
        '02-getting-started/prerequisites/index',
        '02-getting-started/installation/index',
        '02-getting-started/quick-start/index',
        '02-getting-started/first-agent/index',
      ],
    },
    {
      type: 'category',
      label: '03. API Reference',
      collapsed: true,
      items: [
        '03-api-reference/index',
        {
          type: 'category',
          label: 'REST API',
          items: [
            '03-api-reference/rest-api/index',
            '03-api-reference/rest-api/authentication/index',
            '03-api-reference/rest-api/agents/index',
            '03-api-reference/rest-api/chat/index',
            '03-api-reference/rest-api/extensions/index',
            '03-api-reference/rest-api/memory/index',
            '03-api-reference/rest-api/events/index',
            '03-api-reference/rest-api/health/index',
          ],
        },
        {
          type: 'category',
          label: 'WebSocket API',
          items: [
            '03-api-reference/websocket-api/index',
            '03-api-reference/websocket-api/connection/index',
            '03-api-reference/websocket-api/events/index',
            '03-api-reference/websocket-api/commands/index',
            '03-api-reference/websocket-api/streaming/index',
          ],
        },
        {
          type: 'category',
          label: 'TypeScript SDK',
          items: [
            '03-api-reference/typescript-sdk/index',
            '03-api-reference/typescript-sdk/installation/index',
            '03-api-reference/typescript-sdk/agents/index',
            '03-api-reference/typescript-sdk/extensions/index',
            '03-api-reference/typescript-sdk/modules/index',
            '03-api-reference/typescript-sdk/runtime/index',
            '03-api-reference/typescript-sdk/types/index',
          ],
        },
        {
          type: 'category',
          label: 'OpenAPI',
          items: [
            '03-api-reference/openapi/index',
            '03-api-reference/openapi/overview/index',
            '03-api-reference/openapi/endpoints/index',
            '03-api-reference/openapi/schemas/index',
            '03-api-reference/openapi/examples/index',
          ],
        },
        '03-api-reference/graphql/index',
      ],
    },
    {
      type: 'category',
      label: '04. Core Concepts',
      collapsed: true,
      items: [
        '04-core-concepts/index',
        '04-core-concepts/runtime/index',
        '04-core-concepts/registry/index',
        '04-core-concepts/event-bus/index',
        '04-core-concepts/plugin-system/index',
        '04-core-concepts/lifecycle/index',
      ],
    },
    {
      type: 'category',
      label: '05. Agents',
      collapsed: true,
      items: [
        '05-agents/index',
        '05-agents/configuration/index',
        '05-agents/character-system/index',
        '05-agents/multi-agent/index',
        '05-agents/lifecycle/index',
        '05-agents/communication/index',
      ],
    },
    {
      type: 'category',
      label: '06. Modules',
      collapsed: true,
      items: [
        '06-modules/index',
        {
          type: 'category',
          label: 'Memory',
          items: [
            '06-modules/memory/index',
            '06-modules/memory/providers/index',
            '06-modules/memory/sqlite/index',
            '06-modules/memory/postgres/index',
            '06-modules/memory/supabase/index',
            '06-modules/memory/neon/index',
          ],
        },
        {
          type: 'category',
          label: 'Emotion',
          items: [
            '06-modules/emotion/index',
            '06-modules/emotion/emotion-stack/index',
            '06-modules/emotion/custom-emotions/index',
          ],
        },
        {
          type: 'category',
          label: 'Cognition',
          items: [
            '06-modules/cognition/index',
            '06-modules/cognition/htn-planner/index',
            '06-modules/cognition/reactive/index',
            '06-modules/cognition/hybrid/index',
          ],
        },
        '06-modules/consciousness/index',
        '06-modules/behavior/index',
        '06-modules/tools/index',
      ],
    },
    {
      type: 'category',
      label: '07. Extensions',
      collapsed: true,
      items: [
        '07-extensions/index',
        '07-extensions/api-server/index',
        '07-extensions/telegram/index',
        '07-extensions/slack/index',
        '07-extensions/discord/index',
        '07-extensions/twitter/index',
        '07-extensions/web-ui/index',
        '07-extensions/cli/index',
      ],
    },
    {
      type: 'category',
      label: '08. Portals',
      collapsed: true,
      items: [
        '08-portals/index',
        '08-portals/openai/index',
        '08-portals/anthropic/index',
        '08-portals/google/index',
        '08-portals/groq/index',
        '08-portals/xai/index',
        '08-portals/ollama/index',
        '08-portals/custom/index',
      ],
    },
    {
      type: 'category',
      label: '09. Security',
      collapsed: true,
      items: [
        '09-security/index',
        '09-security/authentication/index',
        '09-security/authorization/index',
        '09-security/rbac/index',
        '09-security/compliance/index',
        '09-security/encryption/index',
      ],
    },
    {
      type: 'category',
      label: '10. Deployment',
      collapsed: true,
      items: [
        '10-deployment/index',
        '10-deployment/docker/index',
        '10-deployment/kubernetes/index',
        '10-deployment/cloud/index',
        '10-deployment/on-premise/index',
        '10-deployment/configuration/index',
      ],
    },
    {
      type: 'category',
      label: '11. Monitoring',
      collapsed: true,
      items: [
        '11-monitoring/index',
        '11-monitoring/logging/index',
        '11-monitoring/metrics/index',
        '11-monitoring/tracing/index',
        '11-monitoring/alerts/index',
        '11-monitoring/dashboards/index',
      ],
    },
    {
      type: 'category',
      label: '12. Testing',
      collapsed: true,
      items: [
        '12-testing/index',
        '12-testing/unit-tests/index',
        '12-testing/integration-tests/index',
        '12-testing/e2e-tests/index',
        '12-testing/benchmarks/index',
        '12-testing/ci-cd/index',
      ],
    },
    {
      type: 'category',
      label: '13. Performance',
      collapsed: true,
      items: [
        '13-performance/index',
        '13-performance/optimization/index',
        '13-performance/benchmarks/index',
        '13-performance/scaling/index',
        '13-performance/caching/index',
        '13-performance/profiling/index',
      ],
    },
    {
      type: 'category',
      label: '14. Troubleshooting',
      collapsed: true,
      items: [
        '14-troubleshooting/index',
        '14-troubleshooting/common-issues/index',
        '14-troubleshooting/debugging/index',
        '14-troubleshooting/logs/index',
        '14-troubleshooting/faq/index',
      ],
    },
    {
      type: 'category',
      label: '15. Migration',
      collapsed: true,
      items: [
        '15-migration/index',
        '15-migration/version-upgrades/index',
        '15-migration/data-migration/index',
        '15-migration/breaking-changes/index',
      ],
    },
    {
      type: 'category',
      label: '16. Integrations',
      collapsed: true,
      items: [
        '16-integrations/index',
        '16-integrations/mcp/index',
        '16-integrations/langchain/index',
        '16-integrations/llama-index/index',
        '16-integrations/vector-stores/index',
        '16-integrations/databases/index',
      ],
    },
    {
      type: 'category',
      label: '17. Examples',
      collapsed: true,
      items: [
        '17-examples/index',
        '17-examples/basic/index',
        '17-examples/advanced/index',
        '17-examples/use-cases/index',
        '17-examples/templates/index',
      ],
    },
    {
      type: 'category',
      label: '18. Tutorials',
      collapsed: true,
      items: [
        '18-tutorials/index',
        '18-tutorials/beginner/index',
        '18-tutorials/intermediate/index',
        '18-tutorials/advanced/index',
        '18-tutorials/video-tutorials/index',
      ],
    },
    {
      type: 'category',
      label: '19. Advanced Topics',
      collapsed: true,
      items: [
        '19-advanced-topics/index',
        '19-advanced-topics/autonomous-agents/index',
        '19-advanced-topics/multi-modal/index',
        '19-advanced-topics/fine-tuning/index',
        '19-advanced-topics/custom-portals/index',
      ],
    },
    {
      type: 'category',
      label: '20. Architecture',
      collapsed: true,
      items: [
        '20-architecture/index',
        '20-architecture/system-design/index',
        '20-architecture/data-flow/index',
        '20-architecture/scalability/index',
        '20-architecture/patterns/index',
      ],
    },
    {
      type: 'category',
      label: '21. Development',
      collapsed: true,
      items: [
        '21-development/index',
        '21-development/contributing/index',
        '21-development/code-style/index',
        '21-development/plugin-development/index',
        '21-development/debugging/index',
      ],
    },
    {
      type: 'category',
      label: '22. Community',
      collapsed: true,
      items: [
        '22-community/index',
        '22-community/forums/index',
        '22-community/discord/index',
        '22-community/contributors/index',
        '22-community/showcase/index',
      ],
    },
    {
      type: 'category',
      label: '23. Changelog',
      collapsed: true,
      items: [
        '23-changelog/index',
        '23-changelog/releases/index',
        '23-changelog/migration-guides/index',
        '23-changelog/breaking-changes/index',
      ],
    },
    {
      type: 'category',
      label: '24. Roadmap',
      collapsed: true,
      items: [
        '24-roadmap/index',
        '24-roadmap/features/index',
        '24-roadmap/timeline/index',
        '24-roadmap/vision/index',
      ],
    },
    {
      type: 'category',
      label: '25. Support',
      collapsed: true,
      items: [
        '25-support/index',
        '25-support/documentation/index',
        '25-support/community/index',
        '25-support/enterprise/index',
        '25-support/contact/index',
      ],
    },
    {
      type: 'category',
      label: '26. Resources',
      collapsed: true,
      items: [
        '26-resources/index',
        '26-resources/glossary/index',
        '26-resources/references/index',
        '26-resources/tools/index',
        '26-resources/learning/index',
      ],
    },
  ],

  // API-specific sidebar (can be used for API-only views)
  apiSidebar: [
    {
      type: 'category',
      label: 'API Documentation',
      items: [
        '03-api-reference/index',
        {
          type: 'category',
          label: 'REST API',
          items: [
            '03-api-reference/rest-api/index',
            '03-api-reference/rest-api/authentication/index',
            '03-api-reference/rest-api/agents/index',
            '03-api-reference/rest-api/chat/index',
            '03-api-reference/rest-api/extensions/index',
            '03-api-reference/rest-api/memory/index',
            '03-api-reference/rest-api/events/index',
            '03-api-reference/rest-api/health/index',
          ],
        },
        {
          type: 'category',
          label: 'WebSocket API',
          items: [
            '03-api-reference/websocket-api/index',
            '03-api-reference/websocket-api/connection/index',
            '03-api-reference/websocket-api/events/index',
            '03-api-reference/websocket-api/commands/index',
            '03-api-reference/websocket-api/streaming/index',
          ],
        },
        {
          type: 'category',
          label: 'TypeScript SDK',
          items: [
            '03-api-reference/typescript-sdk/index',
            '03-api-reference/typescript-sdk/installation/index',
            '03-api-reference/typescript-sdk/agents/index',
            '03-api-reference/typescript-sdk/extensions/index',
            '03-api-reference/typescript-sdk/modules/index',
            '03-api-reference/typescript-sdk/runtime/index',
            '03-api-reference/typescript-sdk/types/index',
          ],
        },
      ],
    },
  ],

  // Quick links sidebar for common tasks
  quickLinksSidebar: [
    {
      type: 'doc',
      id: '02-getting-started/quick-start/index',
      label: 'Quick Start',
    },
    {
      type: 'doc',
      id: '02-getting-started/first-agent/index',
      label: 'Create Your First Agent',
    },
    {
      type: 'doc',
      id: '03-api-reference/index',
      label: 'API Reference',
    },
    {
      type: 'doc',
      id: '17-examples/index',
      label: 'Examples',
    },
    {
      type: 'doc',
      id: '14-troubleshooting/faq/index',
      label: 'FAQ',
    },
  ],
};

export default sidebars;