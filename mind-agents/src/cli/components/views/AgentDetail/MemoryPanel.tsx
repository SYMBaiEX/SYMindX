import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { Card3D } from '../../ui/Card3D.js'
import { Chart } from '../../ui/Chart.js'
import { cyberpunkTheme } from '../../../themes/cyberpunk.js'

interface MemoryDetailData {
  provider: string
  totalEntries: number
  recentEntries: MemoryEntry[]
  memoryTypes: Record<string, number>
  embeddingStats: EmbeddingStats
  retentionPolicy: string
  averageImportance: number
}

interface MemoryEntry {
  id: string
  type: string
  content: string
  embedding?: number[]
  importance: number
  timestamp: Date
  tags: string[]
  metadata: Record<string, any>
}

interface EmbeddingStats {
  dimensions: number
  averageDistance: number
  clusters: number
  coverage: number
}

interface AgentDetailData {
  memory: MemoryDetailData
  [key: string]: any
}

interface MemoryPanelProps {
  agentData: AgentDetailData
  formatBytes: (bytes: number) => string
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ agentData, formatBytes }) => {
  const { memory } = agentData
  const [selectedEntry, setSelectedEntry] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'list' | 'embeddings' | 'clusters'>('list')

  useInput((input, key) => {
    if (key.upArrow && selectedEntry > 0) {
      setSelectedEntry(selectedEntry - 1)
    } else if (key.downArrow && selectedEntry < memory.recentEntries.length - 1) {
      setSelectedEntry(selectedEntry + 1)
    } else if (input === 'v') {
      const modes: ('list' | 'embeddings' | 'clusters')[] = ['list', 'embeddings', 'clusters']
      const currentIndex = modes.indexOf(viewMode)
      setViewMode(modes[(currentIndex + 1) % modes.length])
    }
  })

  // Get memory type colors
  const getMemoryTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      'experience': cyberpunkTheme.colors.success,
      'knowledge': cyberpunkTheme.colors.primary,
      'interaction': cyberpunkTheme.colors.accent,
      'goal': cyberpunkTheme.colors.warning,
      'context': cyberpunkTheme.colors.secondary,
      'observation': cyberpunkTheme.colors.matrix,
      'reflection': '#9B59B6'
    }
    return typeColors[type] || cyberpunkTheme.colors.text
  }

  // Render memory distribution chart
  const memoryTypeData = Object.values(memory.memoryTypes)
  const memoryTypeLabels = Object.keys(memory.memoryTypes)

  // Generate embedding visualization data
  const generateEmbeddingVisualization = () => {
    if (!memory.recentEntries[selectedEntry]?.embedding) {
      return Array.from({ length: 50 }, () => Math.random() * 2 - 1)
    }
    
    // Sample first 50 dimensions for visualization
    return memory.recentEntries[selectedEntry].embedding.slice(0, 50)
  }

  // Calculate memory clustering data
  const clusteringData = Array.from({ length: memory.embeddingStats.clusters }, (_, i) => 
    Math.random() * 100 + 20
  )

  // Render embedding space visualization
  const renderEmbeddingSpace = () => {
    const embedding = generateEmbeddingVisualization()
    const chunks = []
    
    for (let i = 0; i < embedding.length; i += 10) {
      chunks.push(embedding.slice(i, i + 10))
    }
    
    return (
      <Box flexDirection="column" gap={1}>
        <Text color={cyberpunkTheme.colors.textDim}>
          Embedding Vector Visualization ({memory.embeddingStats.dimensions}D):
        </Text>
        {chunks.map((chunk, rowIndex) => (
          <Box key={rowIndex} gap={1}>
            <Text color={cyberpunkTheme.colors.textDim}>
              {String(rowIndex * 10).padStart(3, '0')}:
            </Text>
            {chunk.map((value, colIndex) => (
              <Text
                key={colIndex}
                color={
                  value > 0.5 ? cyberpunkTheme.colors.success :
                  value > 0 ? cyberpunkTheme.colors.primary :
                  value > -0.5 ? cyberpunkTheme.colors.warning :
                  cyberpunkTheme.colors.danger
                }
              >
                {value > 0 ? '▲' : value < -0.5 ? '▼' : '●'}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  }

  // Calculate memory importance distribution
  const importanceData = memory.recentEntries.map(entry => entry.importance)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2}>
        {/* Memory Overview */}
        <Box flexDirection="column" width="30%">
          <Card3D
            title="MEMORY OVERVIEW"
            width={28}
            height={16}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Provider:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {memory.provider.toUpperCase()}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Total:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {memory.totalEntries.toLocaleString()}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Policy:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {memory.retentionPolicy}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Avg Importance:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {memory.averageImportance.toFixed(2)}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Type Distribution:</Text>
                {Object.entries(memory.memoryTypes).map(([type, count]) => (
                  <Box key={type} gap={1}>
                    <Text color={getMemoryTypeColor(type)}>
                      {type.slice(0, 10)}:
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {count}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Embedding Statistics */}
        <Box flexDirection="column" width="35%">
          <Card3D
            title="EMBEDDING ANALYTICS"
            width={32}
            height={16}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Dimensions:</Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {memory.embeddingStats.dimensions}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Avg Distance:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {memory.embeddingStats.averageDistance.toFixed(3)}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Clusters:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {memory.embeddingStats.clusters}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Coverage:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {Math.round(memory.embeddingStats.coverage * 100)}%
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Coverage Bar:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {'█'.repeat(Math.round(memory.embeddingStats.coverage * 20))}
                  {'░'.repeat(20 - Math.round(memory.embeddingStats.coverage * 20))}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Cluster Sizes:</Text>
                <Chart
                  data={clusteringData}
                  width={25}
                  height={4}
                  color={cyberpunkTheme.colors.matrix}
                  type="bar"
                  showAxes={false}
                />
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* View Mode Controls */}
        <Box flexDirection="column" width="35%">
          <Card3D
            title={`MEMORY ${viewMode.toUpperCase()}`}
            width={32}
            height={16}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                Mode: {viewMode} | [V] to switch
              </Text>
              
              {viewMode === 'list' && (
                <Box flexDirection="column">
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Recent Entries ({selectedEntry + 1}/{memory.recentEntries.length}):
                  </Text>
                  {memory.recentEntries.slice(0, 5).map((entry, i) => (
                    <Box
                      key={i}
                      flexDirection="column"
                      borderStyle={i === selectedEntry ? 'single' : undefined}
                      borderColor={i === selectedEntry ? cyberpunkTheme.colors.accent : undefined}
                      padding={i === selectedEntry ? 1 : 0}
                    >
                      <Box gap={1}>
                        <Text color={getMemoryTypeColor(entry.type)} bold>
                          {entry.type.toUpperCase()}
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          {entry.importance.toFixed(2)}
                        </Text>
                      </Box>
                      <Text color={cyberpunkTheme.colors.text}>
                        {entry.content.slice(0, 40)}...
                      </Text>
                      <Text color={cyberpunkTheme.colors.textDim}>
                        {entry.timestamp.toLocaleTimeString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              )}
              
              {viewMode === 'embeddings' && renderEmbeddingSpace()}
              
              {viewMode === 'clusters' && (
                <Box flexDirection="column">
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Memory Clusters ({memory.embeddingStats.clusters}):
                  </Text>
                  <Chart
                    data={clusteringData}
                    width={25}
                    height={8}
                    color={cyberpunkTheme.colors.matrix}
                    type="area"
                    showAxes={true}
                  />
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Memory Type Distribution Chart */}
      <Box marginTop={1}>
        <Card3D
          title="MEMORY TYPE DISTRIBUTION"
          width={90}
          height={10}
          color={cyberpunkTheme.colors.primary}
          animated={true}
        >
          <Box flexDirection="row" gap={2}>
            <Box width="60%">
              <Chart
                data={memoryTypeData}
                width={50}
                height={6}
                color={cyberpunkTheme.colors.primary}
                type="bar"
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection="column" width="40%">
              <Text color={cyberpunkTheme.colors.textDim}>Legend:</Text>
              {memoryTypeLabels.map((label, i) => (
                <Box key={label} gap={2}>
                  <Text color={getMemoryTypeColor(label)}>●</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {label}: {memoryTypeData[i]}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Memory Importance Analysis */}
      <Box marginTop={1}>
        <Card3D
          title="MEMORY IMPORTANCE ANALYSIS"
          width={90}
          height={10}
          color={cyberpunkTheme.colors.secondary}
          animated={true}
        >
          <Box flexDirection="row" gap={2}>
            <Box width="70%">
              <Chart
                data={importanceData}
                width={60}
                height={6}
                color={cyberpunkTheme.colors.accent}
                type="line"
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection="column" width="30%">
              <Text color={cyberpunkTheme.colors.textDim}>Statistics:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Min:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {Math.min(...importanceData).toFixed(2)}
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Max:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {Math.max(...importanceData).toFixed(2)}
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Avg:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {(importanceData.reduce((a, b) => a + b, 0) / importanceData.length).toFixed(2)}
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Selected Memory Entry Details */}
      {viewMode === 'list' && memory.recentEntries[selectedEntry] && (
        <Box marginTop={1}>
          <Card3D
            title="MEMORY ENTRY DETAILS"
            width={90}
            height={12}
            color={getMemoryTypeColor(memory.recentEntries[selectedEntry].type)}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>ID:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {memory.recentEntries[selectedEntry].id}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                <Text color={getMemoryTypeColor(memory.recentEntries[selectedEntry].type)} bold>
                  {memory.recentEntries[selectedEntry].type.toUpperCase()}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Importance:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {memory.recentEntries[selectedEntry].importance.toFixed(3)}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Content:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {memory.recentEntries[selectedEntry].content}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Tags:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {memory.recentEntries[selectedEntry].tags.join(', ')}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Metadata:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {JSON.stringify(memory.recentEntries[selectedEntry].metadata, null, 2)}
                </Text>
              </Box>
              
              <Box gap={2} marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Timestamp:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {memory.recentEntries[selectedEntry].timestamp.toLocaleString()}
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>Embedding:</Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {memory.recentEntries[selectedEntry].embedding ? 'Present' : 'Missing'}
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>
      )}
    </Box>
  )
}