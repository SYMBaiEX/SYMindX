# Static Assets - Images

This directory contains static images that are served directly by Docusaurus without any processing.

## Usage

Files in this directory can be referenced in documentation using:

### In Markdown files:
```markdown
![Alt text](/assets/images/your-image.png)
```

### In MDX files:
```jsx
<img src="/assets/images/your-image.png" alt="Alt text" />
```

## Organization

- `logos/` - Brand logos and icons
- `screenshots/` - Application screenshots
- `diagrams/` - Architecture and flow diagrams
- `icons/` - UI icons and symbols
- `banners/` - Header banners and hero images

## Best Practices

- Use descriptive filenames (e.g., `dashboard-overview.png` instead of `image1.png`)
- Optimize images for web (compress and use appropriate formats)
- Prefer SVG for logos and simple graphics
- Keep file sizes under 1MB when possible
- Use kebab-case for filenames (e.g., `user-profile-settings.png`)

## Supported Formats

- PNG (for screenshots and complex images)
- JPG (for photos and gradients)
- SVG (for logos and simple graphics)
- WebP (for optimized web images)
- GIF (for simple animations) 