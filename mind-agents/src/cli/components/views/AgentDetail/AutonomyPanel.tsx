import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { cyberpunkTheme } from '../../../themes/cyberpunk.js';
import { Card3D } from '../../ui/Card3D.js';
import { Chart } from '../../ui/Chart.js';

interface AutonomyDetailData {
  enabled: boolean;
  independenceLevel: number;
  autonomousActions: AutonomousAction[];
  dailyRoutine: RoutineActivity[];
  curiosityTopics: string[];
  explorationRate: number;
  socialBehaviors: SocialBehavior[];
  ethicsEnabled: boolean;
}

interface AutonomousAction {
  id: string;
  action: string;
  reasoning: string;
  timestamp: Date;
  success: boolean;
  impact: number;
}

interface RoutineActivity {
  time: string;
  activities: string[];
  completed: boolean;
  timestamp?: Date;
}

interface SocialBehavior {
  type: string;
  frequency: number;
  lastOccurrence: Date;
  effectiveness: number;
}

interface AgentDetailData {
  autonomy: AutonomyDetailData;
  [key: string]: any;
}

interface AutonomyPanelProps {
  agentData: AgentDetailData;
}

export const AutonomyPanel: React.FC<AutonomyPanelProps> = ({ agentData }) => {
  const { autonomy } = agentData;
  const [selectedAction, setSelectedAction] = useState<number>(0);
  const [viewMode, setViewMode] = useState<
    'actions' | 'routine' | 'social' | 'curiosity'
  >('actions');

  useInput((input, key) => {
    if (key.upArrow && selectedAction > 0) {
      setSelectedAction(selectedAction - 1);
    } else if (
      key.downArrow &&
      selectedAction < autonomy.autonomousActions.length - 1
    ) {
      setSelectedAction(selectedAction + 1);
    } else if (input === 'v') {
      const modes: ('actions' | 'routine' | 'social' | 'curiosity')[] = [
        'actions',
        'routine',
        'social',
        'curiosity',
      ];
      const currentIndex = modes.indexOf(viewMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      if (nextMode) {
        setViewMode(nextMode);
      }
    }
  });

  // Calculate autonomy metrics
  const actionSuccessRate =
    autonomy.autonomousActions.length > 0
      ? autonomy.autonomousActions.filter((a) => a.success).length /
        autonomy.autonomousActions.length
      : 0;

  const averageImpact =
    autonomy.autonomousActions.length > 0
      ? autonomy.autonomousActions.reduce((sum, a) => sum + a.impact, 0) /
        autonomy.autonomousActions.length
      : 0;

  const routineCompletion =
    autonomy.dailyRoutine.length > 0
      ? autonomy.dailyRoutine.filter((r) => r.completed).length /
        autonomy.dailyRoutine.length
      : 0;

  const socialEffectiveness =
    autonomy.socialBehaviors.length > 0
      ? autonomy.socialBehaviors.reduce((sum, b) => sum + b.effectiveness, 0) /
        autonomy.socialBehaviors.length
      : 0;

  // Generate autonomy score over time
  const autonomyScoreData = Array.from({ length: 20 }, (_) => {
    const baseScore = autonomy.independenceLevel;
    const variance = (Math.random() - 0.5) * 0.3;
    return Math.max(0, Math.min(1, baseScore + variance));
  });

  // Get autonomy status color
  const getAutonomyColor = (): string => {
    if (!autonomy.enabled) return cyberpunkTheme.colors.textDim;
    if (autonomy.independenceLevel >= 0.8) return cyberpunkTheme.colors.success;
    if (autonomy.independenceLevel >= 0.6) return cyberpunkTheme.colors.warning;
    return cyberpunkTheme.colors.danger;
  };

  // Get ethics status color
  const getEthicsColor = (): string => {
    return autonomy.ethicsEnabled
      ? cyberpunkTheme.colors.success
      : cyberpunkTheme.colors.danger;
  };

  return (
    <Box flexDirection='column' gap={1}>
      <Box flexDirection='row' gap={2}>
        {/* Autonomy Overview */}
        <Box flexDirection='column' width='25%'>
          <Card3D
            title='AUTONOMY STATUS'
            width={25}
            height={18}
            color={getAutonomyColor()}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Status:</Text>
                <Text color={getAutonomyColor()} bold>
                  {autonomy.enabled ? 'ENABLED' : 'DISABLED'}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Independence:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {Math.round(autonomy.independenceLevel * 100)}%
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Ethics:</Text>
                <Text color={getEthicsColor()} bold>
                  {autonomy.ethicsEnabled ? 'ENABLED' : 'DISABLED'}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Exploration:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {Math.round(autonomy.explorationRate * 100)}%
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Independence Bar:
                </Text>
                <Text color={getAutonomyColor()}>
                  {'█'.repeat(Math.round(autonomy.independenceLevel * 15))}
                  {'░'.repeat(15 - Math.round(autonomy.independenceLevel * 15))}
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Performance Metrics:
                </Text>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Success Rate:
                  </Text>
                  <Text color={cyberpunkTheme.colors.success}>
                    {Math.round(actionSuccessRate * 100)}%
                  </Text>
                </Box>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>Avg Impact:</Text>
                  <Text color={cyberpunkTheme.colors.primary}>
                    {averageImpact.toFixed(2)}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Autonomous Actions */}
        <Box flexDirection='column' width='30%'>
          <Card3D
            title='AUTONOMOUS ACTIONS'
            width={30}
            height={18}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Total Actions:
                </Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {autonomy.autonomousActions.length}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Success Rate:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {Math.round(actionSuccessRate * 100)}%
                </Text>
              </Box>

              <Box marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Recent Actions ({selectedAction + 1}/
                  {autonomy.autonomousActions.length}):
                </Text>
              </Box>

              {autonomy.autonomousActions.slice(0, 4).map((action, i) => (
                <Box
                  key={`action-${action.id}-${i}`}
                  flexDirection='column'
                  borderStyle={i === selectedAction ? 'single' : undefined}
                  borderColor={
                    i === selectedAction
                      ? cyberpunkTheme.colors.accent
                      : undefined
                  }
                  padding={i === selectedAction ? 1 : 0}
                >
                  <Box gap={1}>
                    <Text
                      color={
                        action.success
                          ? cyberpunkTheme.colors.success
                          : cyberpunkTheme.colors.danger
                      }
                    >
                      {action.success ? '✓' : '✗'}
                    </Text>
                    <Text color={cyberpunkTheme.colors.text} bold>
                      {action.action.slice(0, 20)}...
                    </Text>
                  </Box>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Impact: {action.impact.toFixed(2)} |{' '}
                    {action.timestamp.toLocaleTimeString()}
                  </Text>
                  {i === selectedAction && (
                    <Box marginTop={1}>
                      <Text color={cyberpunkTheme.colors.text}>
                        {action.reasoning.slice(0, 40)}...
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Card3D>
        </Box>

        {/* Daily Routine */}
        <Box flexDirection='column' width='25%'>
          <Card3D
            title='DAILY ROUTINE'
            width={25}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Completion:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {Math.round(routineCompletion * 100)}%
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Schedule:</Text>
                {autonomy.dailyRoutine.map((routine, i) => (
                  <Box key={`routine-${routine.time}-${i}`} flexDirection='column' marginTop={1}>
                    <Box gap={1}>
                      <Text
                        color={
                          routine.completed
                            ? cyberpunkTheme.colors.success
                            : cyberpunkTheme.colors.textDim
                        }
                      >
                        {routine.completed ? '✓' : '○'}
                      </Text>
                      <Text color={cyberpunkTheme.colors.accent} bold>
                        {routine.time}
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      {routine.activities.slice(0, 2).map((activity, j) => (
                        <Text key={`activity-${routine.time}-${j}`} color={cyberpunkTheme.colors.text}>
                          • {activity.slice(0, 15)}...
                        </Text>
                      ))}
                      {routine.activities.length > 2 && (
                        <Text color={cyberpunkTheme.colors.textDim}>
                          +{routine.activities.length - 2} more
                        </Text>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Completion Bar:
                </Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {'█'.repeat(Math.round(routineCompletion * 15))}
                  {'░'.repeat(15 - Math.round(routineCompletion * 15))}
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Social Behaviors */}
        <Box flexDirection='column' width='20%'>
          <Card3D
            title='SOCIAL BEHAVIORS'
            width={20}
            height={18}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Effectiveness:
                </Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {Math.round(socialEffectiveness * 100)}%
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Behaviors:</Text>
                {autonomy.socialBehaviors.map((behavior, i) => (
                  <Box key={`behavior-${behavior.type}-${i}`} flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {behavior.type.slice(0, 12)}...
                    </Text>
                    <Box gap={1}>
                      <Text color={cyberpunkTheme.colors.textDim}>Freq:</Text>
                      <Text color={cyberpunkTheme.colors.text}>
                        {behavior.frequency.toFixed(1)}
                      </Text>
                    </Box>
                    <Box gap={1}>
                      <Text color={cyberpunkTheme.colors.textDim}>Eff:</Text>
                      <Text color={cyberpunkTheme.colors.success}>
                        {Math.round(behavior.effectiveness * 100)}%
                      </Text>
                    </Box>
                    <Text color={cyberpunkTheme.colors.matrix}>
                      {'▓'.repeat(Math.round(behavior.effectiveness * 8))}
                      {'░'.repeat(8 - Math.round(behavior.effectiveness * 8))}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Autonomy Score Chart */}
      <Box marginTop={1}>
        <Card3D
          title='AUTONOMY PERFORMANCE OVER TIME'
          width={90}
          height={12}
          color={getAutonomyColor()}
          animated={true}
        >
          <Box flexDirection='row' gap={2}>
            <Box width='80%'>
              <Chart
                data={autonomyScoreData}
                width={70}
                height={8}
                color={getAutonomyColor()}
                type='area'
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection='column' width='20%'>
              <Text color={cyberpunkTheme.colors.textDim}>Statistics:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Current:</Text>
                <Text color={getAutonomyColor()}>
                  {Math.round(autonomy.independenceLevel * 100)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Peak:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {Math.round(Math.max(...autonomyScoreData) * 100)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Average:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {Math.round(
                    (autonomyScoreData.reduce((a, b) => a + b, 0) /
                      autonomyScoreData.length) *
                      100
                  )}
                  %
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Detailed View Based on Mode */}
      <Box marginTop={1}>
        <Card3D
          title={`${viewMode.toUpperCase()} DETAILS`}
          width={90}
          height={12}
          color={cyberpunkTheme.colors.matrix}
          animated={true}
        >
          <Box flexDirection='column' gap={1}>
            <Text color={cyberpunkTheme.colors.textDim}>
              [V] Switch view mode | Current: {viewMode}
            </Text>

            {viewMode === 'actions' &&
              autonomy.autonomousActions[selectedAction] && (
                <Box flexDirection='column' gap={1}>
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Action ID:
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {autonomy.autonomousActions[selectedAction].id}
                    </Text>
                    <Text color={cyberpunkTheme.colors.textDim}>Success:</Text>
                    <Text
                      color={
                        autonomy.autonomousActions[selectedAction].success
                          ? cyberpunkTheme.colors.success
                          : cyberpunkTheme.colors.danger
                      }
                    >
                      {autonomy.autonomousActions[selectedAction].success
                        ? 'YES'
                        : 'NO'}
                    </Text>
                    <Text color={cyberpunkTheme.colors.textDim}>Impact:</Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {autonomy.autonomousActions[
                        selectedAction
                      ].impact.toFixed(3)}
                    </Text>
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Action:</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {autonomy.autonomousActions[selectedAction].action}
                    </Text>
                  </Box>

                  <Box flexDirection='column' marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Reasoning:
                    </Text>
                    <Text color={cyberpunkTheme.colors.matrix}>
                      {autonomy.autonomousActions[selectedAction].reasoning}
                    </Text>
                  </Box>

                  <Box gap={2} marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Timestamp:
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {autonomy.autonomousActions[
                        selectedAction
                      ].timestamp.toLocaleString()}
                    </Text>
                  </Box>
                </Box>
              )}

            {viewMode === 'curiosity' && (
              <Box flexDirection='column' gap={1}>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Exploration Rate:
                  </Text>
                  <Text color={cyberpunkTheme.colors.matrix}>
                    {Math.round(autonomy.explorationRate * 100)}%
                  </Text>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Topics of Interest:
                  </Text>
                  <Box flexDirection='row' gap={2} flexWrap='wrap'>
                    {autonomy.curiosityTopics.map((topic, i) => (
                      <Box
                        key={`topic-${topic}-${i}`}
                        borderStyle='single'
                        borderColor={cyberpunkTheme.colors.matrix}
                        padding={1}
                      >
                        <Text color={cyberpunkTheme.colors.accent}>
                          {topic}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Exploration Progress:
                  </Text>
                  <Text color={cyberpunkTheme.colors.matrix}>
                    {'█'.repeat(Math.round(autonomy.explorationRate * 30))}
                    {'░'.repeat(30 - Math.round(autonomy.explorationRate * 30))}
                  </Text>
                </Box>
              </Box>
            )}

            {viewMode === 'routine' && (
              <Box flexDirection='column' gap={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Daily Schedule Breakdown:
                </Text>
                {autonomy.dailyRoutine.map((routine, i) => (
                  <Box key={`detailed-routine-${routine.time}-${i}`} flexDirection='column' marginTop={1}>
                    <Box gap={2}>
                      <Text
                        color={
                          routine.completed
                            ? cyberpunkTheme.colors.success
                            : cyberpunkTheme.colors.textDim
                        }
                        bold
                      >
                        {routine.time}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        ({routine.activities.length} activities)
                      </Text>
                      <Text
                        color={
                          routine.completed
                            ? cyberpunkTheme.colors.success
                            : cyberpunkTheme.colors.danger
                        }
                      >
                        {routine.completed ? 'COMPLETED' : 'PENDING'}
                      </Text>
                    </Box>
                    <Box marginLeft={2} flexDirection='column'>
                      {routine.activities.map((activity, j) => (
                        <Text key={`detailed-activity-${routine.time}-${j}`} color={cyberpunkTheme.colors.text}>
                          • {activity}
                        </Text>
                      ))}
                    </Box>
                    {routine.timestamp && (
                      <Box marginLeft={2}>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          Last executed: {routine.timestamp.toLocaleString()}
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {viewMode === 'social' && (
              <Box flexDirection='column' gap={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Social Behavior Analysis:
                </Text>
                {autonomy.socialBehaviors.map((behavior, i) => (
                  <Box key={`detailed-behavior-${behavior.type}-${i}`} flexDirection='column' marginTop={1}>
                    <Box gap={2}>
                      <Text color={cyberpunkTheme.colors.accent} bold>
                        {behavior.type.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Freq: {behavior.frequency.toFixed(2)}
                      </Text>
                      <Text color={cyberpunkTheme.colors.success}>
                        Eff: {Math.round(behavior.effectiveness * 100)}%
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      <Text color={cyberpunkTheme.colors.matrix}>
                        {'▓'.repeat(Math.round(behavior.effectiveness * 20))}
                        {'░'.repeat(
                          20 - Math.round(behavior.effectiveness * 20)
                        )}
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        Last occurrence:{' '}
                        {behavior.lastOccurrence.toLocaleString()}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Card3D>
      </Box>
    </Box>
  );
};
