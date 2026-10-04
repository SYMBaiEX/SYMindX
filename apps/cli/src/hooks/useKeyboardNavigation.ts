import { useInput, Key } from 'ink';
import { useState, useCallback } from 'react';

import { soundManager, SoundType } from '../utils/sound-effects';

export interface NavigationConfig {
  views: string[];
  onViewChange: (view: string) => void;
  onExit?: () => void;
  soundEnabled?: boolean;
}

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardNavigation = (config: NavigationConfig) => {
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [commandMode, setCommandMode] = useState(false);
  const [commandBuffer, setCommandBuffer] = useState('');

  const { views, onViewChange, onExit, soundEnabled = true } = config;

  // Play navigation sound
  const playNavSound = useCallback(() => {
    if (soundEnabled) {
      soundManager.play(SoundType.NAVIGATION);
    }
  }, [soundEnabled]);

  // Key bindings
  const keyBindings: KeyBinding[] = [
    // Function keys for direct navigation
    { key: 'f1', action: () => navigateToView(0), description: 'Dashboard' },
    { key: 'f2', action: () => navigateToView(1), description: 'Agents' },
    { key: 'f3', action: () => navigateToView(2), description: 'Chat' },
    { key: 'f4', action: () => navigateToView(3), description: 'Logs' },
    { key: 'f5', action: () => navigateToView(4), description: 'Settings' },

    // Navigation keys
    { key: 'tab', action: () => navigateNext(), description: 'Next view' },
    {
      key: 'tab',
      shift: true,
      action: () => navigatePrev(),
      description: 'Previous view',
    },

    // Quick keys
    { key: 'd', action: () => navigateToView(0), description: 'Dashboard' },
    { key: 'a', action: () => navigateToView(1), description: 'Agents' },
    { key: 'c', action: () => navigateToView(2), description: 'Chat' },
    { key: 'l', action: () => navigateToView(3), description: 'Logs' },
    { key: 's', action: () => navigateToView(4), description: 'Settings' },

    // Command mode
    { key: ':', action: () => enterCommandMode(), description: 'Command mode' },
    { key: '/', action: () => enterSearchMode(), description: 'Search mode' },

    // Help and exit
    { key: 'h', action: () => toggleHelp(), description: 'Toggle help' },
    { key: '?', action: () => toggleHelp(), description: 'Toggle help' },
    { key: 'q', action: () => handleExit(), description: 'Quit' },
    { key: 'c', ctrl: true, action: () => handleExit(), description: 'Quit' },

    // Sound toggle
    { key: 'm', action: () => toggleSound(), description: 'Toggle sound' },
  ];

  // Navigation functions
  const navigateToView = useCallback(
    (index: number) => {
      if (index >= 0 && index < views.length) {
        const view = views[index];
        if (view) {
          setCurrentViewIndex(index);
          onViewChange(view);
          playNavSound();
        }
      }
    },
    [views, onViewChange, playNavSound]
  );

  const navigateNext = useCallback(() => {
    const nextIndex = (currentViewIndex + 1) % views.length;
    navigateToView(nextIndex);
  }, [currentViewIndex, views.length, navigateToView]);

  const navigatePrev = useCallback(() => {
    const prevIndex =
      currentViewIndex === 0 ? views.length - 1 : currentViewIndex - 1;
    navigateToView(prevIndex);
  }, [currentViewIndex, views.length, navigateToView]);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
    if (soundEnabled) {
      soundManager.play(SoundType.NOTIFICATION);
    }
  }, [soundEnabled]);

  const enterCommandMode = useCallback(() => {
    setCommandMode(true);
    setCommandBuffer('');
    if (soundEnabled) {
      soundManager.play(SoundType.KEYPRESS);
    }
  }, [soundEnabled]);

  const enterSearchMode = useCallback(() => {
    setCommandMode(true);
    setCommandBuffer('/');
    if (soundEnabled) {
      soundManager.play(SoundType.KEYPRESS);
    }
  }, [soundEnabled]);

  const handleExit = useCallback(() => {
    if (soundEnabled) {
      soundManager.play(SoundType.SHUTDOWN);
    }
    setTimeout(() => {
      onExit?.();
      process.exit(0);
    }, 500);
  }, [onExit, soundEnabled]);

  const toggleSound = useCallback(() => {
    soundManager.toggle();
    if (soundManager.isEnabled()) {
      soundManager.play(SoundType.SUCCESS);
    }
  }, []);

  // Execute command
  const executeCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase().trim();

      // Navigation commands
      if (cmd === 'dashboard' || cmd === 'd') navigateToView(0);
      else if (cmd === 'agents' || cmd === 'a') navigateToView(1);
      else if (cmd === 'chat' || cmd === 'c') navigateToView(2);
      else if (cmd === 'logs' || cmd === 'l') navigateToView(3);
      else if (cmd === 'settings' || cmd === 's') navigateToView(4);
      else if (cmd === 'help' || cmd === 'h') toggleHelp();
      else if (cmd === 'quit' || cmd === 'q') handleExit();
      else if (cmd === 'sound on') soundManager.toggle();
      else if (cmd === 'sound off') soundManager.toggle();
      else {
        // Unknown command
        if (soundEnabled) {
          soundManager.play(SoundType.ERROR);
        }
      }

      setCommandMode(false);
      setCommandBuffer('');
    },
    [navigateToView, toggleHelp, handleExit, soundEnabled]
  );

  // Input handler
  useInput((input: string, key: Key) => {
    // Command mode input
    if (commandMode) {
      if (key.return) {
        executeCommand(commandBuffer);
      } else if (key.escape) {
        setCommandMode(false);
        setCommandBuffer('');
      } else if (key.backspace || key.delete) {
        setCommandBuffer((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setCommandBuffer((prev) => prev + input);
        if (soundEnabled) {
          soundManager.play(SoundType.KEYPRESS);
        }
      }
      return;
    }

    // Normal mode - check key bindings
    const binding = keyBindings.find((kb) => {
      if (kb.key === 'tab' && key.tab) {
        return kb.shift ? key.shift : !key.shift;
      }

      if (kb.key.startsWith('f') && key[kb.key as keyof Key]) {
        return true;
      }

      if (kb.ctrl && !key.ctrl) return false;
      if (kb.shift && !key.shift) return false;
      if (kb.alt && !key.meta) return false;

      return kb.key === input;
    });

    if (binding) {
      binding.action();
    }
  });

  return {
    currentView: views[currentViewIndex],
    currentViewIndex,
    showHelp,
    commandMode,
    commandBuffer,
    keyBindings,
    navigateToView,
    navigateNext,
    navigatePrev,
    toggleHelp,
    executeCommand,
  };
};
