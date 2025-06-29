/**
 * Lifecycle Integration Tests
 * 
 * Comprehensive integration tests for the agent lifecycle platform
 * including development, testing, deployment, and monitoring.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { 
  AgentLifecycleManager,
  createAgentLifecycleManager,
  defaultLifecycleConfig
} from '../../../mind-agents/src/lifecycle/index.js'

describe('Agent Lifecycle Integration Tests', () => {
  let lifecycleManager: AgentLifecycleManager
  let testAgentConfig: any

  beforeAll(async () => {
    // Initialize lifecycle manager
    lifecycleManager = createAgentLifecycleManager(defaultLifecycleConfig)
    
    // Create test agent configuration
    testAgentConfig = global.testUtils.createMockAgentConfig({
      core: {
        name: 'Integration Test Agent',
        tone: 'analytical and precise',
        personality: ['methodical', 'reliable', 'thorough']
      },
      lore: {
        origin: 'Created for comprehensive integration testing',
        motive: 'To validate end-to-end lifecycle functionality'
      },
      psyche: {
        traits: ['analytical', 'systematic', 'quality-focused'],
        defaults: {
          memory: 'memory',
          emotion: 'rune-emotion-stack',
          cognition: 'reactive',
          portal: 'openai'
        }
      },
      modules: {
        extensions: ['api', 'lifecycle'],
        tools: {
          enabled: true,
          system: 'dynamic',
          sandbox: {
            enabled: true,
            allowedLanguages: ['javascript', 'python'],
            timeoutMs: 30000,
            memoryLimitMB: 256,
            networkAccess: false,
            fileSystemAccess: false
          }
        }
      }
    })
  })

  afterAll(async () => {
    // Cleanup resources
    if (lifecycleManager) {
      // Perform cleanup
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Agent Development Platform', () => {
    test('should validate agent configuration', async () => {
      const validation = lifecycleManager.development.validateConfig(testAgentConfig)
      
      expect(validation).toBeDefined()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('should create agent builder', () => {
      const builder = lifecycleManager.development.createBuilder()
      
      expect(builder).toBeDefined()
      expect(builder.config).toBeDefined()
      expect(builder.isValid).toBeDefined()
      expect(builder.validationErrors).toBeInstanceOf(Array)
      expect(builder.warnings).toBeInstanceOf(Array)
    })

    test('should generate agent preview', async () => {
      const preview = await lifecycleManager.development.previewAgent(testAgentConfig)
      
      expect(preview).toBeDefined()
      expect(preview.config).toEqual(testAgentConfig)
      expect(preview.estimatedResources).toBeDefined()
      expect(preview.compatibilityCheck).toBeDefined()
      expect(preview.securityAnalysis).toBeDefined()
    })

    test('should list available templates', async () => {
      const templates = await lifecycleManager.development.listTemplates()
      
      expect(templates).toBeInstanceOf(Array)
      expect(templates.length).toBeGreaterThan(0)
      
      // Check template structure
      if (templates.length > 0) {
        const template = templates[0]
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('baseConfig')
      }
    })
  })

  describe('Testing Framework', () => {
    test('should create test suite', () => {
      const testSuite = lifecycleManager.testing.createTestSuite('test-agent', {
        name: 'Integration Test Suite',
        description: 'Tests for integration testing',
        categories: ['SYSTEM', 'COGNITION', 'MEMORY'],
        environment: 'isolated',
        parallel: false,
        timeout: 30000
      })
      
      expect(testSuite).toBeDefined()
      expect(testSuite.id).toBeDefined()
      expect(testSuite.name).toBe('Integration Test Suite')
      expect(testSuite.agentId).toBe('test-agent')
      expect(testSuite.tests).toBeInstanceOf(Array)
    })

    test('should generate test cases for agent config', () => {
      const testCases = lifecycleManager.testing.generateTestCases(testAgentConfig)
      
      expect(testCases).toBeInstanceOf(Array)
      expect(testCases.length).toBeGreaterThan(0)
      
      // Check test case structure
      const testCase = testCases[0]
      expect(testCase).toHaveProperty('id')
      expect(testCase).toHaveProperty('name')
      expect(testCase).toHaveProperty('description')
      expect(testCase).toHaveProperty('category')
      expect(testCase).toHaveProperty('priority')
      expect(testCase).toHaveProperty('steps')
      expect(testCase).toHaveProperty('assertions')
    })

    test('should create test environment', async () => {
      const environment = await lifecycleManager.testing.createTestEnvironment({
        name: 'Test Environment',
        type: 'isolated',
        resources: {
          maxMemoryMB: 256,
          maxCpuPercent: 50,
          maxNetworkBandwidth: 1000000,
          maxDiskSpace: 1024,
          maxExecutionTime: 30000
        },
        services: [],
        data: []
      })
      
      expect(environment).toBeDefined()
      expect(environment.id).toBeDefined()
      expect(environment.name).toBe('Test Environment')
      expect(environment.type).toBe('isolated')
      expect(environment.resources).toBeDefined()
    })

    test('should run tests and return results', async () => {
      // Create a simple test suite
      const testSuite = lifecycleManager.testing.createTestSuite('test-agent', {
        name: 'Quick Test Suite',
        description: 'Quick tests for validation',
        categories: ['SYSTEM'],
        environment: 'isolated',
        parallel: false,
        timeout: 10000
      })
      
      // Mock successful test execution
      const results = await lifecycleManager.testing.runTests(testSuite.id)
      
      expect(results).toBeDefined()
      expect(results.suiteId).toBe(testSuite.id)
      expect(results.totalTests).toBeGreaterThanOrEqual(0)
      expect(results.startTime).toBeInstanceOf(Date)
      expect(results.endTime).toBeInstanceOf(Date)
      expect(results.duration).toBeGreaterThanOrEqual(0)
    }, 15000) // Longer timeout for test execution
  })

  describe('Deployment Manager', () => {
    test('should create deployment configuration', async () => {
      const deploymentId = await lifecycleManager.deployment.createDeployment({
        strategy: 'rolling',
        blueGreen: { enabled: false, switchoverTime: 0, rollbackTimeout: 0, healthCheckTimeout: 0 },
        canary: { enabled: false, trafficPercentage: 0, incrementStep: 0, evaluationInterval: 0, successThreshold: 0, failureThreshold: 0 },
        rolling: { enabled: true, maxUnavailable: 1, maxSurge: 1, batchSize: 1, pauseBetweenBatches: 0 },
        resources: { cpu: '500m', memory: '512Mi', storage: '2Gi', network: '1Gbps' },
        networking: {
          ports: [{ name: 'http', port: 3000, targetPort: 3000, protocol: 'TCP' }],
          loadBalancer: {
            type: 'round_robin',
            algorithm: 'round_robin',
            healthCheck: {
              enabled: true,
              type: 'http',
              endpoint: '/health',
              interval: 30000,
              timeout: 5000,
              retries: 3,
              initialDelay: 10000
            }
          },
          ingress: {
            enabled: true,
            host: 'test.symindx.com',
            path: '/',
            tls: true,
            annotations: {}
          }
        },
        security: {
          authentication: { enabled: true, type: 'jwt', config: {} },
          authorization: {
            enabled: true,
            rbac: { enabled: true, roles: [], bindings: [] },
            policies: []
          },
          encryption: {
            atRest: true,
            inTransit: true,
            keyManagement: { provider: 'kubernetes', keyRotation: true, rotationInterval: 86400000 }
          },
          networkPolicies: []
        },
        monitoring: {
          enabled: true,
          metrics: ['cpu', 'memory'],
          dashboards: ['performance'],
          alerts: ['high_cpu']
        }
      })
      
      expect(deploymentId).toBeDefined()
      expect(typeof deploymentId).toBe('string')
    })

    test('should deploy agent to environment', async () => {
      const deploymentId = await lifecycleManager.deployment.createDeployment({
        strategy: 'rolling',
        blueGreen: { enabled: false, switchoverTime: 0, rollbackTimeout: 0, healthCheckTimeout: 0 },
        canary: { enabled: false, trafficPercentage: 0, incrementStep: 0, evaluationInterval: 0, successThreshold: 0, failureThreshold: 0 },
        rolling: { enabled: true, maxUnavailable: 1, maxSurge: 1, batchSize: 1, pauseBetweenBatches: 0 },
        resources: { cpu: '500m', memory: '512Mi', storage: '2Gi', network: '1Gbps' },
        networking: {
          ports: [{ name: 'http', port: 3000, targetPort: 3000, protocol: 'TCP' }],
          loadBalancer: {
            type: 'round_robin',
            algorithm: 'round_robin',
            healthCheck: {
              enabled: true,
              type: 'http',
              endpoint: '/health',
              interval: 30000,
              timeout: 5000,
              retries: 3,
              initialDelay: 10000
            }
          },
          ingress: {
            enabled: true,
            host: 'test.symindx.com',
            path: '/',
            tls: true,
            annotations: {}
          }
        },
        security: {
          authentication: { enabled: true, type: 'jwt', config: {} },
          authorization: {
            enabled: true,
            rbac: { enabled: true, roles: [], bindings: [] },
            policies: []
          },
          encryption: {
            atRest: true,
            inTransit: true,
            keyManagement: { provider: 'kubernetes', keyRotation: true, rotationInterval: 86400000 }
          },
          networkPolicies: []
        },
        monitoring: {
          enabled: true,
          metrics: ['cpu', 'memory'],
          dashboards: ['performance'],
          alerts: ['high_cpu']
        }
      })
      
      const result = await lifecycleManager.deployment.deployAgent('test-agent', deploymentId)
      
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.status).toBeDefined()
    })

    test('should create and run deployment pipeline', async () => {
      const pipelineId = await lifecycleManager.deployment.createPipeline({
        name: 'Test Pipeline',
        stages: [
          { name: 'Build', type: 'build', config: {}, dependencies: [] },
          { name: 'Test', type: 'test', config: {}, dependencies: ['Build'] },
          { name: 'Deploy', type: 'deploy', config: {}, dependencies: ['Test'] }
        ],
        triggers: [{ type: 'manual', config: {} }],
        notifications: []
      })
      
      expect(pipelineId).toBeDefined()
      
      const execution = await lifecycleManager.deployment.runPipeline(pipelineId)
      
      expect(execution).toBeDefined()
      expect(execution.id).toBeDefined()
      expect(execution.pipelineId).toBe(pipelineId)
      expect(execution.status).toBeDefined()
    })
  })

  describe('Monitoring System', () => {
    test('should create monitoring dashboard', async () => {
      const dashboard = await lifecycleManager.monitoring.createDashboard({
        name: 'Test Dashboard',
        description: 'Dashboard for testing',
        panels: [
          {
            type: 'graph',
            title: 'CPU Usage',
            queries: [
              {
                id: 'cpu_query',
                metric: 'agent_cpu_usage',
                filters: [],
                aggregation: { type: 'avg', interval: '1m', groupBy: [] }
              }
            ],
            visualization: {
              type: 'timeseries',
              options: {},
              thresholds: [],
              colors: { scheme: 'blue' }
            }
          }
        ],
        filters: []
      })
      
      expect(dashboard).toBeDefined()
      expect(dashboard.id).toBeDefined()
      expect(dashboard.name).toBe('Test Dashboard')
      expect(dashboard.panels).toHaveLength(1)
    })

    test('should create alert rule', async () => {
      const alert = await lifecycleManager.monitoring.createAlert({
        name: 'Test Alert',
        description: 'Alert for testing',
        severity: 'WARNING',
        query: {
          id: 'test_query',
          metric: 'test_metric',
          filters: [],
          aggregation: { type: 'avg', interval: '1m', groupBy: [] }
        },
        condition: {
          type: 'threshold',
          threshold: 80,
          operator: '>',
          duration: '5m'
        },
        notifications: ['email']
      })
      
      expect(alert).toBeDefined()
      expect(alert.id).toBeDefined()
      expect(alert.name).toBe('Test Alert')
      expect(alert.severity).toBe('WARNING')
    })

    test('should detect anomalies', async () => {
      const anomalies = await lifecycleManager.monitoring.detectAnomalies('test-agent', {
        from: 'now-1h',
        to: 'now',
        timezone: 'UTC'
      })
      
      expect(anomalies).toBeInstanceOf(Array)
      // Anomalies may or may not be present, so we just check the structure
    })
  })

  describe('Optimization System', () => {
    test('should create optimization suite', () => {
      const suite = lifecycleManager.optimization.createOptimizationSuite('test-agent', testAgentConfig)
      
      expect(suite).toBeDefined()
      expect(suite.id).toBeDefined()
      expect(suite.agentId).toBe('test-agent')
      expect(suite.hyperparameterTuning).toBeDefined()
      expect(suite.performanceProfiler).toBeDefined()
      expect(suite.learningAnalytics).toBeDefined()
    })

    test('should create A/B test experiment', async () => {
      const controlConfig = testAgentConfig
      const variantConfig = {
        ...testAgentConfig,
        psyche: {
          ...testAgentConfig.psyche,
          defaults: {
            ...testAgentConfig.psyche.defaults,
            cognition: 'htn-planner'
          }
        }
      }
      
      const experiment = await lifecycleManager.optimization.createABTest(
        'test-agent',
        controlConfig,
        [variantConfig],
        'Testing cognition module performance',
        ['response_time', 'accuracy']
      )
      
      expect(experiment).toBeDefined()
      expect(experiment.id).toBeDefined()
      expect(experiment.type).toBe('a_b_test')
      expect(experiment.variants).toHaveLength(2) // Control + 1 variant
    })

    test('should generate optimization recommendations', async () => {
      const recommendations = await lifecycleManager.optimization.generateRecommendations('test-agent')
      
      expect(recommendations).toBeInstanceOf(Array)
      // Recommendations may vary, so we just check the structure
      if (recommendations.length > 0) {
        const rec = recommendations[0]
        expect(rec).toHaveProperty('id')
        expect(rec).toHaveProperty('title')
        expect(rec).toHaveProperty('description')
        expect(rec).toHaveProperty('priority')
        expect(rec).toHaveProperty('impact')
      }
    })
  })

  describe('End-to-End Lifecycle', () => {
    test('should deploy complete agent lifecycle', async () => {
      const result = await lifecycleManager.deployAgentLifecycle(testAgentConfig, {
        runTests: true,
        createOptimization: true,
        enableMonitoring: true,
        deploymentTarget: 'staging'
      })
      
      expect(result).toBeDefined()
      expect(result.agentId).toBeDefined()
      expect(result.validationResult).toBeDefined()
      expect(result.validationResult.isValid).toBe(true)
      expect(result.testResults).toBeDefined()
      expect(result.deploymentResult).toBeDefined()
      expect(result.optimizationSuite).toBeDefined()
      expect(result.monitoringDashboard).toBeDefined()
      
      // Verify agent status
      const status = await lifecycleManager.getAgentStatus(result.agentId)
      expect(status).toBeDefined()
      expect(status.deployment).toBeDefined()
      expect(status.monitoring).toBeDefined()
      expect(status.optimization).toBeDefined()
      expect(status.health).toBeDefined()
    }, 30000) // Longer timeout for full lifecycle

    test('should perform health check on all components', async () => {
      const healthCheck = await lifecycleManager.healthCheck()
      
      expect(healthCheck).toBeDefined()
      expect(healthCheck.development).toBe(true)
      expect(healthCheck.testing).toBe(true)
      expect(healthCheck.deployment).toBe(true)
      expect(healthCheck.monitoring).toBeDefined()
      expect(healthCheck.optimization).toBe(true)
      expect(healthCheck.overall).toBeDefined()
    })
  })

  describe('Performance Requirements', () => {
    test('agent lifecycle deployment should complete within time limit', async () => {
      const startTime = Date.now()
      
      await lifecycleManager.deployAgentLifecycle(testAgentConfig, {
        runTests: false, // Skip tests for performance test
        createOptimization: false,
        enableMonitoring: true,
        deploymentTarget: 'staging'
      })
      
      const duration = Date.now() - startTime
      expect(duration).toRespondWithinTime(10000) // 10 seconds max
    }, 15000)

    test('validation should be fast', () => {
      const startTime = Date.now()
      
      lifecycleManager.development.validateConfig(testAgentConfig)
      
      const duration = Date.now() - startTime
      expect(duration).toRespondWithinTime(1000) // 1 second max
    })

    test('test suite creation should be efficient', () => {
      const startTime = Date.now()
      
      lifecycleManager.testing.createTestSuite('perf-test-agent', {
        name: 'Performance Test Suite',
        description: 'Suite for performance testing',
        categories: ['SYSTEM'],
        environment: 'isolated',
        parallel: false,
        timeout: 30000
      })
      
      const duration = Date.now() - startTime
      expect(duration).toRespondWithinTime(500) // 500ms max
    })
  })
})