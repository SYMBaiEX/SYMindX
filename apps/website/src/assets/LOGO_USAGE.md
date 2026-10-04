# SYMindX Logo Usage Guide

This guide explains how to properly use the SYMindX logos throughout the website.

## Available Logos

### 1. SYMindX Logo (`symindx-logo.png`)
- **Location**: `/assets/images/logos/symindx-logo.png` (public) or `@/assets/images/ui/symindx-logo.png` (src)
- **Use cases**: Main branding, headers, navigation bars
- **Recommended sizes**: 
  - Header: `h-8 w-8` (32px)
  - Cards: `h-6 w-6` (24px) 
  - Small icons: `h-5 w-5` (20px)

### 2. SYMindX Symbol (`symindx.png`)
- **Location**: `/assets/images/logos/symindx.png` (public) or `@/assets/images/ui/symindx.png` (src)
- **Use cases**: Empty states, loading states, watermarks
- **Recommended sizes**:
  - Empty states: `h-12 w-12` or `h-16 w-16`
  - Small watermarks: `h-5 w-5` or `h-6 w-6`

## Usage Examples

### In Public Assets (served directly)
```tsx
// Header logo
<img src="/assets/images/logos/symindx-logo.png" alt="SYMindX Logo" className="h-8 w-8" />

// Empty state
<img src="/assets/images/logos/symindx.png" alt="SYMindX" className="h-16 w-16 mx-auto mb-4 opacity-50" />
```

### In Imported Assets (processed by Vite)
```tsx
import symindxLogo from '@/assets/images/ui/symindx-logo.png'
import symindxSymbol from '@/assets/images/ui/symindx.png'

// Header logo
<img src={symindxLogo} alt="SYMindX Logo" className="h-8 w-8" />

// Empty state  
<img src={symindxSymbol} alt="SYMindX" className="h-16 w-16 mx-auto mb-4 opacity-50" />
```

## Accessibility Guidelines

- **Always include meaningful alt text**:
  - For logo: `"SYMindX Logo"`
  - For symbol: `"SYMindX"`
  - For decorative use: `alt=""` or `aria-hidden="true"`

- **Ensure sufficient contrast** when overlaying on backgrounds
- **Consider dark mode variants** if needed in the future

## Brand Guidelines

- **Maintain aspect ratio**: Never stretch or skew the logos
- **Minimum size**: Don't go smaller than 16px (h-4 w-4)
- **Clear space**: Leave adequate whitespace around the logo
- **Consistent usage**: Use the same logo in similar contexts

## Migration from Brain Icon

The following components have been updated to use SYMindX logos:

- ✅ `App.tsx` - Main header and empty states
- ✅ `AgentBuilder.tsx` - Component header
- ✅ `ThoughtStream.tsx` - Component header  
- ✅ `AnalyticsPlatform.tsx` - Quick Insights section
- ✅ Storybook branding
- ✅ Favicon

### When to Use Brain Icon vs SYMindX Logo

- **Use SYMindX Logo**: For branding, headers, navigation, empty states
- **Keep Brain Icon**: For cognitive/AI-specific functionality, thought processes, neural networks

## File Organization

```
website/
├── public/assets/images/logos/          # Static logos (public URL access)
│   ├── symindx-logo.png
│   └── symindx.png
└── src/assets/images/ui/                # Imported logos (Vite processing)
    ├── symindx-logo.png
    └── symindx.png
```

## Notes

- Logos are available in both public and src directories for flexibility
- Public assets are better for simple img tags
- Src assets are better when you need Vite processing or want TypeScript imports 