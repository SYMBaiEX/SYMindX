# SYMindX Assets Organization

This document outlines the assets organization structure for the SYMindX project, covering both the documentation site and the main website.

## Overview

The project uses two main asset storage strategies:

1. **Static Assets** - Served directly without processing
2. **Component Assets** - Imported in code and processed by build tools

## Directory Structure

```
symindx/
├── docs-site/
│   ├── static/assets/images/          # Static assets for documentation
│   │   ├── logos/                     # Brand logos and icons
│   │   ├── screenshots/               # Application screenshots
│   │   ├── diagrams/                  # Architecture diagrams
│   │   ├── icons/                     # UI icons and symbols
│   │   └── banners/                   # Header banners
│   └── src/assets/images/             # Component assets for docs
│       ├── components/                # Component-specific images
│       ├── layouts/                   # Layout images
│       ├── themes/                    # Theme variants
│       └── interactive/               # Interactive elements
└── website/
    ├── public/assets/images/          # Static assets for website
    │   ├── logos/                     # Brand logos and favicons
    │   ├── screenshots/               # App screenshots
    │   ├── marketing/                 # Marketing materials
    │   ├── icons/                     # Static icons
    │   └── backgrounds/               # Background images
    └── src/assets/images/             # Component assets for website
        ├── ui/                        # UI component images
        ├── icons/                     # SVG icons for components
        ├── avatars/                   # User avatars
        ├── products/                  # Product images
        └── illustrations/             # Custom illustrations
```

## Usage Guidelines

### Docs Site (Docusaurus)

**Static Assets (`docs-site/static/assets/images/`):**
```markdown
![Description](/assets/images/category/image.png)
```

**Component Assets (`docs-site/src/assets/images/`):**
```jsx
import image from '@site/src/assets/images/category/image.png';
```

### Website (Vite + React)

**Static Assets (`website/public/assets/images/`):**
```jsx
<img src="/assets/images/category/image.png" alt="Description" />
```

**Component Assets (`website/src/assets/images/`):**
```jsx
import image from '@/assets/images/category/image.png';
import { ReactComponent as Icon } from '@/assets/images/icons/icon.svg';
```

## Best Practices

### File Naming
- Use kebab-case: `user-profile-settings.png`
- Be descriptive: `dashboard-overview.png` not `image1.png`
- Include dimensions for multiple sizes: `logo-large.png`, `logo-small.png`

### Organization
- Group related images in appropriate subdirectories
- Keep category-specific images together
- Use consistent naming conventions within categories

### Optimization
- Compress images before committing
- Use appropriate formats:
  - **SVG** for logos and simple graphics
  - **PNG** for screenshots and complex images with transparency
  - **JPG** for photos and gradients
  - **WebP** for optimized web delivery
- Keep file sizes under 1MB when possible

### Version Control
- Commit optimized images only
- Use descriptive commit messages for asset changes
- Consider using Git LFS for large images if needed

## Image Formats and Use Cases

| Format | Use Case | Recommended For |
|--------|----------|----------------|
| SVG | Vector graphics, logos, icons | Logos, simple illustrations, icons |
| PNG | Screenshots, images with transparency | UI screenshots, diagrams |
| JPG | Photos, gradients | Marketing photos, backgrounds |
| WebP | Modern optimized format | All web images (when supported) |
| ICO | Favicons | Favicon files only |

## Component Asset Benefits

- **Automatic optimization** by build tools
- **Cache busting** with content hashes
- **TypeScript support** and IDE autocomplete
- **Tree shaking** removes unused assets
- **Hot reloading** during development
- **Build validation** catches missing assets

## Static Asset Benefits

- **Direct serving** without processing overhead
- **SEO friendly** with predictable URLs
- **CDN compatible** for faster delivery
- **Large file support** without build-time processing
- **External reference** capability

## Troubleshooting

### Common Issues

1. **Image not loading**
   - Check file path and spelling
   - Verify file exists in correct directory
   - Check file permissions

2. **Build errors with imports**
   - Ensure using correct import syntax
   - Check TypeScript configuration
   - Verify file extension is included

3. **Large bundle size**
   - Move large images to public assets
   - Optimize images before importing
   - Consider lazy loading for large images

### Getting Help

- Check the README.md files in each assets directory for specific usage
- Review component examples in the codebase
- Consult the build tool documentation (Vite/Docusaurus)

## Maintenance

- Regularly audit unused assets
- Optimize images when adding new ones
- Update this guide when structure changes
- Review asset organization during code reviews 