/**
 * SYMindX CLI Library Exports
 * 
 * Consolidated exports for all CLI components, hooks, and services
 */

// Services
export { RuntimeClient, createRuntimeClient, runtimeClient } from '../services/runtimeClient.js';
export { 
  EnhancedRuntimeClient, 
  createEnhancedRuntimeClient, 
  enhancedRuntimeClient 
} from '../services/enhancedRuntimeClient.js';
export type { 
  RuntimeClientConfig,
  AgentInfo,
  SystemMetrics,
  RuntimeStatus,
  RuntimeCapabilities,
  ActivityEvent
} from '../services/runtimeClient.js';
export type {
  ConnectionStatus,
  EnhancedClientConfig,
  RequestMetrics,
  CacheEntry,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RequestConfig
} from '../services/enhancedRuntimeClient.js';

// UI Components
export { 
  LoadingIndicator, 
  ProgressBar, 
  Skeleton, 
  Shimmer 
} from '../components/ui/LoadingStates.js';
export { 
  ErrorBoundary, 
  ErrorFallback, 
  NetworkErrorFallback, 
  TimeoutErrorFallback,
  useErrorHandler 
} from '../components/ui/ErrorBoundary.js';
export { 
  ConnectionStatus as ConnectionStatusComponent, 
  ConnectionHealth, 
  ConnectionBadge,
  AutoReconnectIndicator,
  ConnectionTimeline 
} from '../components/ui/ConnectionStatus.js';

// Hooks
export { 
  useAPIData,
  useAgentData,
  useSystemMetrics,
  useRuntimeStatus,
  useRuntimeCapabilities,
  useRecentEvents,
  useAgentDetail,
  useAgentControl,
  useAgentChat,
  useSmartPolling
} from '../hooks/useAPIData.js';
export type { 
  UseAPIDataOptions, 
  UseAPIDataResult 
} from '../hooks/useAPIData.js';

export { 
  useConnectionMonitor,
  useConnectionNotifications,
  useNetworkQuality
} from '../hooks/useConnectionMonitor.js';
export type { 
  ConnectionEvent,
  ConnectionStats,
  UseConnectionMonitorOptions,
  UseConnectionMonitorResult 
} from '../hooks/useConnectionMonitor.js';

export { 
  useNavigation,
  createNavigationItem,
  getNavigationPath
} from '../hooks/useNavigation.js';
export type { 
  NavigationItem,
  NavigationState,
  NavigationHookOptions 
} from '../hooks/useNavigation.js';

export { 
  useTerminalDimensions,
  getAdaptiveDimensions
} from '../hooks/useTerminalDimensions.js';
export type { 
  TerminalDimensions,
  TerminalBreakpoints,
  TerminalOrientation,
  TerminalResponsive 
} from '../hooks/useTerminalDimensions.js';

export {
  RuntimeClientProvider,
  useRuntimeClient,
  useRuntimeClientConfig,
  useRuntimeClientMetrics,
  useRuntimeClientCache
} from '../hooks/useRuntimeClient.js';

// Utilities
export {
  calculateGridConfig,
  calculateGridItemDimensions,
  getResponsiveValue,
  getResponsiveSpacing,
  getResponsiveFontSize,
  shouldShowElement,
  truncateText,
  getResponsiveLayout,
  GRID_BREAKPOINTS
} from '../utils/responsive-grid.js';
export type {
  GridConfig,
  GridItem,
  ResponsiveGridOptions
} from '../utils/responsive-grid.js';

// View Components
export { EnhancedDashboard } from '../components/views/EnhancedDashboard.js';

// Example Components (for documentation/testing)
export {
  AgentCardWithLoading,
  ListWithShimmer,
  FileUploadProgress,
  MultiStateLoading,
  ErrorBoundaryExample,
  NetworkErrorExample,
  DashboardSkeleton,
  LoadingVariantsShowcase
} from '../components/examples/LoadingStateExamples.js';
