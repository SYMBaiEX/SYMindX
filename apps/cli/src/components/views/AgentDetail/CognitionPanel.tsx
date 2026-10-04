import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { cyberpunkTheme } from '../../../themes/cyberpunk.js';
import { Card3D } from '../../ui/Card3D.js';
import { Chart } from '../../ui/Chart.js';

interface CognitionDetailData {
  type: string;
  planningDepth: number;
  currentThoughts: ThoughtProcess[];
  activeGoals: Goal[];
  decisionHistory: Decision[];
  planningEfficiency: number;
  creativityLevel: number;
}

interface ThoughtProcess {
  id: string;
  type: 'observation' | 'analysis' | 'planning' | 'decision';
  content: string;
  confidence: number;
  timestamp: Date;
  relatedMemories: string[];
  emotionalContext: string;
}

interface Goal {
  id: string;
  description: string;
  priority: number;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  steps: GoalStep[];
  timeline: Date[];
}

interface GoalStep {
  id: string;
  description: string;
  completed: boolean;
  timestamp?: Date;
}

interface Decision {
  id: string;
  context: string;
  options: string[];
  chosen: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
  outcome?: string;
}

interface AgentDetailData {
  cognition: CognitionDetailData;
  [key: string]: any;
}

interface CognitionPanelProps {
  agentData: AgentDetailData;
}

export const CognitionPanel: React.FC<CognitionPanelProps> = ({
  agentData,
}) => {
  const { cognition } = agentData;
  const [selectedThought, setSelectedThought] = useState<number>(0);
  const [selectedGoal, setSelectedGoal] = useState<number>(0);
  const [selectedDecision, setSelectedDecision] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'thoughts' | 'goals' | 'decisions'>(
    'thoughts'
  );

  useInput((input, key) => {
    if (key.upArrow) {
      if (viewMode === 'thoughts' && selectedThought > 0) {
        setSelectedThought(selectedThought - 1);
      } else if (viewMode === 'goals' && selectedGoal > 0) {
        setSelectedGoal(selectedGoal - 1);
      } else if (viewMode === 'decisions' && selectedDecision > 0) {
        setSelectedDecision(selectedDecision - 1);
      }
    } else if (key.downArrow) {
      if (
        viewMode === 'thoughts' &&
        selectedThought < cognition.currentThoughts.length - 1
      ) {
        setSelectedThought(selectedThought + 1);
      } else if (
        viewMode === 'goals' &&
        selectedGoal < cognition.activeGoals.length - 1
      ) {
        setSelectedGoal(selectedGoal + 1);
      } else if (
        viewMode === 'decisions' &&
        selectedDecision < cognition.decisionHistory.length - 1
      ) {
        setSelectedDecision(selectedDecision + 1);
      }
    } else if (input === 'v') {
      const modes: ('thoughts' | 'goals' | 'decisions')[] = [
        'thoughts',
        'goals',
        'decisions',
      ];
      const currentIndex = modes.indexOf(viewMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      if (nextMode) {
        setViewMode(nextMode);
      }
    }
  });

  // Get thought type colors
  const getThoughtTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      observation: cyberpunkTheme.colors.primary,
      analysis: cyberpunkTheme.colors.secondary,
      planning: cyberpunkTheme.colors.accent,
      decision: cyberpunkTheme.colors.success,
    };
    return typeColors[type] || cyberpunkTheme.colors.text;
  };

  // Get goal status colors
  const getGoalStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: cyberpunkTheme.colors.success,
      completed: cyberpunkTheme.colors.primary,
      paused: cyberpunkTheme.colors.warning,
    };
    return statusColors[status] || cyberpunkTheme.colors.text;
  };

  // Generate thought-action loop visualization
  const generateThoughtLoopData = (): Array<ThoughtProcess & { visualDepth: number; connections: number }> => {
    return cognition.currentThoughts.map((thought) => ({
      ...thought,
      visualDepth: Math.random() * 0.8 + 0.2,
      connections: Math.floor(Math.random() * 3) + 1,
    }));
  };

  // Calculate decision confidence trends
  const decisionConfidenceData = cognition.decisionHistory
    .slice(-10)
    .map((decision) => decision.confidence);

  // Calculate planning efficiency over time
  const planningEfficiencyData = Array.from(
    { length: 20 },
    (_) => cognition.planningEfficiency + (Math.random() - 0.5) * 0.2
  );

  const renderThoughtLoopVisualization = (): React.JSX.Element => {
    const loopData = generateThoughtLoopData();

    return (
      <Box flexDirection='column' gap={1}>
        <Text color={cyberpunkTheme.colors.textDim}>Thought-Action Loop:</Text>
        {loopData.map((thought, i) => (
          <Box
            key={`thought-loop-${thought.id}-${i}`}
            flexDirection='column'
            marginLeft={Math.round(thought.visualDepth * 10)}
          >
            <Box gap={1}>
              <Text color={getThoughtTypeColor(thought.type)}>
                {'●'.repeat(thought.connections)}
              </Text>
              <Text color={getThoughtTypeColor(thought.type)} bold>
                {thought.type.toUpperCase()}
              </Text>
              <Text color={cyberpunkTheme.colors.textDim}>
                {Math.round(thought.confidence * 100)}%
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text color={cyberpunkTheme.colors.text}>
                {thought.content.slice(0, 50)}...
              </Text>
            </Box>
            <Box marginLeft={2} gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>Context:</Text>
              <Text color={cyberpunkTheme.colors.matrix}>
                {thought.emotionalContext}
              </Text>
            </Box>
            {i < loopData.length - 1 && (
              <Box marginLeft={5}>
                <Text color={cyberpunkTheme.colors.borderDim}>↓</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection='column' gap={1}>
      <Box flexDirection='row' gap={2}>
        {/* Cognition Overview */}
        <Box flexDirection='column' width='30%'>
          <Card3D
            title='COGNITION OVERVIEW'
            width={28}
            height={18}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {cognition.type.toUpperCase()}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Planning Depth:
                </Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {cognition.planningDepth}
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Efficiency:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {Math.round(cognition.planningEfficiency * 100)}%
                </Text>
              </Box>

              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Creativity:</Text>
                <Text color={cyberpunkTheme.colors.secondary}>
                  {Math.round(cognition.creativityLevel * 100)}%
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Active Thoughts:
                </Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {cognition.currentThoughts.length}
                </Text>
              </Box>

              <Box flexDirection='column'>
                <Text color={cyberpunkTheme.colors.textDim}>Active Goals:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {
                    cognition.activeGoals.filter((g) => g.status === 'active')
                      .length
                  }
                </Text>
              </Box>

              <Box flexDirection='column'>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Recent Decisions:
                </Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {cognition.decisionHistory.length}
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Efficiency Bar:
                </Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {'█'.repeat(Math.round(cognition.planningEfficiency * 15))}
                  {'░'.repeat(
                    15 - Math.round(cognition.planningEfficiency * 15)
                  )}
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Thought-Action Loop */}
        <Box flexDirection='column' width='40%'>
          <Card3D
            title='THOUGHT-ACTION LOOP'
            width={35}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            {renderThoughtLoopVisualization()}
          </Card3D>
        </Box>

        {/* Current Context */}
        <Box flexDirection='column' width='30%'>
          <Card3D
            title={`${viewMode.toUpperCase()} VIEW`}
            width={28}
            height={18}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                [V] Switch mode | [↑↓] Navigate
              </Text>

              {viewMode === 'thoughts' && (
                <Box flexDirection='column'>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Current Thoughts ({selectedThought + 1}/
                    {cognition.currentThoughts.length}):
                  </Text>
                  {cognition.currentThoughts.slice(0, 4).map((thought, i) => (
                    <Box
                      key={`current-thought-${thought.id}-${i}`}
                      flexDirection='column'
                      borderStyle={i === selectedThought ? 'single' : undefined}
                      borderColor={
                        i === selectedThought
                          ? cyberpunkTheme.colors.accent
                          : undefined
                      }
                      padding={i === selectedThought ? 1 : 0}
                    >
                      <Box gap={1}>
                        <Text color={getThoughtTypeColor(thought.type)} bold>
                          {thought.type.toUpperCase()}
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          {Math.round(thought.confidence * 100)}%
                        </Text>
                      </Box>
                      <Text color={cyberpunkTheme.colors.text}>
                        {thought.content.slice(0, 35)}...
                      </Text>
                    </Box>
                  ))}
                </Box>
              )}

              {viewMode === 'goals' && (
                <Box flexDirection='column'>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Active Goals ({selectedGoal + 1}/
                    {cognition.activeGoals.length}):
                  </Text>
                  {cognition.activeGoals.slice(0, 3).map((goal, i) => (
                    <Box
                      key={`active-goal-${goal.id}-${i}`}
                      flexDirection='column'
                      borderStyle={i === selectedGoal ? 'single' : undefined}
                      borderColor={
                        i === selectedGoal
                          ? cyberpunkTheme.colors.accent
                          : undefined
                      }
                      padding={i === selectedGoal ? 1 : 0}
                    >
                      <Box gap={1}>
                        <Text color={getGoalStatusColor(goal.status)} bold>
                          {goal.status.toUpperCase()}
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          P{goal.priority.toFixed(1)}
                        </Text>
                      </Box>
                      <Text color={cyberpunkTheme.colors.text}>
                        {goal.description.slice(0, 30)}...
                      </Text>
                      <Text color={cyberpunkTheme.colors.matrix}>
                        Progress: {Math.round(goal.progress * 100)}%
                      </Text>
                    </Box>
                  ))}
                </Box>
              )}

              {viewMode === 'decisions' && (
                <Box flexDirection='column'>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Recent Decisions ({selectedDecision + 1}/
                    {cognition.decisionHistory.length}):
                  </Text>
                  {cognition.decisionHistory.slice(0, 3).map((decision, i) => (
                    <Box
                      key={`decision-history-${decision.id}-${i}`}
                      flexDirection='column'
                      borderStyle={
                        i === selectedDecision ? 'single' : undefined
                      }
                      borderColor={
                        i === selectedDecision
                          ? cyberpunkTheme.colors.accent
                          : undefined
                      }
                      padding={i === selectedDecision ? 1 : 0}
                    >
                      <Box gap={1}>
                        <Text color={cyberpunkTheme.colors.success} bold>
                          DECISION
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          {Math.round(decision.confidence * 100)}%
                        </Text>
                      </Box>
                      <Text color={cyberpunkTheme.colors.text}>
                        {decision.context.slice(0, 30)}...
                      </Text>
                      <Text color={cyberpunkTheme.colors.primary}>
                        Chosen: {decision.chosen.slice(0, 20)}...
                      </Text>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Planning Efficiency Chart */}
      <Box marginTop={1}>
        <Card3D
          title='PLANNING EFFICIENCY OVER TIME'
          width={90}
          height={10}
          color={cyberpunkTheme.colors.primary}
          animated={true}
        >
          <Box flexDirection='row' gap={2}>
            <Box width='70%'>
              <Chart
                data={planningEfficiencyData}
                width={60}
                height={6}
                color={cyberpunkTheme.colors.matrix}
                type='line'
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection='column' width='30%'>
              <Text color={cyberpunkTheme.colors.textDim}>Metrics:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Current:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {Math.round(cognition.planningEfficiency * 100)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Trend:</Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {(planningEfficiencyData[planningEfficiencyData.length - 1] ??
                    0) > (planningEfficiencyData[0] ?? 0)
                    ? '↗'
                    : '↘'}
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Volatility:</Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  {(
                    Math.max(...planningEfficiencyData) -
                    Math.min(...planningEfficiencyData)
                  ).toFixed(2)}
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Decision Confidence Analysis */}
      <Box marginTop={1}>
        <Card3D
          title='DECISION CONFIDENCE ANALYSIS'
          width={90}
          height={10}
          color={cyberpunkTheme.colors.secondary}
          animated={true}
        >
          <Box flexDirection='row' gap={2}>
            <Box width='70%'>
              <Chart
                data={decisionConfidenceData}
                width={60}
                height={6}
                color={cyberpunkTheme.colors.accent}
                type='area'
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection='column' width='30%'>
              <Text color={cyberpunkTheme.colors.textDim}>Analysis:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Avg Confidence:
                </Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {Math.round(
                    (decisionConfidenceData.reduce((a, b) => a + b, 0) /
                      decisionConfidenceData.length) *
                      100
                  )}
                  %
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Last Decision:
                </Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {Math.round(
                    (decisionConfidenceData[
                      decisionConfidenceData.length - 1
                    ] ?? 0) * 100
                  )}
                  %
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Detailed View Based on Mode */}
      {viewMode === 'thoughts' &&
        cognition.currentThoughts[selectedThought] && (
          <Box marginTop={1}>
            <Card3D
              title='THOUGHT PROCESS DETAILS'
              width={90}
              height={12}
              color={getThoughtTypeColor(
                cognition.currentThoughts[selectedThought].type
              )}
              animated={true}
            >
              <Box flexDirection='column' gap={1}>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>ID:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.currentThoughts[selectedThought].id}
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                  <Text
                    color={getThoughtTypeColor(
                      cognition.currentThoughts[selectedThought].type
                    )}
                    bold
                  >
                    {cognition.currentThoughts[
                      selectedThought
                    ].type.toUpperCase()}
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Confidence:</Text>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {Math.round(
                      cognition.currentThoughts[selectedThought].confidence *
                        100
                    )}
                    %
                  </Text>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>Content:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.currentThoughts[selectedThought].content}
                  </Text>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Related Memories:
                  </Text>
                  <Text color={cyberpunkTheme.colors.matrix}>
                    {cognition.currentThoughts[
                      selectedThought
                    ].relatedMemories.join(', ')}
                  </Text>
                </Box>

                <Box gap={2} marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Emotional Context:
                  </Text>
                  <Text color={cyberpunkTheme.colors.secondary}>
                    {
                      cognition.currentThoughts[selectedThought]
                        .emotionalContext
                    }
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Timestamp:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.currentThoughts[
                      selectedThought
                    ].timestamp.toLocaleString()}
                  </Text>
                </Box>
              </Box>
            </Card3D>
          </Box>
        )}

      {viewMode === 'goals' && cognition.activeGoals[selectedGoal] && (
        <Box marginTop={1}>
          <Card3D
            title='GOAL DETAILS'
            width={90}
            height={12}
            color={getGoalStatusColor(
              cognition.activeGoals[selectedGoal].status
            )}
            animated={true}
          >
            <Box flexDirection='column' gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>ID:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {cognition.activeGoals[selectedGoal].id}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Status:</Text>
                <Text
                  color={getGoalStatusColor(
                    cognition.activeGoals[selectedGoal].status
                  )}
                  bold
                >
                  {cognition.activeGoals[selectedGoal].status.toUpperCase()}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Priority:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {cognition.activeGoals[selectedGoal].priority.toFixed(1)}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Progress:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {Math.round(
                    cognition.activeGoals[selectedGoal].progress * 100
                  )}
                  %
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Description:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {cognition.activeGoals[selectedGoal].description}
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Progress Bar:</Text>
                <Text
                  color={getGoalStatusColor(
                    cognition.activeGoals[selectedGoal].status
                  )}
                >
                  {'█'.repeat(
                    Math.round(
                      cognition.activeGoals[selectedGoal].progress * 30
                    )
                  )}
                  {'░'.repeat(
                    30 -
                      Math.round(
                        cognition.activeGoals[selectedGoal].progress * 30
                      )
                  )}
                </Text>
              </Box>

              <Box flexDirection='column' marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Steps:</Text>
                {cognition.activeGoals[selectedGoal].steps.map((step, i) => (
                  <Box key={`goal-step-${step.id}-${i}`} gap={1}>
                    <Text
                      color={
                        step.completed
                          ? cyberpunkTheme.colors.success
                          : cyberpunkTheme.colors.textDim
                      }
                    >
                      {step.completed ? '✓' : '○'}
                    </Text>
                    <Text
                      color={
                        step.completed
                          ? cyberpunkTheme.colors.text
                          : cyberpunkTheme.colors.textDim
                      }
                    >
                      {step.description}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card3D>
        </Box>
      )}

      {viewMode === 'decisions' &&
        cognition.decisionHistory[selectedDecision] && (
          <Box marginTop={1}>
            <Card3D
              title='DECISION ANALYSIS'
              width={90}
              height={12}
              color={cyberpunkTheme.colors.success}
              animated={true}
            >
              <Box flexDirection='column' gap={1}>
                <Box gap={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>ID:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.decisionHistory[selectedDecision]?.id ??
                      'Unknown'}
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Confidence:</Text>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {Math.round(
                      (cognition.decisionHistory[selectedDecision]
                        ?.confidence ?? 0) * 100
                    )}
                    %
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Outcome:</Text>
                  <Text
                    color={
                      cognition.decisionHistory[selectedDecision]?.outcome ===
                      'positive'
                        ? cyberpunkTheme.colors.success
                        : cyberpunkTheme.colors.warning
                    }
                  >
                    {cognition.decisionHistory[
                      selectedDecision
                    ]?.outcome?.toUpperCase() || 'PENDING'}
                  </Text>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>Context:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.decisionHistory[selectedDecision]?.context ??
                      'No context available'}
                  </Text>
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Options Considered:
                  </Text>
                  {cognition.decisionHistory[selectedDecision]?.options?.map(
                    (option, i) => (
                      <Box key={`decision-option-${selectedDecision}-${i}`} gap={1}>
                        <Text
                          color={
                            option ===
                            cognition.decisionHistory[selectedDecision]?.chosen
                              ? cyberpunkTheme.colors.success
                              : cyberpunkTheme.colors.textDim
                          }
                        >
                          {option ===
                          cognition.decisionHistory[selectedDecision]?.chosen
                            ? '✓'
                            : '○'}
                        </Text>
                        <Text
                          color={
                            option ===
                            cognition.decisionHistory[selectedDecision]?.chosen
                              ? cyberpunkTheme.colors.text
                              : cyberpunkTheme.colors.textDim
                          }
                        >
                          {option}
                        </Text>
                      </Box>
                    )
                  )}
                </Box>

                <Box flexDirection='column' marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>Reasoning:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.decisionHistory[selectedDecision].reasoning}
                  </Text>
                </Box>

                <Box gap={2} marginTop={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>Timestamp:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {cognition.decisionHistory[
                      selectedDecision
                    ].timestamp.toLocaleString()}
                  </Text>
                </Box>
              </Box>
            </Card3D>
          </Box>
        )}
    </Box>
  );
};
