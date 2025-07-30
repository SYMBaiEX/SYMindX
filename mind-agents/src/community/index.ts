/**
 * SYMindX Community Ecosystem
 *
 * Complete developer community platform with plugin marketplace,
 * showcase gallery, certification program, community tools,
 * and contribution systems.
 */

export * from './community-service';
export * from './marketplace';
export * from './showcase';
export * from './certification';
export * from './tools';
export * from './contributions';
export * from './analytics';
export * from './governance';
export * from './recognition';

// Export types
export type * from '../types/community';

// Export factory functions
export { createCommunityService } from './community-service';
export { createPluginMarketplace } from './marketplace';
export { createShowcaseGallery } from './showcase';
export { createCertificationProgram } from './certification';
export { createCommunityTools } from './tools';
export { createContributionSystem } from './contributions';

// Export utilities
export * from './utils';
export * from './constants';
