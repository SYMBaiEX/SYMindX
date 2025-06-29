import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';

const meta = {
  title: 'UI Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component for displaying agent information, stats, and actions in the SYMindX interface.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Agent Card</CardTitle>
        <CardDescription>
          This is a basic card component for displaying information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This can include any type of information or components.</p>
      </CardContent>
    </Card>
  ),
};

export const AgentCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🤖 NyX
            <Badge variant="default">Active</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500">Online</span>
          </div>
        </div>
        <CardDescription>
          Chaotic-empath hacker with a passion for entropy via joy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Emotion:</span>
            <div className="flex items-center gap-2 mt-1">
              <span>😊 Content</span>
              <div className="h-2 bg-gray-200 rounded-full flex-1">
                <div className="h-2 bg-blue-500 rounded-full w-3/4"></div>
              </div>
            </div>
          </div>
          <div>
            <span className="font-medium">Memory:</span>
            <p className="text-gray-600">2,847 memories</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Last Action:</span>
            <span className="text-gray-600">2 minutes ago</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Extensions:</span>
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs">Slack</Badge>
              <Badge variant="secondary" className="text-xs">Twitter</Badge>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button size="sm" className="flex-1">View Details</Button>
        <Button size="sm" variant="outline">Configure</Button>
        <Button size="sm" variant="destructive">Stop</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A comprehensive agent card showing status, stats, and actions.',
      },
    },
  },
};

export const StatCard: Story = {
  render: () => (
    <Card className="w-64">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Total Agents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-blue-600">42</div>
        <p className="text-sm text-gray-600 mt-1">
          <span className="text-green-600">+3</span> from last week
        </p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A stat card for displaying key metrics.',
      },
    },
  },
};

export const ExtensionCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💬 Slack Extension
          <Badge variant="default">Enabled</Badge>
        </CardTitle>
        <CardDescription>
          Connect your agents to Slack for team collaboration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Connected Workspaces:</span>
            <span className="font-medium">3</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Active Channels:</span>
            <span className="font-medium">12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Messages Today:</span>
            <span className="font-medium">247</span>
          </div>
        </div>
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>• Responded in #general</div>
            <div>• Posted update in #dev-team</div>
            <div>• Joined #random channel</div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Configure Slack</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'An extension card showing integration status and activity.',
      },
    },
  },
};

export const ThoughtCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🧠 Agent Thought
          <Badge variant="outline" className="text-xs">2s ago</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm italic">
            "I notice the user seems excited about the new feature. Their message 
            contains multiple exclamation points and positive language. I should 
            respond with matching enthusiasm while providing helpful information."
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Emotion: 😊 Excited (0.8)</span>
            <span>Confidence: 94%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A thought card for displaying agent internal reasoning.',
      },
    },
  },
};

export const MemoryCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          💭 Memory Fragment
          <Badge variant="secondary" className="text-xs">Important</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm">
            User mentioned they work at TechCorp and are interested in automation solutions. 
            They have experience with Python and are looking for AI agent help with data processing.
          </p>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Relevance: 92%</span>
            <span>3 days ago</span>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">work</Badge>
            <Badge variant="outline" className="text-xs">automation</Badge>
            <Badge variant="outline" className="text-xs">python</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A memory card for displaying stored agent memories.',
      },
    },
  },
};

export const AlertCard: Story = {
  render: () => (
    <Card className="w-80 border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          ⚠️ System Alert
          <Badge variant="destructive" className="text-xs">Critical</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600 mb-3">
          Agent "DataBot" has been unresponsive for 5 minutes. Memory system 
          connection lost. Automatic restart attempted.
        </p>
        <div className="text-xs text-red-500">
          Last seen: 14:32:45 UTC
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="destructive" size="sm" className="w-full">
          Force Restart
        </Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'An alert card for displaying system warnings and errors.',
      },
    },
  },
};

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">8</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Messages Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">1,247</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">2.4GB</div>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of cards arranged in a responsive grid layout.',
      },
    },
  },
};