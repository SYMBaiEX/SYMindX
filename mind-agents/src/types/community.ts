/**
 * Community Ecosystem Types for SYMindX
 *
 * Comprehensive type definitions for the developer community platform
 * including plugin marketplace, showcase gallery, certification program,
 * community tools, and contribution systems.
 */

import type { BaseConfig, Metadata, AgentId, ValidationResult } from './common';
import type { MemoryRecord } from './memory';

// ========================== CORE TYPES ==========================

export interface CommunityConfig extends BaseConfig {
  platform: {
    name: string;
    version: string;
    url: string;
    description: string;
  };
  features: {
    marketplace: boolean;
    showcase: boolean;
    certification: boolean;
    forum: boolean;
    discord: boolean;
    mentorship: boolean;
    contributions: boolean;
  };
  security: {
    requireVerification: boolean;
    sandboxPlugins: boolean;
    allowUnsignedPlugins: boolean;
    moderationEnabled: boolean;
  };
  monetization: {
    enablePayments: boolean;
    revenueSharing: number; // percentage (0-100)
    freeTrialDays: number;
    subscriptionTiers: string[];
  };
}

export interface CommunityUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    discord?: string;
  };
  profile: {
    joinDate: Date;
    lastActive: Date;
    reputation: number;
    level: CommunityLevel;
    badges: Badge[];
    certifications: Certification[];
    contributions: ContributionStats;
  };
  preferences: {
    notifications: NotificationSettings;
    privacy: PrivacySettings;
    theme: string;
    language: string;
  };
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  roles: CommunityRole[];
}

export interface CommunityRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  color: string;
  badge?: string;
  requirements?: RoleRequirement[];
}

export interface Permission {
  id: string;
  name: string;
  category:
    | 'marketplace'
    | 'showcase'
    | 'moderation'
    | 'administration'
    | 'certification';
  description: string;
  level: 'read' | 'write' | 'admin';
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  discord: boolean;
  types: {
    pluginUpdates: boolean;
    showcaseComments: boolean;
    certificationResults: boolean;
    mentorshipRequests: boolean;
    contributions: boolean;
    security: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'community' | 'private';
  showEmail: boolean;
  showLocation: boolean;
  showContributions: boolean;
  allowMentorship: boolean;
  allowDirectMessages: boolean;
}

// ========================== PLUGIN MARKETPLACE ==========================

export interface PluginMarketplace {
  plugins: Plugin[];
  categories: PluginCategory[];
  tags: string[];
  searchEngine: PluginSearchEngine;
  registry: PluginRegistry;
  sandbox: PluginSandbox;
  payments: PaymentSystem;
  analytics: MarketplaceAnalytics;
}

export interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  longDescription?: string;
  version: string;
  author: CommunityUser;
  maintainers: CommunityUser[];
  category: PluginCategory;
  tags: string[];
  type:
    | 'portal'
    | 'memory'
    | 'emotion'
    | 'cognition'
    | 'extension'
    | 'utility'
    | 'theme';

  // Technical details
  manifest: PluginManifest;
  documentation: PluginDocumentation;
  repository: {
    url: string;
    branch?: string;
    commit?: string;
  };
  license: string;
  dependencies: PluginDependency[];
  compatibility: {
    symindxVersion: string;
    nodeVersion: string;
    platforms: ('linux' | 'darwin' | 'win32')[];
  };

  // Marketplace details
  pricing: PluginPricing;
  ratings: PluginRatings;
  reviews: PluginReview[];
  downloads: DownloadStats;
  security: SecurityScan;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'deprecated';

  // Metadata
  publishDate: Date;
  lastUpdate: Date;
  featured: boolean;
  trending: boolean;
  verified: boolean;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent?: string;
  subcategories: PluginCategory[];
  pluginCount: number;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  main: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
  keywords: string[];
  engines: {
    node: string;
    symindx: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  files: string[];
  config?: Record<string, unknown>;
  permissions: string[];
  sandbox: {
    network: boolean;
    filesystem: boolean;
    process: boolean;
    environment: boolean;
  };
}

export interface PluginDocumentation {
  readme: string;
  changelog: string;
  api?: string;
  examples: PluginExample[];
  screenshots: string[];
  videos: string[];
  tutorials: Tutorial[];
}

export interface PluginExample {
  title: string;
  description: string;
  code: string;
  language: string;
  file?: string;
}

export interface PluginDependency {
  name: string;
  version: string;
  type: 'runtime' | 'development' | 'peer';
  optional: boolean;
}

export interface PluginPricing {
  model: 'free' | 'one-time' | 'subscription' | 'usage-based' | 'freemium';
  price?: number;
  currency: string;
  trialDays?: number;
  subscriptionInterval?: 'monthly' | 'yearly';
  usageTiers?: UsageTier[];
  revenueShare: number; // percentage to platform
}

export interface UsageTier {
  name: string;
  description: string;
  limit: number;
  price: number;
  features: string[];
}

export interface PluginRatings {
  average: number;
  total: number;
  distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
}

export interface PluginReview {
  id: string;
  user: CommunityUser;
  plugin: string;
  rating: number;
  title: string;
  content: string;
  date: Date;
  helpful: number;
  verified: boolean; // user has downloaded/used the plugin
  version: string; // plugin version reviewed
  pros: string[];
  cons: string[];
  replies: PluginReviewReply[];
}

export interface PluginReviewReply {
  id: string;
  user: CommunityUser;
  content: string;
  date: Date;
  helpful: number;
}

export interface DownloadStats {
  total: number;
  weekly: number;
  monthly: number;
  daily: number;
  history: DownloadHistory[];
  platforms: Record<string, number>;
  versions: Record<string, number>;
}

export interface DownloadHistory {
  date: Date;
  count: number;
  version?: string;
  platform?: string;
}

export interface SecurityScan {
  status: 'passed' | 'failed' | 'pending' | 'warning';
  lastScan: Date;
  vulnerabilities: SecurityVulnerability[];
  permissions: PermissionAnalysis[];
  sandboxScore: number; // 0-100
  trustScore: number; // 0-100
  codeAnalysis: CodeAnalysis;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
  cve?: string;
}

export interface PermissionAnalysis {
  permission: string;
  required: boolean;
  justification: string;
  risk: 'low' | 'medium' | 'high';
}

export interface CodeAnalysis {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  documentation: number;
  dependencies: DependencyAnalysis[];
}

export interface DependencyAnalysis {
  name: string;
  version: string;
  vulnerabilities: number;
  license: string;
  maintained: boolean;
  alternatives: string[];
}

export interface PluginSearchEngine {
  search(query: PluginSearchQuery): Promise<PluginSearchResult>;
  index(plugin: Plugin): Promise<void>;
  reindex(): Promise<void>;
  suggest(partial: string): Promise<string[]>;
}

export interface PluginSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  type?: string;
  pricing?: 'free' | 'paid';
  rating?: number;
  verified?: boolean;
  sort?: 'relevance' | 'downloads' | 'rating' | 'date' | 'name';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  filters?: PluginFilter[];
}

export interface PluginFilter {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains';
  value: unknown;
}

export interface PluginSearchResult {
  plugins: Plugin[];
  total: number;
  facets: SearchFacet[];
  suggestions: string[];
  queryTime: number;
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export interface PluginRegistry {
  register(plugin: Plugin): Promise<RegistrationResult>;
  update(
    pluginId: string,
    plugin: Partial<Plugin>
  ): Promise<RegistrationResult>;
  unregister(pluginId: string): Promise<RegistrationResult>;
  get(pluginId: string): Promise<Plugin | null>;
  list(query?: PluginSearchQuery): Promise<Plugin[]>;
  validateManifest(manifest: PluginManifest): ValidationResult;
  checkVersion(pluginId: string, version: string): Promise<VersionCheckResult>;
}

export interface RegistrationResult {
  success: boolean;
  pluginId?: string;
  errors: string[];
  warnings: string[];
  metadata?: Metadata;
}

export interface VersionCheckResult {
  exists: boolean;
  compatible: boolean;
  latest: string;
  deprecated: boolean;
  security: SecurityScan;
}

export interface PluginSandbox {
  create(plugin: Plugin): Promise<SandboxInstance>;
  execute(sandboxId: string, code: string): Promise<SandboxResult>;
  destroy(sandboxId: string): Promise<void>;
  test(plugin: Plugin): Promise<TestResult>;
}

export interface SandboxInstance {
  id: string;
  plugin: Plugin;
  environment: SandboxEnvironment;
  limits: ResourceLimits;
  status: 'running' | 'stopped' | 'failed';
  created: Date;
  lastUsed: Date;
}

export interface SandboxEnvironment {
  nodeVersion: string;
  symindxVersion: string;
  permissions: string[];
  variables: Record<string, string>;
  network: NetworkConfig;
  filesystem: FilesystemConfig;
}

export interface NetworkConfig {
  allowed: boolean;
  whitelist: string[];
  blacklist: string[];
  rateLimit: number;
}

export interface FilesystemConfig {
  readonly: boolean;
  allowedPaths: string[];
  deniedPaths: string[];
  maxFileSize: number;
}

export interface ResourceLimits {
  memory: number;
  cpu: number;
  disk: number;
  network: number;
  time: number;
}

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  resources: ResourceUsage;
  duration: number;
}

export interface ResourceUsage {
  memory: number;
  cpu: number;
  disk: number;
  network: number;
}

export interface TestResult {
  passed: boolean;
  tests: TestCase[];
  coverage: TestCoverage;
  performance: PerformanceMetrics;
  security: SecurityTestResult;
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface TestCoverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface PerformanceMetrics {
  startup: number;
  memory: number;
  cpu: number;
  throughput: number;
}

export interface SecurityTestResult {
  vulnerabilities: SecurityVulnerability[];
  permissions: string[];
  network: NetworkTest[];
  filesystem: FilesystemTest[];
}

export interface NetworkTest {
  url: string;
  allowed: boolean;
  reason: string;
}

export interface FilesystemTest {
  path: string;
  operation: 'read' | 'write' | 'execute';
  allowed: boolean;
  reason: string;
}

export interface PaymentSystem {
  providers: PaymentProvider[];
  process(payment: PaymentRequest): Promise<PaymentResult>;
  refund(transactionId: string, amount?: number): Promise<RefundResult>;
  getTransactions(userId: string): Promise<Transaction[]>;
  getEarnings(developerId: string): Promise<EarningsReport>;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: 'card' | 'paypal' | 'crypto' | 'bank';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface PaymentRequest {
  user: string;
  plugin: string;
  amount: number;
  currency: string;
  method: string;
  metadata?: Metadata;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  receipt?: Receipt;
}

export interface Receipt {
  id: string;
  user: string;
  plugin: string;
  amount: number;
  currency: string;
  tax: number;
  total: number;
  date: Date;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  error?: string;
}

export interface Transaction {
  id: string;
  type: 'purchase' | 'refund' | 'payout';
  user: string;
  plugin?: string;
  amount: number;
  currency: string;
  status: string;
  date: Date;
  metadata?: Metadata;
}

export interface EarningsReport {
  developer: string;
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    gross: number;
    platformFee: number;
    net: number;
  };
  sales: {
    total: number;
    plugins: PluginSales[];
  };
  payouts: Payout[];
}

export interface PluginSales {
  plugin: string;
  sales: number;
  revenue: number;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
}

export interface MarketplaceAnalytics {
  getPluginAnalytics(pluginId: string): Promise<PluginAnalytics>;
  getMarketplaceStats(): Promise<MarketplaceStats>;
  getUserAnalytics(userId: string): Promise<UserAnalytics>;
  generateReport(type: string, period: TimePeriod): Promise<AnalyticsReport>;
}

export interface PluginAnalytics {
  plugin: string;
  period: TimePeriod;
  downloads: TimeSeriesData[];
  ratings: RatingTrend[];
  revenue: TimeSeriesData[];
  users: UserMetrics;
  geography: GeographyData[];
  platforms: PlatformData[];
}

export interface TimeSeriesData {
  date: Date;
  value: number;
}

export interface RatingTrend {
  date: Date;
  average: number;
  count: number;
}

export interface TimePeriod {
  start: Date;
  end: Date;
}

export interface UserMetrics {
  total: number;
  active: number;
  new: number;
  returning: number;
  retention: RetentionData[];
}

export interface RetentionData {
  period: string;
  rate: number;
}

export interface GeographyData {
  country: string;
  users: number;
  downloads: number;
  revenue: number;
}

export interface PlatformData {
  platform: string;
  users: number;
  downloads: number;
}

export interface MarketplaceStats {
  plugins: {
    total: number;
    approved: number;
    pending: number;
    categories: CategoryStats[];
  };
  users: {
    total: number;
    developers: number;
    active: number;
  };
  downloads: {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  revenue: {
    total: number;
    monthly: number;
    platformFee: number;
  };
}

export interface CategoryStats {
  category: string;
  plugins: number;
  downloads: number;
  revenue: number;
}

export interface UserAnalytics {
  user: string;
  period: TimePeriod;
  plugins: {
    published: number;
    downloads: number;
    revenue: number;
  };
  activity: TimeSeriesData[];
  engagement: EngagementMetrics;
}

export interface EngagementMetrics {
  reviews: number;
  ratings: number;
  forum: number;
  contributions: number;
}

export interface AnalyticsReport {
  type: string;
  period: TimePeriod;
  data: Record<string, unknown>;
  charts: ChartData[];
  insights: string[];
  recommendations: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
}

// ========================== SHOWCASE GALLERY ==========================

export interface ShowcaseGallery {
  projects: ShowcaseProject[];
  categories: ShowcaseCategory[];
  search(query: ShowcaseSearchQuery): Promise<ShowcaseSearchResult>;
  submit(project: ShowcaseProject): Promise<SubmissionResult>;
  review(projectId: string, review: ProjectReview): Promise<ReviewResult>;
  feature(projectId: string): Promise<FeatureResult>;
}

export interface ShowcaseProject {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  author: CommunityUser;
  collaborators: CommunityUser[];
  category: ShowcaseCategory;
  tags: string[];

  // Project details
  repository: {
    url: string;
    branch?: string;
    commit?: string;
    stars: number;
    forks: number;
  };
  demo: {
    live?: string;
    video?: string;
    screenshots: string[];
    gifs: string[];
  };
  technical: {
    agents: AgentUsage[];
    plugins: string[];
    technologies: string[];
    architecture: string;
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };

  // Showcase metrics
  ratings: ProjectRatings;
  reviews: ProjectReview[];
  views: ViewStats;
  likes: number;
  bookmarks: number;
  shares: number;

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'featured' | 'rejected';
  featured: boolean;
  trending: boolean;
  verified: boolean;

  // Metadata
  submitDate: Date;
  lastUpdate: Date;
  approvalDate?: Date;
  featuredDate?: Date;
}

export interface ShowcaseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parent?: string;
  subcategories: ShowcaseCategory[];
  projectCount: number;
  featured: ShowcaseProject[];
}

export interface AgentUsage {
  agent: string;
  purpose: string;
  configuration?: Record<string, unknown>;
}

export interface ProjectRatings {
  overall: number;
  innovation: number;
  implementation: number;
  documentation: number;
  usefulness: number;
  total: number;
}

export interface ProjectReview {
  id: string;
  user: CommunityUser;
  project: string;
  ratings: ProjectRatings;
  title: string;
  content: string;
  date: Date;
  helpful: number;
  verified: boolean;
  pros: string[];
  cons: string[];
  suggestions: string[];
  replies: ProjectReviewReply[];
}

export interface ProjectReviewReply {
  id: string;
  user: CommunityUser;
  content: string;
  date: Date;
  helpful: number;
}

export interface ViewStats {
  total: number;
  unique: number;
  daily: number;
  weekly: number;
  monthly: number;
  history: ViewHistory[];
  sources: TrafficSource[];
}

export interface ViewHistory {
  date: Date;
  views: number;
  unique: number;
}

export interface TrafficSource {
  source: string;
  views: number;
  percentage: number;
}

export interface ShowcaseSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  complexity?: string;
  technology?: string;
  rating?: number;
  featured?: boolean;
  sort?: 'relevance' | 'date' | 'rating' | 'views' | 'likes';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ShowcaseSearchResult {
  projects: ShowcaseProject[];
  total: number;
  facets: SearchFacet[];
  suggestions: string[];
  queryTime: number;
}

export interface SubmissionResult {
  success: boolean;
  projectId?: string;
  errors: string[];
  warnings: string[];
  status: 'submitted' | 'needs_review' | 'rejected';
}

export interface ReviewResult {
  success: boolean;
  reviewId?: string;
  error?: string;
}

export interface FeatureResult {
  success: boolean;
  featured: boolean;
  duration?: number; // days
  error?: string;
}

// ========================== DEVELOPER CERTIFICATION ==========================

export interface CertificationProgram {
  levels: CertificationLevel[];
  assessments: Assessment[];
  badges: Badge[];
  issue(userId: string, levelId: string): Promise<CertificationResult>;
  verify(certificationId: string): Promise<VerificationResult>;
  revoke(certificationId: string, reason: string): Promise<RevocationResult>;
  getProgress(userId: string): Promise<CertificationProgress>;
}

export interface CertificationLevel {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: 'foundation' | 'associate' | 'professional' | 'expert' | 'master';
  prerequisites: string[];
  requirements: CertificationRequirement[];
  assessments: string[];
  validityPeriod: number; // months
  renewalRequired: boolean;
  benefits: string[];
  badge: Badge;
}

export interface CertificationRequirement {
  type: 'assessment' | 'project' | 'contribution' | 'experience' | 'training';
  description: string;
  target?: number;
  optional?: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'practical' | 'project' | 'interview' | 'portfolio';
  category: 'knowledge' | 'skills' | 'experience';
  level: CertificationLevel;
  duration: number; // minutes
  passingScore: number;
  maxAttempts: number;
  questions: AssessmentQuestion[];
  instructions: string;
  resources: AssessmentResource[];
  grading: GradingCriteria;
}

export interface AssessmentQuestion {
  id: string;
  type:
    | 'multiple-choice'
    | 'true-false'
    | 'fill-blank'
    | 'coding'
    | 'essay'
    | 'matching';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  codeTemplate?: string;
  testCases?: TestCase[];
}

export interface AssessmentResource {
  type: 'documentation' | 'tutorial' | 'video' | 'example' | 'tool';
  title: string;
  url: string;
  description?: string;
}

export interface GradingCriteria {
  automated: boolean;
  rubric?: GradingRubric[];
  reviewers?: number;
  timeLimit?: number;
}

export interface GradingRubric {
  criteria: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  level: string;
  description: string;
  points: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  criteria: BadgeCriteria;
  rewards: BadgeReward[];
  stackable: boolean;
  expiry?: number; // days
}

export interface BadgeCriteria {
  type: 'automatic' | 'manual' | 'nomination';
  conditions: BadgeCondition[];
  verificationRequired: boolean;
}

export interface BadgeCondition {
  metric: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: number | string;
  timeframe?: number; // days
}

export interface BadgeReward {
  type: 'reputation' | 'privilege' | 'access' | 'discount' | 'recognition';
  value: number | string;
  description: string;
}

export interface Certification {
  id: string;
  user: string;
  level: CertificationLevel;
  assessments: AssessmentResult[];
  issueDate: Date;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  verificationCode: string;
  badge: Badge;
  metadata: CertificationMetadata;
}

export interface CertificationMetadata {
  score: number;
  percentile: number;
  attempts: number;
  duration: number; // minutes
  proctored: boolean;
  reviewer?: string;
  notes?: string;
}

export interface AssessmentResult {
  assessment: string;
  score: number;
  maxScore: number;
  passed: boolean;
  attempts: number;
  duration: number;
  date: Date;
  answers: AssessmentAnswer[];
  feedback?: string;
}

export interface AssessmentAnswer {
  question: string;
  answer: string | string[];
  correct: boolean;
  points: number;
  feedback?: string;
}

export interface CertificationResult {
  success: boolean;
  certification?: Certification;
  errors: string[];
  nextSteps: string[];
}

export interface VerificationResult {
  valid: boolean;
  certification?: Certification;
  error?: string;
}

export interface RevocationResult {
  success: boolean;
  reason: string;
  date: Date;
  error?: string;
}

export interface CertificationProgress {
  user: string;
  currentLevel?: CertificationLevel;
  nextLevel?: CertificationLevel;
  progress: LevelProgress[];
  recommendations: string[];
  estimatedCompletion?: Date;
}

export interface LevelProgress {
  level: CertificationLevel;
  completed: boolean;
  progress: number; // 0-100
  requirements: RequirementProgress[];
  assessments: AssessmentProgress[];
}

export interface RequirementProgress {
  requirement: CertificationRequirement;
  completed: boolean;
  progress: number;
  current: number;
  target: number;
}

export interface AssessmentProgress {
  assessment: string;
  completed: boolean;
  score?: number;
  attempts: number;
  lastAttempt?: Date;
}

// ========================== COMMUNITY TOOLS ==========================

export interface CommunityTools {
  forum: ForumIntegration;
  discord: DiscordBot;
  stackoverflow: StackOverflowIntegration;
  mentorship: MentorshipMatching;
  support: SupportSystem;
  events: EventSystem;
}

export interface ForumIntegration {
  categories: ForumCategory[];
  threads: ForumThread[];
  posts: ForumPost[];
  users: ForumUser[];
  moderation: ModerationSystem;
  search(query: ForumSearchQuery): Promise<ForumSearchResult>;
  createThread(thread: CreateThreadRequest): Promise<ForumThread>;
  reply(threadId: string, content: string, author: string): Promise<ForumPost>;
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parent?: string;
  subcategories: ForumCategory[];
  threadCount: number;
  postCount: number;
  lastPost?: ForumPost;
  permissions: ForumPermissions;
  pinned: boolean;
  archived: boolean;
}

export interface ForumPermissions {
  read: string[]; // roles
  create: string[];
  reply: string[];
  moderate: string[];
  admin: string[];
}

export interface ForumThread {
  id: string;
  title: string;
  category: string;
  author: CommunityUser;
  posts: ForumPost[];
  views: number;
  replies: number;
  lastReply?: Date;
  status: 'open' | 'closed' | 'locked' | 'archived';
  pinned: boolean;
  featured: boolean;
  tags: string[];
  solved: boolean;
  acceptedAnswer?: string;
  created: Date;
  updated: Date;
}

export interface ForumPost {
  id: string;
  thread: string;
  author: CommunityUser;
  content: string;
  html: string;
  attachments: Attachment[];
  reactions: Reaction[];
  replies: ForumPostReply[];
  edited: boolean;
  editDate?: Date;
  editReason?: string;
  reported: boolean;
  accepted: boolean;
  helpful: number;
  created: Date;
  updated: Date;
}

export interface ForumPostReply {
  id: string;
  author: CommunityUser;
  content: string;
  created: Date;
  reactions: Reaction[];
}

export interface Attachment {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}

export interface Reaction {
  type: string;
  emoji: string;
  count: number;
  users: string[];
}

export interface ForumUser {
  user: CommunityUser;
  stats: ForumStats;
  preferences: ForumPreferences;
}

export interface ForumStats {
  posts: number;
  threads: number;
  reputation: number;
  helpful: number;
  solutions: number;
  badges: Badge[];
  joinDate: Date;
  lastActive: Date;
}

export interface ForumPreferences {
  notifications: ForumNotifications;
  signature: string;
  theme: string;
  timezone: string;
}

export interface ForumNotifications {
  mentions: boolean;
  replies: boolean;
  following: boolean;
  digest: 'never' | 'daily' | 'weekly';
}

export interface ModerationSystem {
  reports: Report[];
  actions: ModerationAction[];
  automod: AutoModerationRules;
  reviewQueue: ReviewItem[];
  moderate(action: ModerationActionRequest): Promise<ModerationResult>;
  report(item: ReportRequest): Promise<ReportResult>;
}

export interface Report {
  id: string;
  type: 'post' | 'thread' | 'user' | 'plugin' | 'project';
  target: string;
  reporter: string;
  reason: string;
  category: 'spam' | 'abuse' | 'inappropriate' | 'copyright' | 'other';
  description: string;
  evidence: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  created: Date;
  resolved?: Date;
  resolution?: string;
}

export interface ModerationAction {
  id: string;
  type: 'warn' | 'mute' | 'ban' | 'delete' | 'edit' | 'move' | 'lock';
  target: string;
  moderator: string;
  reason: string;
  duration?: number; // hours
  evidence: string[];
  appeal?: Appeal;
  created: Date;
  expires?: Date;
}

export interface Appeal {
  id: string;
  user: string;
  action: string;
  reason: string;
  evidence: string[];
  status: 'pending' | 'approved' | 'denied';
  reviewer?: string;
  decision?: string;
  created: Date;
  reviewed?: Date;
}

export interface AutoModerationRules {
  spam: SpamDetection;
  toxicity: ToxicityDetection;
  contentFilter: ContentFilter;
  rateLimit: RateLimit;
}

export interface SpamDetection {
  enabled: boolean;
  threshold: number;
  indicators: string[];
  actions: string[];
}

export interface ToxicityDetection {
  enabled: boolean;
  threshold: number;
  models: string[];
  actions: string[];
}

export interface ContentFilter {
  enabled: boolean;
  blocked: string[];
  patterns: string[];
  exceptions: string[];
}

export interface RateLimit {
  posts: RateLimitRule;
  threads: RateLimitRule;
  reports: RateLimitRule;
}

export interface RateLimitRule {
  enabled: boolean;
  count: number;
  window: number; // minutes
  punishment: string;
}

export interface ReviewItem {
  id: string;
  type: string;
  content: unknown;
  priority: number;
  created: Date;
  assignee?: string;
}

export interface ModerationActionRequest {
  type: string;
  target: string;
  reason: string;
  duration?: number;
  notify?: boolean;
}

export interface ModerationResult {
  success: boolean;
  actionId?: string;
  error?: string;
}

export interface ReportRequest {
  type: string;
  target: string;
  reason: string;
  category: string;
  description: string;
  evidence?: string[];
}

export interface ReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

export interface ForumSearchQuery {
  query?: string;
  category?: string;
  author?: string;
  tags?: string[];
  solved?: boolean;
  dateRange?: DateRange;
  sort?: 'relevance' | 'date' | 'replies' | 'views';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ForumSearchResult {
  threads: ForumThread[];
  posts: ForumPost[];
  total: number;
  facets: SearchFacet[];
  suggestions: string[];
  queryTime: number;
}

export interface CreateThreadRequest {
  title: string;
  category: string;
  content: string;
  tags: string[];
  attachments?: string[];
}

export interface DiscordBot {
  client: DiscordClient;
  commands: DiscordCommand[];
  events: DiscordEvent[];
  guilds: DiscordGuild[];
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(channelId: string, content: string): Promise<void>;
  handleCommand(
    command: string,
    args: string[],
    context: DiscordContext
  ): Promise<void>;
}

export interface DiscordClient {
  token: string;
  clientId: string;
  guildId: string;
  permissions: string[];
  status: 'online' | 'idle' | 'dnd' | 'invisible';
}

export interface DiscordCommand {
  name: string;
  description: string;
  options: DiscordCommandOption[];
  permissions: string[];
  cooldown: number;
  handler: DiscordCommandHandler;
}

export interface DiscordCommandOption {
  name: string;
  description: string;
  type: 'string' | 'integer' | 'boolean' | 'user' | 'channel' | 'role';
  required: boolean;
  choices?: DiscordChoice[];
}

export interface DiscordChoice {
  name: string;
  value: string | number;
}

export interface DiscordCommandHandler {
  (context: DiscordContext): Promise<DiscordResponse>;
}

export interface DiscordContext {
  command: string;
  args: Record<string, unknown>;
  user: DiscordUser;
  channel: DiscordChannel;
  guild: DiscordGuild;
  interaction: unknown;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot: boolean;
  system: boolean;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: string;
  guild: string;
  topic?: string;
  nsfw: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: string;
  members: number;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  permissions: string[];
  hoist: boolean;
  mentionable: boolean;
}

export interface DiscordEvent {
  name: string;
  once: boolean;
  handler: DiscordEventHandler;
}

export interface DiscordEventHandler {
  (...args: unknown[]): Promise<void>;
}

export interface DiscordResponse {
  content?: string;
  embeds?: DiscordEmbed[];
  ephemeral?: boolean;
  files?: DiscordFile[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  thumbnail?: DiscordImage;
  image?: DiscordImage;
  footer?: DiscordFooter;
  timestamp?: Date;
}

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordImage {
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordFile {
  name: string;
  content: Buffer;
  description?: string;
}

export interface StackOverflowIntegration {
  tags: string[];
  questions: StackOverflowQuestion[];
  syncQuestions(): Promise<void>;
  postAnswer(questionId: number, answer: string): Promise<void>;
  getQuestions(tags: string[]): Promise<StackOverflowQuestion[]>;
}

export interface StackOverflowQuestion {
  question_id: number;
  title: string;
  body: string;
  tags: string[];
  score: number;
  view_count: number;
  answer_count: number;
  creation_date: Date;
  last_activity_date: Date;
  owner: StackOverflowUser;
  answers: StackOverflowAnswer[];
  is_answered: boolean;
  accepted_answer_id?: number;
}

export interface StackOverflowUser {
  user_id: number;
  display_name: string;
  reputation: number;
  user_type: string;
  profile_image?: string;
  link?: string;
}

export interface StackOverflowAnswer {
  answer_id: number;
  question_id: number;
  body: string;
  score: number;
  is_accepted: boolean;
  creation_date: Date;
  last_activity_date: Date;
  owner: StackOverflowUser;
}

export interface MentorshipMatching {
  mentors: Mentor[];
  mentees: Mentee[];
  relationships: MentorshipRelationship[];
  sessions: MentorshipSession[];
  match(menteeId: string, criteria?: MatchingCriteria): Promise<MatchingResult>;
  createRelationship(
    mentorId: string,
    menteeId: string
  ): Promise<RelationshipResult>;
  scheduleSession(
    relationshipId: string,
    session: SessionRequest
  ): Promise<SessionResult>;
}

export interface Mentor {
  user: CommunityUser;
  profile: MentorProfile;
  availability: Availability;
  specialties: string[];
  experience: ExperienceLevel;
  rating: number;
  reviews: MentorReview[];
  active: boolean;
}

export interface MentorProfile {
  bio: string;
  expertise: string[];
  languages: string[];
  timezone: string;
  hourlyRate?: number;
  currency?: string;
  sessionTypes: (
    | 'one-on-one'
    | 'group'
    | 'code-review'
    | 'career'
    | 'project'
  )[];
  tools: string[];
  approach: string;
}

export interface Availability {
  timezone: string;
  schedule: WeeklySchedule;
  exceptions: DateRange[];
  maxSessions: number;
  responseTime: number; // hours
}

export interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface ExperienceLevel {
  years: number;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'expert';
  domains: string[];
  companies: string[];
  achievements: string[];
}

export interface MentorReview {
  id: string;
  mentee: string;
  rating: number;
  title: string;
  content: string;
  date: Date;
  verified: boolean;
  helpful: number;
}

export interface Mentee {
  user: CommunityUser;
  profile: MenteeProfile;
  goals: LearningGoal[];
  progress: LearningProgress[];
  preferences: MenteePreferences;
}

export interface MenteeProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  background: string;
  interests: string[];
  timezone: string;
  availability: Availability;
  budget?: Budget;
}

export interface Budget {
  hourly: number;
  monthly: number;
  currency: string;
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  progress: number; // 0-100
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: Date;
  completedDate?: Date;
}

export interface LearningProgress {
  goal: string;
  sessions: number;
  hours: number;
  achievements: string[];
  feedback: string[];
  nextSteps: string[];
}

export interface MenteePreferences {
  mentorType: 'any' | 'experienced' | 'peer' | 'industry';
  sessionFormat: 'video' | 'audio' | 'text' | 'in-person';
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'as-needed';
  duration: number; // minutes
  focus: string[];
}

export interface MentorshipRelationship {
  id: string;
  mentor: string;
  mentee: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  goals: string[];
  agreement: MentorshipAgreement;
  progress: RelationshipProgress;
  feedback: RelationshipFeedback[];
}

export interface MentorshipAgreement {
  duration: number; // weeks
  frequency: string;
  sessionDuration: number; // minutes
  expectations: string[];
  boundaries: string[];
  goals: string[];
  communication: string[];
}

export interface RelationshipProgress {
  sessions: number;
  hours: number;
  goals: GoalProgress[];
  satisfaction: number;
  nextSession?: Date;
}

export interface GoalProgress {
  goal: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  notes: string[];
}

export interface RelationshipFeedback {
  id: string;
  from: 'mentor' | 'mentee';
  type: 'session' | 'overall' | 'issue';
  rating?: number;
  content: string;
  date: Date;
  private: boolean;
}

export interface MentorshipSession {
  id: string;
  relationship: string;
  type: 'one-on-one' | 'group' | 'code-review' | 'career' | 'project';
  scheduled: Date;
  duration: number; // minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  agenda: string[];
  notes: string;
  recording?: string;
  materials: SessionMaterial[];
  feedback: SessionFeedback[];
  followUp: string[];
}

export interface SessionMaterial {
  type: 'document' | 'code' | 'video' | 'link' | 'image';
  title: string;
  url: string;
  description?: string;
}

export interface SessionFeedback {
  from: 'mentor' | 'mentee';
  rating: number;
  content: string;
  helpful: boolean;
  suggestions: string[];
}

export interface MatchingCriteria {
  expertise: string[];
  experience: string;
  timezone: string;
  sessionType: string;
  budget?: number;
  language: string;
  availability: string;
}

export interface MatchingResult {
  success: boolean;
  matches: MentorMatch[];
  total: number;
  recommendations: string[];
}

export interface MentorMatch {
  mentor: Mentor;
  score: number;
  reasons: string[];
  availability: TimeSlot[];
  compatibility: CompatibilityScore;
}

export interface CompatibilityScore {
  expertise: number;
  experience: number;
  availability: number;
  communication: number;
  overall: number;
}

export interface RelationshipResult {
  success: boolean;
  relationshipId?: string;
  error?: string;
  nextSteps: string[];
}

export interface SessionRequest {
  type: string;
  duration: number;
  scheduled: Date;
  agenda: string[];
  materials?: string[];
}

export interface SessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  details?: MentorshipSession;
}

export interface SupportSystem {
  tickets: SupportTicket[];
  agents: SupportAgent[];
  knowledge: KnowledgeBase;
  automation: SupportAutomation;
  createTicket(ticket: TicketRequest): Promise<TicketResult>;
  assignTicket(ticketId: string, agentId: string): Promise<AssignmentResult>;
  resolveTicket(
    ticketId: string,
    resolution: string
  ): Promise<ResolutionResult>;
}

export interface SupportTicket {
  id: string;
  user: string;
  type:
    | 'bug'
    | 'feature'
    | 'question'
    | 'documentation'
    | 'account'
    | 'billing';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  subject: string;
  description: string;
  category: string;
  tags: string[];
  assignee?: string;
  created: Date;
  updated: Date;
  resolved?: Date;
  responses: TicketResponse[];
  attachments: Attachment[];
  satisfaction?: number;
  feedback?: string;
}

export interface TicketResponse {
  id: string;
  author: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  internal: boolean;
  created: Date;
  attachments: Attachment[];
}

export interface SupportAgent {
  user: CommunityUser;
  specialties: string[];
  languages: string[];
  availability: Availability;
  workload: AgentWorkload;
  performance: AgentPerformance;
  active: boolean;
}

export interface AgentWorkload {
  current: number;
  maximum: number;
  assigned: string[];
  queue: string[];
}

export interface AgentPerformance {
  resolved: number;
  responseTime: number; // hours
  satisfaction: number;
  efficiency: number;
  period: TimePeriod;
}

export interface KnowledgeBase {
  articles: KnowledgeArticle[];
  categories: KnowledgeCategory[];
  search(query: string): Promise<KnowledgeSearchResult>;
  suggest(ticketId: string): Promise<KnowledgeArticle[]>;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  html: string;
  category: string;
  tags: string[];
  author: string;
  created: Date;
  updated: Date;
  views: number;
  helpful: number;
  unhelpful: number;
  status: 'draft' | 'published' | 'archived';
  related: string[];
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  parent?: string;
  subcategories: KnowledgeCategory[];
  articleCount: number;
}

export interface KnowledgeSearchResult {
  articles: KnowledgeArticle[];
  total: number;
  suggestions: string[];
  queryTime: number;
}

export interface SupportAutomation {
  rules: AutomationRule[];
  triggers: AutomationTrigger[];
  workflows: SupportWorkflow[];
  chatbot: SupportChatbot;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
}

export interface AutomationTrigger {
  type: 'ticket-created' | 'ticket-updated' | 'response-added' | 'time-elapsed';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationAction {
  type: 'assign' | 'tag' | 'priority' | 'status' | 'notify' | 'escalate';
  config: Record<string, unknown>;
}

export interface SupportWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'manual' | 'automated';
  assignee?: string;
  duration?: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface SupportChatbot {
  enabled: boolean;
  model: string;
  personality: string;
  knowledge: string[]; // knowledge base articles
  escalation: EscalationConfig;
  responses: ChatbotResponse[];
}

export interface EscalationConfig {
  confidence: number; // minimum confidence to respond
  attempts: number; // max attempts before escalating
  triggers: string[]; // keywords that trigger escalation
}

export interface ChatbotResponse {
  intent: string;
  confidence: number;
  response: string;
  actions?: string[];
  escalate?: boolean;
}

export interface TicketRequest {
  subject: string;
  description: string;
  type: string;
  priority: string;
  category: string;
  attachments?: string[];
}

export interface TicketResult {
  success: boolean;
  ticketId?: string;
  error?: string;
  estimatedResponse?: number; // hours
}

export interface AssignmentResult {
  success: boolean;
  assignee?: string;
  error?: string;
}

export interface ResolutionResult {
  success: boolean;
  resolved: boolean;
  error?: string;
}

export interface EventSystem {
  events: CommunityEvent[];
  venues: EventVenue[];
  speakers: EventSpeaker[];
  attendees: EventAttendee[];
  createEvent(event: EventRequest): Promise<EventResult>;
  registerAttendee(
    eventId: string,
    userId: string
  ): Promise<RegistrationResult>;
  manageEvent(eventId: string, action: EventAction): Promise<ManagementResult>;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type:
    | 'conference'
    | 'workshop'
    | 'meetup'
    | 'webinar'
    | 'hackathon'
    | 'competition';
  format: 'in-person' | 'virtual' | 'hybrid';
  status: 'planning' | 'open' | 'closed' | 'cancelled' | 'completed';

  // Schedule
  startDate: Date;
  endDate: Date;
  timezone: string;
  schedule: EventSchedule[];

  // Location
  venue?: EventVenue;
  virtualLink?: string;
  capacity: number;

  // Content
  speakers: EventSpeaker[];
  agenda: AgendaItem[];
  materials: EventMaterial[];
  recordings: EventRecording[];

  // Participants
  organizers: CommunityUser[];
  attendees: EventAttendee[];
  waitlist: EventWaitlist[];

  // Registration
  registration: RegistrationConfig;
  pricing: EventPricing;
  requirements: string[];

  // Metadata
  tags: string[];
  category: string;
  featured: boolean;
  created: Date;
  updated: Date;
}

export interface EventSchedule {
  date: Date;
  startTime: string;
  endTime: string;
  sessions: EventSession[];
}

export interface EventSession {
  id: string;
  title: string;
  description: string;
  type: 'keynote' | 'talk' | 'workshop' | 'panel' | 'networking' | 'break';
  speakers: string[];
  duration: number; // minutes
  venue?: string;
  virtualLink?: string;
  capacity?: number;
  materials: EventMaterial[];
  recording?: EventRecording;
}

export interface EventVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  capacity: number;
  amenities: string[];
  accessibility: string[];
  directions: string;
  parking: string;
  contact: string;
}

export interface EventSpeaker {
  user: CommunityUser;
  bio: string;
  expertise: string[];
  sessions: string[];
  social: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  featured: boolean;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  type: string;
  speakers: string[];
  venue?: string;
  virtualLink?: string;
}

export interface EventMaterial {
  id: string;
  title: string;
  type: 'slides' | 'code' | 'document' | 'video' | 'link';
  url: string;
  description?: string;
  session?: string;
  speaker?: string;
  downloadable: boolean;
  size?: number;
}

export interface EventRecording {
  id: string;
  title: string;
  session: string;
  speaker: string;
  url: string;
  duration: number; // minutes
  thumbnail?: string;
  transcript?: string;
  views: number;
  public: boolean;
}

export interface EventAttendee {
  user: string;
  event: string;
  status: 'registered' | 'confirmed' | 'attended' | 'no-show' | 'cancelled';
  registrationDate: Date;
  sessions: string[];
  networking: boolean;
  dietary?: string[];
  accessibility?: string[];
  feedback?: EventFeedback;
}

export interface EventWaitlist {
  user: string;
  event: string;
  position: number;
  notified: boolean;
  joinDate: Date;
}

export interface RegistrationConfig {
  required: boolean;
  startDate: Date;
  endDate: Date;
  maxAttendees: number;
  waitlist: boolean;
  approval: boolean;
  fields: RegistrationField[];
}

export interface RegistrationField {
  name: string;
  type: 'text' | 'email' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface EventPricing {
  model: 'free' | 'paid' | 'tiered' | 'donation';
  tiers: PricingTier[];
  currency: string;
  discounts: EventDiscount[];
}

export interface PricingTier {
  name: string;
  price: number;
  description: string;
  capacity?: number;
  includes: string[];
  earlyBird?: {
    price: number;
    deadline: Date;
  };
}

export interface EventDiscount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses?: number;
  used: number;
  startDate: Date;
  endDate: Date;
  restrictions?: string[];
}

export interface EventFeedback {
  overall: number;
  content: number;
  speakers: number;
  venue: number;
  organization: number;
  networking: number;
  comments: string;
  suggestions: string[];
  recommend: boolean;
  date: Date;
}

export interface EventRequest {
  title: string;
  description: string;
  type: string;
  format: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  venue?: string;
  virtualLink?: string;
  capacity: number;
  registration: RegistrationConfig;
  pricing: EventPricing;
}

export interface EventResult {
  success: boolean;
  eventId?: string;
  error?: string;
  registrationUrl?: string;
}

export interface RegistrationResult {
  success: boolean;
  attendeeId?: string;
  waitlisted?: boolean;
  position?: number;
  error?: string;
}

export interface EventAction {
  type: 'publish' | 'cancel' | 'postpone' | 'update' | 'close';
  data?: Record<string, unknown>;
  reason?: string;
}

export interface ManagementResult {
  success: boolean;
  message: string;
  error?: string;
}

// ========================== CONTRIBUTION SYSTEM ==========================

export interface ContributionSystem {
  types: ContributionType[];
  leaderboards: Leaderboard[];
  bounties: Bounty[];
  governance: GovernanceSystem;
  recognition: RecognitionSystem;
  analytics: ContributionAnalytics;
  track(contribution: ContributionRecord): Promise<TrackingResult>;
  reward(userId: string, contribution: string): Promise<RewardResult>;
  rank(period: TimePeriod, category?: string): Promise<RankingResult>;
}

export interface ContributionType {
  id: string;
  name: string;
  description: string;
  category:
    | 'code'
    | 'documentation'
    | 'design'
    | 'community'
    | 'testing'
    | 'translation';
  points: number;
  requirements: ContributionRequirement[];
  verification: VerificationMethod;
  rewards: ContributionReward[];
  multipliers: PointMultiplier[];
}

export interface ContributionRequirement {
  type: 'approval' | 'merge' | 'acceptance' | 'validation';
  description: string;
  automatic: boolean;
}

export interface VerificationMethod {
  type: 'automatic' | 'manual' | 'peer-review' | 'maintainer';
  config: Record<string, unknown>;
  reviewers?: number;
  criteria?: VerificationCriteria[];
}

export interface VerificationCriteria {
  name: string;
  description: string;
  weight: number;
  required: boolean;
}

export interface ContributionReward {
  type: 'reputation' | 'badge' | 'access' | 'monetary' | 'recognition';
  value: number | string;
  description: string;
  condition?: string;
}

export interface PointMultiplier {
  condition: string;
  multiplier: number;
  description: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ContributionRecord {
  id: string;
  user: string;
  type: string;
  title: string;
  description: string;
  repository?: string;
  pullRequest?: string;
  issue?: string;
  plugin?: string;
  project?: string;
  points: number;
  status: 'pending' | 'verified' | 'rejected' | 'disputed';
  evidence: ContributionEvidence[];
  verifiers: string[];
  rewards: ReceivedReward[];
  created: Date;
  verified?: Date;
  metadata: ContributionMetadata;
}

export interface ContributionEvidence {
  type: 'link' | 'screenshot' | 'code' | 'review' | 'test';
  url?: string;
  content?: string;
  description: string;
}

export interface ReceivedReward {
  type: string;
  value: string | number;
  received: Date;
  claimed: boolean;
}

export interface ContributionMetadata {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  tags: string[];
  languages: string[];
  technologies: string[];
  lines?: number;
  files?: number;
  tests?: number;
}

export interface ContributionStats {
  total: number;
  points: number;
  rank: number;
  level: CommunityLevel;
  categories: CategoryStats[];
  recent: ContributionRecord[];
  streak: StreakInfo;
  achievements: Achievement[];
}

export interface CommunityLevel {
  level: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  pointsRequired: number;
  privileges: string[];
  badge: Badge;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastContribution: Date;
  active: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  earned: Date;
  progress?: number;
  category: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'category' | 'period' | 'challenge';
  category?: string;
  period?: TimePeriod;
  entries: LeaderboardEntry[];
  rewards: LeaderboardReward[];
  updated: Date;
}

export interface LeaderboardEntry {
  rank: number;
  user: CommunityUser;
  score: number;
  change: number; // rank change from previous period
  contributions: number;
  categories: Record<string, number>;
  trend: 'up' | 'down' | 'same';
}

export interface LeaderboardReward {
  rank: number;
  type: string;
  value: string | number;
  description: string;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'documentation' | 'plugin' | 'tutorial' | 'design';
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';

  // Reward
  reward: BountyReward;
  sponsor?: CommunityUser;

  // Requirements
  requirements: string[];
  acceptance: AcceptanceCriteria[];
  deadline?: Date;

  // Participation
  status:
    | 'open'
    | 'claimed'
    | 'in-progress'
    | 'completed'
    | 'expired'
    | 'cancelled';
  claimant?: string;
  submissions: BountySubmission[];

  // Metadata
  created: Date;
  updated: Date;
  views: number;
  watchers: string[];
  repository?: string;
  issue?: string;
}

export interface BountyReward {
  type: 'reputation' | 'monetary' | 'badge' | 'access' | 'certification';
  amount: number;
  currency?: string;
  description: string;
}

export interface AcceptanceCriteria {
  requirement: string;
  description: string;
  testable: boolean;
  weight: number;
}

export interface BountySubmission {
  id: string;
  bounty: string;
  submitter: string;
  title: string;
  description: string;
  evidence: ContributionEvidence[];
  status:
    | 'submitted'
    | 'reviewing'
    | 'accepted'
    | 'rejected'
    | 'revision-requested';
  feedback?: string;
  score?: number;
  submitted: Date;
  reviewed?: Date;
}

export interface GovernanceSystem {
  proposals: Proposal[];
  voting: VotingSystem;
  committees: Committee[];
  policies: Policy[];
  createProposal(proposal: ProposalRequest): Promise<ProposalResult>;
  vote(proposalId: string, vote: Vote): Promise<VoteResult>;
  executeProposal(proposalId: string): Promise<ExecutionResult>;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'policy' | 'feature' | 'budget' | 'membership' | 'governance';
  category: string;
  author: string;
  sponsors: string[];

  // Content
  motivation: string;
  specification: string;
  rationale: string;
  impact: ImpactAssessment;
  alternatives: Alternative[];

  // Process
  status:
    | 'draft'
    | 'discussion'
    | 'voting'
    | 'passed'
    | 'rejected'
    | 'withdrawn'
    | 'executed';
  phase: ProposalPhase;
  timeline: ProposalTimeline;

  // Voting
  voting: ProposalVoting;
  results?: VotingResults;

  // Metadata
  created: Date;
  updated: Date;
  tags: string[];
  references: string[];
}

export interface ImpactAssessment {
  technical: ImpactLevel;
  community: ImpactLevel;
  financial: ImpactLevel;
  timeline: number; // days
  resources: string[];
  risks: Risk[];
}

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Risk {
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: ImpactLevel;
  mitigation: string;
}

export interface Alternative {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  effort: 'low' | 'medium' | 'high';
}

export interface ProposalPhase {
  current: 'discussion' | 'voting' | 'cooldown' | 'implementation';
  startDate: Date;
  endDate: Date;
  required: string[];
  completed: string[];
}

export interface ProposalTimeline {
  discussion: TimePeriod;
  voting: TimePeriod;
  cooldown?: TimePeriod;
  implementation?: TimePeriod;
}

export interface ProposalVoting {
  system: 'simple' | 'weighted' | 'ranked' | 'quadratic';
  threshold: VotingThreshold;
  eligibility: VotingEligibility;
  anonymous: boolean;
  delegation: boolean;
}

export interface VotingThreshold {
  participation: number; // minimum % of eligible voters
  approval: number; // minimum % of yes votes
  supermajority?: number; // for critical proposals
}

export interface VotingEligibility {
  roles: string[];
  reputation: number;
  contributions: number;
  tenure: number; // days
  certifications: string[];
}

export interface VotingResults {
  total: number;
  eligible: number;
  participation: number;
  votes: VoteCount;
  passed: boolean;
  margin: number;
  turnout: number;
}

export interface VoteCount {
  yes: number;
  no: number;
  abstain: number;
  weighted?: WeightedVotes;
}

export interface WeightedVotes {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

export interface VotingSystem {
  cast(proposalId: string, vote: Vote): Promise<VoteResult>;
  delegate(delegatee: string, scope: string[]): Promise<DelegationResult>;
  tally(proposalId: string): Promise<VotingResults>;
  verify(proposalId: string, voteId: string): Promise<VerificationResult>;
}

export interface Vote {
  proposal: string;
  voter: string;
  choice: 'yes' | 'no' | 'abstain';
  weight?: number;
  reason?: string;
  anonymous: boolean;
  delegation?: string;
  timestamp: Date;
}

export interface Committee {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'governance' | 'community' | 'moderation' | 'finance';
  members: CommitteeMember[];
  responsibilities: string[];
  authority: string[];
  meetings: CommitteeMeeting[];
  decisions: CommitteeDecision[];
  active: boolean;
  term: {
    start: Date;
    end: Date;
    renewable: boolean;
  };
}

export interface CommitteeMember {
  user: string;
  role: 'chair' | 'vice-chair' | 'member' | 'observer';
  appointed: Date;
  term?: Date;
  votes: number;
  attendance: number;
}

export interface CommitteeMeeting {
  id: string;
  date: Date;
  type: 'regular' | 'special' | 'emergency';
  agenda: AgendaItem[];
  attendees: string[];
  minutes?: string;
  decisions: string[];
  actions: ActionItem[];
}

export interface ActionItem {
  description: string;
  assignee: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface CommitteeDecision {
  id: string;
  title: string;
  description: string;
  date: Date;
  votes: VoteCount;
  result: 'approved' | 'rejected' | 'deferred';
  implementation?: string;
}

export interface Policy {
  id: string;
  title: string;
  description: string;
  category: 'community' | 'technical' | 'legal' | 'governance' | 'security';
  content: string;
  version: string;
  status: 'draft' | 'active' | 'deprecated' | 'superseded';
  author: string;
  approver: string;
  effective: Date;
  review: Date;
  history: PolicyVersion[];
}

export interface PolicyVersion {
  version: string;
  changes: string[];
  author: string;
  date: Date;
  reason: string;
}

export interface RecognitionSystem {
  nominate(nomination: NominationRequest): Promise<NominationResult>;
  recognize(
    userId: string,
    recognition: Recognition
  ): Promise<RecognitionResult>;
  hall: HallOfFame;
  awards: Award[];
}

export interface Recognition {
  id: string;
  type:
    | 'contributor'
    | 'mentor'
    | 'innovator'
    | 'leader'
    | 'helper'
    | 'ambassador';
  title: string;
  description: string;
  recipient: string;
  nominator?: string;
  evidence: string[];
  period: TimePeriod;
  category: string;
  impact: string;
  date: Date;
  public: boolean;
}

export interface NominationRequest {
  type: string;
  nominee: string;
  title: string;
  description: string;
  evidence: string[];
  category: string;
  period?: TimePeriod;
}

export interface NominationResult {
  success: boolean;
  nominationId?: string;
  error?: string;
  status: 'submitted' | 'under-review' | 'approved' | 'rejected';
}

export interface RecognitionResult {
  success: boolean;
  recognitionId?: string;
  error?: string;
  public: boolean;
}

export interface HallOfFame {
  inductees: HallOfFameEntry[];
  categories: string[];
  criteria: HallOfFameCriteria[];
  induct(userId: string, category: string): Promise<InductionResult>;
}

export interface HallOfFameEntry {
  user: CommunityUser;
  category: string;
  year: number;
  achievements: string[];
  impact: string;
  inducted: Date;
  ceremony?: string;
}

export interface HallOfFameCriteria {
  category: string;
  requirements: string[];
  period: string;
  nominators: number;
  votes: number;
}

export interface InductionResult {
  success: boolean;
  inducted: boolean;
  ceremony?: Date;
  error?: string;
}

export interface Award {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'special';
  criteria: AwardCriteria;
  recipients: AwardRecipient[];
  nominations: AwardNomination[];
  active: boolean;
}

export interface AwardCriteria {
  eligibility: string[];
  requirements: string[];
  evaluation: string[];
  timeline: TimePeriod;
}

export interface AwardRecipient {
  user: string;
  year: number;
  period?: string;
  achievements: string[];
  citation: string;
  ceremony?: Date;
}

export interface AwardNomination {
  nominee: string;
  nominator: string;
  period: string;
  reason: string;
  evidence: string[];
  submitted: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ContributionAnalytics {
  getUserStats(userId: string): Promise<UserContributionStats>;
  getCommunityStats(): Promise<CommunityContributionStats>;
  getTrends(period: TimePeriod): Promise<ContributionTrends>;
  generateReport(
    type: string,
    filters: Record<string, unknown>
  ): Promise<ContributionReport>;
}

export interface UserContributionStats {
  user: string;
  period: TimePeriod;
  summary: ContributionSummary;
  breakdown: ContributionBreakdown;
  trends: UserTrends;
  rankings: UserRankings;
  achievements: Achievement[];
}

export interface ContributionSummary {
  total: number;
  points: number;
  rank: number;
  level: number;
  streak: number;
  impact: string;
}

export interface ContributionBreakdown {
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byMonth: TimeSeriesData[];
  byRepository: Record<string, number>;
  byDifficulty: Record<string, number>;
}

export interface UserTrends {
  velocity: number; // contributions per week
  growth: number; // % change from previous period
  consistency: number; // regularity score
  diversity: number; // variety of contribution types
}

export interface UserRankings {
  global: number;
  category: Record<string, number>;
  repository: Record<string, number>;
  percentile: number;
}

export interface CommunityContributionStats {
  period: TimePeriod;
  overview: CommunityOverview;
  growth: CommunityGrowth;
  distribution: ContributionDistribution;
  top: TopContributors;
  repositories: RepositoryStats[];
}

export interface CommunityOverview {
  totalContributions: number;
  totalContributors: number;
  totalPoints: number;
  activeContributors: number;
  newContributors: number;
}

export interface CommunityGrowth {
  contributions: TimeSeriesData[];
  contributors: TimeSeriesData[];
  points: TimeSeriesData[];
  retention: RetentionData[];
}

export interface ContributionDistribution {
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  byRepository: Record<string, number>;
  byUser: Record<string, number>;
}

export interface TopContributors {
  overall: LeaderboardEntry[];
  newcomers: LeaderboardEntry[];
  categories: Record<string, LeaderboardEntry[]>;
  growth: LeaderboardEntry[];
}

export interface RepositoryStats {
  repository: string;
  contributions: number;
  contributors: number;
  points: number;
  types: Record<string, number>;
  activity: TimeSeriesData[];
}

export interface ContributionTrends {
  period: TimePeriod;
  growth: TrendData;
  patterns: PatternData;
  predictions: PredictionData;
  insights: InsightData;
}

export interface TrendData {
  contributions: TrendMetric;
  contributors: TrendMetric;
  points: TrendMetric;
  diversity: TrendMetric;
}

export interface TrendMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PatternData {
  seasonal: SeasonalPattern[];
  weekly: WeeklyPattern;
  daily: DailyPattern;
  events: EventImpact[];
}

export interface SeasonalPattern {
  period: string;
  peak: string;
  low: string;
  variation: number;
}

export interface WeeklyPattern {
  peak: string; // day of week
  low: string;
  distribution: Record<string, number>;
}

export interface DailyPattern {
  peak: string; // hour
  low: string;
  distribution: Record<string, number>;
}

export interface EventImpact {
  event: string;
  date: Date;
  impact: number;
  duration: number; // days
  type: 'positive' | 'negative' | 'neutral';
}

export interface PredictionData {
  nextMonth: PredictionMetric;
  nextQuarter: PredictionMetric;
  growth: GrowthPrediction;
  risks: RiskPrediction[];
}

export interface PredictionMetric {
  contributions: number;
  contributors: number;
  points: number;
  confidence: number;
}

export interface GrowthPrediction {
  rate: number; // % per month
  confidence: number;
  factors: GrowthFactor[];
}

export interface GrowthFactor {
  factor: string;
  impact: number;
  confidence: number;
}

export interface RiskPrediction {
  risk: string;
  probability: number;
  impact: ImpactLevel;
  mitigation: string[];
}

export interface InsightData {
  highlights: string[];
  concerns: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface ContributionReport {
  title: string;
  period: TimePeriod;
  type: string;
  summary: string;
  data: Record<string, unknown>;
  charts: ChartData[];
  insights: string[];
  recommendations: string[];
  appendices: ReportAppendix[];
}

export interface ReportAppendix {
  title: string;
  content: string;
  type: 'text' | 'table' | 'chart' | 'data';
}

// ========================== TRACKING & RESULTS ==========================

export interface TrackingResult {
  success: boolean;
  contributionId?: string;
  points?: number;
  error?: string;
  verification?: VerificationStatus;
}

export interface VerificationStatus {
  required: boolean;
  method: string;
  reviewers: string[];
  deadline?: Date;
  status: 'pending' | 'in-review' | 'verified' | 'rejected';
}

export interface RewardResult {
  success: boolean;
  rewards: ReceivedReward[];
  points: number;
  levelUp?: boolean;
  newLevel?: CommunityLevel;
  badges?: Badge[];
  error?: string;
}

export interface RankingResult {
  period: TimePeriod;
  category?: string;
  leaderboard: LeaderboardEntry[];
  total: number;
  updated: Date;
}

export interface ProposalRequest {
  title: string;
  description: string;
  type: string;
  category: string;
  motivation: string;
  specification: string;
  rationale: string;
  impact: ImpactAssessment;
  alternatives: Alternative[];
  timeline: ProposalTimeline;
  voting: ProposalVoting;
}

export interface ProposalResult {
  success: boolean;
  proposalId?: string;
  error?: string;
  discussionUrl?: string;
  timeline?: ProposalTimeline;
}

export interface VoteResult {
  success: boolean;
  voteId?: string;
  weight?: number;
  error?: string;
  receipt?: string;
}

export interface DelegationResult {
  success: boolean;
  delegationId?: string;
  scope: string[];
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  implemented: boolean;
  timeline?: Date;
  responsible?: string[];
  error?: string;
}

// ========================== MAIN COMMUNITY SERVICE ==========================

export interface CommunityService {
  config: CommunityConfig;
  marketplace: PluginMarketplace;
  showcase: ShowcaseGallery;
  certification: CertificationProgram;
  tools: CommunityTools;
  contributions: ContributionSystem;

  // Core methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getUser(userId: string): Promise<CommunityUser | null>;
  createUser(userData: Partial<CommunityUser>): Promise<CommunityUser>;
  updateUser(
    userId: string,
    updates: Partial<CommunityUser>
  ): Promise<CommunityUser>;

  // Activity tracking
  trackActivity(userId: string, activity: ActivityRecord): Promise<void>;
  getActivity(userId: string, period?: TimePeriod): Promise<ActivityRecord[]>;

  // Reputation system
  updateReputation(
    userId: string,
    change: number,
    reason: string
  ): Promise<void>;
  getReputation(userId: string): Promise<ReputationScore>;

  // Analytics
  getAnalytics(type: string, period: TimePeriod): Promise<AnalyticsReport>;

  // Health check
  healthCheck(): Promise<CommunityHealthStatus>;
}

export interface ActivityRecord {
  id: string;
  user: string;
  type:
    | 'plugin_download'
    | 'plugin_review'
    | 'showcase_view'
    | 'forum_post'
    | 'contribution'
    | 'certification';
  details: Record<string, unknown>;
  timestamp: Date;
  points?: number;
  metadata?: Metadata;
}

export interface ReputationScore {
  current: number;
  history: ReputationHistory[];
  breakdown: ReputationBreakdown;
  level: CommunityLevel;
  nextLevel?: CommunityLevel;
  progress: number; // 0-100 to next level
}

export interface ReputationHistory {
  date: Date;
  change: number;
  reason: string;
  source: string;
  balance: number;
}

export interface ReputationBreakdown {
  contributions: number;
  reviews: number;
  forum: number;
  mentorship: number;
  certifications: number;
  penalties: number;
}

export interface CommunityHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  components: ComponentHealthStatus[];
  metrics: HealthMetrics;
  issues: HealthIssue[];
  recommendations: string[];
  lastCheck: Date;
}

export interface ComponentHealthStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  metrics?: Record<string, number>;
}

export interface HealthMetrics {
  activeUsers: number;
  engagement: number;
  growth: number;
  retention: number;
  satisfaction: number;
  issues: number;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  impact: string;
  recommendation: string;
  detected: Date;
}

// ========================== TUTORIAL SYSTEM ==========================

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  prerequisites: string[];
  objectives: string[];

  // Content
  steps: TutorialStep[];
  resources: TutorialResource[];
  examples: TutorialExample[];
  exercises: TutorialExercise[];

  // Progress tracking
  completions: number;
  rating: number;
  reviews: TutorialReview[];

  // Metadata
  author: string;
  created: Date;
  updated: Date;
  tags: string[];
  languages: string[];
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'video' | 'interactive' | 'quiz';
  order: number;
  estimated: number; // minutes
  code?: CodeExample;
  quiz?: QuizQuestion[];
  validation?: StepValidation;
}

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
  runnable: boolean;
  testCases?: TestCase[];
}

export interface QuizQuestion {
  question: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  options?: string[];
  correct: string | string[];
  explanation: string;
}

export interface StepValidation {
  type: 'automatic' | 'manual' | 'peer';
  criteria: string[];
  tests?: TestCase[];
}

export interface TutorialResource {
  type: 'documentation' | 'video' | 'article' | 'tool' | 'plugin';
  title: string;
  url: string;
  description: string;
  optional: boolean;
}

export interface TutorialExample {
  title: string;
  description: string;
  code: string;
  language: string;
  explanation: string;
  demo?: string;
}

export interface TutorialExercise {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter?: string;
  solution?: string;
  tests: TestCase[];
  hints: string[];
}

export interface TutorialReview {
  id: string;
  user: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  date: Date;
  verified: boolean;
}

export interface RoleRequirement {
  type:
    | 'reputation'
    | 'contribution'
    | 'certification'
    | 'nomination'
    | 'tenure';
  value: number | string;
  description: string;
}

// Re-export all types for easy access
export * from './common';
