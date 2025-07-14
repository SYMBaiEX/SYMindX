import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { AgentList } from '../components/AgentList.js';
import { Chat } from '../components/Chat.js';
import { Dashboard } from '../components/Dashboard.js';
import { SystemStatus } from '../components/SystemStatus.js';

interface MainLayoutProps {
  command?: string;
  args?: string[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  command = 'dashboard',
}) => {
  const [currentView, setCurrentView] = useState(command);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      process.exit(0);
    }

    if (input === 'h' || input === '?') {
      setShowHelp(!showHelp);
    }

    if (input === 'd') {
      setCurrentView('dashboard');
      setShowHelp(false);
    }

    if (input === 'a') {
      setCurrentView('agents');
      setShowHelp(false);
    }

    if (input === 's') {
      setCurrentView('status');
      setShowHelp(false);
    }

    if (input === 'c') {
      setCurrentView('chat');
      setShowHelp(false);
    }
  });

  const renderHelp = () => (
    <Box
      flexDirection='column'
      padding={1}
      borderStyle='round'
      borderColor='blue'
    >
      <Text bold color='blue'>
        SYMindX CLI Help
      </Text>
      <Text> </Text>
      <Text>
        <Text color='green'>d</Text> - Dashboard view
      </Text>
      <Text>
        <Text color='green'>a</Text> - Agent list view
      </Text>
      <Text>
        <Text color='green'>s</Text> - System status view
      </Text>
      <Text>
        <Text color='green'>c</Text> - Chat with agents
      </Text>
      <Text>
        <Text color='green'>h/?</Text> - Toggle this help
      </Text>
      <Text>
        <Text color='red'>ESC</Text> - Exit
      </Text>
    </Box>
  );

  const renderView = () => {
    switch (currentView) {
      case 'agents':
        return <AgentList />;
      case 'status':
        return <SystemStatus />;
      case 'chat':
        return <Chat />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <Box flexDirection='column' height='100%'>
      <Box padding={1} borderStyle='double' borderColor='cyan'>
        <Text bold color='cyan'>
          SYMindX Interactive CLI
        </Text>
        <Text color='gray'>
          {' '}
          | Current View: {currentView} | Press 'h' for help
        </Text>
      </Box>

      {showHelp && renderHelp()}

      <Box flexGrow={1} padding={1}>
        {renderView()}
      </Box>

      <Box padding={1} borderStyle='single' borderColor='gray'>
        <Text color='gray'>
          Navigation: [d]ashboard | [a]gents | [s]tatus | [c]hat | [h]elp |
          [ESC] exit
        </Text>
      </Box>
    </Box>
  );
};
