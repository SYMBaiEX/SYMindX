import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useAgentData } from '../../hooks/useAgentData.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { 
  getResponsiveValueFromBreakpoints, 
  responsiveTruncate, 
  shouldShowElement 
} from '../../utils/responsive-grid.js';
import { GlitchText } from '../effects/GlitchText.js';
import { Header } from '../ui/Header.js';
import { ResponsiveBox } from '../ui/ResponsiveBox.js';
import { ResponsiveCard3D } from '../ui/ResponsiveCard3D.js';
import { ResponsiveGrid } from '../ui/ResponsiveGrid.js';

interface AgentCardProps {
  agent: any;
  isSelected: boolean;
  onSelect: () => void;
}

const ResponsiveAgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onSelect: _onSelect }) => {
  const { breakpoints: _breakpoints, currentBreakpoint } = useTerminalDimensions();
  
  const statusColor = agent.status === 'active' 
    ? cyberpunkTheme.colors.success 
    : agent.status === 'error' 
    ? cyberpunkTheme.colors.danger
    : cyberpunkTheme.colors.warning;
  
  const cardColor = isSelected 
    ? cyberpunkTheme.colors.accent 
    : cyberpunkTheme.colors.primary;
  
  // Responsive text truncation
  const truncatedDescription = responsiveTruncate(
    agent.description || 'No description available',
    { xs: 30, sm: 40, md: 50, lg: 60, xl: 70 },
    currentBreakpoint
  );
  
  return (
    <ResponsiveCard3D
      title={agent.name}
      width={{ xs: 'full', sm: 'full', md: 'auto', lg: 'auto', xl: 'auto' }}
      height={{ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }}
      span={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
      color={cardColor}
      animated={isSelected}
    >
      <ResponsiveBox direction="column" gap={1}>
        {/* Status */}
        <Box>
          <Text color={cyberpunkTheme.colors.textDim}>Status: </Text>
          <Text color={statusColor} bold>
            {agent.status.toUpperCase()}
          </Text>
        </Box>
        
        {/* Ethics */}
        <Box>
          <Text color={cyberpunkTheme.colors.textDim}>Ethics: </Text>
          <Text color={agent.ethicsEnabled === false 
            ? cyberpunkTheme.colors.warning 
            : cyberpunkTheme.colors.success
          }>
            {agent.ethicsEnabled === false ? 'DISABLED ⚠️' : 'ENABLED'}
          </Text>
        </Box>
        
        {/* Portal */}
        <ResponsiveBox show={{ xs: false, sm: true }}>
          <Text color={cyberpunkTheme.colors.textDim}>Portal: </Text>
          <Text color={cyberpunkTheme.colors.accent}>
            {agent.portal || 'None'}
          </Text>
        </ResponsiveBox>
        
        {/* Emotion */}
        <Box>
          <Text color={cyberpunkTheme.colors.textDim}>Emotion: </Text>
          <GlitchText intensity={0.02} frequency={8000}>
            {agent.emotion || 'neutral'}
          </GlitchText>
        </Box>
        
        {/* Memory */}
        <ResponsiveBox show={{ xs: false, sm: false, md: true }}>
          <Text color={cyberpunkTheme.colors.textDim}>Memory: </Text>
          <Text color={cyberpunkTheme.colors.text}>
            {agent.memoryCount || 0} records
          </Text>
        </ResponsiveBox>
        
        {/* Description */}
        <ResponsiveBox 
          marginTop={1}
          show={{ xs: false, sm: false, md: true, lg: true, xl: true }}
        >
          <Text color={cyberpunkTheme.colors.textDim} wrap="wrap">
            {truncatedDescription}
          </Text>
        </ResponsiveBox>
        
        {/* Extensions */}
        <ResponsiveBox show={{ xs: false, sm: false, md: false, lg: true, xl: true }}>
          <Text color={cyberpunkTheme.colors.textDim}>Extensions: </Text>
          <Text color={cyberpunkTheme.colors.primary}>
            {agent.extensions?.length || 0} active
          </Text>
        </ResponsiveBox>
      </ResponsiveBox>
    </ResponsiveCard3D>
  );
};

export const ResponsiveAgents: React.FC = () => {
  const agentData = useAgentData();
  const { dimensions, breakpoints } = useTerminalDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const agents = agentData?.agents || [];
  
  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (key: string) => {
      if (key === 'ArrowUp' || key === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key === 'ArrowDown' || key === 'j') {
        setSelectedIndex(prev => Math.min(agents.length - 1, prev + 1));
      } else if (key === 'ArrowLeft' || key === 'h') {
        // Move left in grid
        const columns = getResponsiveValueFromBreakpoints(breakpoints, {
          xs: 1, sm: 1, md: 2, lg: 3, xl: 4
        }, 2);
        setSelectedIndex(prev => Math.max(0, prev - (columns || 2)));
      } else if (key === 'ArrowRight' || key === 'l') {
        // Move right in grid
        const columns = getResponsiveValueFromBreakpoints(breakpoints, {
          xs: 1, sm: 1, md: 2, lg: 3, xl: 4
        }, 2);
        setSelectedIndex(prev => Math.min(agents.length - 1, prev + (columns || 2)));
      }
    };
    
    process.stdin.on('data', handleKeyPress);
    return () => {
      process.stdin.off('data', handleKeyPress);
    };
  }, [agents.length, breakpoints]);
  
  // Statistics
  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    inactive: agents.filter(a => a.status === 'inactive').length,
    error: agents.filter(a => a.status === 'error').length,
    unethical: agents.filter(a => a.ethicsEnabled === false).length,
  };
  
  return (
    <ResponsiveBox
      direction="column"
      height={dimensions.height}
      padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
    >
      {/* Header */}
      <Header 
        title="NEURAL AGENTS" 
        subtitle={shouldShowElement({ xs: false, sm: true, md: true, lg: true, xl: true }, breakpoints.isXSmall ? 'xs' : breakpoints.isSmall ? 'sm' : breakpoints.isMedium ? 'md' : breakpoints.isLarge ? 'lg' : 'xl') 
          ? `${stats.active} ACTIVE | ${stats.total} TOTAL`
          : `${stats.active}/${stats.total}`
        }
        showStatus={true}
        animated={!breakpoints.isXSmall}
      />
      
      {/* Stats Bar */}
      <ResponsiveBox
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
        marginBottom={1}
        show={{ xs: false, sm: true, md: true, lg: true, xl: true }}
      >
        <Box gap={2}>
          <Text color={cyberpunkTheme.colors.success}>
            ● Active: {stats.active}
          </Text>
          <Text color={cyberpunkTheme.colors.warning}>
            ● Inactive: {stats.inactive}
          </Text>
          <Text color={cyberpunkTheme.colors.danger}>
            ● Error: {stats.error}
          </Text>
          {stats.unethical > 0 && (
            <Text color={cyberpunkTheme.colors.warning}>
              ⚠️ Unethical: {stats.unethical}
            </Text>
          )}
        </Box>
      </ResponsiveBox>
      
      {/* Agent Grid */}
      <ResponsiveBox
        flexGrow={1}
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
        overflow="auto"
      >
        {agents.length === 0 ? (
          <ResponsiveCard3D
            title="NO AGENTS FOUND"
            width={{ xs: 'full', sm: 60, md: 60, lg: 60, xl: 60 }}
            height={10}
            color={cyberpunkTheme.colors.danger}
          >
            <Text color={cyberpunkTheme.colors.textDim}>
              No neural agents detected in the system.
            </Text>
            <Text color={cyberpunkTheme.colors.textDim}>
              Initialize agents to begin operations.
            </Text>
          </ResponsiveCard3D>
        ) : (
          <ResponsiveGrid
            columns={{ xs: 1, sm: 1, md: 2, lg: 3, xl: 4 }}
            gap={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
            responsive={true}
          >
            {agents.map((agent, index) => (
              <ResponsiveAgentCard
                key={agent.id}
                agent={agent}
                isSelected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}
          </ResponsiveGrid>
        )}
      </ResponsiveBox>
      
      {/* Footer with navigation hints */}
      <ResponsiveBox 
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
        borderStyle="single" 
        borderColor={cyberpunkTheme.colors.border}
      >
        <Text color={cyberpunkTheme.colors.textDim}>
          {breakpoints.isXSmall ? 
            '[↑↓] Select | [Enter] View | [Q] Back' :
            '[↑↓←→] Navigate | [Enter] View Details | [D] Delete | [E] Edit | [Q] Back'
          }
        </Text>
        {selectedIndex < agents.length && (
          <Text color={cyberpunkTheme.colors.accent}>
            {' | '}Selected: {agents[selectedIndex]?.name}
          </Text>
        )}
      </ResponsiveBox>
    </ResponsiveBox>
  );
};