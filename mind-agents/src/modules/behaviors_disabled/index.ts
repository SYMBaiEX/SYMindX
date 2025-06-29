/**
 * Autonomous Behavior Modules - Daily routines and personality-driven behaviors
 * 
 * This module exports all autonomous behavior implementations for agents.
 */

export * from './daily-routine-behavior.js'
export * from './curiosity-behavior.js'
export * from './social-behavior.js'
export * from './creative-behavior.js'
export * from './learning-behavior.js'
export * from './reflection-behavior.js'
export * from './goal-oriented-behavior.js'

// Behavior factory function
export { createBehaviorSystem } from './behavior-factory.js'

// Base behavior interface
export { BaseBehavior, BehaviorConfig, BehaviorTrigger, BehaviorResult } from './base-behavior.js'