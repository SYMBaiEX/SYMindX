import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: 'Continue' } };
export const Secondary: Story = { args: { children: 'Cancel', variant: 'outline' } };
export const Disabled: Story = { args: { children: 'Unavailable', disabled: true } };
