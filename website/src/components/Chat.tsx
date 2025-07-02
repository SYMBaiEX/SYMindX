import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
  agentId?: string
  error?: boolean
}

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'thinking' | 'paused' | 'error'
  emotion: string
  ethicsEnabled?: boolean
}

interface ChatProps {
  agents: Agent[]
  selectedAgent: string
  onAgentSelect: (agentId: string) => void
}

export function Chat({ agents, selectedAgent, onAgentSelect }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadChatHistory(selectedAgent)
    }
  }, [selectedAgent])

  const loadChatHistory = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/chat/history/${agentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.messages) {
          const formattedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id || Date.now().toString(),
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            agentId: msg.agentId
          }))
          setMessages(formattedMessages)
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
      // Don't show error for history loading failure - just start fresh
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: selectedAgent,
          message: userMessage.content,
          sessionId: 'web-ui-session',
          timestamp: userMessage.timestamp.toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.response) {
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            sender: 'agent',
            timestamp: new Date(),
            agentId: selectedAgent
          }
          setMessages(prev => [...prev, agentMessage])
        } else {
          throw new Error(data.error || 'Failed to get response')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to send message: ${errorMessage}`)
      
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble responding right now. Please make sure the SYMindX runtime is running and I'm active.",
        sender: 'agent',
        timestamp: new Date(),
        agentId: selectedAgent,
        error: true
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearError = () => setError('')

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent)
  const canChat = selectedAgentData?.status === 'active' || selectedAgentData?.status === 'idle'

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat with Agent</span>
          </CardTitle>
          <CardDescription>
            Select an agent to start a conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Select value={selectedAgent} onValueChange={onAgentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent to chat with" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center space-x-2">
                          <span>{agent.name}</span>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                          <Badge variant="outline">{agent.emotion}</Badge>
                          {agent.ethicsEnabled === false && (
                            <Badge variant="destructive" className="text-xs">
                              No Ethics
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAgentData && (
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">{selectedAgentData.name}</span>
                  <Badge variant={selectedAgentData.status === 'active' ? 'default' : 'secondary'}>
                    {selectedAgentData.status}
                  </Badge>
                  {selectedAgentData.ethicsEnabled === false && (
                    <Badge variant="destructive" className="text-xs">
                      No Ethics
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive flex-1">{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      {selectedAgent && (
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Conversation with {selectedAgentData?.name}</span>
              {selectedAgentData && (
                <>
                  <Badge variant={selectedAgentData.status === 'active' ? 'default' : 'secondary'}>
                    {selectedAgentData.status}
                  </Badge>
                  <Badge variant="outline">{selectedAgentData.emotion}</Badge>
                  {selectedAgentData.ethicsEnabled === false && (
                    <Badge variant="destructive" className="text-xs">
                      Unethical Mode
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
            {!canChat && (
              <CardDescription className="text-orange-600">
                Agent is {selectedAgentData?.status}. Some features may be limited.
              </CardDescription>
            )}
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation with {selectedAgentData?.name}</p>
                  {selectedAgentData?.ethicsEnabled === false && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ This agent operates without ethical constraints
                    </p>
                  )}
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : message.error
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : message.error ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.error
                          ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                        {message.error && ' • Error'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-3 rounded-lg bg-muted text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="flex-shrink-0 space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${selectedAgentData?.name}...`}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {!canChat && (
                <div className="text-center text-sm text-muted-foreground">
                  Agent is {selectedAgentData?.status}. Messages may not be processed immediately.
                </div>
              )}
              
              {selectedAgentData?.ethicsEnabled === false && (
                <div className="text-center text-xs text-orange-600">
                  ⚠️ This agent operates without ethical constraints - responses may be unrestricted
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Chat