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
        'overview/index',
        'overview/introduction/index',
        'overview/use-cases/index',
        'overview/roadmap/index',
      ],
    },
    {
      type: 'category',
      label: '02. Getting Started',
      collapsed: false,
      items: [
        'getting-started/index',
        'getting-started/prerequisites/index',
        'getting-started/installation/index',
        'getting-started/quick-start/index',
        'getting-started/first-agent/index',
      ],
    },
    {
      type: 'category',
      label: '03. API Reference',
      collapsed: true,
      items: [
        'api-reference/index',
        {
          type: 'category',
          label: 'REST API',
          items: [
            'api-reference/rest-api/index',
            'api-reference/rest-api/authentication/index',
            'api-reference/rest-api/agents/index',
            'api-reference/rest-api/chat/index',
            'api-reference/rest-api/extensions/index',
            'api-reference/rest-api/memory/index',
            'api-reference/rest-api/events/index',
            'api-reference/rest-api/health/index',
          ],
        },
        {
          type: 'category',
          label: 'WebSocket API',
          items: [
            'api-reference/websocket-api/index',
            'api-reference/websocket-api/connection/index',
            'api-reference/websocket-api/events/index',
            'api-reference/websocket-api/commands/index',
            'api-reference/websocket-api/streaming/index',
          ],
        },
        {
          type: 'category',
          label: 'TypeScript SDK',
          items: [
            'api-reference/typescript-sdk/index',
            'api-reference/typescript-sdk/installation/index',
            'api-reference/typescript-sdk/agents/index',
            'api-reference/typescript-sdk/extensions/index',
            'api-reference/typescript-sdk/modules/index',
            'api-reference/typescript-sdk/runtime/index',
            'api-reference/typescript-sdk/types/index',
          ],
        },
        {
          type: 'category',
          label: 'OpenAPI',
          items: [
            'api-reference/openapi/index',
            'api-reference/openapi/overview/index',
            'api-reference/openapi/endpoints/index',
            'api-reference/openapi/schemas/index',
            'api-reference/openapi/examples/index',
          ],
        },
        'api-reference/graphql/index',
      ],
    },
    {
      type: 'category',
      label: '04. Core Concepts',
      collapsed: true,
      items: [
        'core-concepts/index',
        'core-concepts/runtime/index',
        'core-concepts/registry/index',
        'core-concepts/event-bus/index',
        'core-concepts/plugin-system/index',
        'core-concepts/lifecycle/index',
      ],
    },
    {
      type: 'category',
      label: '05. Agents',
      collapsed: true,
      items: [
        'agents/index',
        'agents/configuration/index',
        'agents/character-system/index',
        'agents/multi-agent/index',
        'agents/lifecycle/index',
        'agents/communication/index',
      ],
    },
    {
      type: 'category',
      label: '06. Modules',
      collapsed: true,
      items: [
        'modules/index',
        {
          type: 'category',
          label: 'Memory',
          items: [
            'modules/memory/index',
            'modules/memory/providers/index',
            'modules/memory/sqlite/index',
            'modules/memory/postgres/index',
            'modules/memory/supabase/index',
            'modules/memory/neon/index',
          ],
        },
        {
          type: 'category',
          label: 'Emotion',
          items: [
            'modules/emotion/index',
            'modules/emotion/emotion-stack/index',
            'modules/emotion/custom-emotions/index',
          ],
        },
        {
          type: 'category',
          label: 'Cognition',
          items: [
            'modules/cognition/index',
            'modules/cognition/htn-planner/index',
            'modules/cognition/reactive/index',
            'modules/cognition/hybrid/index',
          ],
        },
        'modules/consciousness/index',
        'modules/behavior/index',
        'modules/tools/index',
      ],
    },
    {
      type: 'category',
      label: '07. Extensions',
      collapsed: true,
      items: [
        'extensions/index',
        'extensions/api-server/index',
        'extensions/telegram/index',
        'extensions/slack/index',
        'extensions/discord/index',
        'extensions/twitter/index',
        'extensions/web-ui/index',
        'extensions/cli/index',
      ],
    },
    {
      type: 'category',
      label: '08. Portals',
      collapsed: true,
      items: [
        'portals/index',
        'portals/openai/index',
        'portals/anthropic/index',
        'portals/google/index',
        'portals/groq/index',
        'portals/xai/index',
        'portals/ollama/index',
        'portals/custom/index',
      ],
    },
    {
      type: 'category',
      label: '09. Security',
      collapsed: true,
      items: [
        'security/index',
        'security/authentication/index',
        'security/authorization/index',
        'security/rbac/index',
        'security/compliance/index',
        'security/encryption/index',
      ],
    },
    {
      type: 'category',
      label: '10. Deployment',
      collapsed: true,
      items: [
        'deployment/index',
        'deployment/docker/index',
        'deployment/kubernetes/index',
        'deployment/cloud/index',
        'deployment/on-premise/index',
        'deployment/configuration/index',
      ],
    },
    {
      type: 'category',
      label: '11. Monitoring',
      collapsed: true,
      items: [
        'monitoring/index',
        'monitoring/logging/index',
        'monitoring/metrics/index',
        'monitoring/tracing/index',
        'monitoring/alerts/index',
        'monitoring/dashboards/index',
      ],
    },
    {
      type: 'category',
      label: '12. Testing',
      collapsed: true,
      items: [
        'testing/index',
        'testing/unit-tests/index',
        'testing/integration-tests/index',
        'testing/e2e-tests/index',
        'testing/benchmarks/index',
        'testing/ci-cd/index',
      ],
    },
    {
      type: 'category',
      label: '13. Performance',
      collapsed: true,
      items: [
        'performance/index',
        'performance/optimization/index',
        'performance/benchmarks/index',
        'performance/scaling/index',
        'performance/caching/index',
        'performance/profiling/index',
      ],
    },
    {
      type: 'category',
      label: '14. Troubleshooting',
      collapsed: true,
      items: [
        'troubleshooting/index',
        'troubleshooting/common-issues/index',
        'troubleshooting/debugging/index',
        'troubleshooting/logs/index',
        'troubleshooting/faq/index',
      ],
    },
    {
      type: 'category',
      label: '15. Migration',
      collapsed: true,
      items: [
        'migration/index',
        'migration/version-upgrades/index',
        'migration/data-migration/index',
        'migration/breaking-changes/index',
      ],
    },
    {
      type: 'category',
      label: '16. Integrations',
      collapsed: true,
      items: [
        'integrations/index',
        'integrations/mcp/index',
        'integrations/langchain/index',
        'integrations/llama-index/index',
        'integrations/vector-stores/index',
        'integrations/databases/index',
      ],
    },
    {
      type: 'category',
      label: '17. Examples',
      collapsed: true,
      items: [
        'examples/index',
        'examples/basic/index',
        'examples/advanced/index',
        'examples/use-cases/index',
        'examples/templates/index',
      ],
    },
    {
      type: 'category',
      label: '18. Tutorials',
      collapsed: true,
      items: [
        'tutorials/index',
        'tutorials/beginner/index',
        'tutorials/intermediate/index',
        'tutorials/advanced/index',
        'tutorials/video-tutorials/index',
      ],
    },
    {
      type: 'category',
      label: '19. Advanced Topics',
      collapsed: true,
      items: [
        'advanced-topics/index',
        'advanced-topics/autonomous-agents/index',
        'advanced-topics/multi-modal/index',
        'advanced-topics/fine-tuning/index',
        'advanced-topics/custom-portals/index',
      ],
    },
    {
      type: 'category',
      label: '20. Architecture',
      collapsed: true,
      items: [
        'architecture/index',
        'architecture/system-design/index',
        'architecture/data-flow/index',
        'architecture/scalability/index',
        'architecture/patterns/index',
      ],
    },
    {
      type: 'category',
      label: '21. Development',
      collapsed: true,
      items: [
        'development/index',
        'development/contributing/index',
        'development/code-style/index',
        'development/plugin-development/index',
        'development/debugging/index',
      ],
    },
    {
      type: 'category',
      label: '22. Community',
      collapsed: true,
      items: [
        'community/index',
        'community/forums/index',
        'community/discord/index',
        'community/contributors/index',
        'community/showcase/index',
      ],
    },
    {
      type: 'category',
      label: '23. Changelog',
      collapsed: true,
      items: [
        'changelog/index',
        'changelog/releases/index',
        'changelog/migration-guides/index',
        'changelog/breaking-changes/index',
      ],
    },
    {
      type: 'category',
      label: '24. Roadmap',
      collapsed: true,
      items: [
        'roadmap/index',
        'roadmap/features/index',
        'roadmap/timeline/index',
        'roadmap/vision/index',
      ],
    },
    {
      type: 'category',
      label: '25. Support',
      collapsed: true,
      items: [
        'support/index',
        'support/documentation/index',
        'support/community/index',
        'support/enterprise/index',
        'support/contact/index',
      ],
    },
    {
      type: 'category',
      label: '26. Resources',
      collapsed: true,
      items: [
        'resources/index',
        'resources/glossary/index',
        'resources/references/index',
        'resources/tools/index',
        'resources/learning/index',
      ],
    },
  ],

  // API-specific sidebar (can be used for API-only views)
  apiSidebar: [
    {
      type: 'category',
      label: 'API Documentation',
      items: [
        'api-reference/index',
        {
          type: 'category',
          label: 'REST API',
          items: [
            'api-reference/rest-api/index',
            'api-reference/rest-api/authentication/index',
            'api-reference/rest-api/agents/index',
            'api-reference/rest-api/chat/index',
            'api-reference/rest-api/extensions/index',
            'api-reference/rest-api/memory/index',
            'api-reference/rest-api/events/index',
            'api-reference/rest-api/health/index',
          ],
        },
        {
          type: 'category',
          label: 'WebSocket API',
          items: [
            'api-reference/websocket-api/index',
            'api-reference/websocket-api/connection/index',
            'api-reference/websocket-api/events/index',
            'api-reference/websocket-api/commands/index',
            'api-reference/websocket-api/streaming/index',
          ],
        },
        {
          type: 'category',
          label: 'TypeScript SDK',
          items: [
            'api-reference/typescript-sdk/index',
            'api-reference/typescript-sdk/installation/index',
            'api-reference/typescript-sdk/agents/index',
            'api-reference/typescript-sdk/extensions/index',
            'api-reference/typescript-sdk/modules/index',
            'api-reference/typescript-sdk/runtime/index',
            'api-reference/typescript-sdk/types/index',
          ],
        },
      ],
    },
  ],

  // Quick links sidebar for common tasks
  quickLinksSidebar: [
    {
      type: 'doc',
      id: 'getting-started/quick-start/index',
      label: 'Quick Start',
    },
    {
      type: 'doc',
      id: 'getting-started/first-agent/index',
      label: 'Create Your First Agent',
    },
    {
      type: 'doc',
      id: 'api-reference/index',
      label: 'API Reference',
    },
    {
      type: 'doc',
      id: 'examples/index',
      label: 'Examples',
    },
    {
      type: 'doc',
      id: 'troubleshooting/faq/index',
      label: 'FAQ',
    },
  ],
};

export default sidebars;