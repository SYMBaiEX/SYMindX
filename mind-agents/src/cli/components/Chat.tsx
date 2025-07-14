import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { useAgentData } from '../hooks/useAgentData.js';

interface ChatProps {
  agentId?: string;
}

interface Message {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
}

export const Chat: React.FC<ChatProps> = ({ agentId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    agentId
  );
  const [isLoading, setIsLoading] = useState(false);
  const { agents } = useAgentData();

  const apiUrl = process.env.SYMINDX_API_URL || 'http://localhost:8000';

  useInput((input, key) => {
    if (key.escape) {
      setIsInputMode(false);
      setInputMessage('');
      return;
    }

    if (isInputMode) {
      if (key.return) {
        if (inputMessage.trim()) {
          sendMessage(inputMessage.trim());
          setInputMessage('');
        }
        setIsInputMode(false);
      } else if (key.backspace || key.delete) {
        setInputMessage((prev) => prev.slice(0, -1));
      } else if (input) {
        setInputMessage((prev) => prev + input);
      }
    } else {
      if (input === 'c' || input === 'C') {
        setIsInputMode(true);
      } else if (input === 'r' || input === 'R') {
        setMessages([]);
      } else if (
        input === '1' ||
        input === '2' ||
        input === '3' ||
        input === '4' ||
        input === '5'
      ) {
        const agentIndex = parseInt(input) - 1;
        if (agents && agents[agentIndex]) {
          setSelectedAgentId(agents[agentIndex].id);
        }
      }
    }
  });

  const sendMessage = async (message: string): Promise<void> => {
    if (!selectedAgentId) {
      addMessage('System', 'Please select an agent first', false);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      from: 'You',
      content: message,
      timestamp: new Date(),
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const agent = agents?.find((a) => a.id === selectedAgentId);

      // Add agent response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: agent?.name || selectedAgentId,
        content: data.response,
        timestamp: new Date(),
        isUser: false,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      addMessage(
        'System',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (from: string, content: string, isUser: boolean): void => {
    const message: Message = {
      id: Date.now().toString(),
      from,
      content,
      timestamp: new Date(),
      isUser,
    };
    setMessages((prev) => [...prev, message]);
  };

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId);

  return (
    <Box flexDirection='column' height='100%'>
      <Box borderStyle='single' borderColor='cyan' padding={1}>
        <Text bold color='cyan'>
          💬 Chat Interface
        </Text>
        {selectedAgent && (
          <Text color='green'> | Active: {selectedAgent.name}</Text>
        )}
      </Box>

      <Box flexDirection='row' flexGrow={1}>
        {/* Agent Selection Sidebar */}
        <Box
          flexDirection='column'
          width={30}
          borderStyle='single'
          borderColor='gray'
          padding={1}
        >
          <Text bold color='yellow'>
            Available Agents
          </Text>
          <Text color='gray'>Press 1-5 to select:</Text>
          <Text> </Text>
          {agents?.slice(0, 5).map((agent, index) => (
            <Text
              key={agent.id}
              color={selectedAgentId === agent.id ? 'green' : 'white'}
            >
              {index + 1}. {selectedAgentId === agent.id ? '→ ' : '  '}
              {agent.name}
              {agent.status === 'error' && ' ⚠️'}
            </Text>
          ))}
          <Text> </Text>
          <Text color='gray'>Commands:</Text>
          <Text color='cyan'>c - Chat</Text>
          <Text color='cyan'>r - Clear</Text>
          <Text color='red'>ESC - Back</Text>
        </Box>

        {/* Chat Area */}
        <Box flexDirection='column' flexGrow={1} padding={1}>
          <Box borderStyle='single' borderColor='gray' flexGrow={1} padding={1}>
            {messages.length === 0 && (
              <Text color='gray'>
                {selectedAgent
                  ? `Start chatting with ${selectedAgent.name}! Press 'c' to type a message.`
                  : 'Select an agent (1-5) to start chatting.'}
              </Text>
            )}
            {messages.map((msg) => (
              <Box key={msg.id} marginBottom={1}>
                <Text bold color={msg.isUser ? 'cyan' : 'green'}>
                  {msg.from}:
                </Text>
                <Text> {msg.content}</Text>
              </Box>
            ))}
            {isLoading && (
              <Box>
                <Text color='yellow'>Agent is typing...</Text>
              </Box>
            )}
          </Box>

          {/* Input Area */}
          <Box
            borderStyle='single'
            borderColor={isInputMode ? 'cyan' : 'gray'}
            padding={1}
          >
            <Text bold color={isInputMode ? 'cyan' : 'gray'}>
              {isInputMode
                ? 'Type your message (Enter to send, ESC to cancel):'
                : 'Press C to chat'}
            </Text>
            {isInputMode && (
              <Box marginTop={1}>
                <Text color='cyan'>You: </Text>
                <Text>{inputMessage}</Text>
                <Text color='cyan'>█</Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
