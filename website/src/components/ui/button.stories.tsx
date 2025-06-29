import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta = {
  title: 'UI Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes for the SYMindX interface.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual variant of the button',
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled',
    },
    asChild: {
      control: { type: 'boolean' },
      description: 'Whether to render as a child element',
    },
    children: {
      control: { type: 'text' },
      description: 'The content of the button',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Primary button stories
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Agent',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for destructive actions like deleting agents or clearing data.',
      },
    },
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Cancel',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for secondary actions or when you need a less prominent button.',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'View Details',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Settings',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for minimal actions, often in toolbars or navigation.',
      },
    },
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Learn More',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use when you need a button that looks like a link.',
      },
    },
  },
};

// Size variations
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🔧',
  },
  parameters: {
    docs: {
      description: {
        story: 'Perfect size for icon-only buttons.',
      },
    },
  },
};

// State variations
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

export const Loading: Story = {
  args: {
    children: (
      <>
        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        Loading...
      </>
    ),
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a loading state with spinner.',
      },
    },
  },
};

// Real-world examples
export const CreateAgent: Story = {
  args: {
    children: (
      <>
        🤖 Create Agent
      </>
    ),
    size: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Primary action for creating a new AI agent.',
      },
    },
  },
};

export const StartAgent: Story = {
  args: {
    children: (
      <>
        ▶️ Start Agent
      </>
    ),
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'Action to start an AI agent.',
      },
    },
  },
};

export const StopAgent: Story = {
  args: {
    children: (
      <>
        ⏹️ Stop Agent
      </>
    ),
    variant: 'destructive',
  },
  parameters: {
    docs: {
      description: {
        story: 'Action to stop a running AI agent.',
      },
    },
  },
};

export const ViewThoughts: Story = {
  args: {
    children: (
      <>
        🧠 View Thoughts
      </>
    ),
    variant: 'outline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Secondary action to view agent thought streams.',
      },
    },
  },
};

// Button groups
export const ButtonGroup: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="default">Start</Button>
      <Button variant="outline">Pause</Button>
      <Button variant="destructive">Stop</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of button groups for agent controls.',
      },
    },
  },
};

export const ToolbarButtons: Story = {
  render: () => (
    <div className="flex items-center gap-1 p-2 bg-gray-100 rounded-lg">
      <Button variant="ghost" size="icon">📊</Button>
      <Button variant="ghost" size="icon">🔧</Button>
      <Button variant="ghost" size="icon">📱</Button>
      <Button variant="ghost" size="icon">⚙️</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of ghost buttons in a toolbar layout.',
      },
    },
  },
};