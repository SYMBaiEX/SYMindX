# SYMindX Interactive CLI (Ink)

A modern, interactive command-line interface for the SYMindX agent runtime built with [Ink](https://github.com/vadimdemedes/ink) and React.

## Features

- **Interactive Dashboard**: Real-time overview of system status, agent activity, and performance metrics
- **Agent Management**: Browse and inspect individual agents with detailed configuration views
- **System Monitoring**: Comprehensive system health and performance monitoring
- **Keyboard Navigation**: Full keyboard-driven navigation with intuitive controls
- **Real-time Updates**: Live data refreshing for current system state

## Usage

### Quick Start

```bash
# Run the interactive CLI
npm run cli

# Or start with a specific view
npm run cli:dashboard  # Dashboard view (default)
npm run cli:agents     # Agent list view
npm run cli:status     # System status view
```

### Navigation

Once the CLI is running, use these keyboard shortcuts:

- **d** - Switch to Dashboard view
- **a** - Switch to Agents view
- **s** - Switch to System Status view
- **h** or **?** - Toggle help menu
- **ESC** - Exit the application

#### Agent List Navigation

- **↑/↓ arrows** - Navigate through agent list
- **Enter** - View detailed agent information
- **ESC** - Return to main navigation

## Views

### Dashboard View

The main overview showing:

- System runtime status and uptime
- Memory usage and performance metrics
- Active agent count and extensions
- Recent activity log
- Quick action shortcuts

### Agents View

Detailed agent management:

- List of all configured agents
- Agent status (active/inactive/error)
- Individual agent details including:
  - Configuration settings
  - Memory provider type
  - Enabled extensions and portals
  - Ethics and autonomous behavior settings

### System Status View

Comprehensive system monitoring:

- Component health status (Runtime, Memory, Event Bus, Portals, Extensions, Security)
- Performance metrics (CPU, Memory, Connections, Response times)
- Environment configuration (Node version, Platform, Architecture)
- Warnings and error alerts

## Architecture

### Directory Structure

```
src/cli/
├── components/          # React components for CLI
│   ├── Dashboard.tsx    # Main dashboard component
│   ├── AgentList.tsx    # Agent list viewer
│   ├── SystemStatus.tsx # System status display
│   └── index.ts         # Component exports
├── hooks/              # Custom React hooks
│   ├── useAgentData.ts  # Agent data management
│   ├── useSystemStats.ts # System statistics
│   └── index.ts         # Hook exports
├── layouts/            # Layout components
│   ├── MainLayout.tsx   # Main application layout
│   └── index.ts         # Layout exports
└── ink-cli.tsx         # Main CLI entry point
```

### Data Flow

- **Real-time Updates**: Components refresh data every 3-5 seconds
- **Mock Data**: Currently uses mock data; will integrate with actual SYMindX runtime API
- **State Management**: React hooks manage component state and data fetching

## Development

### Adding New Views

1. Create a new component in `src/cli/components/`
2. Add navigation handling in `MainLayout.tsx`
3. Update the help menu and keyboard shortcuts

### Adding New Data Sources

1. Create custom hooks in `src/cli/hooks/`
2. Implement data fetching logic (replace mock data with actual API calls)
3. Use hooks in components for reactive updates

### Customizing Styles

The CLI uses Ink's built-in components with these styling patterns:

- **Borders**: `borderStyle="round"` for primary sections
- **Colors**: Semantic colors (green=success, red=error, yellow=warning, cyan=info)
- **Layout**: Flexbox-based layouts with proper spacing and padding

## Integration with SYMindX Runtime

The CLI is designed to integrate with the SYMindX runtime through:

- **REST API**: Fetch agent status, configuration, and metrics
- **WebSocket**: Real-time event streaming for live updates
- **File System**: Read configuration files and logs

Current implementation uses mock data that matches the expected API structure for easy future integration.

## Troubleshooting

### Common Issues

**"Raw mode is not supported"**

- This is expected in non-interactive terminals (CI/CD, some remote sessions)
- The CLI will still display content but won't accept keyboard input
- Use direct view commands (`npm run cli:dashboard`) for non-interactive environments

**Components not updating**

- Check if the data refresh intervals are appropriate for your use case
- Verify network connectivity if using real API endpoints
- Monitor console for any hook errors

**Navigation not working**

- Ensure terminal supports interactive input
- Try running in a proper terminal emulator rather than IDE terminals
- Check keyboard layout compatibility

## Future Enhancements

- [ ] Integration with actual SYMindX runtime API
- [ ] Agent control operations (start/stop/restart)
- [ ] Log viewer with real-time streaming
- [ ] Configuration editor
- [ ] Performance charting and historical data
- [ ] Extension management interface
- [ ] Multi-agent scenario visualization
