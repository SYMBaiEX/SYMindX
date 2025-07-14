import { useInput } from 'ink';
import { useState, useCallback } from 'react';

import { soundManager, SoundType } from '../utils/sound-effects.js';

export interface NavigationItem {
  id: string;
  label: string;
  parentId?: string;
  data?: any;
}

export interface NavigationState {
  currentItem: NavigationItem;
  history: NavigationItem[];
  canGoBack: boolean;
  breadcrumbs: NavigationItem[];
}

export interface NavigationHookOptions {
  initialItem: NavigationItem;
  onNavigate?: (item: NavigationItem) => void;
  onBack?: () => void;
  enableKeyboardShortcuts?: boolean;
  soundEnabled?: boolean;
}

export const useNavigation = (options?: Partial<NavigationHookOptions>) => {
  const defaultItem: NavigationItem = {
    id: 'dashboard',
    label: 'Dashboard',
  };

  const {
    initialItem = defaultItem,
    onNavigate,
    onBack,
    enableKeyboardShortcuts = true,
    soundEnabled = true,
  } = options || {};

  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentItem: initialItem,
    history: [],
    canGoBack: false,
    breadcrumbs: [initialItem],
  });

  const navigateTo = useCallback(
    (item: NavigationItem) => {
      setNavigationState((prev) => {
        const newHistory = [...prev.history, prev.currentItem];
        const breadcrumbs = buildBreadcrumbs(item, newHistory);

        const newState = {
          currentItem: item,
          history: newHistory,
          canGoBack: newHistory.length > 0,
          breadcrumbs,
        };

        if (soundEnabled) {
          soundManager.play(SoundType.NAVIGATE);
        }

        onNavigate?.(item);
        return newState;
      });
    },
    [onNavigate, soundEnabled]
  );

  const goBack = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.history.length === 0) return prev;

      const newHistory = [...prev.history];
      const previousItem = newHistory.pop()!;

      const breadcrumbs = buildBreadcrumbs(previousItem, newHistory);

      const newState = {
        currentItem: previousItem,
        history: newHistory,
        canGoBack: newHistory.length > 0,
        breadcrumbs,
      };

      if (soundEnabled) {
        soundManager.play(SoundType.NAVIGATE);
      }

      onBack?.();
      return newState;
    });
  }, [onBack, soundEnabled]);

  const goToRoot = useCallback(() => {
    setNavigationState((prev) => {
      const rootItem = prev.history[0] || prev.currentItem;

      const newState = {
        currentItem: rootItem,
        history: [],
        canGoBack: false,
        breadcrumbs: [rootItem],
      };

      if (soundEnabled) {
        soundManager.play(SoundType.NAVIGATE);
      }

      onNavigate?.(rootItem);
      return newState;
    });
  }, [onNavigate, soundEnabled]);

  const navigateToIndex = useCallback(
    (index: number) => {
      setNavigationState((prev) => {
        if (index < 0 || index >= prev.history.length + 1) return prev;

        let targetItem: NavigationItem;
        let newHistory: NavigationItem[];

        if (index === prev.history.length) {
          // Current item
          return prev;
        } else if (index === 0) {
          // Root item
          targetItem = prev.history[0] || prev.currentItem;
          newHistory = [];
        } else {
          // Historical item
          targetItem = prev.history[index - 1] || prev.currentItem;
          newHistory = prev.history.slice(0, index - 1);
        }

        const breadcrumbs = buildBreadcrumbs(targetItem, newHistory);

        const newState = {
          currentItem: targetItem,
          history: newHistory,
          canGoBack: newHistory.length > 0,
          breadcrumbs,
        };

        if (soundEnabled) {
          soundManager.play(SoundType.NAVIGATE);
        }

        onNavigate?.(targetItem);
        return newState;
      });
    },
    [onNavigate, soundEnabled]
  );

  const reset = useCallback(
    (item?: NavigationItem) => {
      const resetItem = item || initialItem;
      setNavigationState({
        currentItem: resetItem,
        history: [],
        canGoBack: false,
        breadcrumbs: [resetItem],
      });
    },
    [initialItem]
  );

  // Keyboard navigation
  if (enableKeyboardShortcuts) {
    useInput((input, key) => {
      if (key.escape && navigationState.canGoBack) {
        goBack();
      } else if (key.ctrl && input === 'r') {
        goToRoot();
      } else if (key.ctrl && input === 'h') {
        // Toggle help - can be handled by parent component
      }
    });
  }

  // Convenience method for navigating with just a route and metadata
  const navigate = useCallback(
    (route: string, metadata?: any) => {
      const item: NavigationItem = {
        id: route,
        label:
          metadata?.title || route.charAt(0).toUpperCase() + route.slice(1),
        data: metadata,
      };
      navigateTo(item);
    },
    [navigateTo]
  );

  return {
    ...navigationState,
    navigateTo,
    navigate,
    goBack,
    goToRoot,
    navigateToIndex,
    reset,
    getBreadcrumbs: () => navigationState.breadcrumbs,
  };
};

// Helper function to build breadcrumbs
function buildBreadcrumbs(
  currentItem: NavigationItem,
  history: NavigationItem[]
): NavigationItem[] {
  const breadcrumbs: NavigationItem[] = [];

  // Add history items
  history.forEach((item) => {
    breadcrumbs.push(item);
  });

  // Add current item
  breadcrumbs.push(currentItem);

  return breadcrumbs;
}

// Navigation utilities
export const createNavigationItem = (
  id: string,
  label: string,
  parentId?: string,
  data?: any
): NavigationItem => ({
  id,
  label,
  ...(parentId && { parentId }),
  ...(data && { data }),
});

export const getNavigationPath = (
  item: NavigationItem,
  allItems: NavigationItem[]
): NavigationItem[] => {
  const path: NavigationItem[] = [item];
  let current = item;

  while (current.parentId) {
    const parent = allItems.find((i) => i.id === current.parentId);
    if (parent) {
      path.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }

  return path;
};
