import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState, useRef, useEffect } from 'react';

import { useAgentData } from '../../hooks/useAgentData.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import {
  getResponsiveValueFromBreakpoints,
  responsiveTruncate,
} from '../../utils/responsive-grid.js';
import { GlitchText } from '../effects/GlitchText.js';
import { Header } from '../ui/Header.js';
import { ResponsiveBox } from '../ui/ResponsiveBox.js';
import { ResponsiveCard3D } from '../ui/ResponsiveCard3D.js';

interface Message {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'agent' | 'system';
}

interface ChatMessageProps {
  message: Message;
  isCompact: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCompact }) => {
  const { currentBreakpoint } =
    useTerminalDimensions();

  const getMessageColor = (): string => {
    switch (message.type) {
      case 'user':
        return cyberpunkTheme.colors.accent;
      case 'agent':
        return cyberpunkTheme.colors.primary;
      case 'system':
        return cyberpunkTheme.colors.warning;
      default:
        return cyberpunkTheme.colors.text;
    }
  };

  const time = message.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const truncatedContent = responsiveTruncate(
    message.content,
    { xs: 60, sm: 80, md: 100, lg: 120, xl: 140 },
    currentBreakpoint
  );

  if (isCompact) {
    return (
      <Box marginBottom={1}>
        <Text color={getMessageColor()} bold>
          {message.type === 'user' ? '>' : '<'}
        </Text>
        <Text color={cyberpunkTheme.colors.textDim}> {truncatedContent}</Text>
      </Box>
    );
  }

  return (
    <ResponsiveBox marginBottom={1} direction='column'>
      <Box>
        <Text color={cyberpunkTheme.colors.textDim}>[{time}] </Text>
        <Text color={getMessageColor()} bold>
          {message.type === 'user' ? 'USER' : message.agentName}
        </Text>
      </Box>
      <ResponsiveBox marginLeft={{ xs: 0, sm: 2, md: 2, lg: 2, xl: 2 }}>
        <Text color={cyberpunkTheme.colors.text} wrap='wrap'>
          {message.content}
        </Text>
      </ResponsiveBox>
    </ResponsiveBox>
  );
};

export const ResponsiveChat: React.FC = () => {
  const { dimensions, breakpoints } = useTerminalDimensions();
  const agentData = useAgentData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<any>(null);

  const activeAgents =
    agentData?.agents.filter((a) => a.status === 'active') || [];
  const selectedAgent = activeAgents[selectedAgentIndex];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  // Handle input
  useInput((_input, key) => {
    if (key.tab) {
      // Cycle through agents
      setSelectedAgentIndex(
        (prev) => (prev + 1) % Math.max(1, activeAgents.length)
      );
    }
  });

  const handleSubmit = (): void => {
    if (!inputValue.trim() || !selectedAgent) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      agentId: 'user',
      agentName: 'User',
      content: inputValue,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(
      () => {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          content: `Processing request: "${inputValue}". Analyzing with ${selectedAgent.emotion || 'neutral'} emotion state...`,
          timestamp: new Date(),
          type: 'agent',
        };

        setMessages((prev) => [...prev, agentMessage]);
        setIsTyping(false);
      },
      1000 + Math.random() * 2000
    );
  };

  // Calculate responsive dimensions
  const chatHeight = getResponsiveValueFromBreakpoints(
    breakpoints,
    {
      xs: dimensions.height - 12,
      sm: dimensions.height - 14,
      md: dimensions.height - 16,
      lg: dimensions.height - 18,
      xl: dimensions.height - 20,
    },
    dimensions.height - 16
  );

  const isCompactMode = breakpoints.isXSmall || breakpoints.isSmall;

  return (
    <ResponsiveBox
      direction='column'
      height={dimensions.height}
      padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
    >
      {/* Header */}
      <Header
        title='NEURAL CHAT'
        subtitle={
          selectedAgent
            ? isCompactMode
              ? selectedAgent.name
              : `Connected to ${selectedAgent.name}`
            : 'No agent selected'
        }
        showStatus={true}
        animated={!breakpoints.isXSmall}
      />

      {/* Main Chat Area */}
      <ResponsiveBox
        flexGrow={1}
        direction={{
          xs: 'column',
          sm: 'column',
          md: 'row',
          lg: 'row',
          xl: 'row',
        }}
        gap={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
      >
        {/* Agent List - Hide on small screens */}
        <ResponsiveBox
          show={{ xs: false, sm: false, md: true, lg: true, xl: true }}
          width='auto'
        >
          <ResponsiveCard3D
            title='ACTIVE AGENTS'
            width='full'
            height={chatHeight || dimensions.height - 16}
            color={cyberpunkTheme.colors.secondary}
          >
            <ResponsiveBox direction='column' gap={1}>
              {activeAgents.length === 0 ? (
                <Text color={cyberpunkTheme.colors.textDim}>
                  No active agents
                </Text>
              ) : (
                activeAgents.map((agent, index) => (
                  <ResponsiveBox
                    key={agent.id}
                    padding={1}
                    borderStyle={
                      index === selectedAgentIndex ? 'double' : 'single'
                    }
                    borderColor={
                      index === selectedAgentIndex
                        ? cyberpunkTheme.colors.accent
                        : cyberpunkTheme.colors.borderDim
                    }
                  >
                    <Box flexDirection='column'>
                      <Text color={cyberpunkTheme.colors.text} bold>
                        {agent.name}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        {agent.emotion || 'neutral'}
                      </Text>
                      {agent.ethicsEnabled === false && (
                        <Text color={cyberpunkTheme.colors.warning}>
                          ⚠️ Ethics disabled
                        </Text>
                      )}
                    </Box>
                  </ResponsiveBox>
                ))
              )}
            </ResponsiveBox>
          </ResponsiveCard3D>
        </ResponsiveBox>

        {/* Chat Messages */}
        <ResponsiveBox flexGrow={1} direction='column'>
          <ResponsiveCard3D
            title={isCompactMode ? 'CHAT' : 'CONVERSATION'}
            width='full'
            height={(chatHeight || dimensions.height - 16) - 4}
            color={cyberpunkTheme.colors.primary}
          >
            <ResponsiveBox
              direction='column'
              height={(chatHeight || dimensions.height - 16) - 8}
              overflow='auto'
            >
              {messages.length === 0 ? (
                <Text color={cyberpunkTheme.colors.textDim}>
                  Start a conversation with {selectedAgent?.name || 'an agent'}
                  ...
                </Text>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isCompact={isCompactMode}
                  />
                ))
              )}
              {isTyping && (
                <Box>
                  <GlitchText intensity={0.1} frequency={100}>
                    {(selectedAgent?.name || 'Agent') + ' is typing...'}
                  </GlitchText>
                </Box>
              )}
              <Box ref={messagesEndRef} />
            </ResponsiveBox>
          </ResponsiveCard3D>

          {/* Input Area */}
          <ResponsiveBox
            marginTop={1}
            padding={1}
            borderStyle='single'
            borderColor={cyberpunkTheme.colors.accent}
          >
            <Box flexDirection='column' width='100%'>
              {/* Agent selector for mobile */}
              {isCompactMode && activeAgents.length > 0 && (
                <Box marginBottom={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>To: </Text>
                  <Text color={cyberpunkTheme.colors.accent} bold>
                    {selectedAgent?.name || 'Select agent'}
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    {' '}
                    [Tab to switch]
                  </Text>
                </Box>
              )}

              <Box>
                <Text color={cyberpunkTheme.colors.accent}>{'> '}</Text>
                <Box flexGrow={1}>
                  <TextInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={handleSubmit}
                    placeholder={
                      isCompactMode ? 'Message...' : 'Type your message...'
                    }
                  />
                </Box>
              </Box>
            </Box>
          </ResponsiveBox>
        </ResponsiveBox>
      </ResponsiveBox>

      {/* Footer */}
      <ResponsiveBox
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
        borderStyle='single'
        borderColor={cyberpunkTheme.colors.border}
      >
        <Text color={cyberpunkTheme.colors.textDim}>
          {isCompactMode
            ? '[Tab] Agent | [Enter] Send | [Q] Back'
            : '[Tab] Switch Agent | [Enter] Send | [↑↓] History | [Q] Back'}
        </Text>
      </ResponsiveBox>
    </ResponsiveBox>
  );
};
