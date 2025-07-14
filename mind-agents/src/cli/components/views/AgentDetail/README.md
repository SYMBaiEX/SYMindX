# Agent Deep Diagnostics System

A comprehensive debugging and profiling interface for SYMindX agents that provides real-time visualization of internal agent states, memory contents, emotional processes, and performance metrics.

## Features

### 🧠 Comprehensive Agent State Visualization

- **Real-time monitoring** of agent internal states
- **Multi-dimensional debugging** across 8 core areas
- **Interactive navigation** with keyboard controls
- **Auto-refresh capabilities** with configurable intervals

### 📊 Debugging Views

#### 1. Overview Panel

- System health score and status indicators
- Quick metrics summary (uptime, messages, errors)
- Performance alerts and recommendations
- Real-time agent vital signs

#### 2. Emotion Panel (`EmotionPanel.tsx`)

- **Current emotion state** with intensity visualization
- **Emotion blending** in 3D emotional space (valence, arousal, dominance)
- **Personality trait analysis** with Big Five model integration
- **Emotion history tracking** with triggers and duration
- **Real-time emotion transitions** and pattern analysis

#### 3. Memory Panel (`MemoryPanel.tsx`)

- **Vector embedding visualization** with 3072-dimensional space
- **Memory type distribution** (experience, knowledge, interaction, etc.)
- **Importance-based filtering** and retention policy analysis
- **Embedding cluster analysis** with coverage metrics
- **Interactive memory browsing** with detailed entry inspection

#### 4. Cognition Panel (`CognitionPanel.tsx`)

- **Thought-action loop tracing** with decision points
- **Active goal management** with progress tracking
- **Decision history analysis** with confidence scoring
- **Planning efficiency metrics** over time
- **Creativity level monitoring** and cognitive load assessment

#### 5. Performance Panel (`PerformancePanel.tsx`)

- **Resource utilization tracking** (CPU, memory, I/O)
- **Response time analysis** with trend indicators
- **Error rate monitoring** and alert generation
- **Throughput measurement** and performance scoring
- **System bottleneck identification** with recommendations

#### 6. Autonomy Panel (`AutonomyPanel.tsx`)

- **Autonomous action tracking** with success rates
- **Daily routine monitoring** and completion analysis
- **Curiosity-driven exploration** with topic interests
- **Social behavior analysis** and effectiveness metrics
- **Ethics system status** and decision-making patterns

#### 7. Portals Panel (`PortalsPanel.tsx`)

- **Multi-portal performance comparison** across providers
- **Usage statistics** and cost analysis per portal
- **Latency and throughput monitoring** with real-time charts
- **Token usage tracking** and cost optimization insights
- **Portal capability mapping** and load distribution

#### 8. Extensions Panel (`ExtensionsPanel.tsx`)

- **Extension activity monitoring** with event/action tracking
- **Error analysis** with severity classification
- **Performance profiling** per extension
- **Resource consumption** and efficiency metrics
- **Extension lifecycle management** and health monitoring

## Technical Architecture

### Component Structure

```
AgentDetail/
├── index.ts                 # Component exports and types
├── EmotionPanel.tsx        # Emotion system debugging
├── MemoryPanel.tsx         # Memory and embeddings visualization
├── CognitionPanel.tsx      # Thought processes and planning
├── PerformancePanel.tsx    # System performance metrics
├── AutonomyPanel.tsx       # Autonomous behavior analysis
├── PortalsPanel.tsx        # AI portal usage and performance
└── ExtensionsPanel.tsx     # Extension monitoring and debugging
```

### Data Flow

1. **Runtime Client Extensions** - Added comprehensive API endpoints for detailed agent data
2. **Real-time Data Fetching** - Auto-refresh with configurable intervals (2-5 seconds)
3. **Mock Data Generation** - Realistic synthetic data for development and testing
4. **Interactive Navigation** - Keyboard-driven interface with sound feedback

### Key Features

#### Real-time Visualization

- **Chart Integration** - Line, bar, and area charts for trend analysis
- **3D Emotion Space** - Valence/Arousal/Dominance coordinate mapping
- **Progress Bars** - Visual representation of metrics and completion
- **Color-coded Status** - Cyberpunk theme with semantic coloring

#### Advanced Analytics

- **Vector Embedding Analysis** - Dimensionality reduction and clustering
- **Performance Scoring** - Multi-factor health and efficiency scoring
- **Trend Detection** - Automatic trend analysis with directional indicators
- **Anomaly Detection** - Intelligent alert generation for unusual patterns

#### Interactive Controls

- **Navigation**: `←→` arrows to switch between panels
- **Refresh**: `R` for manual refresh, `A` to toggle auto-refresh
- **View Modes**: `V` to cycle through sub-views within panels
- **Selection**: `↑↓` arrows to navigate lists and details
- **Exit**: `ESC` to return to main agent list

## Usage

### Accessing Agent Diagnostics

1. Navigate to the Agents view in the CLI
2. Select an agent from the list
3. Press `D` to enter Deep Debug mode
4. Use arrow keys to navigate between diagnostic panels

### Navigation Flow

```
Agents List → [D] → Agent Detail Overview
             ↓
    [←→] Navigate between panels:
    Overview → Emotion → Memory → Cognition → Performance → Autonomy → Portals → Extensions
             ↓
    [V] Switch sub-views within panels
    [↑↓] Navigate items within lists
    [ESC] Return to Agents List
```

### Panel-Specific Controls

#### Memory Panel

- `V` - Switch between list, embeddings, and clusters view
- `↑↓` - Navigate memory entries
- View embedding vectors in real-time

#### Cognition Panel

- `V` - Switch between thoughts, goals, and decisions
- `↑↓` - Navigate through cognitive processes
- Real-time thought-action loop visualization

#### Performance Panel

- Automatic performance scoring and alerts
- Resource trend analysis with directional indicators
- Bottleneck identification and recommendations

#### Autonomy Panel

- `V` - Switch between actions, routine, social, and curiosity views
- `↑↓` - Navigate autonomous actions
- Real-time autonomy performance scoring

#### Portals Panel

- `V` - Switch between overview, performance, usage, and costs
- `↑↓` - Navigate between portal configurations
- Comparative performance analysis

#### Extensions Panel

- `V` - Switch between overview, usage, errors, and performance
- `↑↓` - Navigate extension list
- Error severity classification and analysis

## Data Sources

### Real-time Agent Data

- **Agent State**: Status, uptime, health metrics
- **Memory System**: Entries, embeddings, importance scores
- **Emotion System**: Current state, history, personality traits
- **Cognition System**: Thoughts, goals, decisions, planning
- **Performance Metrics**: CPU, memory, I/O, response times
- **Autonomous Behaviors**: Actions, routines, social interactions
- **Portal Usage**: Requests, latency, costs, token usage
- **Extension Activity**: Events, actions, errors, performance

### API Endpoints (Extended Runtime Client)

- `GET /api/agents/{id}/detail` - Comprehensive agent data
- `GET /api/agents/{id}/memory` - Memory entries and embeddings
- `GET /api/agents/{id}/emotions` - Emotion history and state
- `GET /api/agents/{id}/thoughts` - Current thought processes
- `GET /api/agents/{id}/performance` - Performance metrics
- `GET /api/agents/{id}/autonomous-actions` - Autonomous behavior data
- `GET /api/agents/{id}/portals` - Portal usage statistics
- `GET /api/agents/{id}/extensions` - Extension activity and errors

## Development Notes

### Mock Data Implementation

Currently uses sophisticated mock data generators that create realistic:

- Emotion transitions with temporal patterns
- Memory clusters with embedding-like properties
- Thought processes with confidence scoring
- Performance metrics with realistic variance
- Autonomous actions with success/failure patterns

### Future Enhancements

- **Real-time WebSocket connections** for live updates
- **Historical data storage** for long-term trend analysis
- **Export capabilities** for debugging reports
- **Alert configuration** for custom monitoring thresholds
- **Plugin system** for custom diagnostic panels

### Performance Considerations

- **Efficient rendering** with React optimization patterns
- **Data caching** to minimize API calls
- **Selective updates** to prevent unnecessary re-renders
- **Memory management** for large datasets
- **Responsive design** for different terminal sizes

## Integration with SYMindX

This debugging system integrates seamlessly with the existing SYMindX architecture:

- **Agent Runtime**: Direct access to agent internal state
- **Memory Providers**: Real-time memory content and embedding data
- **Emotion Modules**: Live emotion processing and history
- **Cognition Modules**: Thought processes and decision making
- **Portal System**: Multi-provider usage and performance data
- **Extension System**: Activity monitoring and error tracking

The system provides unprecedented visibility into agent behavior, making it an essential tool for:

- **Development debugging** - Understanding agent decision-making
- **Performance optimization** - Identifying bottlenecks and inefficiencies
- **Behavior analysis** - Monitoring autonomous actions and patterns
- **System monitoring** - Real-time health and performance tracking
- **Research insights** - Deep analysis of AI agent cognition and emotion
