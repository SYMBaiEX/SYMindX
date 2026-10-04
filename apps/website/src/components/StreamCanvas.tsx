import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Monitor, Wifi, WifiOff, Settings, Maximize2 } from 'lucide-react'

export default function StreamCanvas() {
  const [isConnected, setIsConnected] = useState(false)
  const [streamUrl, setStreamUrl] = useState('http://localhost:8081/stream')
  const [overlayEnabled, setOverlayEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const videoRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate stream connection
    const checkStream = () => {
      // In a real implementation, this would check if the stream URL is accessible
      setIsConnected(Math.random() > 0.3) // Simulate intermittent connection
    }

    const interval = setInterval(checkStream, 5000)
    checkStream()

    return () => clearInterval(interval)
  }, [streamUrl])

  const toggleFullscreen = () => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen()
      setFullscreen(true)
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className="space-y-6">
      {/* Stream Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Stream Controls</span>
          </CardTitle>
          <CardDescription>
            Configure and monitor live game stream
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                Stream Status
              </span>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overlay Enabled</span>
            <Switch
              checked={overlayEnabled}
              onCheckedChange={setOverlayEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stream URL</label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="http://localhost:8081/stream"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stream Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Live Stream</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardTitle>
          <CardDescription>
            RuneLite game stream with AI agent overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden aspect-video"
          >
            {isConnected ? (
              <>
                {/* MJPEG Stream */}
                <img
                  ref={videoRef}
                  src={streamUrl}
                  alt="Game Stream"
                  className="w-full h-full object-contain"
                  onError={() => setIsConnected(false)}
                  onLoad={() => setIsConnected(true)}
                />
                
                {/* AI Agent Overlay */}
                {overlayEnabled && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Agent Status Overlay */}
                    <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">NyX Active</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>Status: Thinking</div>
                        <div>Emotion: Focused (85%)</div>
                        <div>Task: Grand Exchange</div>
                      </div>
                    </div>

                    {/* Thought Bubble */}
                    <div className="absolute top-4 right-4 bg-blue-900/80 text-white p-3 rounded-lg max-w-xs">
                      <div className="text-xs font-medium mb-1">Current Thought</div>
                      <div className="text-sm">
                        "Analyzing market prices for optimal trading strategy..."
                      </div>
                    </div>

                    {/* Action Queue */}
                    <div className="absolute bottom-4 left-4 bg-purple-900/80 text-white p-3 rounded-lg">
                      <div className="text-xs font-medium mb-2">Action Queue</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                          <span>Move to bank</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          <span>Deposit items</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          <span>Check quest log</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="absolute bottom-4 right-4 bg-green-900/80 text-white p-3 rounded-lg">
                      <div className="text-xs font-medium mb-2">Performance</div>
                      <div className="space-y-1 text-xs">
                        <div>FPS: 60</div>
                        <div>Latency: 45ms</div>
                        <div>Actions/min: 12</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <Monitor className="h-12 w-12 mx-auto opacity-50" />
                  <div className="text-lg font-medium">Stream Offline</div>
                  <div className="text-sm">
                    Waiting for connection to {streamUrl}
                  </div>
                  <div className="text-xs">
                    Make sure RuneLite is running with stream plugin enabled
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stream Info */}
      <Card>
        <CardHeader>
          <CardTitle>Stream Information</CardTitle>
          <CardDescription>
            Technical details and setup instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Resolution</div>
              <div className="text-muted-foreground">1920x1080</div>
            </div>
            <div>
              <div className="font-medium">Format</div>
              <div className="text-muted-foreground">MJPEG</div>
            </div>
            <div>
              <div className="font-medium">Framerate</div>
              <div className="text-muted-foreground">30 FPS</div>
            </div>
            <div>
              <div className="font-medium">Latency</div>
              <div className="text-muted-foreground">~100ms</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium text-sm">Setup Instructions:</div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Install RuneLite with streaming plugin</li>
              <li>Configure stream output to localhost:8081</li>
              <li>Enable MJPEG format in plugin settings</li>
              <li>Start RuneScape and begin streaming</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}