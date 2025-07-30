/**
 * Configuration Documentation Generator
 *
 * Automatically generates comprehensive documentation for configuration
 * schemas including examples, validation rules, and deployment guides.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { SchemaDefinition } from '../../types/utils/validation.js';
import { UnifiedConfig, PortalProviderConfig } from './unified-config.js';
import { standardLoggers } from '../../utils/standard-logging.js';

/**
 * Documentation output format
 */
export type DocumentationFormat = 'markdown' | 'html' | 'json' | 'yaml';

/**
 * Documentation generation options
 */
export interface DocGenerationOptions {
  format: DocumentationFormat;
  includeExamples: boolean;
  includeValidation: boolean;
  includeEnvironmentVars: boolean;
  includeSecrets: boolean;
  outputPath: string;
  templatePath?: string;
}

/**
 * Schema documentation metadata
 */
export interface SchemaDocumentation {
  title: string;
  description: string;
  version: string;
  sections: DocumentationSection[];
  examples: ConfigurationExample[];
  environmentVariables: EnvironmentVariableDoc[];
  validationRules: ValidationRuleDoc[];
  generatedAt: Date;
}

/**
 * Documentation section
 */
export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  properties: PropertyDoc[];
  subsections?: DocumentationSection[];
}

/**
 * Property documentation
 */
export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  examples?: unknown[];
  validation?: {
    rules: string[];
    constraints: Record<string, unknown>;
  };
  environmentVariable?: string;
  sensitive?: boolean;
}

/**
 * Configuration example
 */
export interface ConfigurationExample {
  name: string;
  description: string;
  environment: 'development' | 'testing' | 'staging' | 'production';
  config: Partial<UnifiedConfig>;
  notes?: string[];
}

/**
 * Environment variable documentation
 */
export interface EnvironmentVariableDoc {
  name: string;
  description: string;
  configPath: string;
  type: string;
  required: boolean;
  default?: string;
  example?: string;
  sensitive: boolean;
}

/**
 * Validation rule documentation
 */
export interface ValidationRuleDoc {
  configPath: string;
  rules: Array<{
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * Configuration Documentation Generator
 *
 * Generates comprehensive documentation from configuration schemas
 * with examples, validation rules, and deployment guides.
 */
export class ConfigDocumentationGenerator {
  private logger = standardLoggers.config;

  /**
   * Generate complete configuration documentation
   */
  public async generateDocumentation(
    schema: SchemaDefinition,
    options: DocGenerationOptions
  ): Promise<SchemaDocumentation> {
    this.logger.info('Generating configuration documentation', {
      format: options.format,
      outputPath: options.outputPath,
    });

    const documentation: SchemaDocumentation = {
      title: 'SYMindX Configuration Reference',
      description:
        'Comprehensive configuration guide for the SYMindX AI agent runtime system',
      version: '1.0.0',
      sections: [],
      examples: [],
      environmentVariables: [],
      validationRules: [],
      generatedAt: new Date(),
    };

    // Generate sections from schema
    if (schema.properties) {
      documentation.sections = this.generateSections(schema.properties);
    }

    // Generate examples
    if (options.includeExamples) {
      documentation.examples = this.generateExamples();
    }

    // Generate environment variables documentation
    if (options.includeEnvironmentVars) {
      documentation.environmentVariables =
        this.generateEnvironmentVariables(schema);
    }

    // Generate validation rules documentation
    if (options.includeValidation) {
      documentation.validationRules = this.generateValidationRules(schema);
    }

    // Write documentation to file
    await this.writeDocumentation(documentation, options);

    this.logger.info('Configuration documentation generated successfully', {
      sections: documentation.sections.length,
      examples: documentation.examples.length,
      envVars: documentation.environmentVariables.length,
    });

    return documentation;
  }

  /**
   * Generate deployment-specific configuration guides
   */
  public async generateDeploymentGuides(outputDir: string): Promise<void> {
    const guides = [
      {
        name: 'development',
        title: 'Development Environment Setup',
        config: this.getExampleConfig('development'),
      },
      {
        name: 'production',
        title: 'Production Deployment Guide',
        config: this.getExampleConfig('production'),
      },
      {
        name: 'docker',
        title: 'Docker Deployment',
        config: this.getDockerConfig(),
      },
      {
        name: 'kubernetes',
        title: 'Kubernetes Deployment',
        config: this.getKubernetesConfig(),
      },
    ];

    for (const guide of guides) {
      const content = this.generateDeploymentGuide(guide.title, guide.config);
      const filePath = resolve(outputDir, `${guide.name}-deployment.md`);

      this.ensureDirectoryExists(dirname(filePath));
      writeFileSync(filePath, content);

      this.logger.debug('Deployment guide generated', {
        name: guide.name,
        filePath,
      });
    }

    this.logger.info('All deployment guides generated', { outputDir });
  }

  /**
   * Generate environment-specific configuration templates
   */
  public async generateConfigTemplates(outputDir: string): Promise<void> {
    const environments = ['development', 'testing', 'staging', 'production'];

    for (const env of environments) {
      const config = this.getExampleConfig(env as any);
      const content = JSON.stringify(config, null, 2);
      const filePath = resolve(outputDir, `config.${env}.json`);

      this.ensureDirectoryExists(dirname(filePath));
      writeFileSync(filePath, content);
    }

    // Generate environment file template
    const envTemplate = this.generateEnvironmentTemplate();
    const envFilePath = resolve(outputDir, '.env.example');
    writeFileSync(envFilePath, envTemplate);

    this.logger.info('Configuration templates generated', { outputDir });
  }

  // Private methods

  private generateSections(
    properties: Record<string, SchemaDefinition>
  ): DocumentationSection[] {
    const sections: DocumentationSection[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const section: DocumentationSection = {
        id: propName,
        title: this.formatTitle(propName),
        description: propSchema.description || `Configuration for ${propName}`,
        properties: [],
      };

      if (propSchema.type === 'object' && propSchema.properties) {
        // Generate nested properties
        section.properties = this.generateProperties(propSchema.properties);

        // Generate subsections for complex nested objects
        section.subsections = this.generateSubsections(propSchema.properties);
      } else {
        // Single property
        section.properties = [
          {
            name: propName,
            type: propSchema.type || 'any',
            description: propSchema.description || '',
            required: propSchema.required || false,
            default: propSchema.default,
            examples: propSchema.enum || [],
            validation: this.extractValidationInfo(propSchema),
          },
        ];
      }

      sections.push(section);
    }

    return sections;
  }

  private generateProperties(
    properties: Record<string, SchemaDefinition>
  ): PropertyDoc[] {
    const props: PropertyDoc[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const prop: PropertyDoc = {
        name: propName,
        type: propSchema.type || 'any',
        description:
          propSchema.description || `Configuration property: ${propName}`,
        required: propSchema.required || false,
        default: propSchema.default,
        examples: propSchema.enum ? [propSchema.enum[0]] : undefined,
        validation: this.extractValidationInfo(propSchema),
        environmentVariable: this.getEnvironmentVariable(propName),
        sensitive: this.isSensitiveProperty(propName),
      };

      props.push(prop);
    }

    return props;
  }

  private generateSubsections(
    properties: Record<string, SchemaDefinition>
  ): DocumentationSection[] {
    const subsections: DocumentationSection[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (propSchema.type === 'object' && propSchema.properties) {
        const subsection: DocumentationSection = {
          id: propName,
          title: this.formatTitle(propName),
          description:
            propSchema.description || `${propName} configuration options`,
          properties: this.generateProperties(propSchema.properties),
        };

        subsections.push(subsection);
      }
    }

    return subsections;
  }

  private generateExamples(): ConfigurationExample[] {
    return [
      {
        name: 'Minimal Development Setup',
        description: 'Basic configuration for local development',
        environment: 'development',
        config: this.getExampleConfig('development'),
        notes: [
          'Uses default settings optimized for development',
          'Hot reload enabled for rapid iteration',
          'Debug logging enabled',
        ],
      },
      {
        name: 'Production Deployment',
        description: 'Optimized configuration for production use',
        environment: 'production',
        config: this.getExampleConfig('production'),
        notes: [
          'Security features enabled',
          'Performance optimization active',
          'Monitoring and metrics enabled',
        ],
      },
      {
        name: 'Multi-Agent Setup',
        description: 'Configuration for multi-agent coordination',
        environment: 'production',
        config: this.getMultiAgentConfig(),
        notes: [
          'Multiple AI providers configured',
          'Load balancing enabled',
          'Distributed coordination',
        ],
      },
    ];
  }

  private generateEnvironmentVariables(
    schema: SchemaDefinition
  ): EnvironmentVariableDoc[] {
    const envVars: EnvironmentVariableDoc[] = [];

    // Common environment variables
    const commonVars = [
      {
        name: 'NODE_ENV',
        description:
          'Runtime environment (development, testing, staging, production)',
        configPath: 'runtime.environment',
        type: 'string',
        required: false,
        default: 'development',
        example: 'production',
        sensitive: false,
      },
      {
        name: 'SYMINDX_LOG_LEVEL',
        description: 'Logging level',
        configPath: 'runtime.logLevel',
        type: 'string',
        required: false,
        default: 'info',
        example: 'debug',
        sensitive: false,
      },
      {
        name: 'SYMINDX_DATA_PATH',
        description: 'Data directory path',
        configPath: 'persistence.path',
        type: 'string',
        required: false,
        default: './data',
        example: '/var/lib/symindx',
        sensitive: false,
      },
    ];

    envVars.push(...commonVars);

    // API key environment variables
    const apiKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'GOOGLE_API_KEY',
      'TELEGRAM_BOT_TOKEN',
    ];

    for (const keyName of apiKeys) {
      envVars.push({
        name: keyName,
        description: `API key for ${keyName.split('_')[0]} service`,
        configPath: `security.secrets.apiKeys.${keyName}`,
        type: 'string',
        required: false,
        example: 'sk-...',
        sensitive: true,
      });
    }

    return envVars;
  }

  private generateValidationRules(
    schema: SchemaDefinition
  ): ValidationRuleDoc[] {
    const rules: ValidationRuleDoc[] = [];

    const extractRules = (obj: SchemaDefinition, path: string = ''): void => {
      if (obj.rules && obj.rules.length > 0) {
        rules.push({
          configPath: path,
          rules: obj.rules.map((rule) => ({
            name: rule.name,
            description: rule.description || `Validation rule: ${rule.name}`,
          })),
        });
      }

      // Extract constraint-based rules
      const constraintRules: Array<{ name: string; description: string }> = [];

      if (obj.min !== undefined) {
        constraintRules.push({
          name: 'minimum',
          description: `Value must be at least ${obj.min}`,
        });
      }

      if (obj.max !== undefined) {
        constraintRules.push({
          name: 'maximum',
          description: `Value must be at most ${obj.max}`,
        });
      }

      if (obj.enum) {
        constraintRules.push({
          name: 'enum',
          description: `Value must be one of: ${obj.enum.join(', ')}`,
        });
      }

      if (obj.pattern) {
        constraintRules.push({
          name: 'pattern',
          description: `Value must match pattern: ${obj.pattern}`,
        });
      }

      if (constraintRules.length > 0) {
        rules.push({
          configPath: path,
          rules: constraintRules,
        });
      }

      // Recurse into nested objects
      if (obj.properties) {
        for (const [propName, propSchema] of Object.entries(obj.properties)) {
          const newPath = path ? `${path}.${propName}` : propName;
          extractRules(propSchema, newPath);
        }
      }
    };

    extractRules(schema);
    return rules;
  }

  private async writeDocumentation(
    documentation: SchemaDocumentation,
    options: DocGenerationOptions
  ): Promise<void> {
    this.ensureDirectoryExists(dirname(options.outputPath));

    let content: string;

    switch (options.format) {
      case 'markdown':
        content = this.generateMarkdown(documentation);
        break;
      case 'html':
        content = this.generateHTML(documentation);
        break;
      case 'json':
        content = JSON.stringify(documentation, null, 2);
        break;
      case 'yaml':
        content = this.generateYAML(documentation);
        break;
      default:
        throw new Error(`Unsupported documentation format: ${options.format}`);
    }

    writeFileSync(options.outputPath, content);
  }

  private generateMarkdown(doc: SchemaDocumentation): string {
    let md = '';

    // Header
    md += `# ${doc.title}\n\n`;
    md += `${doc.description}\n\n`;
    md += `**Generated:** ${doc.generatedAt.toISOString()}\n`;
    md += `**Version:** ${doc.version}\n\n`;

    // Table of Contents
    md += '## Table of Contents\n\n';
    for (const section of doc.sections) {
      md += `- [${section.title}](#${section.id.toLowerCase()})\n`;
    }
    md += '\n';

    // Sections
    for (const section of doc.sections) {
      md += `## ${section.title}\n\n`;
      md += `${section.description}\n\n`;

      if (section.properties.length > 0) {
        md += '### Properties\n\n';
        md += '| Property | Type | Required | Default | Description |\n';
        md += '|----------|------|----------|---------|-------------|\n';

        for (const prop of section.properties) {
          const required = prop.required ? '✅' : '❌';
          const defaultValue =
            prop.default !== undefined ? JSON.stringify(prop.default) : '-';

          md += `| ${prop.name} | \`${prop.type}\` | ${required} | \`${defaultValue}\` | ${prop.description} |\n`;
        }
        md += '\n';
      }

      if (section.subsections && section.subsections.length > 0) {
        for (const subsection of section.subsections) {
          md += `### ${subsection.title}\n\n`;
          md += `${subsection.description}\n\n`;

          if (subsection.properties.length > 0) {
            md += '| Property | Type | Required | Default | Description |\n';
            md += '|----------|------|----------|---------|-------------|\n';

            for (const prop of subsection.properties) {
              const required = prop.required ? '✅' : '❌';
              const defaultValue =
                prop.default !== undefined ? JSON.stringify(prop.default) : '-';

              md += `| ${prop.name} | \`${prop.type}\` | ${required} | \`${defaultValue}\` | ${prop.description} |\n`;
            }
            md += '\n';
          }
        }
      }
    }

    // Examples
    if (doc.examples.length > 0) {
      md += '## Configuration Examples\n\n';

      for (const example of doc.examples) {
        md += `### ${example.name}\n\n`;
        md += `${example.description}\n\n`;
        md += `**Environment:** ${example.environment}\n\n`;

        md += '```json\n';
        md += JSON.stringify(example.config, null, 2);
        md += '\n```\n\n';

        if (example.notes && example.notes.length > 0) {
          md += '**Notes:**\n';
          for (const note of example.notes) {
            md += `- ${note}\n`;
          }
          md += '\n';
        }
      }
    }

    // Environment Variables
    if (doc.environmentVariables.length > 0) {
      md += '## Environment Variables\n\n';
      md +=
        '| Variable | Description | Type | Required | Default | Sensitive |\n';
      md +=
        '|----------|-------------|------|----------|---------|----------|\n';

      for (const envVar of doc.environmentVariables) {
        const required = envVar.required ? '✅' : '❌';
        const sensitive = envVar.sensitive ? '🔒' : '📖';
        const defaultValue = envVar.default || '-';

        md += `| \`${envVar.name}\` | ${envVar.description} | \`${envVar.type}\` | ${required} | \`${defaultValue}\` | ${sensitive} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  private generateHTML(doc: SchemaDocumentation): string {
    // Basic HTML generation - can be enhanced with templates
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${doc.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 16px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>${doc.title}</h1>
    <p>${doc.description}</p>
    <p><strong>Generated:</strong> ${doc.generatedAt.toISOString()}</p>
    <p><strong>Version:</strong> ${doc.version}</p>
    
    <h2>Configuration Structure</h2>
    <pre><code>${JSON.stringify(
      doc.sections.map((s) => s.id),
      null,
      2
    )}</code></pre>
</body>
</html>`;
  }

  private generateYAML(doc: SchemaDocumentation): string {
    // Simple YAML generation - would need proper YAML library for production
    const yamlLines: string[] = [];

    yamlLines.push(`title: "${doc.title}"`);
    yamlLines.push(`description: "${doc.description}"`);
    yamlLines.push(`version: "${doc.version}"`);
    yamlLines.push(`generated: "${doc.generatedAt.toISOString()}"`);
    yamlLines.push('sections:');

    for (const section of doc.sections) {
      yamlLines.push(`  - id: "${section.id}"`);
      yamlLines.push(`    title: "${section.title}"`);
      yamlLines.push(`    description: "${section.description}"`);
    }

    return yamlLines.join('\n');
  }

  private getExampleConfig(
    environment: 'development' | 'testing' | 'staging' | 'production'
  ): Partial<UnifiedConfig> {
    const baseConfig: Partial<UnifiedConfig> = {
      runtime: {
        environment,
        tickInterval: 1000,
        maxAgents: environment === 'production' ? 50 : 10,
        logLevel: environment === 'production' ? 'info' : 'debug',
        version: '1.0.0',
      },
      persistence: {
        enabled: true,
        path: environment === 'production' ? '/var/lib/symindx/data' : './data',
        autoSave: true,
        saveInterval: environment === 'production' ? 60000 : 30000,
        maxBackups: environment === 'production' ? 10 : 5,
        compression: environment === 'production',
      },
      development: {
        hotReload: environment === 'development',
        debugMode: environment === 'development',
        verboseLogging: environment === 'development',
        mockExternalServices: environment === 'testing',
        testMode: environment === 'testing',
      },
    };

    return baseConfig;
  }

  private getMultiAgentConfig(): Partial<UnifiedConfig> {
    return {
      multiAgent: {
        enabled: true,
        maxConcurrentAgents: 10,
        coordinationStrategy: 'hybrid',
        messagingProtocol: 'pubsub',
        loadBalancing: true,
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 5000,
        memoryLimit: 4096,
        cpuThreshold: 70,
        enableProfiling: true,
        cacheSize: 2000,
        gcStrategy: 'balanced',
      },
    };
  }

  private getDockerConfig(): Partial<UnifiedConfig> {
    return {
      runtime: {
        environment: 'production',
        tickInterval: 1000,
        maxAgents: 20,
        logLevel: 'info',
        version: '1.0.0',
      },
      persistence: {
        enabled: true,
        path: '/app/data',
        autoSave: true,
        saveInterval: 60000,
        maxBackups: 5,
        compression: true,
      },
    };
  }

  private getKubernetesConfig(): Partial<UnifiedConfig> {
    return {
      runtime: {
        environment: 'production',
        tickInterval: 1000,
        maxAgents: 100,
        logLevel: 'info',
        version: '1.0.0',
      },
      persistence: {
        enabled: true,
        path: '/var/lib/symindx',
        autoSave: true,
        saveInterval: 30000,
        maxBackups: 10,
        compression: true,
      },
      multiAgent: {
        enabled: true,
        maxConcurrentAgents: 50,
        coordinationStrategy: 'distributed',
        messagingProtocol: 'queue',
        loadBalancing: true,
      },
    };
  }

  private generateDeploymentGuide(
    title: string,
    config: Partial<UnifiedConfig>
  ): string {
    return `# ${title}

## Configuration

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

## Setup Instructions

1. Copy the configuration above to your config file
2. Set required environment variables
3. Ensure all dependencies are installed
4. Start the SYMindX runtime

## Environment Variables

See the main configuration reference for complete environment variable documentation.

## Troubleshooting

Check the logs for any configuration validation errors and ensure all required API keys are set.
`;
  }

  private generateEnvironmentTemplate(): string {
    return `# SYMindX Configuration Environment Variables

# Runtime Configuration
NODE_ENV=development
SYMINDX_LOG_LEVEL=info
SYMINDX_TICK_INTERVAL=1000
SYMINDX_MAX_AGENTS=10

# Data and Persistence
SYMINDX_DATA_PATH=./data

# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GROQ_API_KEY=gsk_your-groq-key-here
XAI_API_KEY=xai-your-xai-key-here

# Optional Extensions
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SLACK_BOT_TOKEN=xoxb-your-slack-token

# Security (Production)
SYMINDX_ENABLE_AUTH=false
SYMINDX_ENABLE_ENCRYPTION=true
SYMINDX_MASTER_KEY=your-master-encryption-key

# Development
SYMINDX_DEBUG=false
SYMINDX_HOT_RELOAD=true
`;
  }

  private extractValidationInfo(
    schema: SchemaDefinition
  ): PropertyDoc['validation'] | undefined {
    const rules: string[] = [];
    const constraints: Record<string, unknown> = {};

    if (schema.rules) {
      rules.push(...schema.rules.map((rule) => rule.name));
    }

    if (schema.min !== undefined) {
      rules.push('minimum');
      constraints.min = schema.min;
    }

    if (schema.max !== undefined) {
      rules.push('maximum');
      constraints.max = schema.max;
    }

    if (schema.enum) {
      rules.push('enum');
      constraints.enum = schema.enum;
    }

    if (schema.pattern) {
      rules.push('pattern');
      constraints.pattern = schema.pattern;
    }

    return rules.length > 0 ? { rules, constraints } : undefined;
  }

  private getEnvironmentVariable(propName: string): string | undefined {
    const envMappings: Record<string, string> = {
      logLevel: 'SYMINDX_LOG_LEVEL',
      tickInterval: 'SYMINDX_TICK_INTERVAL',
      maxAgents: 'SYMINDX_MAX_AGENTS',
      environment: 'NODE_ENV',
      path: 'SYMINDX_DATA_PATH',
      debugMode: 'SYMINDX_DEBUG',
      hotReload: 'SYMINDX_HOT_RELOAD',
    };

    return envMappings[propName];
  }

  private isSensitiveProperty(propName: string): boolean {
    const sensitiveProps = [
      'apiKey',
      'secret',
      'token',
      'password',
      'key',
      'encryptionKey',
      'jwtSecret',
    ];

    return sensitiveProps.some((sensitive) =>
      propName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private formatTitle(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Export singleton instance
export const configDocGenerator = new ConfigDocumentationGenerator();
