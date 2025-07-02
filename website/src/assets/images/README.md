# Source Assets - Images

This directory contains images that are imported and used within React components. These images are processed by Vite for optimization.

## Usage

Import images in your components:

```tsx
import logoImage from '@/assets/images/logo.png';
import { ReactComponent as IconSvg } from '@/assets/images/icon.svg';

function MyComponent() {
  return (
    <div>
      <img src={logoImage} alt="Logo" />
      <IconSvg className="w-6 h-6" />
    </div>
  );
}
```

## Organization

- `ui/` - UI component images (buttons, patterns, etc.)
- `icons/` - SVG icons for components
- `avatars/` - User avatars and profile images
- `products/` - Product images and thumbnails
- `illustrations/` - Custom illustrations and graphics

## Benefits of Src Assets

- **Automatic optimization** - Vite optimizes images during build
- **Cache busting** - Filenames include content hashes
- **TypeScript support** - Type checking and autocomplete
- **Tree shaking** - Unused images won't be included in bundle
- **Hot reloading** - Changes reflect immediately in development
- **Import validation** - Build fails if image path is incorrect

## Best Practices

- Use for images that are part of the UI
- Import using the `@/assets/images/` alias
- Use descriptive filenames and organize in subdirectories
- Prefer SVG for icons and simple graphics
- Use TypeScript-compatible imports
- Consider image dimensions and file sizes

## SVG Handling

For SVG icons, you can import them as React components:

```tsx
import { ReactComponent as ChevronIcon } from '@/assets/images/icons/chevron.svg';

// Use as a component
<ChevronIcon className="w-4 h-4 text-blue-500" />
```

## Supported Formats

- PNG, JPG, WebP (raster images)
- SVG (vector graphics, can be imported as components)
- AVIF (modern optimized format)
- Any format supported by Vite's asset handling 