/**
 * @module core/context/observability/context-visualizer
 * @description Visual representation and flow visualization for context operations
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { 
  ContextVisualizer,
  ContextVisualization,
  ContextVisualNode,
  ContextVisualEdge,
  ContextObservabilityConfig,
  ContextTrace
} from '../../../types/context/context-observability.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

interface VisualizationState {
  visualizationId: string;
  contextIds: string[];
  type: ContextVisualization['type'];
  updateSubscribers: Set<(update: ContextVisualization) => void>;
  lastUpdate: Date;
  nodePositions: Map<string, { x: number; y: number; z?: number }>;
  autoLayout: boolean;
}

interface LayoutAlgorithm {
  name: string;
  calculate: (nodes: ContextVisualNode[], edges: ContextVisualEdge[]) => Map<string, { x: number; y: number; z?: number }>;
}

/**
 * Context visualizer with multiple rendering formats and interactive features
 */
export class ContextVisualizerImpl extends EventEmitter implements ContextVisualizer {
  private visualizations = new Map<string, VisualizationState>();
  private config: ContextObservabilityConfig['visualization'];
  private contextTraces = new Map<string, ContextTrace>();
  private layoutAlgorithms: Map<string, LayoutAlgorithm>;

  constructor(config: ContextObservabilityConfig['visualization']) {
    super();
    this.config = config;
    this.layoutAlgorithms = this.initializeLayoutAlgorithms();
    
    if (config.enabled && config.enableRealTimeUpdates) {
      this.startUpdateTimer();
    }
  }

  /**
   * Generate visualization for context flow
   */
  async generateVisualization(
    contextIds: string[], 
    type: ContextVisualization['type']
  ): Promise<ContextVisualization> {
    if (!this.config.enabled) {
      throw new Error('Context visualization is disabled');
    }

    if (contextIds.length === 0) {
      throw new Error('At least one context ID is required');
    }

    const visualizationId = randomUUID();
    const startTime = performance.now();

    try {
      // Collect context data
      const contextData = await this.collectContextData(contextIds);
      
      // Generate nodes and edges based on visualization type
      const { nodes, edges } = await this.generateGraphElements(contextData, type);
      
      // Apply layout algorithm
      const layout = await this.calculateLayout(nodes, edges, type);
      
      // Create visualization
      const visualization: ContextVisualization = {
        visualizationId,
        type,
        nodes,
        edges,
        layout,
        interactions: {
          enableZoom: this.config.enableInteractiveMode,
          enablePan: this.config.enableInteractiveMode,
          enableSelection: this.config.enableInteractiveMode,
          enableFiltering: this.config.enableInteractiveMode,
          enableAnimation: this.config.enableRealTimeUpdates
        },
        rendering: {
          generatedAt: new Date(),
          nodeCount: nodes.length,
          edgeCount: edges.length,
          renderTime: performance.now() - startTime,
          format: this.config.renderFormat
        }
      };

      // Store visualization state
      const state: VisualizationState = {
        visualizationId,
        contextIds,
        type,
        updateSubscribers: new Set(),
        lastUpdate: new Date(),
        nodePositions: new Map(),
        autoLayout: true
      };

      // Store node positions
      nodes.forEach(node => {
        state.nodePositions.set(node.nodeId, node.position);
      });

      this.visualizations.set(visualizationId, state);

      runtimeLogger.debug('Visualization generated', {
        visualizationId,
        type,
        contextCount: contextIds.length,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        renderTime: visualization.rendering.renderTime.toFixed(2) + 'ms'
      });

      this.emit('visualization_generated', { visualizationId, visualization });

      return visualization;

    } catch (error) {
      runtimeLogger.error('Visualization generation failed', {
        visualizationId,
        contextIds,
        type,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(`Failed to generate visualization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update existing visualization with new data
   */
  async updateVisualization(visualizationId: string): Promise<void> {
    const state = this.visualizations.get(visualizationId);
    if (!state) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    try {
      const updatedVisualization = await this.generateVisualization(state.contextIds, state.type);
      
      // Preserve custom node positions if not using auto-layout
      if (!state.autoLayout) {
        updatedVisualization.nodes.forEach(node => {
          const savedPosition = state.nodePositions.get(node.nodeId);
          if (savedPosition) {
            node.position = savedPosition;
          }
        });
      }

      state.lastUpdate = new Date();

      // Notify subscribers
      state.updateSubscribers.forEach(callback => {
        try {
          callback(updatedVisualization);
        } catch (error) {
          runtimeLogger.error('Update callback failed', { visualizationId, error });
        }
      });

      runtimeLogger.debug('Visualization updated', {
        visualizationId,
        nodeCount: updatedVisualization.nodes.length,
        edgeCount: updatedVisualization.edges.length,
        subscriberCount: state.updateSubscribers.size
      });

      this.emit('visualization_updated', { visualizationId, visualization: updatedVisualization });

    } catch (error) {
      runtimeLogger.error('Visualization update failed', { visualizationId, error });
      throw error;
    }
  }

  /**
   * Export visualization in specified format
   */
  async exportVisualization(
    visualizationId: string, 
    format: 'svg' | 'png' | 'json'
  ): Promise<string | Buffer> {
    const visualization = await this.getVisualization(visualizationId);
    if (!visualization) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    try {
      switch (format) {
        case 'json':
          return JSON.stringify(visualization, null, 2);

        case 'svg':
          return this.generateSVG(visualization);

        case 'png':
          return this.generatePNG(visualization);

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      runtimeLogger.error('Visualization export failed', { visualizationId, format, error });
      throw new Error(`Failed to export visualization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get visualization data
   */
  async getVisualization(visualizationId: string): Promise<ContextVisualization | undefined> {
    const state = this.visualizations.get(visualizationId);
    if (!state) {
      return undefined;
    }

    // Generate fresh visualization data
    try {
      const visualization = await this.generateVisualization(state.contextIds, state.type);
      return visualization;
    } catch (error) {
      runtimeLogger.error('Failed to get visualization', { visualizationId, error });
      return undefined;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribeToUpdates(
    visualizationId: string, 
    callback: (update: ContextVisualization) => void
  ): Promise<void> {
    const state = this.visualizations.get(visualizationId);
    if (!state) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    state.updateSubscribers.add(callback);

    runtimeLogger.debug('Subscribed to visualization updates', {
      visualizationId,
      subscriberCount: state.updateSubscribers.size
    });

    this.emit('subscription_added', { visualizationId });
  }

  /**
   * Unsubscribe from updates
   */
  async unsubscribeFromUpdates(visualizationId: string): Promise<void> {
    const state = this.visualizations.get(visualizationId);
    if (!state) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    state.updateSubscribers.clear();

    runtimeLogger.debug('Unsubscribed from visualization updates', { visualizationId });

    this.emit('subscription_removed', { visualizationId });
  }

  /**
   * Set context trace data for visualization
   */
  setContextTrace(contextId: string, trace: ContextTrace): void {
    this.contextTraces.set(contextId, trace);
    
    // Update any visualizations that include this context
    for (const [visualizationId, state] of this.visualizations.entries()) {
      if (state.contextIds.includes(contextId)) {
        this.updateVisualization(visualizationId).catch(error => {
          runtimeLogger.error('Failed to update visualization after trace update', {
            visualizationId,
            contextId,
            error
          });
        });
      }
    }
  }

  /**
   * Private helper methods
   */

  private async collectContextData(contextIds: string[]): Promise<Map<string, any>> {
    const contextData = new Map<string, any>();

    for (const contextId of contextIds) {
      const trace = this.contextTraces.get(contextId);
      if (trace) {
        contextData.set(contextId, {
          trace,
          type: trace.contextType,
          status: trace.lifecycle.destroyed ? 'inactive' : 'active',
          metrics: {
            lifetime: trace.lifecycle.totalLifetimeMs || 0,
            accessCount: trace.accessPatterns.length,
            transformationCount: trace.transformations.length,
            qualityScore: Object.values(trace.quality).reduce((a, b) => a + b, 0) / 5
          }
        });
      } else {
        // Create mock data for missing contexts
        contextData.set(contextId, {
          type: 'unknown',
          status: 'pending',
          metrics: {
            lifetime: 0,
            accessCount: 0,
            transformationCount: 0,
            qualityScore: 0.5
          }
        });
      }
    }

    return contextData;
  }

  private async generateGraphElements(
    contextData: Map<string, any>, 
    type: ContextVisualization['type']
  ): Promise<{ nodes: ContextVisualNode[]; edges: ContextVisualEdge[] }> {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    switch (type) {
      case 'flow':
        return this.generateFlowGraph(contextData);
      
      case 'hierarchy':
        return this.generateHierarchyGraph(contextData);
      
      case 'network':
        return this.generateNetworkGraph(contextData);
      
      case 'timeline':
        return this.generateTimelineGraph(contextData);
      
      case 'heatmap':
        return this.generateHeatmapGraph(contextData);
      
      default:
        throw new Error(`Unsupported visualization type: ${type}`);
    }
  }

  private generateFlowGraph(contextData: Map<string, any>): { nodes: ContextVisualNode[]; edges: ContextVisualEdge[] } {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    // Create nodes for each context
    for (const [contextId, data] of contextData.entries()) {
      const node: ContextVisualNode = {
        nodeId: contextId,
        label: this.formatContextLabel(contextId, data),
        type: data.type,
        position: { x: 0, y: 0 }, // Will be calculated by layout
        size: this.calculateNodeSize(data),
        style: this.getNodeStyle(data),
        data: data.metrics,
        metadata: {
          contextId,
          status: data.status,
          metrics: data.metrics
        }
      };
      nodes.push(node);
    }

    // Create edges based on context relationships
    for (const [contextId, data] of contextData.entries()) {
      if (data.trace?.hierarchy?.parentContextId) {
        const parentId = data.trace.hierarchy.parentContextId;
        if (contextData.has(parentId)) {
          edges.push({
            edgeId: randomUUID(),
            sourceNodeId: parentId,
            targetNodeId: contextId,
            type: 'dependency',
            style: this.getEdgeStyle('dependency'),
            data: {},
            metadata: {
              flowRate: data.metrics.accessCount,
              latency: data.metrics.lifetime / Math.max(1, data.metrics.accessCount)
            }
          });
        }
      }

      // Add transformation edges
      if (data.trace?.transformations) {
        data.trace.transformations.forEach((transform: any, index: number) => {
          if (index > 0) {
            edges.push({
              edgeId: randomUUID(),
              sourceNodeId: contextId,
              targetNodeId: contextId,
              label: transform.transformationType,
              type: 'data',
              style: this.getEdgeStyle('data'),
              data: { transformation: transform },
              metadata: {
                latency: transform.duration,
                errorRate: transform.success ? 0 : 1
              }
            });
          }
        });
      }
    }

    return { nodes, edges };
  }

  private generateHierarchyGraph(contextData: Map<string, any>): { nodes: ContextVisualNode[]; edges: ContextVisualEdge[] } {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    // Build hierarchy tree
    const rootContexts = new Set<string>();
    const childMap = new Map<string, string[]>();

    for (const [contextId, data] of contextData.entries()) {
      const parentId = data.trace?.hierarchy?.parentContextId;
      if (parentId && contextData.has(parentId)) {
        if (!childMap.has(parentId)) {
          childMap.set(parentId, []);
        }
        childMap.get(parentId)!.push(contextId);
      } else {
        rootContexts.add(contextId);
      }
    }

    // Create nodes with hierarchy information
    for (const [contextId, data] of contextData.entries()) {
      const depth = data.trace?.hierarchy?.depth || 0;
      const node: ContextVisualNode = {
        nodeId: contextId,
        label: this.formatContextLabel(contextId, data),
        type: data.type,
        position: { x: 0, y: depth * 100 }, // Y position based on depth
        size: this.calculateNodeSize(data),
        style: this.getNodeStyle(data, depth),
        data: { ...data.metrics, depth },
        metadata: {
          contextId,
          status: data.status,
          metrics: data.metrics,
          depth
        }
      };
      nodes.push(node);
    }

    // Create hierarchy edges
    for (const [parentId, children] of childMap.entries()) {
      children.forEach(childId => {
        edges.push({
          edgeId: randomUUID(),
          sourceNodeId: parentId,
          targetNodeId: childId,
          type: 'control',
          style: this.getEdgeStyle('control'),
          data: {},
          metadata: {}
        });
      });
    }

    return { nodes, edges };
  }

  private generateNetworkGraph(contextData: Map<string, any>): { nodes: ContextVisualNode[]; edges: ContextVisualEdge[] } {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    // Create nodes grouped by type
    const typeGroups = new Map<string, string[]>();
    
    for (const [contextId, data] of contextData.entries()) {
      const type = data.type;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(contextId);

      const node: ContextVisualNode = {
        nodeId: contextId,
        label: this.formatContextLabel(contextId, data),
        type,
        position: { x: 0, y: 0 }, // Will be calculated by layout
        size: this.calculateNodeSize(data),
        style: this.getNodeStyle(data),
        data: data.metrics,
        metadata: {
          contextId,
          status: data.status,
          metrics: data.metrics
        }
      };
      nodes.push(node);
    }

    // Create network edges based on interactions
    for (const [contextId, data] of contextData.entries()) {
      if (data.trace?.accessPatterns) {
        data.trace.accessPatterns.forEach((access: any) => {
          const accessorId = access.accessor;
          if (contextData.has(accessorId)) {
            edges.push({
              edgeId: randomUUID(),
              sourceNodeId: accessorId,
              targetNodeId: contextId,
              type: 'communication',
              style: this.getEdgeStyle('communication'),
              data: { access },
              metadata: {
                flowRate: 1,
                latency: access.duration,
                bandwidth: access.dataSize
              }
            });
          }
        });
      }
    }

    return { nodes, edges };
  }

  private generateTimelineGraph(contextData: Map<string, any>): { nodes: ContextVisualNode[]; edges: ContextVisualEdge[] } {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    // Sort contexts by creation time
    const sortedContexts = Array.from(contextData.entries())
      .sort(([, a], [, b]) => {
        const aTime = a.trace?.lifecycle?.created?.getTime() || 0;
        const bTime = b.trace?.lifecycle?.created?.getTime() || 0;
        return aTime - bTime;
      });

    // Create timeline nodes
    sortedContexts.forEach(([contextId, data], index) => {
      const createdTime = data.trace?.lifecycle?.created?.getTime() || Date.now();
      const startTime = sortedContexts[0][1].trace?.lifecycle?.created?.getTime() || Date.now();
      const relativeTime = createdTime - startTime;

      const node: ContextVisualNode = {
        nodeId: contextId,
        label: this.formatContextLabel(contextId, data),
        type: data.type,
        position: { 
          x: relativeTime / 1000, // Time in seconds
          y: index * 50 
        },
        size: this.calculateNodeSize(data),
        style: this.getNodeStyle(data),
        data: { ...data.metrics, createdTime, relativeTime },
        metadata: {
          contextId,
          status: data.status,
          metrics: data.metrics
        }
      };
      nodes.push(node);
    });

    // Create temporal edges
    for (let i = 1; i < sortedContexts.length; i++) {
      const prevContextId = sortedContexts[i - 1][0];
      const currentContextId = sortedContexts[i][0];

      edges.push({
        edgeId: randomUUID(),
        sourceNodeId: prevContextId,
        targetNodeId: currentContextId,
        type: 'dependency',
        style: { ...this.getEdgeStyle('dependency'), style: 'dashed' },
        data: {},
        metadata: {}
      });
    }

    return { nodes, edges };
  }

  private generateHeatmapGraph(contextData: Map<string, any>): { nodes: ContextVisualNode[]; edges: ContextVisualEdge[] } {
    const nodes: ContextVisualNode[] = [];
    const edges: ContextVisualEdge[] = [];

    // Calculate grid size
    const gridSize = Math.ceil(Math.sqrt(contextData.size));
    
    // Create heatmap nodes
    let index = 0;
    for (const [contextId, data] of contextData.entries()) {
      const x = (index % gridSize) * 100;
      const y = Math.floor(index / gridSize) * 100;
      
      const intensity = data.metrics.qualityScore || 0;
      const node: ContextVisualNode = {
        nodeId: contextId,
        label: this.formatContextLabel(contextId, data),
        type: data.type,
        position: { x, y },
        size: { width: 80, height: 80 },
        style: this.getHeatmapNodeStyle(intensity),
        data: { ...data.metrics, intensity },
        metadata: {
          contextId,
          status: data.status,
          metrics: data.metrics
        }
      };
      nodes.push(node);
      index++;
    }

    // No edges for heatmap visualization
    return { nodes, edges };
  }

  private async calculateLayout(
    nodes: ContextVisualNode[], 
    edges: ContextVisualEdge[], 
    type: ContextVisualization['type']
  ): Promise<ContextVisualization['layout']> {
    let algorithm: string;
    
    switch (type) {
      case 'hierarchy':
        algorithm = 'hierarchy';
        break;
      case 'network':
        algorithm = 'force';
        break;
      case 'timeline':
        algorithm = 'grid';
        break;
      case 'heatmap':
        algorithm = 'grid';
        break;
      default:
        algorithm = 'force';
    }

    const layoutAlg = this.layoutAlgorithms.get(algorithm);
    if (!layoutAlg) {
      throw new Error(`Layout algorithm not found: ${algorithm}`);
    }

    const positions = layoutAlg.calculate(nodes, edges);
    
    // Update node positions
    nodes.forEach(node => {
      const position = positions.get(node.nodeId);
      if (position) {
        node.position = position;
      }
    });

    // Calculate bounds
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);

    return {
      algorithm,
      dimensions: { 
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
      },
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      }
    };
  }

  private formatContextLabel(contextId: string, data: any): string {
    const type = data.type || 'unknown';
    const shortId = contextId.substring(0, 8);
    return `${type}:${shortId}`;
  }

  private calculateNodeSize(data: any): { width: number; height: number } {
    const baseSize = 60;
    const scaleFactor = Math.min(2, Math.max(0.5, (data.metrics?.qualityScore || 0.5) * 2));
    return {
      width: baseSize * scaleFactor,
      height: baseSize * scaleFactor
    };
  }

  private getNodeStyle(data: any, depth?: number): ContextVisualNode['style'] {
    const colors = {
      portal: '#4CAF50',
      memory: '#2196F3',
      cognition: '#FF9800',
      emotion: '#E91E63',
      extension: '#9C27B0',
      system: '#607D8B',
      unknown: '#9E9E9E'
    };

    const baseColor = colors[data.type as keyof typeof colors] || colors.unknown;
    const opacity = Math.max(0.3, Math.min(1, data.metrics?.qualityScore || 0.5));

    return {
      color: baseColor,
      borderColor: this.darkenColor(baseColor, 0.2),
      shape: this.getNodeShape(data.type),
      opacity
    };
  }

  private getHeatmapNodeStyle(intensity: number): ContextVisualNode['style'] {
    const hue = intensity * 120; // 0 = red, 120 = green
    const color = `hsl(${hue}, 70%, 50%)`;
    
    return {
      color,
      borderColor: this.darkenColor(color, 0.3),
      shape: 'rectangle',
      opacity: 0.8
    };
  }

  private getNodeShape(type: string): ContextVisualNode['style']['shape'] {
    const shapes: Record<string, ContextVisualNode['style']['shape']> = {
      portal: 'circle',
      memory: 'rectangle',
      cognition: 'diamond',
      emotion: 'ellipse',
      extension: 'rectangle',
      system: 'rectangle'
    };
    return shapes[type] || 'circle';
  }

  private getEdgeStyle(type: string): ContextVisualEdge['style'] {
    const styles = {
      data: { color: '#4CAF50', width: 2, style: 'solid' as const, arrow: true, opacity: 0.8 },
      control: { color: '#2196F3', width: 1, style: 'solid' as const, arrow: true, opacity: 0.6 },
      dependency: { color: '#FF9800', width: 1, style: 'dashed' as const, arrow: true, opacity: 0.7 },
      communication: { color: '#9C27B0', width: 1, style: 'dotted' as const, arrow: true, opacity: 0.6 }
    };
    return styles[type as keyof typeof styles] || styles.data;
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening (in production, use a proper color library)
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
      const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
      const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  private generateSVG(visualization: ContextVisualization): string {
    const { nodes, edges, layout } = visualization;
    const width = layout.dimensions.width + 100;
    const height = layout.dimensions.height + 100;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
      </marker>
    </defs>`;

    // Draw edges first
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.nodeId === edge.sourceNodeId);
      const targetNode = nodes.find(n => n.nodeId === edge.targetNodeId);
      
      if (sourceNode && targetNode) {
        const x1 = sourceNode.position.x + 50;
        const y1 = sourceNode.position.y + 50;
        const x2 = targetNode.position.x + 50;
        const y2 = targetNode.position.y + 50;

        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                stroke="${edge.style.color}" 
                stroke-width="${edge.style.width}"
                stroke-dasharray="${edge.style.style === 'dashed' ? '5,5' : edge.style.style === 'dotted' ? '2,2' : 'none'}"
                marker-end="url(#arrowhead)" />`;
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const x = node.position.x + 50;
      const y = node.position.y + 50;

      if (node.style.shape === 'circle') {
        svg += `<circle cx="${x}" cy="${y}" r="${node.size.width / 2}" 
                fill="${node.style.color}" 
                stroke="${node.style.borderColor}" 
                stroke-width="2"
                opacity="${node.style.opacity}" />`;
      } else {
        svg += `<rect x="${x - node.size.width / 2}" y="${y - node.size.height / 2}" 
                width="${node.size.width}" height="${node.size.height}"
                fill="${node.style.color}" 
                stroke="${node.style.borderColor}" 
                stroke-width="2"
                opacity="${node.style.opacity}" />`;
      }

      // Add label
      svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="12" fill="#333">
              ${node.label}
            </text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  private generatePNG(visualization: ContextVisualization): Buffer {
    // In a real implementation, this would use a library like puppeteer or canvas
    // For now, return a placeholder
    const placeholder = `PNG export not implemented. Visualization: ${visualization.visualizationId}`;
    return Buffer.from(placeholder);
  }

  private initializeLayoutAlgorithms(): Map<string, LayoutAlgorithm> {
    const algorithms = new Map<string, LayoutAlgorithm>();

    // Force-directed layout
    algorithms.set('force', {
      name: 'Force-Directed',
      calculate: (nodes, edges) => {
        const positions = new Map<string, { x: number; y: number }>();
        
        // Simple force-directed algorithm
        nodes.forEach((node, index) => {
          const angle = (index / nodes.length) * 2 * Math.PI;
          const radius = Math.min(200, nodes.length * 20);
          positions.set(node.nodeId, {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          });
        });

        return positions;
      }
    });

    // Hierarchical layout
    algorithms.set('hierarchy', {
      name: 'Hierarchical',
      calculate: (nodes, edges) => {
        const positions = new Map<string, { x: number; y: number }>();
        const levels = new Map<number, string[]>();
        
        // Group nodes by depth
        nodes.forEach(node => {
          const depth = (node.data as any)?.depth || 0;
          if (!levels.has(depth)) {
            levels.set(depth, []);
          }
          levels.get(depth)!.push(node.nodeId);
        });

        // Position nodes
        levels.forEach((nodeIds, depth) => {
          nodeIds.forEach((nodeId, index) => {
            positions.set(nodeId, {
              x: (index - nodeIds.length / 2) * 150,
              y: depth * 100
            });
          });
        });

        return positions;
      }
    });

    // Grid layout
    algorithms.set('grid', {
      name: 'Grid',
      calculate: (nodes, edges) => {
        const positions = new Map<string, { x: number; y: number }>();
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        
        nodes.forEach((node, index) => {
          positions.set(node.nodeId, {
            x: (index % gridSize) * 120,
            y: Math.floor(index / gridSize) * 120
          });
        });

        return positions;
      }
    });

    return algorithms;
  }

  private startUpdateTimer(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [visualizationId, state] of this.visualizations.entries()) {
        // Update if it's been more than 5 seconds since last update
        if (now.getTime() - state.lastUpdate.getTime() > 5000) {
          this.updateVisualization(visualizationId).catch(error => {
            runtimeLogger.error('Scheduled visualization update failed', {
              visualizationId,
              error
            });
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get visualizer statistics
   */
  getStatistics() {
    return {
      totalVisualizations: this.visualizations.size,
      totalSubscribers: Array.from(this.visualizations.values())
        .reduce((sum, state) => sum + state.updateSubscribers.size, 0),
      availableLayouts: Array.from(this.layoutAlgorithms.keys()),
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.visualizations.clear();
    this.contextTraces.clear();
    this.removeAllListeners();
    runtimeLogger.debug('Context visualizer disposed');
  }
}