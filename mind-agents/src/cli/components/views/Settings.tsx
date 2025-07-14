import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { musicManager } from '../../utils/background-music.js';
import { soundManager } from '../../utils/sound-effects.js';
import { GlitchText } from '../effects/GlitchText.js';
import { Card3D } from '../ui/Card3D.js';

interface SettingItem {
  id: string;
  label: string;
  value: string | boolean | number;
  type: 'toggle' | 'select' | 'range';
  options?: string[];
  min?: number;
  max?: number;
}

export const Settings: React.FC = (): React.ReactElement => {
  const [selectedCategory] = useState('general');
  const [selectedSetting] = useState(0);

  const categories = {
    general: {
      title: 'GENERAL',
      settings: [
        {
          id: 'theme',
          label: 'Theme',
          value: 'cyberpunk',
          type: 'select',
          options: ['cyberpunk', 'matrix', 'neon', 'minimal'],
        },
        { id: 'animations', label: 'Animations', value: true, type: 'toggle' },
        {
          id: 'glitchEffects',
          label: 'Glitch Effects',
          value: true,
          type: 'toggle',
        },
        { id: 'matrixRain', label: 'Matrix Rain', value: true, type: 'toggle' },
      ] as SettingItem[],
    },
    audio: {
      title: 'AUDIO',
      settings: [
        {
          id: 'soundEffects',
          label: 'Sound Effects',
          value: soundManager.isEnabled(),
          type: 'toggle',
        },
        {
          id: 'backgroundMusic',
          label: 'Background Music',
          value: musicManager.isEnabled(),
          type: 'toggle',
        },
        {
          id: 'volume',
          label: 'Volume',
          value: 70,
          type: 'range',
          min: 0,
          max: 100,
        },
        {
          id: 'musicTrack',
          label: 'Music Track',
          value: 'digitalNative',
          type: 'select',
          options: ['digitalNative', 'searching', 'underclocked'],
        },
      ] as SettingItem[],
    },
    performance: {
      title: 'PERFORMANCE',
      settings: [
        {
          id: 'refreshRate',
          label: 'Refresh Rate',
          value: 60,
          type: 'range',
          min: 30,
          max: 120,
        },
        { id: 'dataCache', label: 'Data Caching', value: true, type: 'toggle' },
        {
          id: 'logRetention',
          label: 'Log Retention (days)',
          value: 7,
          type: 'range',
          min: 1,
          max: 30,
        },
        { id: 'autoSave', label: 'Auto Save', value: true, type: 'toggle' },
      ] as SettingItem[],
    },
    network: {
      title: 'NETWORK',
      settings: [
        {
          id: 'apiUrl',
          label: 'API URL',
          value: 'http://localhost:8000',
          type: 'select',
          options: ['http://localhost:8000'],
        },
        {
          id: 'wsUrl',
          label: 'WebSocket URL',
          value: 'ws://localhost:8000/ws',
          type: 'select',
          options: ['ws://localhost:8000/ws'],
        },
        {
          id: 'timeout',
          label: 'Timeout (ms)',
          value: 5000,
          type: 'range',
          min: 1000,
          max: 30000,
        },
        {
          id: 'retryAttempts',
          label: 'Retry Attempts',
          value: 3,
          type: 'range',
          min: 0,
          max: 10,
        },
      ] as SettingItem[],
    },
  };

  const currentSettings =
    categories[selectedCategory as keyof typeof categories].settings;

  const renderSettingValue = (setting: SettingItem): React.ReactElement => {
    switch (setting.type) {
      case 'toggle':
        return (
          <Text
            color={
              setting.value
                ? cyberpunkTheme.colors.success
                : cyberpunkTheme.colors.danger
            }
          >
            {setting.value ? 'ON' : 'OFF'}
          </Text>
        );
      case 'select':
        return (
          <Text color={cyberpunkTheme.colors.primary}>{setting.value}</Text>
        );
      case 'range': {
        const percentage =
          setting.max && setting.min
            ? (((setting.value as number) - setting.min) /
                (setting.max - setting.min)) *
              100
            : 0;
        return (
          <Box gap={1}>
            <Text color={cyberpunkTheme.colors.warning}>
              [
              {cyberpunkTheme.ascii.progressFull.repeat(
                Math.floor(percentage / 10)
              )}
              {cyberpunkTheme.ascii.progressEmpty.repeat(
                10 - Math.floor(percentage / 10)
              )}
              ]
            </Text>
            <Text color={cyberpunkTheme.colors.text}>{setting.value}</Text>
          </Box>
        );
      }
      default:
        return (
          <Text color={cyberpunkTheme.colors.text}>{setting.value}</Text>
        );
    }
  };

  return (
    <Box flexDirection='column' padding={1} height='100%'>
      {/* Header */}
      <Box marginBottom={1}>
        <GlitchText
          intensity={0.1}
          frequency={3000}
          color={cyberpunkTheme.colors.accent}
          bold
        >
          SYSTEM CONFIGURATION
        </GlitchText>
      </Box>

      <Box flexDirection='row' gap={2} flexGrow={1}>
        {/* Categories */}
        <Box width='25%'>
          <Card3D
            title='CATEGORIES'
            width={25}
            height={20}
            color={cyberpunkTheme.colors.primary}
          >
            <Box flexDirection='column' gap={1}>
              {Object.entries(categories).map(([key, category]) => (
                <Box key={key} paddingY={1} paddingX={1}>
                  <Text
                    color={
                      selectedCategory === key
                        ? cyberpunkTheme.colors.accent
                        : cyberpunkTheme.colors.text
                    }
                    bold={selectedCategory === key}
                  >
                    {selectedCategory === key ? '▶' : ' '} {category.title}
                  </Text>
                </Box>
              ))}
            </Box>
          </Card3D>
        </Box>

        {/* Settings */}
        <Box flexGrow={1}>
          <Card3D
            title={
              categories[selectedCategory as keyof typeof categories].title +
              ' SETTINGS'
            }
            width={70}
            height={20}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection='column' gap={2}>
              {currentSettings.map((setting, index) => (
                <Box key={setting.id} flexDirection='column' gap={1}>
                  <Box justifyContent='space-between'>
                    <Box gap={1}>
                      {selectedSetting === index && (
                        <Text color={cyberpunkTheme.colors.accent}>▶</Text>
                      )}
                      <Text
                        color={
                          selectedSetting === index
                            ? cyberpunkTheme.colors.accent
                            : cyberpunkTheme.colors.text
                        }
                        bold={selectedSetting === index}
                      >
                        {setting.label}
                      </Text>
                    </Box>
                    <Box>{renderSettingValue(setting)}</Box>
                  </Box>

                  {/* Options for select type */}
                  {setting.type === 'select' && selectedSetting === index && (
                    <Box marginLeft={3}>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Options: {setting.options?.join(', ')}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Card3D>

          {/* Info Panel */}
          <Box marginTop={1}>
            <Card3D
              title='INFORMATION'
              width={70}
              height={7}
              color={cyberpunkTheme.colors.matrix}
            >
              <Box flexDirection='column'>
                <Text color={cyberpunkTheme.colors.text}>
                  {currentSettings[selectedSetting]?.label ||
                    'Select a setting'}
                </Text>
                <Box marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Use [↑↓] to navigate, [←→] to change values, [Enter] to
                    toggle
                  </Text>
                </Box>
              </Box>
            </Card3D>
          </Box>
        </Box>
      </Box>

      {/* Controls */}
      <Box marginTop={1} gap={3}>
        <Text color={cyberpunkTheme.colors.textDim}>
          [S] Save | [R] Reset | [D] Defaults | [E] Export | [I] Import
        </Text>
      </Box>
    </Box>
  );
};
