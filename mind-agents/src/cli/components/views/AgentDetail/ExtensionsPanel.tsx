import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { cyberpunkTheme } from '../../../themes/cyberpunk.js';
import { Card3D } from '../../ui/Card3D.js';
import { Chart } from '../../ui/Chart.js';

interface ExtensionDetailData {
  name: string;
  type: string;
  enabled: boolean;
  status: string;
  usage: ExtensionUsage;
  errors: ExtensionError[];
}

interface ExtensionUsage {
  actionsTriggered: number;
  eventsHandled: number;
  lastActivity: Date;
  averageProcessingTime: number;
}

interface ExtensionError {
  timestamp: Date;
  error: string;
  context: string;
  severity: 'low' | 'medium' | 'high';
}

interface AgentDetailData {
  extensions: ExtensionDetailData[];
  [key: string]: any;
}

interface ExtensionsPanelProps {
  agentData: AgentDetailData;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({
  agentData,
}) => {
  const { extensions } = agentData;
  const [selectedExtension, setSelectedExtension] = useState<number>(0);
  const [viewMode, setViewMode] = useState<
    'overview' | 'usage' | 'errors' | 'performance'
  >('overview');

  useInput((input, key) => {
    if (key.upArrow && selectedExtension > 0) {
      setSelectedExtension(selectedExtension - 1);
    } else if (key.downArrow && selectedExtension < extensions.length - 1) {
      setSelectedExtension(selectedExtension + 1);
    } else if (input === 'v') {
      const modes: ('overview' | 'usage' | 'errors' | 'performance')[] = [
        'overview',
        'usage',
        'errors',
        'performance',
      ];
      const currentIndex = modes.indexOf(viewMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      if (nextMode) {
        setViewMode(nextMode);
      }
    }
  });

  // Get extension type colors
  const getExtensionTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      communication: cyberpunkTheme.colors.primary,
      social_platform: cyberpunkTheme.colors.accent,
      game_integration: cyberpunkTheme.colors.success,
      data_source: cyberpunkTheme.colors.secondary,
      utility: cyberpunkTheme.colors.matrix,
      sensor: '#9B59B6',
      actuator: '#E67E22',
      mcp_server: '#2ECC71',
    };
    return typeColors[type] || cyberpunkTheme.colors.text;
  };

  // Get extension status color
  const getExtensionStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      running: cyberpunkTheme.colors.success,
      stopped: cyberpunkTheme.colors.textDim,
      error: cyberpunkTheme.colors.danger,
      initializing: cyberpunkTheme.colors.warning,
      stopping: cyberpunkTheme.colors.warning,
    };
    return statusColors[status] || cyberpunkTheme.colors.text;
  };

  // Get error severity color
  const getErrorSeverityColor = (
    severity: 'low' | 'medium' | 'high'
  ): string => {
    const severityColors = {
      low: cyberpunkTheme.colors.textDim,
      medium: cyberpunkTheme.colors.warning,
      high: cyberpunkTheme.colors.danger,
    };
    return severityColors[severity];
  };

  // Calculate extension statistics
  const totalActions = extensions.reduce(
    (sum, ext) => sum + ext.usage.actionsTriggered,
    0
  );
  const totalEvents = extensions.reduce(
    (sum, ext) => sum + ext.usage.eventsHandled,
    0
  );
  const totalErrors = extensions.reduce(
    (sum, ext) => sum + ext.errors.length,
    0
  );
  const enabledCount = extensions.filter((ext) => ext.enabled).length;
  const runningCount = extensions.filter(
    (ext) => ext.status === 'running'
  ).length;

  // Generate extension activity data
  const generateActivityData = (extension: ExtensionDetailData) => {
    return Array.from({ length: 20 }, (_) => {
      const baseActivity = extension.usage.actionsTriggered / 20;
      const variance = (Math.random() - 0.5) * baseActivity * 0.5;
      return Math.max(0, baseActivity + variance);
    });
  };

  return (
    <Box flexDirection='column' gap={1}>
      <Box flexDirection='row' gap={2}>
        {/* Extensions Overview */}
        <Box flexDirection='column' width='25%'>
          <Card3D
            title='EXTENSIONS OVERVIEW'
            width={25}
            height={18}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Total:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {extensions.length}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Enabled:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {enabledCount}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Running:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>{runningCount}</Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Errors:</Text>
                <Text
                  color={
                    totalErrors > 0
                      ? cyberpunkTheme.colors.danger
                      : cyberpunkTheme.colors.success
                  }
                >
                  {totalErrors}
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Health Status:
                </Text>
                <Text
                  color={
                    runningCount === enabledCount
                      ? cyberpunkTheme.colors.success
                      : cyberpunkTheme.colors.warning
                  }
                >
                  {'█'.repeat(
                    Math.round((runningCount / Math.max(enabledCount, 1)) * 15)
                  )}
                  {'░'.repeat(
                    15 -
                      Math.round(
                        (runningCount / Math.max(enabledCount, 1)) * 15
                      )
                  )}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {Math.round((runningCount / Math.max(enabledCount, 1)) * 100)}
                  %
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Activity:</Text>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Actions:</Text>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {totalActions}
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Events:</Text>
                  <Text color={cyberpunkTheme.colors.secondary}>
                    {totalEvents}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Extension List */}
        <Box flexDirection='column' width='35%'>
          <Card3D
            title='EXTENSION DIRECTORY'
            width={35}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                Extensions ({selectedExtension + 1}/{extensions.length}):
              </Text>

              {extensions.map((extension, i) => (
                <Box
                  key={i}
                  flexDirection='column'
                  borderStyle={i === selectedExtension ? 'single' : undefined}
                  borderColor={
                    i === selectedExtension
                      ? cyberpunkTheme.colors.accent
                      : undefined
                  }
                  padding={i === selectedExtension ? 1 : 0}
                >
                  <Box gap={1}>
                    <Text color={getExtensionStatusColor(extension.status)}>
                      {extension.enabled ? '●' : '○'}
                    </Text>
                    <Text color={getExtensionTypeColor(extension.type)} bold>
                      {extension.name.toUpperCase()}
                    </Text>
                    <Text color={getExtensionStatusColor(extension.status)}>
                      {extension.status.toUpperCase()}
                    </Text>
                  </Box>

                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                    <Text color={getExtensionTypeColor(extension.type)}>
                      {extension.type.replace(/_/g, ' ')}
                    </Text>
                  </Box>

                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Actions:</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {extension.usage.actionsTriggered}
                    </Text>
                  </Box>

                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Events:</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {extension.usage.eventsHandled}
                    </Text>
                  </Box>

                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Errors:</Text>
                    <Text
                      color={
                        extension.errors.length > 0
                          ? cyberpunkTheme.colors.danger
                          : cyberpunkTheme.colors.success
                      }
                    >
                      {extension.errors.length}
                    </Text>
                  </Box>

                  {i === selectedExtension && (
                    <Box marginLeft={2} flexDirection='column' marginTop={1}>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Last Activity:
                      </Text>
                      <Text color={cyberpunkTheme.colors.text}>
                        {extension.usage.lastActivity.toLocaleString()}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Avg Processing:
                      </Text>
                      <Text color={cyberpunkTheme.colors.warning}>
                        {extension.usage.averageProcessingTime}ms
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Card3D>
        </Box>

        {/* Extension Analytics */}
        <Box flexDirection='column' width='40%'>
          <Card3D
            title={`${viewMode.toUpperCase()} ANALYTICS`}
            width={40}
            height={18}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                [V] Switch view | Current: {viewMode}
              </Text>

              {viewMode === 'overview' && (
                <Box flexDirection='column' gap={1}>
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Total Actions:
                    </Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {totalActions.toLocaleString()}
                    </Text>
                  </Box>

                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Total Events:
                    </Text>
                    <Text color={cyberpunkTheme.colors.secondary}>
                      {totalEvents.toLocaleString()}
                    </Text>
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Extension Types:
                    </Text>
                    {Array.from(new Set(extensions.map((ext) => ext.type))).map(
                      (type, i) => {
                        const count = extensions.filter(
                          (ext) => ext.type === type
                        ).length;
                        return (
                          <Box key={i} gap={2}>
                            <Text color={getExtensionTypeColor(type)}>
                              {type.replace(/_/g, ' ')}:
                            </Text>
                            <Text color={cyberpunkTheme.colors.text}>
                              {count}
                            </Text>
                          </Box>
                        );
                      }
                    )}
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Status Distribution:
                    </Text>
                    {Array.from(
                      new Set(extensions.map((ext) => ext.status))
                    ).map((status, i) => {
                      const count = extensions.filter(
                        (ext) => ext.status === status
                      ).length;
                      return (
                        <Box key={i} gap={2}>
                          <Text color={getExtensionStatusColor(status)}>
                            {status}:
                          </Text>
                          <Text color={cyberpunkTheme.colors.text}>
                            {count}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {viewMode === 'usage' && extensions[selectedExtension] && (
                <Box flexDirection='column' gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    {extensions[selectedExtension].name} Usage:
                  </Text>

                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Actions Triggered:
                    </Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {extensions[selectedExtension].usage.actionsTriggered}
                    </Text>
                  </Box>

                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Events Handled:
                    </Text>
                    <Text color={cyberpunkTheme.colors.secondary}>
                      {extensions[selectedExtension].usage.eventsHandled}
                    </Text>
                  </Box>

                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Avg Processing:
                    </Text>
                    <Text color={cyberpunkTheme.colors.warning}>
                      {
                        extensions[selectedExtension].usage
                          .averageProcessingTime
                      }
                      ms
                    </Text>
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Activity Chart:
                    </Text>
                    <Chart
                      data={generateActivityData(extensions[selectedExtension])}
                      width={30}
                      height={6}
                      color={getExtensionTypeColor(
                        extensions[selectedExtension].type
                      )}
                      type='bar'
                      showAxes={false}
                    />
                  </Box>

                  <Box gap={2} marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Last Activity:
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {extensions[
                        selectedExtension
                      ].usage.lastActivity.toLocaleTimeString()}
                    </Text>
                  </Box>
                </Box>
              )}

              {viewMode === 'errors' && (
                <Box flexDirection='column' gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Error Analysis:
                  </Text>

                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Total Errors:
                    </Text>
                    <Text
                      color={
                        totalErrors > 0
                          ? cyberpunkTheme.colors.danger
                          : cyberpunkTheme.colors.success
                      }
                    >
                      {totalErrors}
                    </Text>
                  </Box>

                  {extensions[selectedExtension] && (
                    <Box flexDirection='column' marginTop={1}>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        {extensions[selectedExtension].name} Errors:
                      </Text>
                      {extensions[selectedExtension].errors.length === 0 ? (
                        <Text color={cyberpunkTheme.colors.success}>
                          No errors reported
                        </Text>
                      ) : (
                        extensions[selectedExtension].errors
                          .slice(0, 3)
                          .map((error, i) => (
                            <Box key={i} flexDirection='column' marginTop={1}>
                              <Box gap={1}>
                                <Text
                                  color={getErrorSeverityColor(error.severity)}
                                >
                                  ●
                                </Text>
                                <Text
                                  color={getErrorSeverityColor(error.severity)}
                                  bold
                                >
                                  {error.severity.toUpperCase()}
                                </Text>
                                <Text color={cyberpunkTheme.colors.textDim}>
                                  {error.timestamp.toLocaleTimeString()}
                                </Text>
                              </Box>
                              <Text color={cyberpunkTheme.colors.text}>
                                {error.error.slice(0, 40)}...
                              </Text>
                              <Text color={cyberpunkTheme.colors.textDim}>
                                Context: {error.context.slice(0, 30)}...
                              </Text>
                            </Box>
                          ))
                      )}
                    </Box>
                  )}

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Error Summary by Extension:
                    </Text>
                    {extensions.map((ext, i) => (
                      <Box key={i} gap={2}>
                        <Text color={getExtensionTypeColor(ext.type)}>
                          {ext.name}:
                        </Text>
                        <Text
                          color={
                            ext.errors.length > 0
                              ? cyberpunkTheme.colors.danger
                              : cyberpunkTheme.colors.success
                          }
                        >
                          {ext.errors.length}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {viewMode === 'performance' && (
                <Box flexDirection='column' gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Performance Metrics:
                  </Text>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Processing Times:
                    </Text>
                    {extensions.map((ext, i) => {
                      const maxTime = Math.max(
                        ...extensions.map((e) => e.usage.averageProcessingTime)
                      );
                      const relativeTime =
                        ext.usage.averageProcessingTime / maxTime;
                      return (
                        <Box key={i} gap={1}>
                          <Text color={getExtensionTypeColor(ext.type)}>
                            {ext.name.slice(0, 8)}:
                          </Text>
                          <Text color={cyberpunkTheme.colors.warning}>
                            {'▓'.repeat(Math.round(relativeTime * 10))}
                            {'░'.repeat(10 - Math.round(relativeTime * 10))}
                          </Text>
                          <Text color={cyberpunkTheme.colors.text}>
                            {ext.usage.averageProcessingTime}ms
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Activity Levels:
                    </Text>
                    {extensions.map((ext, i) => {
                      const maxActivity = Math.max(
                        ...extensions.map(
                          (e) =>
                            e.usage.actionsTriggered + e.usage.eventsHandled
                        )
                      );
                      const totalActivity =
                        ext.usage.actionsTriggered + ext.usage.eventsHandled;
                      const relativeActivity = totalActivity / maxActivity;
                      return (
                        <Box key={i} gap={1}>
                          <Text color={getExtensionTypeColor(ext.type)}>
                            {ext.name.slice(0, 8)}:
                          </Text>
                          <Text color={cyberpunkTheme.colors.accent}>
                            {'█'.repeat(Math.round(relativeActivity * 10))}
                            {'░'.repeat(10 - Math.round(relativeActivity * 10))}
                          </Text>
                          <Text color={cyberpunkTheme.colors.text}>
                            {totalActivity}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Extension Activity Chart */}
      {extensions[selectedExtension] && (
        <Box marginTop={1}>
          <Card3D
            title={`${extensions[selectedExtension].name.toUpperCase()} ACTIVITY OVER TIME`}
            width={90}
            height={12}
            color={getExtensionTypeColor(extensions[selectedExtension].type)}
            animated={true}
          >
            <Box flexDirection='row' gap={2}>
              <Box width='80%'>
                <Chart
                  data={generateActivityData(extensions[selectedExtension])}
                  width={70}
                  height={8}
                  color={getExtensionTypeColor(
                    extensions[selectedExtension].type
                  )}
                  type='area'
                  animated={true}
                  showAxes={true}
                />
              </Box>
              <Box flexDirection='column' width='20%'>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Extension Stats:
                </Text>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Status:</Text>
                  <Text
                    color={getExtensionStatusColor(
                      extensions[selectedExtension].status
                    )}
                  >
                    {extensions[selectedExtension].status.toUpperCase()}
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                  <Text
                    color={getExtensionTypeColor(
                      extensions[selectedExtension].type
                    )}
                  >
                    {extensions[selectedExtension].type.replace(/_/g, ' ')}
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Actions:</Text>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {extensions[selectedExtension].usage.actionsTriggered}
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Events:</Text>
                  <Text color={cyberpunkTheme.colors.secondary}>
                    {extensions[selectedExtension].usage.eventsHandled}
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Errors:</Text>
                  <Text
                    color={
                      extensions[selectedExtension].errors.length > 0
                        ? cyberpunkTheme.colors.danger
                        : cyberpunkTheme.colors.success
                    }
                  >
                    {extensions[selectedExtension].errors.length}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Card3D>
        </Box>
      )}

      {/* Error Details */}
      {extensions[selectedExtension] &&
        extensions[selectedExtension].errors.length > 0 && (
          <Box marginTop={1}>
            <Card3D
              title={`${extensions[selectedExtension].name.toUpperCase()} ERROR DETAILS`}
              width={90}
              height={10}
              color={cyberpunkTheme.colors.danger}
              animated={true}
            >
              <Box flexDirection='column' gap={1}>
                {extensions[selectedExtension].errors
                  .slice(0, 3)
                  .map((error, i) => (
                    <Box key={i} flexDirection='column'>
                      <Box gap={2}>
                        <Text
                          color={getErrorSeverityColor(error.severity)}
                          bold
                        >
                          {error.severity.toUpperCase()}
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          {error.timestamp.toLocaleString()}
                        </Text>
                      </Box>
                      <Text color={cyberpunkTheme.colors.text}>
                        Error: {error.error}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Context: {error.context}
                      </Text>
                      {i <
                        (extensions[selectedExtension]?.errors?.slice(0, 3)
                          .length ?? 0) -
                          1 && (
                        <Box marginTop={1}>
                          <Text color={cyberpunkTheme.colors.borderDim}>
                            {'─'.repeat(80)}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  ))}

                {extensions[selectedExtension].errors.length > 3 && (
                  <Box marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      ... and {extensions[selectedExtension].errors.length - 3}{' '}
                      more errors
                    </Text>
                  </Box>
                )}
              </Box>
            </Card3D>
          </Box>
        )}
    </Box>
  );
};
