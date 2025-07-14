import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { GlitchText } from '../effects/GlitchText.js';
import { Card3D } from '../ui/Card3D.js';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug' | 'success';
  source: string;
  message: string;
}

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, _setFilter] = useState<'all' | 'info' | 'warning' | 'error'>(
    'all'
  );
  const [autoScroll, _setAutoScroll] = useState(true);

  // Generate mock logs
  useEffect(() => {
    const sources = [
      'runtime',
      'agent:nyx',
      'agent:aria',
      'portal:groq',
      'extension:api',
      'memory:sqlite',
    ];
    const messages = [
      'System initialized successfully',
      'Agent started processing request',
      'Memory cache cleared',
      'Portal connection established',
      'WebSocket client connected',
      'Database query executed',
      'Extension loaded',
      'Configuration updated',
      'Health check passed',
      'Metrics collected',
    ];

    const generateLog = (): LogEntry => {
      const levels: LogEntry['level'][] = [
        'info',
        'warning',
        'error',
        'debug',
        'success',
      ];
      const weights = [0.4, 0.2, 0.1, 0.2, 0.1];

      let random = Math.random();
      let level: LogEntry['level'] = 'info';
      for (let i = 0; i < levels.length; i++) {
        random -= weights[i] ?? 0;
        if (random <= 0) {
          level = levels[i] ?? 'info';
          break;
        }
      }

      return {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
        level: level ?? 'info',
        source: sources[Math.floor(Math.random() * sources.length)] ?? 'system',
        message:
          messages[Math.floor(Math.random() * messages.length)] ?? 'No message',
      };
    };

    // Initial logs
    const initialLogs = Array.from({ length: 10 }, generateLog);
    setLogs(initialLogs);

    // Add new logs periodically
    const interval = setInterval(
      () => {
        if (autoScroll) {
          setLogs((prev) => [...prev.slice(-50), generateLog()]);
        }
      },
      2000 + Math.random() * 3000
    );

    return () => clearInterval(interval);
  }, [autoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return cyberpunkTheme.colors.primary;
      case 'warning':
        return cyberpunkTheme.colors.warning;
      case 'error':
        return cyberpunkTheme.colors.danger;
      case 'debug':
        return cyberpunkTheme.colors.textDim;
      case 'success':
        return cyberpunkTheme.colors.success;
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      case 'debug':
        return '⚙';
      case 'success':
        return '✓';
    }
  };

  const filteredLogs =
    filter === 'all' ? logs : logs.filter((log) => log.level === filter);

  return (
    <Box flexDirection='column' padding={1} height='100%'>
      {/* Header */}
      <Box marginBottom={1} justifyContent='space-between'>
        <GlitchText
          intensity={0.1}
          frequency={3000}
          color={cyberpunkTheme.colors.accent}
          bold
        >
          SYSTEM LOGS
        </GlitchText>
        <Box gap={2}>
          <Text color={cyberpunkTheme.colors.textDim}>
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Text>
          <Text color={cyberpunkTheme.colors.textDim}>
            Filter: {filter.toUpperCase()}
          </Text>
        </Box>
      </Box>

      <Box flexDirection='row' gap={2} flexGrow={1}>
        {/* Log Stats */}
        <Box flexDirection='column' width='25%'>
          <Card3D
            title='LOG STATISTICS'
            width={25}
            height={15}
            color={cyberpunkTheme.colors.primary}
          >
            <Box flexDirection='column' gap={1}>
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Total: </Text>
                <Text color={cyberpunkTheme.colors.text} bold>
                  {logs.length}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.primary}>ℹ Info: </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {logs.filter((l) => l.level === 'info').length}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.warning}>⚠ Warning: </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {logs.filter((l) => l.level === 'warning').length}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.danger}>✗ Error: </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {logs.filter((l) => l.level === 'error').length}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.success}>✓ Success: </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {logs.filter((l) => l.level === 'success').length}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>⚙ Debug: </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {logs.filter((l) => l.level === 'debug').length}
                </Text>
              </Box>
            </Box>
          </Card3D>

          {/* Sources */}
          <Box marginTop={1}>
            <Card3D
              title='ACTIVE SOURCES'
              width={25}
              height={12}
              color={cyberpunkTheme.colors.secondary}
            >
              <Box flexDirection='column' gap={1}>
                {Array.from(new Set(logs.map((l) => l.source)))
                  .slice(0, 8)
                  .map((source) => (
                    <Text key={source} color={cyberpunkTheme.colors.text}>
                      • {source}
                    </Text>
                  ))}
              </Box>
            </Card3D>
          </Box>
        </Box>

        {/* Log Stream */}
        <Box flexGrow={1}>
          <Card3D
            title='LOG STREAM'
            width={75}
            height={28}
            color={cyberpunkTheme.colors.matrix}
            animated={true}
          >
            <Box flexDirection='column' gap={0} height='100%'>
              {filteredLogs.slice(-20).map((log) => (
                <Box key={log.id} gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    [{log.timestamp.toLocaleTimeString()}]
                  </Text>
                  <Text color={getLevelColor(log.level)}>
                    {getLevelIcon(log.level)}
                  </Text>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {log.source}:
                  </Text>
                  <Text color={cyberpunkTheme.colors.text}>{log.message}</Text>
                </Box>
              ))}

              {autoScroll && (
                <Box marginTop={1}>
                  <Text color={cyberpunkTheme.colors.primary}>
                    ▼ Auto-scrolling...
                  </Text>
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Controls */}
      <Box marginTop={1} gap={3}>
        <Text color={cyberpunkTheme.colors.textDim}>
          [A] Toggle Auto-scroll | [F] Filter | [C] Clear | [E] Export
        </Text>
      </Box>
    </Box>
  );
};
