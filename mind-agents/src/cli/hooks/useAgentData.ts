import { useState, useEffect } from 'react';
import { runtimeClient, type AgentInfo as RuntimeAgentInfo } from '../services/runtimeClient';

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type?: string;
  description?: string;
  memoryProvider?: string;
  extensions?: string[];
  portals?: string[];
  ethicsEnabled?: boolean;
  autonomousEnabled?: boolean;
  emotion?: string;
  extensionCount?: number;
  portal?: string; // For backward compatibility
}

export interface ActivityEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

export interface AgentData {
  agents: AgentInfo[];
  activeCount: number;
  totalCount: number;
  extensionsCount: number;
  recentActivity: ActivityEntry[];
  isConnected: boolean;
  error?: string;
  activeAgents?: number; // For backward compatibility
  totalAgents?: number;  // For backward compatibility
}

export const useAgentData = (): AgentData => {
  const [agentData, setAgentData] = useState<AgentData>({
    agents: [],
    activeCount: 0,
    totalCount: 0,
    extensionsCount: 0,
    recentActivity: [],
    isConnected: false
  });

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Check if runtime is available
        const isAvailable = await runtimeClient.isRuntimeAvailable();
        
        if (!isAvailable) {
          // Runtime not available - show offline state with mock data
          const connectionStatus = runtimeClient.getConnectionStatus();
          setAgentData(prev => ({
            ...prev,
            isConnected: false,
            error: connectionStatus.error || 'Runtime not available',
            agents: [], // Clear agents when offline
            activeCount: 0,
            totalCount: 0,
            extensionsCount: 0,
            recentActivity: [{
              timestamp: new Date().toLocaleTimeString(),
              message: `Runtime offline: ${connectionStatus.error || 'Unable to connect'}`,
              type: 'error'
            }]
          }));
          return;
        }

        // Fetch real data from runtime
        const [agents, events] = await Promise.all([
          runtimeClient.getAgents(),
          runtimeClient.getRecentEvents(10)
        ]);

        // Convert runtime agent data to our format
        const convertedAgents: AgentInfo[] = agents.map((agent: RuntimeAgentInfo) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          type: 'AI Agent', // Default type since runtime doesn't expose this
          description: `${agent.name} agent`,
          memoryProvider: 'connected', // Runtime doesn't expose specific provider
          extensions: [], // Would need to fetch detailed agent info
          portals: agent.hasPortal ? ['connected'] : [],
          ethicsEnabled: agent.ethicsEnabled,
          autonomousEnabled: false, // Runtime doesn't expose this directly
          emotion: agent.emotion || 'neutral',
          extensionCount: agent.extensionCount,
          portal: agent.hasPortal ? 'connected' : undefined
        }));

        // Convert events to activity entries
        const recentActivity: ActivityEntry[] = events.map(event => ({
          timestamp: event.timestamp,
          message: event.type === 'agent_active' 
            ? `Agent ${event.data?.agentName || event.source} is active`
            : event.type === 'runtime_status'
            ? `Runtime running with ${event.data?.agents || 0} agents`
            : `${event.type}: ${event.source || 'system'}`,
          type: event.type.includes('error') ? 'error' : 
                event.type.includes('warn') ? 'warning' : 'info'
        }));

        // Calculate extension count (approximate from agent data)
        const extensionsCount = agents.reduce((count, agent) => 
          count + agent.extensionCount, 0);

        const activeCount = agents.filter(a => a.status === 'active').length;
        const totalCount = agents.length;
        
        setAgentData({
          agents: convertedAgents,
          activeCount,
          totalCount,
          extensionsCount,
          recentActivity,
          isConnected: true,
          error: undefined,
          activeAgents: activeCount,
          totalAgents: totalCount
        });

      } catch (error) {
        console.error('Error fetching agent data:', error);
        const connectionStatus = runtimeClient.getConnectionStatus();
        setAgentData(prev => ({
          ...prev,
          isConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recentActivity: [{
            timestamp: new Date().toLocaleTimeString(),
            message: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'error'
          }, ...prev.recentActivity.slice(0, 9)]
        }));
      }
    };

    // Initial fetch
    fetchAgentData();
    
    // Refresh data every 3 seconds (more frequent for better real-time feel)
    const interval = setInterval(fetchAgentData, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return agentData;
};