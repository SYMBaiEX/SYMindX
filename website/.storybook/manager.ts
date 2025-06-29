import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'light',
  
  // Brand
  brandTitle: 'SYMindX Design System',
  brandUrl: 'https://symindx.dev',
  brandImage: undefined, // Add logo URL here when available
  brandTarget: '_self',
  
  // Colors
  colorPrimary: '#2563eb',
  colorSecondary: '#7c3aed',
  
  // UI
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  appBorderColor: '#e2e8f0',
  appBorderRadius: 8,
  
  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: '"Fira Code", monospace',
  
  // Text colors
  textColor: '#1e293b',
  textInverseColor: '#ffffff',
  
  // Toolbar default and active colors
  barTextColor: '#64748b',
  barSelectedColor: '#2563eb',
  barBg: '#f8fafc',
  
  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
  inputTextColor: '#1e293b',
  inputBorderRadius: 6,
});

addons.setConfig({
  theme,
  panelPosition: 'bottom',
  selectedPanel: 'controls',
});