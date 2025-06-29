/**
 * Agent Builder Component
 * 
 * Visual drag-and-drop interface for creating and configuring agents
 * with real-time validation and template support.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Brain, 
  Settings, 
  Code, 
  Play, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Sparkles,
  Target,
  Zap,
  Shield
} from 'lucide-react'

interface AgentTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  baseConfig: any
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  suggestion?: string
}

interface AgentConfig {
  core: {
    name: string
    tone: string
    personality: string[]
  }
  lore: {
    origin: string
    motive: string
    background?: string
  }
  psyche: {
    traits: string[]
    defaults: {
      memory: string
      emotion: string
      cognition: string
      portal?: string
    }
  }
  modules: {
    extensions: string[]
    tools?: {
      enabled: boolean
      system: string
      sandbox?: {
        enabled: boolean
        allowedLanguages: string[]
        timeoutMs: number
        memoryLimitMB: number
        networkAccess: boolean
        fileSystemAccess: boolean
      }
    }
  }
}

export function AgentBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [config, setConfig] = useState<AgentConfig>({
    core: {
      name: '',
      tone: 'helpful and friendly',
      personality: []
    },
    lore: {
      origin: '',
      motive: ''
    },
    psyche: {
      traits: [],
      defaults: {
        memory: 'sqlite',
        emotion: 'rune-emotion-stack',
        cognition: 'reactive'
      }
    },
    modules: {
      extensions: []
    }
  })
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const templates: AgentTemplate[] = [
    {
      id: 'gaming-agent',
      name: 'Gaming Agent',
      description: 'Agent specialized for game automation and interaction',
      category: 'Gaming',
      tags: ['gaming', 'automation', 'runelite'],
      baseConfig: {
        core: { name: 'Gaming Bot', tone: 'focused and strategic', personality: ['analytical', 'persistent'] },
        psyche: { defaults: { memory: 'sqlite', emotion: 'rune-emotion-stack', cognition: 'htn-planner' } },
        modules: { extensions: ['runelite', 'api'] }
      }
    },
    {
      id: 'social-agent',
      name: 'Social Media Agent',
      description: 'Agent for social media management and engagement',
      category: 'Social Media',
      tags: ['social', 'twitter', 'telegram'],
      baseConfig: {
        core: { name: 'Social Assistant', tone: 'friendly and engaging', personality: ['charismatic', 'responsive'] },
        psyche: { defaults: { memory: 'supabase', emotion: 'rune-emotion-stack', cognition: 'reactive' } },
        modules: { extensions: ['twitter', 'telegram', 'api'] }
      }
    },
    {
      id: 'enterprise-agent',
      name: 'Enterprise Assistant',
      description: 'Professional agent for business and enterprise tasks',
      category: 'Enterprise',
      tags: ['enterprise', 'business', 'slack'],
      baseConfig: {
        core: { name: 'Enterprise Assistant', tone: 'professional and helpful', personality: ['reliable', 'efficient'] },
        psyche: { defaults: { memory: 'neon', emotion: 'rune-emotion-stack', cognition: 'hybrid' } },
        modules: { extensions: ['slack', 'api', 'mcp'], tools: { enabled: true, system: 'dynamic' } }
      }
    }
  ]

  const availableExtensions = [
    { id: 'api', name: 'API Server', description: 'HTTP/WebSocket API interface' },
    { id: 'slack', name: 'Slack Integration', description: 'Slack chat integration' },
    { id: 'twitter', name: 'Twitter', description: 'Twitter social media integration' },
    { id: 'telegram', name: 'Telegram', description: 'Telegram messaging integration' },
    { id: 'runelite', name: 'RuneLite', description: 'RuneScape game automation' },
    { id: 'mcp', name: 'MCP Client', description: 'Model Context Protocol client' }
  ]

  const memoryProviders = [
    { id: 'sqlite', name: 'SQLite', description: 'Local file-based storage' },
    { id: 'supabase', name: 'Supabase', description: 'Cloud PostgreSQL with vector search' },
    { id: 'neon', name: 'Neon', description: 'Serverless PostgreSQL' },
    { id: 'memory', name: 'In-Memory', description: 'Temporary memory storage' }
  ]

  const emotionModules = [
    { id: 'rune-emotion-stack', name: 'RuneScape Emotion Stack', description: 'Gaming-inspired emotion system' }
  ]

  const cognitionModules = [
    { id: 'reactive', name: 'Reactive', description: 'Fast, reactive decision making' },
    { id: 'htn-planner', name: 'HTN Planner', description: 'Hierarchical task planning' },
    { id: 'hybrid', name: 'Hybrid', description: 'Combined reactive and planning approach' }
  ]

  const aiPortals = [
    { id: 'openai', name: 'OpenAI', description: 'GPT models from OpenAI' },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude models from Anthropic' },
    { id: 'groq', name: 'Groq', description: 'Fast inference with Groq' },
    { id: 'xai', name: 'xAI', description: 'Grok models from xAI' }
  ]

  // Real-time validation
  useEffect(() => {
    const validateConfig = async () => {
      setIsValidating(true)
      const errors: ValidationError[] = []

      // Core validation
      if (!config.core.name.trim()) {
        errors.push({
          field: 'core.name',
          message: 'Agent name is required',
          severity: 'error',
          suggestion: 'Provide a descriptive name for your agent'
        })
      }

      if (config.core.name.length > 50) {
        errors.push({
          field: 'core.name',
          message: 'Agent name is too long',
          severity: 'warning',
          suggestion: 'Keep the name under 50 characters'
        })
      }

      // Module validation
      if (config.modules.extensions.length === 0) {
        errors.push({
          field: 'modules.extensions',
          message: 'No extensions selected',
          severity: 'warning',
          suggestion: 'Add at least one extension to enable agent capabilities'
        })
      }

      // Tools validation
      if (config.modules.tools?.enabled && !config.modules.tools.sandbox?.enabled) {
        errors.push({
          field: 'modules.tools.sandbox',
          message: 'Tools enabled without sandbox',
          severity: 'warning',
          suggestion: 'Enable sandbox for safer tool execution'
        })
      }

      setValidationErrors(errors)
      setIsValidating(false)
    }

    const debounce = setTimeout(validateConfig, 300)
    return () => clearTimeout(debounce)
  }, [config])

  const applyTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setConfig({
      ...config,
      ...template.baseConfig,
      core: {
        ...config.core,
        ...template.baseConfig.core
      },
      psyche: {
        ...config.psyche,
        ...template.baseConfig.psyche,
        defaults: {
          ...config.psyche.defaults,
          ...template.baseConfig.psyche?.defaults
        }
      },
      modules: {
        ...config.modules,
        ...template.baseConfig.modules
      }
    })
  }

  const updateConfig = (path: string, value: any) => {
    const keys = path.split('.')
    const newConfig = { ...config }
    let current: any = newConfig

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    setConfig(newConfig)
  }

  const toggleExtension = (extensionId: string) => {
    const extensions = [...config.modules.extensions]
    const index = extensions.indexOf(extensionId)
    
    if (index > -1) {
      extensions.splice(index, 1)
    } else {
      extensions.push(extensionId)
    }
    
    updateConfig('modules.extensions', extensions)
  }

  const addPersonalityTrait = (trait: string) => {
    if (trait && !config.core.personality.includes(trait)) {
      updateConfig('core.personality', [...config.core.personality, trait])
    }
  }

  const removePersonalityTrait = (trait: string) => {
    updateConfig('core.personality', config.core.personality.filter(t => t !== trait))
  }

  const saveAgent = async () => {
    console.log('Saving agent configuration:', config)
    // Here you would typically send to an API
  }

  const previewAgent = () => {
    setPreviewMode(true)
    console.log('Previewing agent:', config)
  }

  const hasErrors = validationErrors.some(e => e.severity === 'error')
  const hasWarnings = validationErrors.some(e => e.severity === 'warning')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            Agent Builder
          </h2>
          <p className="text-muted-foreground">Create and configure intelligent agents with visual tools</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={previewAgent}
            disabled={hasErrors}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={saveAgent}
            disabled={hasErrors}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Agent
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {(hasErrors || hasWarnings || isValidating) && (
        <Card className={`border-l-4 ${
          hasErrors ? 'border-l-red-500 bg-red-50' : 
          hasWarnings ? 'border-l-yellow-500 bg-yellow-50' : 
          'border-l-blue-500 bg-blue-50'
        }`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  <span className="text-sm font-medium">Validating configuration...</span>
                </>
              ) : hasErrors ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Configuration errors found</span>
                </>
              ) : (
                <>
                  <Info className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-700">Configuration warnings</span>
                </>
              )}
            </div>
            {validationErrors.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm">
                    <span className={error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                      {error.field}: {error.message}
                    </span>
                    {error.suggestion && (
                      <div className="text-xs text-gray-600 ml-2">💡 {error.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>Start with a pre-built template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => applyTemplate(template)}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-600 mb-2">{template.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setConfig({
                      core: { name: '', tone: 'helpful and friendly', personality: [] },
                      lore: { origin: '', motive: '' },
                      psyche: {
                        traits: [],
                        defaults: { memory: 'sqlite', emotion: 'rune-emotion-stack', cognition: 'reactive' }
                      },
                      modules: { extensions: [] }
                    })
                  }}
                >
                  Start from Scratch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Configuration */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="core" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="core" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Core
              </TabsTrigger>
              <TabsTrigger value="psyche" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Psyche
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Modules
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="core" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Core Identity</CardTitle>
                  <CardDescription>Define the basic identity and characteristics of your agent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name *</Label>
                      <Input
                        id="name"
                        value={config.core.name}
                        onChange={(e) => updateConfig('core.name', e.target.value)}
                        placeholder="Enter agent name"
                        className={validationErrors.some(e => e.field === 'core.name' && e.severity === 'error') ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tone">Personality Tone</Label>
                      <Input
                        id="tone"
                        value={config.core.tone}
                        onChange={(e) => updateConfig('core.tone', e.target.value)}
                        placeholder="e.g., helpful and friendly"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Personality Traits</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {config.core.personality.map((trait) => (
                        <Badge
                          key={trait}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => removePersonalityTrait(trait)}
                        >
                          {trait} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add personality trait"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addPersonalityTrait((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {['analytical', 'creative', 'empathetic', 'focused', 'friendly', 'patient', 'strategic'].map((trait) => (
                        <Button
                          key={trait}
                          variant="outline"
                          size="sm"
                          onClick={() => addPersonalityTrait(trait)}
                          disabled={config.core.personality.includes(trait)}
                        >
                          {trait}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origin Story</Label>
                      <Input
                        id="origin"
                        value={config.lore.origin}
                        onChange={(e) => updateConfig('lore.origin', e.target.value)}
                        placeholder="Describe the agent's background and creation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motive">Primary Motive</Label>
                      <Input
                        id="motive"
                        value={config.lore.motive}
                        onChange={(e) => updateConfig('lore.motive', e.target.value)}
                        placeholder="What drives this agent?"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="psyche" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Psychological Configuration</CardTitle>
                  <CardDescription>Configure memory, emotion, and cognition systems</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Memory Provider</Label>
                      <Select
                        value={config.psyche.defaults.memory}
                        onValueChange={(value) => updateConfig('psyche.defaults.memory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {memoryProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div>
                                <div className="font-medium">{provider.name}</div>
                                <div className="text-xs text-gray-500">{provider.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Emotion Module</Label>
                      <Select
                        value={config.psyche.defaults.emotion}
                        onValueChange={(value) => updateConfig('psyche.defaults.emotion', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {emotionModules.map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              <div>
                                <div className="font-medium">{module.name}</div>
                                <div className="text-xs text-gray-500">{module.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cognition Module</Label>
                      <Select
                        value={config.psyche.defaults.cognition}
                        onValueChange={(value) => updateConfig('psyche.defaults.cognition', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {cognitionModules.map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              <div>
                                <div className="font-medium">{module.name}</div>
                                <div className="text-xs text-gray-500">{module.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>AI Portal (Optional)</Label>
                      <Select
                        value={config.psyche.defaults.portal || ''}
                        onValueChange={(value) => updateConfig('psyche.defaults.portal', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI portal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No AI Portal</SelectItem>
                          {aiPortals.map((portal) => (
                            <SelectItem key={portal.id} value={portal.id}>
                              <div>
                                <div className="font-medium">{portal.name}</div>
                                <div className="text-xs text-gray-500">{portal.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Extensions & Capabilities</CardTitle>
                  <CardDescription>Select extensions to add capabilities to your agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableExtensions.map((extension) => (
                      <div
                        key={extension.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          config.modules.extensions.includes(extension.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleExtension(extension.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{extension.name}</div>
                            <div className="text-sm text-gray-600">{extension.description}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            config.modules.extensions.includes(extension.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {config.modules.extensions.includes(extension.id) && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tools & Security</CardTitle>
                  <CardDescription>Configure advanced features and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Dynamic Tools</Label>
                      <p className="text-sm text-gray-600">Allow agent to execute code and tools dynamically</p>
                    </div>
                    <Switch
                      checked={config.modules.tools?.enabled || false}
                      onCheckedChange={(checked) => updateConfig('modules.tools.enabled', checked)}
                    />
                  </div>

                  {config.modules.tools?.enabled && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Sandbox Security
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Enable Sandbox</Label>
                            <p className="text-xs text-gray-600">Isolate tool execution for security</p>
                          </div>
                          <Switch
                            checked={config.modules.tools?.sandbox?.enabled || false}
                            onCheckedChange={(checked) => 
                              updateConfig('modules.tools.sandbox.enabled', checked)
                            }
                          />
                        </div>

                        {config.modules.tools?.sandbox?.enabled && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Network Access</Label>
                                <Switch
                                  checked={config.modules.tools?.sandbox?.networkAccess || false}
                                  onCheckedChange={(checked) => 
                                    updateConfig('modules.tools.sandbox.networkAccess', checked)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">File System Access</Label>
                                <Switch
                                  checked={config.modules.tools?.sandbox?.fileSystemAccess || false}
                                  onCheckedChange={(checked) => 
                                    updateConfig('modules.tools.sandbox.fileSystemAccess', checked)
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="timeout" className="text-sm">Timeout (ms)</Label>
                                <Input
                                  id="timeout"
                                  type="number"
                                  value={config.modules.tools?.sandbox?.timeoutMs || 30000}
                                  onChange={(e) => updateConfig('modules.tools.sandbox.timeoutMs', parseInt(e.target.value))}
                                  min="1000"
                                  max="300000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="memory" className="text-sm">Memory Limit (MB)</Label>
                                <Input
                                  id="memory"
                                  type="number"
                                  value={config.modules.tools?.sandbox?.memoryLimitMB || 512}
                                  onChange={(e) => updateConfig('modules.tools.sandbox.memoryLimitMB', parseInt(e.target.value))}
                                  min="64"
                                  max="4096"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Configuration Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Configuration Preview
                  </CardTitle>
                  <CardDescription>JSON representation of your agent configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}