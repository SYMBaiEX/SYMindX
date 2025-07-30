/**
 * Community Ecosystem Constants
 *
 * Shared constants and configuration values for the community platform
 */

// ========================== PLATFORM CONSTANTS ==========================

export const PLATFORM_INFO = {
  name: 'SYMindX Community',
  version: '1.0.0',
  url: 'https://community.symindx.dev',
  description: 'The collaborative developer ecosystem for AI agents',
  repository: 'https://github.com/symindx/community',
  documentation: 'https://docs.symindx.dev/community',
  support: 'https://support.symindx.dev',
  discord: 'https://discord.gg/symindx',
  forum: 'https://forum.symindx.dev',
} as const;

// ========================== REPUTATION SYSTEM ==========================

export const REPUTATION_POINTS = {
  // Plugin marketplace
  PLUGIN_PUBLISH: 100,
  PLUGIN_UPDATE: 10,
  PLUGIN_DOWNLOAD: 1,
  PLUGIN_REVIEW: 5,
  PLUGIN_HELPFUL_REVIEW: 2,
  PLUGIN_FEATURED: 50,

  // Showcase gallery
  PROJECT_SUBMIT: 25,
  PROJECT_FEATURED: 100,
  PROJECT_LIKE: 1,
  PROJECT_REVIEW: 10,
  PROJECT_SHARE: 2,

  // Forum activity
  FORUM_POST: 2,
  FORUM_HELPFUL_ANSWER: 10,
  FORUM_ACCEPTED_ANSWER: 25,
  FORUM_THREAD_CREATE: 5,

  // Contributions
  CODE_CONTRIBUTION: 20,
  DOCUMENTATION: 15,
  BUG_REPORT: 5,
  BUG_FIX: 25,
  FEATURE_REQUEST: 3,
  FEATURE_IMPLEMENTATION: 50,

  // Community involvement
  MENTORSHIP_SESSION: 15,
  TUTORIAL_CREATION: 30,
  EVENT_ORGANIZATION: 40,
  MODERATION_ACTION: 5,

  // Certifications
  CERTIFICATION_FOUNDATION: 200,
  CERTIFICATION_ASSOCIATE: 500,
  CERTIFICATION_PROFESSIONAL: 1000,
  CERTIFICATION_EXPERT: 2000,
  CERTIFICATION_MASTER: 5000,

  // Penalties
  SPAM_PENALTY: -50,
  VIOLATION_MINOR: -25,
  VIOLATION_MAJOR: -100,
  VIOLATION_SEVERE: -500,
} as const;

export const COMMUNITY_LEVELS = [
  { level: 1, name: 'Newcomer', points: 0, icon: '🌱', color: '#22c55e' },
  { level: 2, name: 'Explorer', points: 100, icon: '🔍', color: '#3b82f6' },
  { level: 3, name: 'Contributor', points: 500, icon: '⚡', color: '#8b5cf6' },
  { level: 4, name: 'Builder', points: 1500, icon: '🔨', color: '#f59e0b' },
  { level: 5, name: 'Innovator', points: 3500, icon: '💡', color: '#ef4444' },
  { level: 6, name: 'Expert', points: 7500, icon: '🏆', color: '#dc2626' },
  { level: 7, name: 'Mentor', points: 15000, icon: '🎓', color: '#7c2d12' },
  { level: 8, name: 'Legend', points: 30000, icon: '⭐', color: '#fbbf24' },
  { level: 9, name: 'Master', points: 60000, icon: '👑', color: '#a855f7' },
  {
    level: 10,
    name: 'Architect',
    points: 100000,
    icon: '🌟',
    color: '#e11d48',
  },
] as const;

// ========================== PLUGIN MARKETPLACE ==========================

export const PLUGIN_CATEGORIES = [
  'AI Portals',
  'Memory Providers',
  'Emotion Systems',
  'Cognition Modules',
  'Extensions',
  'Utilities',
  'Themes',
  'Security',
  'Analytics',
  'Integrations',
] as const;

export const PLUGIN_TYPES = [
  'portal',
  'memory',
  'emotion',
  'cognition',
  'extension',
  'utility',
  'theme',
] as const;

export const SECURITY_LEVELS = {
  SANDBOX_SCORE: {
    EXCELLENT: 90,
    GOOD: 70,
    FAIR: 50,
    POOR: 30,
    FAILED: 0,
  },
  TRUST_SCORE: {
    VERIFIED: 95,
    TRUSTED: 80,
    STANDARD: 60,
    UNVERIFIED: 40,
    SUSPICIOUS: 20,
  },
} as const;

export const PLUGIN_PRICING_MODELS = [
  'free',
  'one-time',
  'subscription',
  'usage-based',
  'freemium',
] as const;

// ========================== SHOWCASE GALLERY ==========================

export const SHOWCASE_CATEGORIES = [
  'AI Assistants',
  'Automation Tools',
  'Creative Projects',
  'Educational Apps',
  'Enterprise Solutions',
  'Gaming & Entertainment',
  'Healthcare & Wellness',
  'IoT & Hardware',
  'Research & Science',
  'Social & Communication',
] as const;

export const COMPLEXITY_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const;

// ========================== CERTIFICATION PROGRAM ==========================

export const CERTIFICATION_TIERS = [
  'foundation',
  'associate',
  'professional',
  'expert',
  'master',
] as const;

export const ASSESSMENT_TYPES = [
  'quiz',
  'practical',
  'project',
  'interview',
  'portfolio',
] as const;

export const BADGE_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;

// ========================== CONTRIBUTION SYSTEM ==========================

export const CONTRIBUTION_TYPES = {
  CODE: {
    FEATURE: { points: 50, category: 'code' },
    BUG_FIX: { points: 25, category: 'code' },
    REFACTOR: { points: 20, category: 'code' },
    OPTIMIZATION: { points: 30, category: 'code' },
    TEST: { points: 15, category: 'code' },
  },
  DOCUMENTATION: {
    GUIDE: { points: 30, category: 'documentation' },
    API_DOCS: { points: 25, category: 'documentation' },
    TUTORIAL: { points: 40, category: 'documentation' },
    TRANSLATION: { points: 20, category: 'documentation' },
    EXAMPLE: { points: 15, category: 'documentation' },
  },
  DESIGN: {
    UI_DESIGN: { points: 35, category: 'design' },
    UX_RESEARCH: { points: 30, category: 'design' },
    BRANDING: { points: 25, category: 'design' },
    MOCKUP: { points: 20, category: 'design' },
    ICON_SET: { points: 15, category: 'design' },
  },
  COMMUNITY: {
    MENTORSHIP: { points: 40, category: 'community' },
    EVENT_ORGANIZATION: { points: 50, category: 'community' },
    MODERATION: { points: 20, category: 'community' },
    FORUM_HELP: { points: 10, category: 'community' },
    ONBOARDING: { points: 25, category: 'community' },
  },
  TESTING: {
    BUG_REPORT: { points: 10, category: 'testing' },
    SECURITY_AUDIT: { points: 100, category: 'testing' },
    PERFORMANCE_TEST: { points: 30, category: 'testing' },
    USABILITY_TEST: { points: 25, category: 'testing' },
    COMPATIBILITY_TEST: { points: 20, category: 'testing' },
  },
} as const;

export const BOUNTY_TYPES = [
  'feature',
  'bug',
  'documentation',
  'plugin',
  'tutorial',
  'design',
] as const;

// ========================== GOVERNANCE ==========================

export const PROPOSAL_TYPES = [
  'policy',
  'feature',
  'budget',
  'membership',
  'governance',
] as const;

export const VOTING_SYSTEMS = [
  'simple',
  'weighted',
  'ranked',
  'quadratic',
] as const;

export const COMMITTEE_TYPES = [
  'technical',
  'governance',
  'community',
  'moderation',
  'finance',
] as const;

// ========================== FORUM & COMMUNITY TOOLS ==========================

export const FORUM_CATEGORIES = [
  'General Discussion',
  'Plugin Development',
  'Showcase Projects',
  'Help & Support',
  'Feature Requests',
  'Bug Reports',
  'Tutorials & Guides',
  'Job Board',
  'Off Topic',
] as const;

export const MODERATION_ACTIONS = [
  'warn',
  'mute',
  'ban',
  'delete',
  'edit',
  'move',
  'lock',
] as const;

export const REPORT_CATEGORIES = [
  'spam',
  'abuse',
  'inappropriate',
  'copyright',
  'other',
] as const;

// ========================== DISCORD BOT COMMANDS ==========================

export const DISCORD_COMMANDS = {
  PLUGINS: {
    name: 'plugins',
    description: 'Search and discover plugins',
    options: [
      {
        name: 'query',
        description: 'Search query',
        type: 'string',
        required: false,
      },
      {
        name: 'category',
        description: 'Plugin category',
        type: 'string',
        required: false,
      },
    ],
  },
  SHOWCASE: {
    name: 'showcase',
    description: 'Browse showcase projects',
    options: [
      {
        name: 'category',
        description: 'Project category',
        type: 'string',
        required: false,
      },
      {
        name: 'featured',
        description: 'Show only featured projects',
        type: 'boolean',
        required: false,
      },
    ],
  },
  PROFILE: {
    name: 'profile',
    description: 'View community profile',
    options: [
      {
        name: 'user',
        description: 'User to view (defaults to you)',
        type: 'user',
        required: false,
      },
    ],
  },
  CONTRIBUTE: {
    name: 'contribute',
    description: 'Learn how to contribute to SYMindX',
    options: [],
  },
  CERTIFY: {
    name: 'certify',
    description: 'View certification program',
    options: [
      {
        name: 'level',
        description: 'Certification level',
        type: 'string',
        required: false,
      },
    ],
  },
  HELP: {
    name: 'help',
    description: 'Get help with SYMindX',
    options: [
      {
        name: 'topic',
        description: 'Help topic',
        type: 'string',
        required: false,
      },
    ],
  },
} as const;

// ========================== ANALYTICS & METRICS ==========================

export const METRIC_TYPES = [
  'downloads',
  'views',
  'ratings',
  'contributions',
  'users',
  'engagement',
  'retention',
  'satisfaction',
] as const;

export const TIME_PERIODS = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;

export const CHART_TYPES = [
  'line',
  'bar',
  'pie',
  'area',
  'scatter',
  'histogram',
] as const;

// ========================== API LIMITS & QUOTAS ==========================

export const API_LIMITS = {
  PLUGIN_UPLOADS_PER_DAY: 10,
  REVIEWS_PER_DAY: 50,
  FORUM_POSTS_PER_HOUR: 20,
  REPORTS_PER_DAY: 10,
  VOTES_PER_DAY: 100,
  BOUNTY_SUBMISSIONS_PER_DAY: 5,
  CERTIFICATIONS_PER_MONTH: 3,
  MENTORSHIP_SESSIONS_PER_WEEK: 10,
} as const;

export const RATE_LIMITS = {
  SEARCH_REQUESTS_PER_MINUTE: 100,
  API_REQUESTS_PER_MINUTE: 1000,
  UPLOAD_REQUESTS_PER_HOUR: 50,
  DOWNLOAD_REQUESTS_PER_MINUTE: 500,
} as const;

// ========================== FILE UPLOAD LIMITS ==========================

export const UPLOAD_LIMITS = {
  PLUGIN_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  SCREENSHOT_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  VIDEO_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB

  ALLOWED_PLUGIN_TYPES: ['.zip', '.tar.gz', '.tgz'],
  ALLOWED_IMAGE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  ALLOWED_VIDEO_TYPES: ['.mp4', '.webm', '.mov'],
  ALLOWED_DOCUMENT_TYPES: ['.pdf', '.md', '.txt', '.docx'],
} as const;

// ========================== NOTIFICATION TYPES ==========================

export const NOTIFICATION_TYPES = {
  PLUGIN_APPROVED: 'plugin_approved',
  PLUGIN_REJECTED: 'plugin_rejected',
  PLUGIN_FEATURED: 'plugin_featured',
  PLUGIN_REVIEW: 'plugin_review',
  PLUGIN_UPDATE: 'plugin_update',

  PROJECT_FEATURED: 'project_featured',
  PROJECT_REVIEW: 'project_review',
  PROJECT_LIKE: 'project_like',

  CERTIFICATION_PASSED: 'certification_passed',
  CERTIFICATION_FAILED: 'certification_failed',
  BADGE_EARNED: 'badge_earned',

  FORUM_REPLY: 'forum_reply',
  FORUM_MENTION: 'forum_mention',
  FORUM_HELPFUL: 'forum_helpful',

  MENTORSHIP_REQUEST: 'mentorship_request',
  MENTORSHIP_SESSION: 'mentorship_session',

  CONTRIBUTION_ACCEPTED: 'contribution_accepted',
  BOUNTY_COMPLETED: 'bounty_completed',

  REPUTATION_MILESTONE: 'reputation_milestone',
  LEVEL_UP: 'level_up',
} as const;

// ========================== ERROR CODES ==========================

export const ERROR_CODES = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Limits
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // Plugins
  PLUGIN_VALIDATION_FAILED: 'PLUGIN_VALIDATION_FAILED',
  SECURITY_SCAN_FAILED: 'SECURITY_SCAN_FAILED',
  INCOMPATIBLE_VERSION: 'INCOMPATIBLE_VERSION',

  // Payments
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

// ========================== SUCCESS MESSAGES ==========================

export const SUCCESS_MESSAGES = {
  PLUGIN_PUBLISHED: 'Plugin successfully published to marketplace',
  PLUGIN_UPDATED: 'Plugin updated successfully',
  PROJECT_SUBMITTED: 'Project submitted to showcase gallery',
  CERTIFICATION_EARNED: 'Congratulations! Certification earned',
  CONTRIBUTION_RECORDED: 'Contribution recorded and points awarded',
  REVIEW_SUBMITTED: 'Review submitted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
} as const;

// ========================== DEFAULT CONFIGURATIONS ==========================

export const DEFAULT_CONFIG = {
  MARKETPLACE: {
    FEATURED_COUNT: 12,
    TRENDING_DAYS: 7,
    REVIEW_EXPIRY_DAYS: 365,
    SANDBOX_TIMEOUT: 30000, // 30 seconds
    AUTO_APPROVE_TRUSTED: true,
  },

  SHOWCASE: {
    FEATURED_COUNT: 8,
    TRENDING_DAYS: 14,
    AUTO_FEATURE_THRESHOLD: 100, // likes
    REVIEW_REQUIRED_FOR_FEATURE: true,
  },

  FORUM: {
    POSTS_PER_PAGE: 20,
    THREADS_PER_PAGE: 15,
    MAX_ATTACHMENTS: 5,
    EDIT_TIME_LIMIT: 3600, // 1 hour
    AUTO_LOCK_DAYS: 365,
  },

  CERTIFICATION: {
    ATTEMPT_COOLDOWN: 24, // hours
    CERTIFICATE_VALIDITY: 730, // 2 years
    PASSING_SCORE: 70,
    RETRY_LIMIT: 3,
  },

  MENTORSHIP: {
    SESSION_DURATION: 60, // minutes
    ADVANCE_BOOKING_DAYS: 14,
    CANCELLATION_HOURS: 24,
    RATING_REQUIRED: true,
  },
} as const;

// ========================== FEATURE FLAGS ==========================

export const FEATURE_FLAGS = {
  ENABLE_PAID_PLUGINS: true,
  ENABLE_PLUGIN_SANDBOX: true,
  ENABLE_AI_MODERATION: true,
  ENABLE_BLOCKCHAIN_VERIFICATION: false,
  ENABLE_DECENTRALIZED_STORAGE: false,
  ENABLE_SMART_CONTRACTS: false,
  ENABLE_NFT_BADGES: false,
  ENABLE_DAO_GOVERNANCE: false,
  ENABLE_REPUTATION_STAKING: false,
  ENABLE_CROSS_CHAIN_PAYMENTS: false,
} as const;

// ========================== THEME COLORS ==========================

export const THEME_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',

  // Level colors
  level1: '#22c55e',
  level2: '#3b82f6',
  level3: '#8b5cf6',
  level4: '#f59e0b',
  level5: '#ef4444',
  level6: '#dc2626',
  level7: '#7c2d12',
  level8: '#fbbf24',
  level9: '#a855f7',
  level10: '#e11d48',
} as const;

// Export everything as a single constants object
export const COMMUNITY_CONSTANTS = {
  PLATFORM_INFO,
  REPUTATION_POINTS,
  COMMUNITY_LEVELS,
  PLUGIN_CATEGORIES,
  PLUGIN_TYPES,
  SECURITY_LEVELS,
  PLUGIN_PRICING_MODELS,
  SHOWCASE_CATEGORIES,
  COMPLEXITY_LEVELS,
  CERTIFICATION_TIERS,
  ASSESSMENT_TYPES,
  BADGE_RARITIES,
  CONTRIBUTION_TYPES,
  BOUNTY_TYPES,
  PROPOSAL_TYPES,
  VOTING_SYSTEMS,
  COMMITTEE_TYPES,
  FORUM_CATEGORIES,
  MODERATION_ACTIONS,
  REPORT_CATEGORIES,
  DISCORD_COMMANDS,
  METRIC_TYPES,
  TIME_PERIODS,
  CHART_TYPES,
  API_LIMITS,
  RATE_LIMITS,
  UPLOAD_LIMITS,
  NOTIFICATION_TYPES,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  DEFAULT_CONFIG,
  FEATURE_FLAGS,
  THEME_COLORS,
} as const;
