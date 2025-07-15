/**
 * @module cli/components
 * @description CLI Component Types - Defines types for various UI components used in the CLI
 * 
 * This module provides type definitions for:
 * - Chart and visualization components
 * - Dashboard components and data structures
 * - Status monitoring components
 * - Particle effects and animations
 * - Loading states and UI feedback
 */

import type { ReactNode } from 'react';
import type React from 'react';

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  /** Unique identifier for the data point */
  id: string;
  /** Label for the data point */
  label: string;
  /** Numeric value */
  value: number;
  /** Optional timestamp */
  timestamp?: Date;
  /** Optional color override */
  color?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * System status metrics
 */
export interface SystemStatusMetrics {
  /** CPU usage percentage (0-100) */
  cpuUsage: number;
  /** Memory usage in bytes */
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  /** Active agent count */
  activeAgents: number;
  /** Total agent count */
  totalAgents: number;
  /** Network status */
  networkStatus: 'online' | 'offline' | 'connecting';
  /** System uptime in milliseconds */
  uptime: number;
  /** Current system load */
  systemLoad: number[];
  /** Event processing rate */
  eventRate: {
    current: number;
    average: number;
    peak: number;
  };
  /** API status for each portal */
  portalStatus: Record<string, {
    status: 'connected' | 'disconnected' | 'error';
    latency?: number;
    lastError?: string;
  }>;
}

/**
 * Loading state enumeration
 */
export enum LoadingState {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
  Cancelled = 'cancelled'
}

/**
 * Loading state configuration
 */
export interface LoadingStateConfig {
  /** Current loading state */
  state: LoadingState;
  /** Loading message */
  message?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Error details if in error state */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Whether to show progress bar */
  showProgress?: boolean;
  /** Whether the operation can be cancelled */
  cancellable?: boolean;
  /** Callback when cancel is requested */
  onCancel?: () => void;
}

/**
 * Responsive grid configuration
 */
export interface ResponsiveGridConfig {
  /** Number of columns at different breakpoints */
  columns: {
    xs?: number;  // < 640px
    sm?: number;  // >= 640px
    md?: number;  // >= 768px
    lg?: number;  // >= 1024px
    xl?: number;  // >= 1280px
  };
  /** Gap between grid items */
  gap?: number | {
    x?: number;
    y?: number;
  };
  /** Padding around the grid */
  padding?: number | {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Alignment of grid items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justification of grid items */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
}

/**
 * Navigation state interface
 */
export interface NavigationState {
  /** Current active route */
  currentRoute: string;
  /** Navigation history */
  history: string[];
  /** Current history index */
  historyIndex: number;
  /** Route parameters */
  params: Record<string, string>;
  /** Query parameters */
  query: Record<string, string>;
  /** Whether navigation is in progress */
  isNavigating: boolean;
  /** Breadcrumb trail */
  breadcrumbs: Array<{
    label: string;
    path: string;
    isActive: boolean;
  }>;
}

/**
 * Event handler types for CLI components
 */
export type ClickEventHandler = (event: React.MouseEvent) => void;
export type KeyEventHandler = (event: React.KeyboardEvent) => void;
export type FocusEventHandler = (event: React.FocusEvent) => void;
export type ChangeEventHandler<T = string> = (value: T) => void;
export type SubmitEventHandler = (data: Record<string, unknown>) => void | Promise<void>;
export type SelectEventHandler = (selected: string | number) => void;
export type ToggleEventHandler = (enabled: boolean) => void;
export type InputEventHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type TextAreaEventHandler = (event: React.ChangeEvent<HTMLTextAreaElement>) => void;

/**
 * Card component properties
 */
export interface CardProps {
  /** Card title */
  title?: string;
  /** Card content */
  children: ReactNode;
  /** Whether the card is interactive */
  interactive?: boolean;
  /** Click handler if interactive */
  onClick?: ClickEventHandler;
  /** Custom CSS classes */
  className?: string;
  /** Elevation level (0-5) */
  elevation?: number;
  /** Whether to show border */
  bordered?: boolean;
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  /** Type of chart */
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'scatter';
  /** Chart data */
  data: ChartDataPoint[];
  /** Chart dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Whether to show legend */
  showLegend?: boolean;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Custom color palette */
  colors?: string[];
  /** Axis configuration */
  axes?: {
    x?: {
      label?: string;
      format?: (value: unknown) => string;
    };
    y?: {
      label?: string;
      format?: (value: number) => string;
      min?: number;
      max?: number;
    };
  };
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that was caught */
  error?: Error;
  /** Error info from React */
  errorInfo?: {
    componentStack: string;
  };
  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Connection status configuration
 */
export interface ConnectionStatusConfig {
  /** Current connection state */
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  /** Connection latency in milliseconds */
  latency?: number;
  /** Last successful connection timestamp */
  lastConnected?: Date;
  /** Error message if in error state */
  errorMessage?: string;
  /** Retry configuration */
  retry?: {
    attempts: number;
    maxAttempts: number;
    nextRetryIn: number;
  };
}

/**
 * Command palette item
 */
export interface CommandPaletteItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Category for grouping */
  category?: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Icon name or component */
  icon?: string | ReactNode;
  /** Action to perform when selected */
  action: () => void | Promise<void>;
  /** Whether the item is currently available */
  enabled?: boolean;
  /** Search keywords */
  keywords?: string[];
}

/**
 * Help overlay section
 */
export interface HelpSection {
  /** Section title */
  title: string;
  /** Section items */
  items: Array<{
    /** Keyboard shortcut or command */
    key: string;
    /** Description of what it does */
    description: string;
    /** Optional category */
    category?: string;
  }>;
}

/**
 * Header configuration
 */
export interface HeaderConfig {
  /** Application title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Logo component or path */
  logo?: ReactNode | string;
  /** Navigation items */
  navigation?: Array<{
    label: string;
    path: string;
    isActive?: boolean;
  }>;
  /** User menu configuration */
  userMenu?: {
    username?: string;
    avatar?: string;
    items: Array<{
      label: string;
      action: () => void;
      icon?: string;
      divider?: boolean;
    }>;
  };
}

/**
 * Responsive box breakpoints
 */
export interface ResponsiveBoxBreakpoints {
  /** Extra small devices */
  xs?: boolean;
  /** Small devices */
  sm?: boolean;
  /** Medium devices */
  md?: boolean;
  /** Large devices */
  lg?: boolean;
  /** Extra large devices */
  xl?: boolean;
}

/**
 * Settings panel configuration
 */
export interface SettingsPanelConfig {
  /** Settings sections */
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    settings: Array<{
      id: string;
      label: string;
      type: 'toggle' | 'select' | 'input' | 'slider' | 'color';
      value: unknown;
      onChange: ChangeEventHandler<unknown>;
      options?: Array<{
        label: string;
        value: string | number;
      }>;
      min?: number;
      max?: number;
      step?: number;
      placeholder?: string;
    }>;
  }>;
  /** Save handler */
  onSave?: (settings: Record<string, unknown>) => void | Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
  /** Whether settings have been modified */
  isDirty?: boolean;
}

/**
 * Agent list item
 */
export interface AgentListItem {
  /** Unique agent ID */
  id: string;
  /** Agent name */
  name: string;
  /** Agent status */
  status: 'active' | 'inactive' | 'error' | 'initializing';
  /** Agent type/role */
  type: string;
  /** Last activity timestamp */
  lastActivity?: Date;
  /** Performance metrics */
  metrics?: {
    messageCount: number;
    responseTime: number;
    successRate: number;
  };
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chat message
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message content */
  content: string;
  /** Message sender */
  sender: {
    id: string;
    name: string;
    type: 'user' | 'agent' | 'system';
    avatar?: string;
  };
  /** Message timestamp */
  timestamp: Date;
  /** Message status */
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  /** Reply to another message */
  replyTo?: string;
  /** Message attachments */
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
  /** Message reactions */
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  /** Unique widget ID */
  id: string;
  /** Widget type */
  type: 'chart' | 'metric' | 'list' | 'custom';
  /** Widget title */
  title: string;
  /** Grid position */
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** Widget-specific configuration */
  config: Record<string, unknown>;
  /** Refresh interval in seconds */
  refreshInterval?: number;
  /** Whether the widget can be removed */
  removable?: boolean;
  /** Whether the widget can be resized */
  resizable?: boolean;
}