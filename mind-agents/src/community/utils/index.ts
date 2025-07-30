/**
 * Community Utilities
 *
 * Shared utility functions and helpers for the community ecosystem
 */

import type {
  CommunityUser,
  Plugin,
  ShowcaseProject,
  Certification,
  ValidationResult,
} from '../../types/community';

// ========================== VALIDATION UTILITIES ==========================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 20) {
      errors.push('Username must be no more than 20 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
    }
    if (/^[_-]/.test(username) || /[_-]$/.test(username)) {
      warnings.push(
        'Username should not start or end with underscore or hyphen'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateSemanticVersion(version: string): boolean {
  const semverRegex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

// ========================== FORMATTING UTILITIES ==========================

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (format === 'relative') {
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ========================== SEARCH UTILITIES ==========================

export function highlightSearchTerms(
  text: string,
  searchTerms: string[]
): string {
  let highlightedText = text;

  searchTerms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });

  return highlightedText;
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .slice(0, 10); // Limit to 10 terms
}

export function calculateRelevanceScore(
  item: any,
  searchTerms: string[]
): number {
  let score = 0;
  const searchableText = [
    item.title || item.name || '',
    item.description || '',
    ...(item.tags || []),
    ...(item.keywords || []),
  ]
    .join(' ')
    .toLowerCase();

  searchTerms.forEach((term) => {
    const termRegex = new RegExp(escapeRegExp(term), 'gi');
    const matches = searchableText.match(termRegex);
    if (matches) {
      score += matches.length;

      // Boost score for title matches
      if ((item.title || item.name || '').toLowerCase().includes(term)) {
        score += 5;
      }

      // Boost score for exact matches
      if (searchableText.includes(term)) {
        score += 2;
      }
    }
  });

  return score;
}

// ========================== SORTING UTILITIES ==========================

export function sortByRelevance<T>(items: T[], searchTerms: string[]): T[] {
  return items
    .map((item) => ({
      item,
      score: calculateRelevanceScore(item, searchTerms),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

export function sortByPopularity<
  T extends {
    downloads?: { total: number };
    views?: { total: number };
    likes?: number;
  },
>(items: T[]): T[] {
  return items.sort((a, b) => {
    const scoreA =
      (a.downloads?.total || 0) +
      (a.views?.total || 0) * 0.1 +
      (a.likes || 0) * 2;
    const scoreB =
      (b.downloads?.total || 0) +
      (b.views?.total || 0) * 0.1 +
      (b.likes || 0) * 2;
    return scoreB - scoreA;
  });
}

export function sortByDate<
  T extends { created?: Date; publishDate?: Date; submitDate?: Date },
>(items: T[], ascending = false): T[] {
  return items.sort((a, b) => {
    const dateA = a.created || a.publishDate || a.submitDate || new Date(0);
    const dateB = b.created || b.publishDate || b.submitDate || new Date(0);
    return ascending
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });
}

// ========================== FILTERING UTILITIES ==========================

export function filterByCategory<T extends { category: { name: string } }>(
  items: T[],
  category: string
): T[] {
  return items.filter((item) => item.category.name === category);
}

export function filterByTags<T extends { tags: string[] }>(
  items: T[],
  tags: string[]
): T[] {
  return items.filter((item) => tags.some((tag) => item.tags.includes(tag)));
}

export function filterByDateRange<
  T extends { created?: Date; publishDate?: Date; submitDate?: Date },
>(items: T[], startDate: Date, endDate: Date): T[] {
  return items.filter((item) => {
    const itemDate = item.created || item.publishDate || item.submitDate;
    if (!itemDate) return false;
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function filterByRating<T extends { ratings: { average: number } }>(
  items: T[],
  minRating: number
): T[] {
  return items.filter((item) => item.ratings.average >= minRating);
}

// ========================== PAGINATION UTILITIES ==========================

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(
  items: T[],
  options: PaginationOptions
): PaginationResult<T> {
  const { page, limit } = options;
  const offset = options.offset || (page - 1) * limit;
  const total = items.length;
  const totalPages = Math.ceil(total / limit);

  const paginatedItems = items.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ========================== ANALYTICS UTILITIES ==========================

export function calculateGrowthRate(
  current: number,
  previous: number
): { rate: number; percentage: number } {
  if (previous === 0) {
    return { rate: current, percentage: current > 0 ? 100 : 0 };
  }

  const rate = current - previous;
  const percentage = (rate / previous) * 100;

  return { rate, percentage };
}

export function calculateMovingAverage(
  values: number[],
  windowSize: number
): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }

  return result;
}

export function calculatePercentile(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);

  if (index === -1) return 100;
  if (index === 0) return 0;

  return (index / sorted.length) * 100;
}

export function generateTimeSeriesData(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month' = 'day'
): { date: Date; value: number }[] {
  const data: { date: Date; value: number }[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    data.push({
      date: new Date(current),
      value: 0, // Would be filled with actual data
    });

    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return data;
}

// ========================== SECURITY UTILITIES ==========================

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

export function generateSecureToken(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export function hashString(input: string): number {
  let hash = 0;
  if (input.length === 0) return hash;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash);
}

// ========================== RATE LIMITING UTILITIES ==========================

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    requests = requests.filter((timestamp) => timestamp > windowStart);

    if (requests.length >= this.maxRequests) {
      return false;
    }

    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(identifier: string): Date {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) {
      return new Date();
    }

    const oldestRequest = Math.min(...requests);
    return new Date(oldestRequest + this.windowMs);
  }
}

// ========================== CACHING UTILITIES ==========================

export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ========================== ERROR HANDLING UTILITIES ==========================

export class CommunityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CommunityError';
  }
}

export function createErrorResponse(error: CommunityError | Error): {
  error: {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
  };
} {
  if (error instanceof CommunityError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        context: error.context,
      },
    };
  }

  return {
    error: {
      message: error.message,
      code: 'INTERNAL_SERVER_ERROR',
    },
  };
}

// ========================== TYPE GUARD UTILITIES ==========================

export function isPlugin(obj: any): obj is Plugin {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    obj.manifest &&
    obj.author
  );
}

export function isShowcaseProject(obj: any): obj is ShowcaseProject {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    obj.category &&
    obj.author
  );
}

export function isCertification(obj: any): obj is Certification {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user === 'string' &&
    obj.level &&
    obj.issueDate instanceof Date &&
    typeof obj.status === 'string'
  );
}

export function isCommunityUser(obj: any): obj is CommunityUser {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string' &&
    obj.profile &&
    obj.preferences
  );
}

// ========================== UTILITY EXPORTS ==========================

export const communityUtils = {
  // Validation
  validateEmail,
  validateUsername,
  validateUrl,
  validateSemanticVersion,

  // Formatting
  formatNumber,
  formatDuration,
  formatFileSize,
  formatDate,

  // Search
  highlightSearchTerms,
  extractSearchTerms,
  calculateRelevanceScore,

  // Sorting
  sortByRelevance,
  sortByPopularity,
  sortByDate,

  // Filtering
  filterByCategory,
  filterByTags,
  filterByDateRange,
  filterByRating,

  // Pagination
  paginate,

  // Analytics
  calculateGrowthRate,
  calculateMovingAverage,
  calculatePercentile,
  generateTimeSeriesData,

  // Security
  sanitizeHtml,
  sanitizeFilename,
  generateSecureToken,
  hashString,

  // Classes
  RateLimiter,
  LRUCache,
  CommunityError,

  // Error handling
  createErrorResponse,

  // Type guards
  isPlugin,
  isShowcaseProject,
  isCertification,
  isCommunityUser,
};

export default communityUtils;
