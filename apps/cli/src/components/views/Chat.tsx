import { Box, Text, useInput } from 'ink';
import React, { useState, useEffect, useRef } from 'react';

import { useAgentData } from '../../hooks/useAgentData.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { soundManager, SoundType } from '../../utils/sound-effects.js';
import { GlitchText } from '../effects/GlitchText.js';
import { Card3D } from '../ui/Card3D.js';

interface Message {
  id: string;
  from: 'user' | 'agent';
  content: string;
  timestamp: Date;
  agentId?: string;
}

export const Chat: React.FC = (): React.ReactElement => {
  const agentData = useAgentData();
  const [selectedAgent, setSelectedAgent] = useState<string>('nyx');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputBuffer, setInputBuffer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<any>(null);

  // Mock initial messages
  useEffect(() => {
    setMessages([
      {
        id: '1',
        from: 'agent',
        content: 'Neural interface initialized. How may I assist you today?',
        timestamp: new Date(),
        agentId: selectedAgent,
      },
    ]);
  }, [selectedAgent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input
  useInput((input, key) => {
    if (key.return && inputBuffer.trim()) {
      sendMessage();
    } else if (key.backspace) {
      setInputBuffer((prev) => prev.slice(0, -1));
    } else if (key.tab) {
      // Switch agents
      const agents = agentData?.agents || [];
      const currentIndex = agents.findIndex((a) => a.id === selectedAgent);
      const nextIndex = (currentIndex + 1) % agents.length;
      if (agents[nextIndex]) {
        setSelectedAgent(agents[nextIndex].id);
        soundManager.play(SoundType.NAVIGATION);
      }
    } else if (input && !key.ctrl && !key.meta) {
      setInputBuffer((prev) => prev + input);
      soundManager.play(SoundType.KEYPRESS);
    }
  });

  const sendMessage = (): void => {
    const userMessage: Message = {
      id: Date.now().toString(),
      from: 'user',
      content: inputBuffer,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputBuffer('');
    setIsTyping(true);

    soundManager.play(SoundType.CHAT_SEND);

    // Simulate agent response
    setTimeout(
      (): void => {
        const responses = [
          'Processing neural patterns... Analysis complete.',
          'Interesting query. Let me interface with the knowledge matrix.',
          'Accessing quantum databases... Data retrieved.',
          'Your request has been encrypted and processed through secure channels.',
          "Neural pathways aligned. Here's what I found:",
        ];

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          from: 'agent',
          content:
            responses[Math.floor(Math.random() * responses.length)] ||
            'No response available',
          timestamp: new Date(),
          agentId: selectedAgent,
        };

        setMessages((prev) => [...prev, agentMessage]);
        setIsTyping(false);
        soundManager.play(SoundType.CHAT_RECEIVE);
      },
      1000 + Math.random() * 2000
    );
  };

  const currentAgent = agentData?.agents.find((a) => a.id === selectedAgent);

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
          NEURAL CHAT INTERFACE
        </GlitchText>
        <Text color={cyberpunkTheme.colors.textDim}>
          [Tab] Switch Agent | [Enter] Send
        </Text>
      </Box>

      <Box flexDirection='row' gap={2} flexGrow={1}>
        {/* Agent List */}
        <Box width='25%'>
          <Card3D
            title='AGENTS'
            width={25}
            height={30}
            color={cyberpunkTheme.colors.primary}
          >
            <Box flexDirection='column' gap={1}>
              {agentData?.agents.map((agent) => (
                <Box key={agent.id} paddingY={1} paddingX={1}>
                  <Text
                    color={
                      selectedAgent === agent.id
                        ? cyberpunkTheme.colors.accent
                        : cyberpunkTheme.colors.text
                    }
                    bold={selectedAgent === agent.id}
                  >
                    {agent.status === 'active' ? '●' : '○'} {agent.name}
                  </Text>
                  <Box marginLeft={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      {agent.emotion}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card3D>
        </Box>

        {/* Chat Area */}
        <Box flexDirection='column' flexGrow={1}>
          {/* Messages */}
          <Card3D
            title={`CHAT: ${currentAgent?.name.toUpperCase() || 'NO AGENT'}`}
            width={70}
            height={24}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection='column' gap={1} height='100%'>
              {/* Message list */}
              <Box flexDirection='column' flexGrow={1} gap={1}>
                {messages.map((message) => (
                  <Box key={message.id} flexDirection='column'>
                    <Box>
                      <Text
                        color={
                          message.from === 'user'
                            ? cyberpunkTheme.colors.primary
                            : cyberpunkTheme.colors.accent
                        }
                        bold
                      >
                        {message.from === 'user'
                          ? 'YOU'
                          : currentAgent?.name.toUpperCase()}
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        {' '}
                        [{message.timestamp.toLocaleTimeString()}]
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      <Text color={cyberpunkTheme.colors.text}>
                        {message.content}
                      </Text>
                    </Box>
                  </Box>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <Box>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {currentAgent?.name} is typing
                    </Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {' '}
                      ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
                    </Text>
                  </Box>
                )}

                <Box ref={messagesEndRef} />
              </Box>
            </Box>
          </Card3D>

          {/* Input Area */}
          <Box marginTop={1}>
            <Card3D
              title='MESSAGE INPUT'
              width={70}
              height={5}
              color={cyberpunkTheme.colors.matrix}
            >
              <Box>
                <Text color={cyberpunkTheme.colors.primary}>{'> '}</Text>
                <Text color={cyberpunkTheme.colors.text}>{inputBuffer}</Text>
                <Text color={cyberpunkTheme.colors.primary}>█</Text>
              </Box>
            </Card3D>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
