/**
 * Developer Experience Type Definitions
 */

// Core DX Interfaces
export interface DeveloperExperienceConfig {
  enableInteractiveTutorials: boolean;
  enableAIAssistedCoding: boolean;
  enableVisualDebugger: boolean;
  enableProductivityTools: boolean;
  enableDocumentationPlatform: boolean;
  enableAnalytics: boolean;
  theme?: DXTheme;
  language?: DXLanguage;
}

export interface DXTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    primary: string;
    code: string;
  };
}

export type DXLanguage =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'zh'
  | 'pt'
  | 'it'
  | 'ru'
  | 'ko';

// Interactive Tutorials
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  code?: string;
  expected?: string;
  hints?: string[];
  validation?: (input: string) => boolean | Promise<boolean>;
  aiExplanation?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  steps: TutorialStep[];
  completionReward?: string;
}

export interface TutorialProgress {
  tutorialId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: Date;
  lastActivity: Date;
  completed?: Date;
}

// AI-Assisted Coding
export interface CodeCompletionRequest {
  code: string;
  cursor: number;
  context: {
    filePath: string;
    agentType?: string;
    imports?: string[];
    variables?: Record<string, string>;
  };
}

export interface CodeCompletionSuggestion {
  text: string;
  displayText: string;
  insertText: string;
  confidence: number;
  category: 'api' | 'pattern' | 'completion' | 'fix';
  description?: string;
  documentation?: string;
}

export interface CodeOptimizationSuggestion {
  id: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  fix?: {
    description: string;
    changes: CodeChange[];
  };
  aiExplanation: string;
}

export interface CodeChange {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

// Visual Debugger
export interface AgentDebugState {
  agentId: string;
  status: 'active' | 'inactive' | 'error' | 'paused';
  emotion: {
    current: string;
    intensity: number;
    history: Array<{
      emotion: string;
      intensity: number;
      timestamp: Date;
    }>;
  };
  memory: {
    recent: MemoryRecord[];
    stats: {
      totalRecords: number;
      memoryUsage: number;
    };
  };
  cognition: {
    currentThought?: string;
    planningState: string;
    recentActions: AgentAction[];
  };
  metrics: {
    responseTime: number;
    tokensUsed: number;
    errorRate: number;
    uptime: number;
  };
}

export interface MemoryRecord {
  id: string;
  content: string;
  timestamp: Date;
  importance: number;
  tags?: string[];
}

export interface AgentAction {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  result?: string;
  error?: string;
}

export interface VisualizationConfig {
  showEmotionGraph: boolean;
  showMemoryUsage: boolean;
  showPerformanceMetrics: boolean;
  showConversationReplay: boolean;
  refreshInterval: number;
}

// Productivity Tools
export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  excludePatterns: string[];
  debounceMs: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  suggestions: Array<{
    path: string;
    suggestion: string;
    aiReasoning: string;
  }>;
}

export interface PerformanceProfile {
  name: string;
  timestamp: Date;
  metrics: {
    initializationTime: number;
    memoryUsage: number;
    responseTime: number;
    throughput: number;
  };
  breakdown: Record<string, number>;
}

// Documentation Platform
export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  category: 'api' | 'tutorial' | 'example' | 'guide';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  lastUpdated: Date;
  interactiveExamples?: InteractiveExample[];
}

export interface InteractiveExample {
  id: string;
  title: string;
  description: string;
  code: string;
  expectedOutput?: string;
  runnable: boolean;
  dependencies?: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  sections: string[]; // DocumentationSection IDs
  prerequisites?: string[];
}

// VS Code Extension
export interface VSCodeExtensionConfig {
  enableCodeCompletion: boolean;
  enableInlineHelp: boolean;
  enableDebugging: boolean;
  enableSnippets: boolean;
  autoSuggestThreshold: number;
}

// Analytics
export interface DeveloperAnalytics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  event: string;
  data: Record<string, any>;
  context?: {
    tutorialId?: string;
    agentId?: string;
    feature?: string;
  };
}

export interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  tutorialsCompleted: number;
  codeCompletionsUsed: number;
  debuggingSessions: number;
  averageSessionTime: number;
  popularFeatures: Array<{
    feature: string;
    usage: number;
  }>;
}

// Events
export interface DXEvent {
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
}

export type DXEventHandler = (event: DXEvent) => void | Promise<void>;

// Error Handling
export interface DXError extends Error {
  code: string;
  category: 'tutorial' | 'ai-coding' | 'debugger' | 'productivity' | 'docs';
  context?: Record<string, any>;
  suggestions?: string[];
}
