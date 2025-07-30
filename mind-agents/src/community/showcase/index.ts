/**
 * Showcase Gallery System
 *
 * Platform for displaying community projects, with ratings,
 * categories, featured projects, and social interactions.
 */

import { EventEmitter } from 'events';
import type {
  ShowcaseGallery,
  ShowcaseProject,
  ShowcaseCategory,
  ShowcaseSearchQuery,
  ShowcaseSearchResult,
  SubmissionResult,
  ReviewResult,
  FeatureResult,
  ProjectReview,
  CommunityUser,
} from '../../types/community';
import { runtimeLogger } from '../../utils/logger';
import { COMMUNITY_CONSTANTS } from '../constants';

export class ShowcaseGalleryImpl
  extends EventEmitter
  implements ShowcaseGallery
{
  public projects: ShowcaseProject[] = [];
  public categories: ShowcaseCategory[] = [];

  private initialized = false;
  private projectIndex: Map<string, ShowcaseProject> = new Map();
  private categoryIndex: Map<string, ShowcaseCategory> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      runtimeLogger.info('Initializing showcase gallery...');

      // Initialize categories
      this.initializeCategories();

      // Load existing projects
      await this.loadProjects();

      // Build search indices
      this.buildIndices();

      this.initialized = true;
      this.emit('initialized');

      runtimeLogger.info('Showcase gallery initialized', {
        projects: this.projects.length,
        categories: this.categories.length,
      });
    } catch (error) {
      runtimeLogger.error('Failed to initialize showcase gallery', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Save state and cleanup
      await this.saveState();
      this.projects = [];
      this.categories = [];
      this.projectIndex.clear();
      this.categoryIndex.clear();

      this.initialized = false;
      this.emit('shutdown');

      runtimeLogger.info('Showcase gallery shutdown complete');
    } catch (error) {
      runtimeLogger.error('Error during showcase shutdown', error);
      throw error;
    }
  }

  // ========================== SEARCH & DISCOVERY ==========================

  async search(query: ShowcaseSearchQuery): Promise<ShowcaseSearchResult> {
    const startTime = Date.now();

    try {
      let results = [...this.projects];

      // Apply text search
      if (query.query) {
        const searchTerms = query.query.toLowerCase().split(' ');
        results = results.filter((project) => {
          const searchText =
            `${project.title} ${project.description} ${project.tags.join(' ')} ${project.technical.technologies.join(' ')}`.toLowerCase();
          return searchTerms.some((term) => searchText.includes(term));
        });
      }

      // Apply filters
      results = this.applyFilters(results, query);

      // Sort results
      results = this.sortResults(
        results,
        query.sort || 'relevance',
        query.order || 'desc'
      );

      // Pagination
      const total = results.length;
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        projects: paginatedResults,
        total,
        facets: this.generateFacets(results),
        suggestions: this.generateSuggestions(query.query || ''),
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      runtimeLogger.error('Showcase search failed', error, { query });
      return {
        projects: [],
        total: 0,
        facets: [],
        suggestions: [],
        queryTime: Date.now() - startTime,
      };
    }
  }

  // ========================== PROJECT MANAGEMENT ==========================

  async submit(project: ShowcaseProject): Promise<SubmissionResult> {
    try {
      // Validate project data
      const validation = this.validateProject(project);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings || [],
          status: 'rejected',
        };
      }

      // Set initial status and metadata
      project.status = 'submitted';
      project.submitDate = new Date();
      project.lastUpdate = new Date();
      project.featured = false;
      project.trending = false;
      project.verified = false;

      // Initialize metrics
      project.views = {
        total: 0,
        unique: 0,
        daily: 0,
        weekly: 0,
        monthly: 0,
        history: [],
        sources: [],
      };
      project.likes = 0;
      project.bookmarks = 0;
      project.shares = 0;

      // Add to collection
      this.projects.push(project);
      this.projectIndex.set(project.id, project);

      // Update category count
      const category = this.categoryIndex.get(project.category.id);
      if (category) {
        category.projectCount++;
      }

      // Emit event
      this.emit('project:submitted', { project });

      // Auto-approve if meets criteria
      if (await this.shouldAutoApprove(project)) {
        project.status = 'approved';
        project.approvalDate = new Date();
        this.emit('project:approved', { project });
      }

      runtimeLogger.info('Project submitted', {
        projectId: project.id,
        title: project.title,
        status: project.status,
      });

      return {
        success: true,
        projectId: project.id,
        errors: [],
        warnings: validation.warnings || [],
        status: project.status,
      };
    } catch (error) {
      runtimeLogger.error('Project submission failed', error, {
        projectId: project.id,
      });
      return {
        success: false,
        errors: ['Submission failed due to internal error'],
        warnings: [],
        status: 'rejected',
      };
    }
  }

  async review(
    projectId: string,
    review: ProjectReview
  ): Promise<ReviewResult> {
    try {
      const project = this.projectIndex.get(projectId);
      if (!project) {
        return {
          success: false,
          error: 'Project not found',
        };
      }

      // Set review metadata
      review.id = this.generateReviewId();
      review.date = new Date();
      review.helpful = 0;
      review.replies = [];

      // Add review to project
      project.reviews.push(review);

      // Update project ratings
      this.updateProjectRatings(project);

      // Emit event
      this.emit('project:reviewed', { project, review });

      runtimeLogger.info('Project review added', {
        projectId,
        reviewId: review.id,
        rating: review.ratings.overall,
      });

      return {
        success: true,
        reviewId: review.id,
      };
    } catch (error) {
      runtimeLogger.error('Project review failed', error, { projectId });
      return {
        success: false,
        error: 'Review failed due to internal error',
      };
    }
  }

  async feature(projectId: string): Promise<FeatureResult> {
    try {
      const project = this.projectIndex.get(projectId);
      if (!project) {
        return {
          success: false,
          featured: false,
          error: 'Project not found',
        };
      }

      // Check if project meets feature criteria
      if (!this.meetsFeatureCriteria(project)) {
        return {
          success: false,
          featured: false,
          error: 'Project does not meet feature criteria',
        };
      }

      // Feature the project
      project.featured = true;
      project.featuredDate = new Date();

      // Add to category featured list
      const category = this.categoryIndex.get(project.category.id);
      if (category && !category.featured.find((p) => p.id === project.id)) {
        category.featured.push(project);

        // Keep only top featured projects
        category.featured.sort((a, b) => b.likes - a.likes);
        category.featured = category.featured.slice(0, 5);
      }

      // Emit event
      this.emit('project:featured', { project });

      runtimeLogger.info('Project featured', {
        projectId,
        title: project.title,
        likes: project.likes,
      });

      return {
        success: true,
        featured: true,
        duration: 30, // Featured for 30 days
      };
    } catch (error) {
      runtimeLogger.error('Project featuring failed', error, { projectId });
      return {
        success: false,
        featured: false,
        error: 'Featuring failed due to internal error',
      };
    }
  }

  // ========================== PRIVATE METHODS ==========================

  private setupEventHandlers(): void {
    this.on('project:submitted', this.handleProjectSubmitted.bind(this));
    this.on('project:approved', this.handleProjectApproved.bind(this));
    this.on('project:viewed', this.handleProjectViewed.bind(this));
    this.on('project:liked', this.handleProjectLiked.bind(this));
  }

  private initializeCategories(): void {
    this.categories = COMMUNITY_CONSTANTS.SHOWCASE_CATEGORIES.map(
      (name, index) => ({
        id: `showcase_cat_${index + 1}`,
        name,
        description: `${name} projects and applications`,
        icon: this.getCategoryIcon(name),
        color: this.getCategoryColor(name),
        parent: undefined,
        subcategories: [],
        projectCount: 0,
        featured: [],
      })
    );

    // Build category index
    this.categories.forEach((category) => {
      this.categoryIndex.set(category.id, category);
    });
  }

  private getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'AI Assistants': '🤖',
      'Automation Tools': '⚙️',
      'Creative Projects': '🎨',
      'Educational Apps': '📚',
      'Enterprise Solutions': '🏢',
      'Gaming & Entertainment': '🎮',
      'Healthcare & Wellness': '🏥',
      'IoT & Hardware': '📡',
      'Research & Science': '🔬',
      'Social & Communication': '💬',
    };
    return iconMap[categoryName] || '📁';
  }

  private getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      'AI Assistants': '#3b82f6',
      'Automation Tools': '#8b5cf6',
      'Creative Projects': '#ec4899',
      'Educational Apps': '#10b981',
      'Enterprise Solutions': '#6366f1',
      'Gaming & Entertainment': '#f59e0b',
      'Healthcare & Wellness': '#ef4444',
      'IoT & Hardware': '#06b6d4',
      'Research & Science': '#84cc16',
      'Social & Communication': '#f97316',
    };
    return colorMap[categoryName] || '#6b7280';
  }

  private async loadProjects(): Promise<void> {
    // Load projects from storage
    runtimeLogger.debug('Loading existing showcase projects...');
    // Implementation would load from persistent storage
  }

  private buildIndices(): void {
    // Build search indices
    this.projects.forEach((project) => {
      this.projectIndex.set(project.id, project);
    });
  }

  private async saveState(): Promise<void> {
    // Save current state to storage
    runtimeLogger.debug('Saving showcase state...');
    // Implementation would save to persistent storage
  }

  private applyFilters(
    results: ShowcaseProject[],
    query: ShowcaseSearchQuery
  ): ShowcaseProject[] {
    let filtered = results;

    if (query.category) {
      filtered = filtered.filter((p) => p.category.name === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((p) =>
        query.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    if (query.author) {
      filtered = filtered.filter((p) => p.author.username === query.author);
    }

    if (query.complexity) {
      filtered = filtered.filter(
        (p) => p.technical.complexity === query.complexity
      );
    }

    if (query.technology) {
      filtered = filtered.filter((p) =>
        p.technical.technologies.some((tech) =>
          tech.toLowerCase().includes(query.technology!.toLowerCase())
        )
      );
    }

    if (query.rating) {
      filtered = filtered.filter((p) => p.ratings.overall >= query.rating!);
    }

    if (query.featured !== undefined) {
      filtered = filtered.filter((p) => p.featured === query.featured);
    }

    return filtered;
  }

  private sortResults(
    results: ShowcaseProject[],
    sort: string,
    order: string
  ): ShowcaseProject[] {
    const sortMultiplier = order === 'desc' ? -1 : 1;

    return results.sort((a, b) => {
      switch (sort) {
        case 'date':
          return (
            (a.submitDate.getTime() - b.submitDate.getTime()) * sortMultiplier
          );
        case 'rating':
          return (a.ratings.overall - b.ratings.overall) * sortMultiplier;
        case 'views':
          return (a.views.total - b.views.total) * sortMultiplier;
        case 'likes':
          return (a.likes - b.likes) * sortMultiplier;
        case 'relevance':
        default:
          // Relevance scoring based on likes, views, and ratings
          const scoreA =
            a.likes * 2 + a.views.total * 0.1 + a.ratings.overall * 10;
          const scoreB =
            b.likes * 2 + b.views.total * 0.1 + b.ratings.overall * 10;
          return (scoreA - scoreB) * sortMultiplier;
      }
    });
  }

  private generateFacets(results: ShowcaseProject[]): any[] {
    const categoryFacet = {
      field: 'category',
      values: Object.entries(
        results.reduce(
          (acc, project) => {
            acc[project.category.name] = (acc[project.category.name] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).map(([value, count]) => ({ value, count, selected: false })),
    };

    const complexityFacet = {
      field: 'complexity',
      values: Object.entries(
        results.reduce(
          (acc, project) => {
            acc[project.technical.complexity] =
              (acc[project.technical.complexity] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).map(([value, count]) => ({ value, count, selected: false })),
    };

    const technologyFacet = {
      field: 'technology',
      values: Object.entries(
        results.reduce(
          (acc, project) => {
            project.technical.technologies.forEach((tech) => {
              acc[tech] = (acc[tech] || 0) + 1;
            });
            return acc;
          },
          {} as Record<string, number>
        )
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([value, count]) => ({ value, count, selected: false })),
    };

    return [categoryFacet, complexityFacet, technologyFacet];
  }

  private generateSuggestions(query: string): string[] {
    if (!query || query.length < 2) return [];

    // Generate suggestions based on project titles and technologies
    const suggestions = new Set<string>();

    this.projects.forEach((project) => {
      if (project.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(project.title);
      }

      project.technical.technologies.forEach((tech) => {
        if (tech.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tech);
        }
      });

      project.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, 8);
  }

  private validateProject(project: ShowcaseProject): {
    valid: boolean;
    errors: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!project.title || project.title.trim().length === 0) {
      errors.push('Project title is required');
    }

    if (!project.description || project.description.trim().length === 0) {
      errors.push('Project description is required');
    }

    if (!project.category || !project.category.id) {
      errors.push('Project category is required');
    }

    if (!project.repository || !project.repository.url) {
      errors.push('Repository URL is required');
    }

    // Validate repository URL
    if (project.repository?.url) {
      try {
        new URL(project.repository.url);
      } catch {
        errors.push('Invalid repository URL');
      }
    }

    // Validate demo URLs
    if (project.demo?.live) {
      try {
        new URL(project.demo.live);
      } catch {
        warnings.push('Invalid live demo URL');
      }
    }

    if (project.demo?.video) {
      try {
        new URL(project.demo.video);
      } catch {
        warnings.push('Invalid video demo URL');
      }
    }

    // Check for minimum content
    if (project.description && project.description.length < 50) {
      warnings.push(
        'Project description is quite short - consider adding more details'
      );
    }

    if (!project.demo?.screenshots || project.demo.screenshots.length === 0) {
      warnings.push(
        'No screenshots provided - consider adding visual examples'
      );
    }

    if (!project.tags || project.tags.length === 0) {
      warnings.push('No tags provided - tags help with discoverability');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async shouldAutoApprove(project: ShowcaseProject): Promise<boolean> {
    // Auto-approve criteria
    const hasDemo = !!(project.demo?.live || project.demo?.video);
    const hasScreenshots = (project.demo?.screenshots?.length || 0) > 0;
    const hasGoodDescription = (project.description?.length || 0) >= 100;
    const hasTags = (project.tags?.length || 0) >= 3;

    // Check author reputation (would integrate with user system)
    const authorReputation = 100; // Placeholder
    const isVerifiedAuthor = authorReputation >= 500;

    return (
      hasDemo &&
      hasScreenshots &&
      hasGoodDescription &&
      hasTags &&
      isVerifiedAuthor
    );
  }

  private updateProjectRatings(project: ShowcaseProject): void {
    if (project.reviews.length === 0) return;

    const reviews = project.reviews;
    const total = reviews.length;

    // Calculate averages
    project.ratings = {
      overall: reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / total,
      innovation:
        reviews.reduce((sum, r) => sum + r.ratings.innovation, 0) / total,
      implementation:
        reviews.reduce((sum, r) => sum + r.ratings.implementation, 0) / total,
      documentation:
        reviews.reduce((sum, r) => sum + r.ratings.documentation, 0) / total,
      usefulness:
        reviews.reduce((sum, r) => sum + r.ratings.usefulness, 0) / total,
      total,
    };

    // Round to 1 decimal place
    Object.keys(project.ratings).forEach((key) => {
      if (key !== 'total') {
        (project.ratings as any)[key] =
          Math.round((project.ratings as any)[key] * 10) / 10;
      }
    });
  }

  private meetsFeatureCriteria(project: ShowcaseProject): boolean {
    // Feature criteria
    const minLikes =
      COMMUNITY_CONSTANTS.DEFAULT_CONFIG.SHOWCASE.AUTO_FEATURE_THRESHOLD;
    const minRating = 4.0;
    const hasDemo = !!(project.demo?.live || project.demo?.video);
    const isApproved = project.status === 'approved';

    return (
      project.likes >= minLikes &&
      project.ratings.overall >= minRating &&
      hasDemo &&
      isApproved
    );
  }

  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async handleProjectSubmitted(event: {
    project: ShowcaseProject;
  }): Promise<void> {
    const { project } = event;
    runtimeLogger.info('Project submitted for review', {
      projectId: project.id,
      title: project.title,
    });
  }

  private async handleProjectApproved(event: {
    project: ShowcaseProject;
  }): Promise<void> {
    const { project } = event;
    runtimeLogger.info('Project approved', {
      projectId: project.id,
      title: project.title,
    });
  }

  private async handleProjectViewed(event: {
    project: ShowcaseProject;
    userId?: string;
  }): Promise<void> {
    const { project } = event;

    // Update view statistics
    project.views.total++;
    project.views.daily++;

    // Add to view history
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayEntry = project.views.history.find(
      (h) => h.date.getTime() === today.getTime()
    );

    if (!todayEntry) {
      todayEntry = { date: today, views: 0, unique: 0 };
      project.views.history.push(todayEntry);
    }

    todayEntry.views++;
  }

  private async handleProjectLiked(event: {
    project: ShowcaseProject;
    userId: string;
  }): Promise<void> {
    const { project } = event;
    project.likes++;

    // Check if project should be featured
    if (this.meetsFeatureCriteria(project) && !project.featured) {
      await this.feature(project.id);
    }
  }
}

/**
 * Factory function to create a showcase gallery
 */
export function createShowcaseGallery(): ShowcaseGallery {
  return new ShowcaseGalleryImpl();
}

export default ShowcaseGalleryImpl;
