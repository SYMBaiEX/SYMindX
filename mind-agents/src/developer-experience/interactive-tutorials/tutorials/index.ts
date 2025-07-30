/**
 * Built-in Tutorial Collection
 * All available tutorials organized by category
 */

// Re-export tutorial templates for easy access
export { getTutorialTemplates } from '../tutorial-templates.js';

// Tutorial categories for better organization
export const TUTORIAL_CATEGORIES = {
  GETTING_STARTED: 'getting-started',
  AGENT_DEVELOPMENT: 'agent-development',
  ADVANCED_PATTERNS: 'advanced-patterns',
  DEPLOYMENT: 'deployment',
  TROUBLESHOOTING: 'troubleshooting',
} as const;

// Tutorial difficulty levels
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// Tutorial metadata for organization
export const TUTORIAL_METADATA = {
  'getting-started': {
    category: TUTORIAL_CATEGORIES.GETTING_STARTED,
    order: 1,
    icon: '🚀',
    color: '#4CAF50',
  },
  'first-agent': {
    category: TUTORIAL_CATEGORIES.AGENT_DEVELOPMENT,
    order: 2,
    icon: '🤖',
    color: '#2196F3',
  },
  'emotion-system': {
    category: TUTORIAL_CATEGORIES.AGENT_DEVELOPMENT,
    order: 3,
    icon: '😊',
    color: '#FF9800',
  },
  'memory-system': {
    category: TUTORIAL_CATEGORIES.AGENT_DEVELOPMENT,
    order: 4,
    icon: '🧠',
    color: '#9C27B0',
  },
  extensions: {
    category: TUTORIAL_CATEGORIES.ADVANCED_PATTERNS,
    order: 5,
    icon: '🔌',
    color: '#607D8B',
  },
  'multi-agent': {
    category: TUTORIAL_CATEGORIES.ADVANCED_PATTERNS,
    order: 6,
    icon: '👥',
    color: '#795548',
  },
  'advanced-patterns': {
    category: TUTORIAL_CATEGORIES.ADVANCED_PATTERNS,
    order: 7,
    icon: '⚡',
    color: '#E91E63',
  },
  'debugging-agents': {
    category: TUTORIAL_CATEGORIES.TROUBLESHOOTING,
    order: 8,
    icon: '🔍',
    color: '#FF5722',
  },
  deployment: {
    category: TUTORIAL_CATEGORIES.DEPLOYMENT,
    order: 9,
    icon: '🚀',
    color: '#3F51B5',
  },
} as const;
