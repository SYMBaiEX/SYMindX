# Component Assets - Images

This directory contains images that are imported and used within React components in the Docusaurus site.

## Usage

Files in this directory should be imported in components:

```jsx
import logoImage from '@site/src/assets/images/logo.png';

function MyComponent() {
  return <img src={logoImage} alt="Logo" />;
}
```

Or using require:

```jsx
function MyComponent() {
  return <img src={require('@site/src/assets/images/logo.png').default} alt="Logo" />;
}
```

## Organization

- `components/` - Images specific to individual components
- `layouts/` - Images used in layout components
- `themes/` - Theme-specific images (light/dark variants)
- `interactive/` - Images for interactive elements

## Best Practices

- Import images in components rather than using public URLs
- These images will be processed by webpack (optimization, cache busting)
- Use TypeScript-friendly imports when possible
- Co-locate images with related components when it makes sense
- Use descriptive variable names when importing

## Benefits of Component Assets

- Automatic optimization by webpack
- Cache busting (filenames include content hashes)
- TypeScript support and IDE autocomplete
- Dead code elimination (unused images won't be bundled)
- Better error handling (build fails if image is missing) 