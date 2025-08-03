/**
 * Advanced Features for RuneLite Extension
 * Implements pathfinding, automation, macro system, and plugin bridge
 */

import { EventEmitter } from 'events';

import * as pako from 'pako';
import { v4 as uuidv4 } from 'uuid';

import { runtimeLogger } from '../../utils/logger.js';

import {
  EventType,
  ActionType,
  GameEvent,
  GameState,
  PathfindingOptions,
  Path,
  PathTile,
  Obstacle,
  Macro,
  MacroAction,
  MacroTrigger,
  MacroCondition,
  AutomationTask as BaseAutomationTask,
  AutomationSafetyConfig,
  EventRecording,
  RecordedEvent,
  EventPriority,
  EventBatch,
  StateDelta,
  StateChange,
  PluginMessage,
  PluginCapability,
  NPCInfo,
  GameObject,
  GroundItem,
  PlayerInfo,
} from './types.js';

// Extended task types for different automation scenarios
interface TaskStep {
  id: string;
  action: ActionType;
  parameters: Record<string, unknown>;
  delay?: number;
}

interface SequentialTask extends BaseAutomationTask {
  type: 'sequence';
  steps: TaskStep[];
  startTime?: number;
}

interface LoopTask extends BaseAutomationTask {
  type: 'loop';
  steps: TaskStep[];
  iterations: number;
  startTime?: number;
}

interface ConditionalTask extends BaseAutomationTask {
  type: 'conditional';
  conditions: MacroCondition[];
  steps: TaskStep[];
  startTime?: number;
}

type AutomationTask =
  | BaseAutomationTask
  | SequentialTask
  | LoopTask
  | ConditionalTask;

/**
 * Pathfinding System
 * Implements A* pathfinding with obstacle avoidance
 */
export class PathfindingSystem extends EventEmitter {
  private gameState: GameState;
  private collisionMap: Map<string, boolean> = new Map();
  private teleportLocations: Map<
    string,
    { x: number; y: number; plane: number }
  > = new Map();

  constructor(gameState: GameState) {
    super();
    this.gameState = gameState;
    this.initializeTeleports();
  }

  private initializeTeleports(): void {
    // Common teleport locations
    this.teleportLocations.set('varrock', { x: 3212, y: 3424, plane: 0 });
    this.teleportLocations.set('lumbridge', { x: 3222, y: 3218, plane: 0 });
    this.teleportLocations.set('falador', { x: 2965, y: 3378, plane: 0 });
    this.teleportLocations.set('camelot', { x: 2757, y: 3478, plane: 0 });
    this.teleportLocations.set('ardougne', { x: 2662, y: 3305, plane: 0 });
    this.teleportLocations.set('watchtower', { x: 2549, y: 3112, plane: 0 });
    this.teleportLocations.set('trollheim', { x: 2888, y: 3674, plane: 0 });
    this.teleportLocations.set('ape_atoll', { x: 2754, y: 2784, plane: 0 });
    this.teleportLocations.set('kourend', { x: 1643, y: 3673, plane: 0 });
  }

  async findPath(
    start: { x: number; y: number; plane: number },
    end: { x: number; y: number; plane: number },
    options: PathfindingOptions = {}
  ): Promise<Path | null> {
    // Check if teleport is more efficient
    if (options.allowTeleports) {
      const teleportPath = this.checkTeleportPath(start, end);
      if (teleportPath) return teleportPath;
    }

    // A* pathfinding implementation
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, PathTile>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const startKey = this.tileKey(start);
    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, end));

    while (openSet.size > 0) {
      const current = this.getLowestFScore(openSet, fScore);
      if (!current) break;

      const currentTile = this.keyToTile(current);
      if (this.isAtDestination(currentTile, end)) {
        return this.reconstructPath(cameFrom, currentTile);
      }

      openSet.delete(current);
      closedSet.add(current);

      // Check neighbors
      const neighbors = this.getNeighbors(currentTile, options);
      for (const neighbor of neighbors) {
        const neighborKey = this.tileKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeGScore =
          (gScore.get(current) || Infinity) + neighbor.cost;

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, currentTile);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(
          neighborKey,
          tentativeGScore + this.heuristic(neighbor, end)
        );
      }
    }

    return null; // No path found
  }

  private tileKey(tile: { x: number; y: number; plane: number }): string {
    return `${tile.x},${tile.y},${tile.plane}`;
  }

  private keyToTile(key: string): PathTile {
    const parts = key.split(',').map(Number);
    const x = parts[0] ?? 0;
    const y = parts[1] ?? 0;
    const plane = parts[2] ?? 0;
    return { x, y, plane, walkable: true, cost: 1 };
  }

  private heuristic(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private isAtDestination(
    current: { x: number; y: number; plane: number },
    end: { x: number; y: number; plane: number }
  ): boolean {
    return (
      current.x === end.x && current.y === end.y && current.plane === end.plane
    );
  }

  private getLowestFScore(
    openSet: Set<string>,
    fScore: Map<string, number>
  ): string | null {
    let lowest: string | null = null;
    let lowestScore = Infinity;

    for (const key of openSet) {
      const score = fScore.get(key) || Infinity;
      if (score < lowestScore) {
        lowest = key;
        lowestScore = score;
      }
    }

    return lowest;
  }

  private getNeighbors(
    tile: PathTile,
    options: PathfindingOptions
  ): PathTile[] {
    const neighbors: PathTile[] = [];
    const directions = [
      { dx: 0, dy: 1 }, // North
      { dx: 1, dy: 0 }, // East
      { dx: 0, dy: -1 }, // South
      { dx: -1, dy: 0 }, // West
      { dx: 1, dy: 1 }, // Northeast
      { dx: 1, dy: -1 }, // Southeast
      { dx: -1, dy: -1 }, // Southwest
      { dx: -1, dy: 1 }, // Northwest
    ];

    for (const dir of directions) {
      const newX = tile.x + dir.dx;
      const newY = tile.y + dir.dy;
      const neighbor: PathTile = {
        x: newX,
        y: newY,
        plane: tile.plane,
        walkable: true,
        cost: Math.abs(dir.dx) + Math.abs(dir.dy) > 1 ? 1.414 : 1, // Diagonal cost
      };

      if (this.isWalkable(neighbor, options)) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private isWalkable(tile: PathTile, options: PathfindingOptions): boolean {
    const key = this.tileKey(tile);

    // Check collision map
    if (this.collisionMap.has(key)) {
      return this.collisionMap.get(key)!;
    }

    // Check for players
    if (options.avoidPlayers && this.hasPlayer(tile)) {
      return false;
    }

    // Check for combat
    if (options.avoidCombat && this.hasCombat(tile)) {
      return false;
    }

    return true;
  }

  private hasPlayer(tile: PathTile): boolean {
    if (!this.gameState.players) return false;
    return this.gameState.players.some(
      (p) =>
        p.location.x === tile.x &&
        p.location.y === tile.y &&
        p.location.plane === tile.plane
    );
  }

  private hasCombat(tile: PathTile): boolean {
    if (!this.gameState.npcs) return false;
    return this.gameState.npcs.some(
      (npc) =>
        npc.location.x === tile.x &&
        npc.location.y === tile.y &&
        npc.location.plane === tile.plane &&
        npc.combatLevel > 0
    );
  }

  private checkTeleportPath(
    start: { x: number; y: number; plane: number },
    end: { x: number; y: number; plane: number }
  ): Path | null {
    let bestTeleport: string | null = null;
    let bestDistance = this.heuristic(start, end);

    for (const [name, location] of this.teleportLocations) {
      const distance = this.heuristic(location, end);
      if (distance < bestDistance) {
        bestTeleport = name;
        bestDistance = distance;
      }
    }

    if (bestTeleport) {
      const teleportLoc = this.teleportLocations.get(bestTeleport)!;
      return {
        tiles: [
          { ...start, walkable: true, cost: 0 },
          { ...teleportLoc, walkable: true, cost: 0 },
        ],
        distance: bestDistance,
        estimatedTime: 5000, // 5 seconds for teleport
        obstacles: [],
      };
    }

    return null;
  }

  private reconstructPath(
    cameFrom: Map<string, PathTile>,
    current: PathTile
  ): Path {
    const tiles: PathTile[] = [current];
    let currentKey = this.tileKey(current);

    while (cameFrom.has(currentKey)) {
      const previous = cameFrom.get(currentKey)!;
      tiles.unshift(previous);
      currentKey = this.tileKey(previous);
    }

    const distance = tiles.length - 1;
    const estimatedTime = distance * 600; // 600ms per tile

    return {
      tiles,
      distance,
      estimatedTime,
      obstacles: this.detectObstacles(tiles),
    };
  }

  private detectObstacles(tiles: PathTile[]): Obstacle[] {
    const obstacles: Obstacle[] = [];

    // Check for doors, gates, etc. along the path
    for (let i = 0; i < tiles.length - 1; i++) {
      const current = tiles[i];
      const next = tiles[i + 1];

      // Check game objects between tiles
      if (this.gameState.objects && current && next) {
        const obstacle = this.gameState.objects.find((obj) =>
          this.isObstacleBetween(current, next, obj)
        );

        if (obstacle) {
          obstacles.push({
            type: this.getObstacleType(obstacle),
            location: obstacle.location,
            action: obstacle.actions[0] || 'examine',
          });
        }
      }
    }

    return obstacles;
  }

  private isObstacleBetween(
    tile1: PathTile,
    tile2: PathTile,
    obj: GameObject
  ): boolean {
    // Simple check - in reality would need proper collision detection
    return (
      obj.location.plane === tile1.plane &&
      obj.location.x >= Math.min(tile1.x, tile2.x) &&
      obj.location.x <= Math.max(tile1.x, tile2.x) &&
      obj.location.y >= Math.min(tile1.y, tile2.y) &&
      obj.location.y <= Math.max(tile1.y, tile2.y)
    );
  }

  private getObstacleType(obj: GameObject): Obstacle['type'] {
    const name = obj.name.toLowerCase();
    if (name.includes('door')) return 'door';
    if (name.includes('gate')) return 'gate';
    if (name.includes('stile')) return 'stile';
    return 'agility';
  }

  updateCollisionMap(updates: Map<string, boolean>): void {
    for (const [key, walkable] of updates) {
      this.collisionMap.set(key, walkable);
    }
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
}

/**
 * Macro System
 * Handles macro recording, playback, and management
 */
export class MacroSystem extends EventEmitter {
  private macros = new Map<string, Macro>();
  private activeMacro: Macro | null = null;
  private isRecording = false;
  private recordedActions: MacroAction[] = [];
  private macroExecutor?: NodeJS.Timeout;

  constructor() {
    super();
  }

  startRecording(name: string, description?: string): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    this.isRecording = true;
    this.recordedActions = [];

    runtimeLogger.info(`📹 Started recording macro: ${name}`);
    this.emit('recording:started', { name, description });
  }

  stopRecording(): Macro | null {
    if (!this.isRecording) return null;

    this.isRecording = false;

    if (this.recordedActions.length === 0) {
      runtimeLogger.warn('⚠️ No actions recorded');
      return null;
    }

    const macro: Macro = {
      id: uuidv4(),
      name: `Macro_${Date.now()}`,
      actions: this.recordedActions,
      metadata: {
        createdAt: Date.now(),
        actionCount: this.recordedActions.length,
      },
    };

    this.macros.set(macro.id, macro);
    runtimeLogger.info(
      `✅ Recorded macro with ${macro.actions.length} actions`
    );
    this.emit('recording:stopped', macro);

    return macro;
  }

  recordAction(action: MacroAction): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      ...action,
      delay:
        this.recordedActions.length > 0
          ? Date.now() - this.getLastActionTime()
          : 0,
    });

    this.emit('action:recorded', action);
  }

  private getLastActionTime(): number {
    if (this.recordedActions.length === 0) return Date.now();
    // Calculate based on cumulative delays
    return Date.now(); // Simplified - would track actual timestamps
  }

  async playMacro(
    macroId: string,
    options: {
      speed?: number;
      loop?: boolean;
      conditions?: MacroCondition[];
    } = {}
  ): Promise<void> {
    const macro = this.macros.get(macroId);
    if (!macro) {
      throw new Error(`Macro not found: ${macroId}`);
    }

    if (this.activeMacro) {
      this.stopMacro();
    }

    this.activeMacro = macro;
    const speed = options.speed || 1;

    runtimeLogger.info(`▶️ Playing macro: ${macro.name}`);
    this.emit('macro:started', { macro, options });

    let actionIndex = 0;

    const executeNextAction = async () => {
      if (!this.activeMacro || actionIndex >= macro.actions.length) {
        if (options.loop && this.activeMacro) {
          actionIndex = 0;
        } else {
          this.stopMacro();
          return;
        }
      }

      const action = macro.actions[actionIndex];

      // Ensure action exists
      if (!action) {
        this.stopMacro();
        return;
      }

      // Check conditions
      if (action.condition && !this.evaluateCondition(action.condition)) {
        actionIndex++;
        this.macroExecutor = setTimeout(executeNextAction, 100);
        return;
      }

      // Execute action
      this.emit('action:execute', action);

      actionIndex++;
      const delay = (action.delay || 1000) / speed;
      this.macroExecutor = setTimeout(executeNextAction, delay);
    };

    executeNextAction();
  }

  stopMacro(): void {
    if (this.macroExecutor) {
      clearTimeout(this.macroExecutor);
      this.macroExecutor = null as any;
    }

    if (this.activeMacro) {
      runtimeLogger.info(`⏹️ Stopped macro: ${this.activeMacro.name}`);
      this.emit('macro:stopped', this.activeMacro);
      this.activeMacro = null;
    }
  }

  private evaluateCondition(condition: MacroCondition): boolean {
    // Simplified condition evaluation
    switch (condition.type) {
      case 'hp_below':
        // Would check actual HP
        return true;
      case 'prayer_below':
        // Would check actual prayer
        return true;
      case 'inventory_full':
        // Would check inventory
        return false;
      default:
        return true;
    }
  }

  saveMacro(macro: Macro): void {
    this.macros.set(macro.id, macro);
    this.emit('macro:saved', macro);
  }

  deleteMacro(macroId: string): boolean {
    const deleted = this.macros.delete(macroId);
    if (deleted) {
      this.emit('macro:deleted', macroId);
    }
    return deleted;
  }

  getMacro(macroId: string): Macro | undefined {
    return this.macros.get(macroId);
  }

  getAllMacros(): Macro[] {
    return Array.from(this.macros.values());
  }
}

/**
 * Automation System
 * Manages automated tasks with safety features
 */
export class AutomationSystem extends EventEmitter {
  private tasks = new Map<string, AutomationTask>();
  private activeTasks = new Set<string>();
  private safetyConfig: AutomationSafetyConfig;
  private actionCount = 0;
  private lastActionTime = 0;
  private breakScheduler?: NodeJS.Timeout;

  constructor(safetyConfig: AutomationSafetyConfig) {
    super();
    this.safetyConfig = safetyConfig;
    this.startBreakScheduler();
  }

  private startBreakScheduler(): void {
    if (!this.safetyConfig.breakInterval) return;

    this.breakScheduler = setInterval(() => {
      if (this.activeTasks.size > 0) {
        this.takeBreak();
      }
    }, this.safetyConfig.breakInterval);
  }

  private async takeBreak(): Promise<void> {
    const duration = this.safetyConfig.breakDuration || 300000; // 5 minutes default

    runtimeLogger.info(`☕ Taking break for ${duration / 1000} seconds`);
    this.emit('break:started', { duration });

    // Pause all tasks
    for (const taskId of this.activeTasks) {
      this.pauseTask(taskId);
    }

    await new Promise((resolve) => setTimeout(resolve, duration));

    // Resume all tasks
    for (const taskId of this.activeTasks) {
      this.resumeTask(taskId);
    }

    this.emit('break:ended');
  }

  async executeAction(action: ActionType, params: any): Promise<number> {
    // Apply safety delays
    const now = Date.now();
    const timeSinceLastAction = now - this.lastActionTime;
    const minDelay = this.safetyConfig.minActionDelay || 600;

    if (timeSinceLastAction < minDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, minDelay - timeSinceLastAction)
      );
    }

    // Apply random delay variance
    if (this.safetyConfig.randomDelayVariance) {
      const variance = Math.random() * this.safetyConfig.randomDelayVariance;
      await new Promise((resolve) => setTimeout(resolve, variance));
    }

    // Apply reaction time
    if (this.safetyConfig.reactionTimeRange) {
      const [min, max] = this.safetyConfig.reactionTimeRange;
      const reactionTime = min + Math.random() * (max - min);
      await new Promise((resolve) => setTimeout(resolve, reactionTime));
    }

    // Check rate limiting
    this.actionCount++;
    const maxActionsPerMinute = this.safetyConfig.maxActionsPerMinute || 100;
    if (this.actionCount > maxActionsPerMinute) {
      const waitTime = 60000 - (now - this.lastActionTime);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      this.actionCount = 0;
    }

    this.lastActionTime = Date.now();
    this.emit('action:executed', {
      action,
      params,
      timestamp: this.lastActionTime,
    });

    // Return actual delay applied
    return Date.now() - now;
  }

  createTask(
    type: AutomationTask['type'],
    name: string,
    actions: ActionType[],
    config: Record<string, unknown> = {}
  ): AutomationTask {
    const baseTask = {
      id: uuidv4(),
      type,
      name,
      status: 'idle' as const,
      progress: 0,
      actions,
      config,
      safety: this.safetyConfig,
    };

    let task: AutomationTask;

    switch (type) {
      case 'sequence':
        task = {
          ...baseTask,
          type: 'sequence',
          steps: [],
        } as SequentialTask;
        break;
      case 'loop':
        task = {
          ...baseTask,
          type: 'loop',
          steps: [],
          iterations: 1,
        } as LoopTask;
        break;
      case 'conditional':
        task = {
          ...baseTask,
          type: 'conditional',
          conditions: [],
          steps: [],
        } as ConditionalTask;
        break;
      default:
        task = baseTask as BaseAutomationTask;
    }

    this.tasks.set(task.id, task);
    this.emit('task:created', task);

    return task;
  }

  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'running') return false;

    task.status = 'running';
    this.activeTasks.add(taskId);
    this.emit('task:started', task);

    // Start task execution
    this.executeTask(task);

    return true;
  }

  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return false;

    task.status = 'paused';
    this.activeTasks.delete(taskId);
    this.emit('task:paused', task);

    return true;
  }

  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') return false;

    task.status = 'running';
    this.activeTasks.add(taskId);
    this.emit('task:resumed', task);

    // Resume task execution
    this.executeTask(task);

    return true;
  }

  stopTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'completed';
    this.activeTasks.delete(taskId);
    this.emit('task:stopped', task);

    return true;
  }

  private async executeTask(task: AutomationTask): Promise<void> {
    try {
      this.emit('task:executing', { taskId: task.id, status: 'starting' });

      // Execute task based on its type
      switch (task.type) {
        case 'sequence':
          await this.executeSequentialTask(task);
          break;
        case 'loop':
          await this.executeLoopTask(task);
          break;
        case 'conditional':
          await this.executeConditionalTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.status = 'completed';
      const startTime = 'startTime' in task ? task.startTime : Date.now();
      this.emit('task:completed', {
        taskId: task.id,
        duration: Date.now() - (startTime || Date.now()),
      });
    } catch (error) {
      task.status = 'failed';
      this.emit('task:failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async executeSequentialTask(task: AutomationTask): Promise<void> {
    if ('steps' in task) {
      for (const step of task.steps) {
        if (task.status === 'completed') break;
        await this.executeTaskStep(task, step);
      }
    }
  }

  private async executeLoopTask(task: AutomationTask): Promise<void> {
    if ('iterations' in task && 'steps' in task) {
      while (task.status === 'running' && task.iterations > 0) {
        for (const step of task.steps) {
          await this.executeTaskStep(task, step);
        }
        task.iterations--;
      }
    }
  }

  private async executeConditionalTask(task: AutomationTask): Promise<void> {
    // Execute conditional logic based on game state
    // This would evaluate conditions and execute appropriate steps
    if (
      'conditions' in task &&
      'steps' in task &&
      task.conditions &&
      task.conditions.length > 0
    ) {
      const conditionMet = await this.evaluateConditions(task.conditions);
      if (conditionMet) {
        for (const step of task.steps) {
          if (task.status === 'completed') break;
          await this.executeTaskStep(task, step);
        }
      }
    }
  }

  private async executeTaskStep(
    task: AutomationTask,
    step: any
  ): Promise<void> {
    // Execute individual task step
    // This would coordinate with the main extension to perform game actions
    this.emit('task:step', {
      taskId: task.id,
      step: step.id,
      action: step.action,
    });

    // Simulate step execution delay
    await new Promise((resolve) => setTimeout(resolve, step.delay || 100));
  }

  private async evaluateConditions(conditions: any[]): Promise<boolean> {
    // Evaluate automation conditions
    // This would check game state against defined conditions
    return conditions.every((condition) => {
      // Placeholder condition evaluation logic
      return condition.type === 'always' || Math.random() > 0.5;
    });
  }

  getTask(taskId: string): AutomationTask | undefined {
    return this.tasks.get(taskId);
  }

  // Methods using the imported types
  createMacroTrigger(conditions: any[]): MacroTrigger {
    return {
      id: `trigger_${Date.now()}`,
      type: 'condition',
      value: conditions,
      conditions,
      enabled: true,
      priority: 1,
    };
  }

  processNPCInfo(npc: NPCInfo): void {
    // Process NPC information for automation decisions
    this.emit('npc:detected', {
      id: npc.id,
      name: npc.name,
      position: npc.location,
      level: npc.combatLevel,
      health: npc.healthRatio,
    });
  }

  processGroundItem(item: GroundItem): void {
    // Process ground item for automation decisions
    this.emit('item:spotted', {
      id: item.id,
      name: item.name,
      position: item.location,
      value: item.value,
      stackSize: item.quantity,
    });
  }

  processPlayerInfo(player: PlayerInfo): void {
    // Process player information for social automation
    this.emit('player:detected', {
      name: player.displayName || player.username,
      position: player.location,
      level: player.combatLevel,
      equipment: (player as any).equipment || [],
      isInCombat: (player as any).isInCombat || false,
    });
  }

  getAllTasks(): AutomationTask[] {
    return Array.from(this.tasks.values());
  }

  getActiveTasks(): AutomationTask[] {
    return Array.from(this.activeTasks)
      .map((id) => this.tasks.get(id)!)
      .filter(Boolean);
  }

  updateSafetyConfig(config: Partial<AutomationSafetyConfig>): void {
    this.safetyConfig = { ...this.safetyConfig, ...config };
    this.emit('safety:updated', this.safetyConfig);
  }

  cleanup(): void {
    if (this.breakScheduler) {
      clearInterval(this.breakScheduler);
    }

    // Stop all active tasks
    for (const taskId of this.activeTasks) {
      this.stopTask(taskId);
    }
  }
}

/**
 * Event Recording System
 * Records and replays game events
 */
export class EventRecordingSystem extends EventEmitter {
  private recordings = new Map<string, EventRecording>();
  private currentRecording: EventRecording | null = null;
  private replaySpeed = 1;
  private replayTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  startRecording(metadata: Record<string, unknown> = {}): string {
    if (this.currentRecording) {
      this.stopRecording();
    }

    const id = uuidv4();
    this.currentRecording = {
      id,
      startTime: Date.now(),
      events: [],
      metadata,
    };

    runtimeLogger.info(`🔴 Started event recording: ${id}`);
    this.emit('recording:started', this.currentRecording);

    return id;
  }

  stopRecording(): EventRecording | null {
    if (!this.currentRecording) return null;

    this.currentRecording.endTime = Date.now();
    const recording = this.currentRecording;
    this.recordings.set(recording.id, recording);
    this.currentRecording = null;

    runtimeLogger.info(
      `⏹️ Stopped recording: ${recording.id} (${recording.events.length} events)`
    );
    this.emit('recording:stopped', recording);

    return recording;
  }

  recordEvent(event: GameEvent, gameTime: number): void {
    if (!this.currentRecording) return;

    const recordedEvent: RecordedEvent = {
      event,
      timestamp: Date.now(),
      gameTime,
      replayable: this.isReplayable(event.type),
    };

    this.currentRecording.events.push(recordedEvent);
    this.emit('event:recorded', recordedEvent);
  }

  private isReplayable(eventType: EventType): boolean {
    // Determine which events can be replayed
    const replayableEvents = [
      EventType.LOCATION_CHANGED,
      EventType.ITEM_ADDED,
      EventType.ITEM_REMOVED,
      EventType.SKILL_EXP_GAINED,
      EventType.CHAT_MESSAGE,
    ];

    return replayableEvents.includes(eventType);
  }

  async replayRecording(
    recordingId: string,
    options: {
      speed?: number;
      filter?: EventType[];
      startTime?: number;
      endTime?: number;
    } = {}
  ): Promise<void> {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }

    this.replaySpeed = options.speed || 1;
    const events = this.filterEvents(recording.events, options);

    runtimeLogger.info(
      `▶️ Replaying recording: ${recordingId} (${events.length} events)`
    );
    this.emit('replay:started', { recording, options });

    let eventIndex = 0;

    const replayNextEvent = () => {
      if (eventIndex >= events.length) {
        this.emit('replay:completed', recording);
        return;
      }

      const recordedEvent = events[eventIndex];

      // Emit replayed event
      this.emit('event:replayed', recordedEvent);

      eventIndex++;

      // Calculate delay to next event
      let delay = 0;
      if (eventIndex < events.length) {
        const nextEvent = events[eventIndex];
        if (nextEvent && recordedEvent) {
          delay =
            (nextEvent.timestamp - recordedEvent.timestamp) / this.replaySpeed;
        }
      }

      this.replayTimer = setTimeout(replayNextEvent, Math.max(delay, 0));
    };

    replayNextEvent();
  }

  stopReplay(): void {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null as any;
      this.emit('replay:stopped');
    }
  }

  private filterEvents(
    events: RecordedEvent[],
    options: {
      filter?: EventType[];
      startTime?: number;
      endTime?: number;
    }
  ): RecordedEvent[] {
    let filtered = events;

    if (options.filter) {
      filtered = filtered.filter((e) => options.filter!.includes(e.event.type));
    }

    if (options.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= options.endTime!);
    }

    return filtered;
  }

  getRecording(recordingId: string): EventRecording | undefined {
    return this.recordings.get(recordingId);
  }

  getAllRecordings(): EventRecording[] {
    return Array.from(this.recordings.values());
  }

  deleteRecording(recordingId: string): boolean {
    return this.recordings.delete(recordingId);
  }

  exportRecording(recordingId: string): string {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }

    return JSON.stringify(recording, null, 2);
  }

  importRecording(data: string): EventRecording {
    const recording = JSON.parse(data) as EventRecording;
    this.recordings.set(recording.id, recording);
    return recording;
  }
}

/**
 * Plugin Bridge System
 * Enables communication between RuneLite plugins
 */
export class PluginBridgeSystem extends EventEmitter {
  private plugins = new Map<string, PluginCapability>();
  private messageQueue = new Map<string, PluginMessage[]>();
  private messageHandlers = new Map<string, (message: PluginMessage) => void>();

  constructor() {
    super();
  }

  registerPlugin(capability: PluginCapability): void {
    this.plugins.set(capability.name, capability);
    this.messageQueue.set(capability.name, []);

    runtimeLogger.info(
      `🔌 Registered plugin: ${capability.name} v${capability.version}`
    );
    this.emit('plugin:registered', capability);
  }

  unregisterPlugin(name: string): boolean {
    const deleted = this.plugins.delete(name);
    if (deleted) {
      this.messageQueue.delete(name);
      this.messageHandlers.delete(name);
      this.emit('plugin:unregistered', name);
    }
    return deleted;
  }

  sendMessage(message: PluginMessage): void {
    // Validate target plugin exists
    if (!this.plugins.has(message.target)) {
      this.emit('message:failed', {
        message,
        error: 'Target plugin not found',
      });
      return;
    }

    // Add to message queue
    const queue = this.messageQueue.get(message.target) || [];
    queue.push(message);
    this.messageQueue.set(message.target, queue);

    // Emit message event
    this.emit('message:sent', message);

    // Trigger handler if exists
    const handler = this.messageHandlers.get(message.target);
    if (handler) {
      handler(message);
    }
  }

  receiveMessages(pluginName: string): PluginMessage[] {
    const queue = this.messageQueue.get(pluginName) || [];
    this.messageQueue.set(pluginName, []);
    return queue;
  }

  setMessageHandler(
    pluginName: string,
    handler: (message: PluginMessage) => void
  ): void {
    this.messageHandlers.set(pluginName, handler);
  }

  broadcastMessage(message: Omit<PluginMessage, 'target'>): void {
    for (const pluginName of this.plugins.keys()) {
      if (pluginName !== message.source) {
        this.sendMessage({ ...message, target: pluginName });
      }
    }
  }

  getPlugin(name: string): PluginCapability | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): PluginCapability[] {
    return Array.from(this.plugins.values());
  }

  callMethod(
    pluginName: string,
    methodName: string,
    args: unknown[]
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        reject(new Error(`Plugin not found: ${pluginName}`));
        return;
      }

      if (!plugin.methods.includes(methodName)) {
        reject(new Error(`Method not found: ${methodName}`));
        return;
      }

      const message: PluginMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source: 'runelite-extension',
        target: pluginName,
        type: 'method-call',
        data: { method: methodName, args },
        timestamp: Date.now(),
      };

      // Set up reply handler
      const replyHandler = (reply: PluginMessage) => {
        if (reply.replyTo === message.id) {
          this.messageHandlers.delete(`${pluginName}-reply`);
          if (reply.type === 'error') {
            reject(new Error(reply.data as string));
          } else {
            resolve(reply.data);
          }
        }
      };

      this.setMessageHandler(`${pluginName}-reply`, replyHandler);
      this.sendMessage(message);

      // Timeout after 10 seconds
      setTimeout(() => {
        this.messageHandlers.delete(`${pluginName}-reply`);
        reject(new Error('Method call timeout'));
      }, 10000);
    });
  }
}

/**
 * Event Batching System
 * Batches events for efficient processing
 */
export class EventBatchingSystem extends EventEmitter {
  private eventQueue = new Map<EventPriority, GameEvent[]>();
  private batchSize: number;
  private batchInterval: number;
  private batchTimer?: NodeJS.Timeout;

  constructor(batchSize = 50, batchInterval = 100) {
    super();
    this.batchSize = batchSize;
    this.batchInterval = batchInterval;

    // Initialize priority queues
    Object.values(EventPriority).forEach((priority) => {
      if (typeof priority === 'number') {
        this.eventQueue.set(priority, []);
      }
    });

    this.startBatchTimer();
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.processBatches();
    }, this.batchInterval);
  }

  addEvent(
    event: GameEvent,
    priority: EventPriority = EventPriority.NORMAL
  ): void {
    const queue = this.eventQueue.get(priority) || [];
    queue.push(event);
    this.eventQueue.set(priority, queue);

    // Process immediately if critical or queue is full
    if (priority === EventPriority.CRITICAL || queue.length >= this.batchSize) {
      this.processPriorityBatch(priority);
    }
  }

  private processBatches(): void {
    // Process in priority order
    const priorities = [
      EventPriority.CRITICAL,
      EventPriority.HIGH,
      EventPriority.NORMAL,
      EventPriority.LOW,
    ];

    for (const priority of priorities) {
      this.processPriorityBatch(priority);
    }
  }

  private processPriorityBatch(priority: EventPriority): void {
    const queue = this.eventQueue.get(priority) || [];
    if (queue.length === 0) return;

    // Take up to batchSize events
    const events = queue.splice(0, this.batchSize);
    this.eventQueue.set(priority, queue);

    const batch: EventBatch = {
      id: uuidv4(),
      events,
      compressed: false,
      priority,
      timestamp: Date.now(),
    };

    this.emit('batch:ready', batch);
  }

  cleanup(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null as any;
    }

    // Process remaining events
    this.processBatches();
  }
}

/**
 * Compression utilities
 */
export class CompressionUtils {
  static compress(data: string): Uint8Array {
    try {
      return pako.deflate(data);
    } catch (error) {
      runtimeLogger.error('Compression failed:', error);
      return new TextEncoder().encode(data);
    }
  }

  static decompress(data: Uint8Array): string {
    try {
      return pako.inflate(data, { to: 'string' });
    } catch (error) {
      runtimeLogger.error('Decompression failed:', error);
      return new TextDecoder().decode(data);
    }
  }

  static compressJSON(obj: any): Uint8Array {
    return this.compress(JSON.stringify(obj));
  }

  static decompressJSON(data: Uint8Array): any {
    return JSON.parse(this.decompress(data));
  }
}

/**
 * State synchronization system
 */
export class StateSyncSystem extends EventEmitter {
  private lastState: GameState | null = null;
  private stateHistory: StateDelta[] = [];
  private maxHistorySize = 100;

  constructor() {
    super();
  }

  updateState(newState: GameState): StateDelta | null {
    if (!this.lastState) {
      this.lastState = newState;
      return null;
    }

    const changes = this.calculateStateDelta(this.lastState, newState);
    if (changes.length === 0) return null;

    const delta: StateDelta = {
      timestamp: Date.now(),
      changes,
      compressed: false,
    };

    this.stateHistory.push(delta);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    this.lastState = newState;
    this.emit('state:delta', delta);

    return delta;
  }

  private calculateStateDelta(
    oldState: GameState,
    newState: GameState
  ): StateChange[] {
    const changes: StateChange[] = [];

    // Compare each field
    this.compareField('player', oldState.player, newState.player, changes);
    this.compareField(
      'location',
      oldState.location,
      newState.location,
      changes
    );
    this.compareField(
      'inventory',
      oldState.inventory,
      newState.inventory,
      changes
    );
    this.compareField('skills', oldState.skills, newState.skills, changes);
    this.compareField('combat', oldState.combat, newState.combat, changes);

    return changes;
  }

  private compareField(
    path: string,
    oldValue: any,
    newValue: any,
    changes: StateChange[]
  ): void {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        path,
        operation:
          oldValue === null ? 'add' : newValue === null ? 'remove' : 'update',
        value: newValue,
        previousValue: oldValue,
      });
    }
  }

  getStateHistory(): StateDelta[] {
    return [...this.stateHistory];
  }

  clearHistory(): void {
    this.stateHistory = [];
  }
}
