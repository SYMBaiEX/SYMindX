# Context Integration Testing Framework

This directory contains a comprehensive testing framework to validate the context integration enhancements for the SYMindX mind-agents system.

## Overview

The testing framework ensures that our context integration enhancements maintain backward compatibility, provide expected benefits, and operate reliably in production environments.

## Test Suites

### 1. Context Integration Tests (`context-integration.test.ts`)

**Purpose**: Validates the integration of enhanced context features with existing system components.

**Key Test Areas**:
- **Backward Compatibility**: Ensures existing agent initialization, message processing, memory systems, portal integration, and extension loading continue to work
- **Feature Integration**: Tests context enrichment with emotion, memory, cognition, multi-agent sharing, and caching systems
- **Performance Impact**: Measures performance overhead of enhancements vs. baseline operations
- **Runtime Integration**: Validates seamless integration with runtime lifecycle, event system, configuration updates, and shutdown procedures
- **Error Handling**: Tests graceful handling of enrichment failures, compatibility layer errors, memory provider failures, and portal integration issues
- **Migration**: Validates legacy context format migration, gradual migration scenarios, and data integrity preservation

**Usage**:
```bash
bun test src/__tests__/context-integration.test.ts
```

### 2. Context Validation Tests (`context-validation.test.ts`)

**Purpose**: Comprehensive validation of context creation, structure, enrichment pipeline, and transformation operations.

**Key Test Areas**:
- **Context Creation**: Validates context structure, state integrity, message validation, participant management, metadata, and state transitions
- **Enrichment Pipeline**: Tests temporal, emotional, social, memory integration, cognitive, and environment context enrichment
- **Context Transformation**: Validates memory, cognition, and portal context transformations with chain integrity and rollback capability
- **Context Merging**: Tests successful merging, conflict resolution, enrichment data preservation, and invalid scenario handling
- **Error Handling**: Handles malformed data, corrupted enrichment, circular references, large datasets, concurrent operations, validation failures, and schema compliance
- **Performance**: Validates operations under load, memory usage, and enrichment pipeline performance

**Usage**:
```bash
bun test src/__tests__/context-validation.test.ts
```

### 3. Context Performance Tests (`context-performance.test.ts`)

**Purpose**: Benchmarks context system performance and identifies potential bottlenecks.

**Key Test Areas**:
- **Baseline Comparison**: Measures enhanced vs. baseline performance for context creation, message processing, retrieval, and enrichment
- **Memory Usage Analysis**: Analyzes memory consumption during operations, enrichment caching, long-running operations, and different context sizes
- **Context Caching**: Benchmarks L1, L2, L3 cache performance, coordination, hit rates, access patterns, and eviction performance
- **Multi-Agent Performance**: Tests shared context creation, message propagation, synchronization, memory usage, and concurrent access in multi-agent scenarios
- **Stress Testing**: Validates system behavior under extreme load, large message histories, and edge case scenarios

**Usage**:
```bash
bun test src/__tests__/context-performance.test.ts
```

### 4. Context Migration Tests (`context-migration.test.ts`)

**Purpose**: Validates migration scenarios from legacy to enhanced context systems.

**Key Test Areas**:
- **Gradual Migration**: Tests phased migration strategies, incremental feature migration, parallel agent group migration, failure handling, and service availability maintenance
- **Rollback Capabilities**: Validates immediate rollback after failures, partial migration rollback, corrupted state recovery, selective feature rollback, and rollback history audit trails
- **Mixed Usage**: Supports hybrid runtime with legacy and enhanced contexts, context bridging, consistency in mixed operations, data synchronization, and feature parity
- **Data Integrity**: Preserves message data, metadata, timestamps, topics, conversation state, handles corruption detection/recovery, and maintains referential integrity

**Usage**:
```bash
bun test src/__tests__/context-migration.test.ts
```

## Running Tests

### All Tests
```bash
# Run all context integration tests
bun test src/__tests__/

# Run with coverage
bun test src/__tests__/ --coverage

# Run with verbose output
bun test src/__tests__/ --verbose
```

### Individual Test Suites
```bash
# Integration tests
bun test src/__tests__/context-integration.test.ts

# Validation tests
bun test src/__tests__/context-validation.test.ts

# Performance benchmarks
bun test src/__tests__/context-performance.test.ts

# Migration tests
bun test src/__tests__/context-migration.test.ts
```

### Test Filtering
```bash
# Run specific test groups
bun test src/__tests__/ --testNamePattern="Backward Compatibility"
bun test src/__tests__/ --testNamePattern="Performance"
bun test src/__tests__/ --testNamePattern="Migration"

# Run tests matching pattern
bun test src/__tests__/ --testPathPattern="integration"
```

## Test Configuration

### Performance Test Presets

Tests use predefined performance presets for consistent benchmarking:

- **FAST**: Quick operations (100 iterations, 1000ms timeout)
- **MODERATE**: Standard operations (50 iterations, 5000ms timeout)  
- **PERFORMANCE**: Intensive benchmarks (1000 iterations, 30000ms timeout)

### Memory Testing

Memory usage tests include:
- Heap growth monitoring
- Memory retention analysis
- Garbage collection simulation
- Memory leak detection
- Per-operation memory profiling

### Error Scenarios

Comprehensive error testing covers:
- Network failures
- Data corruption
- Resource exhaustion
- Concurrent access conflicts
- Invalid input handling

## Test Utilities

The testing framework leverages utilities from `../core/context/__tests__/utils/`:

- **ContextFactory**: Creates test contexts with various configurations
- **ConfigFactory**: Generates test configurations for different scenarios
- **AgentFactory**: Creates test agents with specific properties
- **ContextAssertions**: Validates context structure and integrity
- **PerformanceAssertions**: Measures and validates performance metrics
- **MockUtilities**: Provides mocking capabilities for external dependencies

## Continuous Integration

### Pre-commit Hooks
```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Tests
bun test src/__tests__/
```

### CI/CD Pipeline
- Automated test execution on pull requests
- Performance regression detection
- Memory leak monitoring
- Coverage reporting
- Integration with existing CI systems

## Debugging Tests

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug bun test src/__tests__/

# Run single test with debugging
bun test src/__tests__/context-integration.test.ts --testNamePattern="specific test"
```

### Performance Profiling
```bash
# Enable performance profiling
NODE_ENV=test ENABLE_PROFILING=true bun test src/__tests__/context-performance.test.ts
```

### Memory Analysis
```bash
# Enable memory analysis
NODE_ENV=test ENABLE_MEMORY_ANALYSIS=true bun test src/__tests__/context-performance.test.ts
```

## Expected Test Coverage

- **Lines**: ≥ 85%
- **Functions**: ≥ 90%
- **Branches**: ≥ 80%
- **Statements**: ≥ 85%

## Performance Benchmarks

### Acceptable Performance Ranges

- **Context Creation**: < 50ms per context
- **Message Processing**: < 10ms per message
- **Context Enrichment**: < 100ms per enrichment
- **Cache Operations**: < 1ms per L1 access, < 5ms per L2 access
- **Memory Usage**: < 100KB per context with enrichment

### Performance Regression Detection

Tests automatically fail if performance degrades beyond acceptable thresholds:

- Enhanced operations should not be >3x slower than baseline
- Memory usage should not exceed 50MB growth per 1000 contexts
- Cache hit rates should maintain >70% effectiveness

## Contributing to Tests

### Adding New Tests

1. Follow existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add performance benchmarks for new features
4. Update documentation for new test scenarios

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Benchmarking and profiling
- **Migration Tests**: Upgrade/downgrade scenarios
- **Stress Tests**: High-load and edge case testing

### Best Practices

- Use descriptive test names that explain the scenario
- Include setup and teardown for proper test isolation
- Mock external dependencies appropriately
- Validate both success and failure paths
- Include edge cases and boundary conditions
- Document complex test scenarios

## Troubleshooting

### Common Issues

1. **Memory Issues**: Ensure proper cleanup in afterEach hooks
2. **Timing Issues**: Use proper async/await patterns
3. **Mock Issues**: Verify mock setup and teardown
4. **Performance Issues**: Check for resource leaks and cleanup

### Debug Resources

- Enable verbose logging with `LOG_LEVEL=debug`
- Use Chrome DevTools for memory profiling
- Leverage VS Code debugging for step-through debugging
- Use performance.mark() for custom timing measurements

## Maintenance

### Regular Tasks

- Update performance baselines quarterly
- Review and update test scenarios based on new features
- Monitor test execution times and optimize slow tests
- Update mock data to reflect current system usage patterns

### Version Compatibility

Tests are designed to validate:
- Backward compatibility with previous versions
- Forward compatibility with planned features
- Migration paths between major versions
- Data integrity across version transitions

---

*This testing framework ensures the context integration enhancements meet quality, performance, and reliability standards while maintaining backward compatibility and providing a smooth migration path.*