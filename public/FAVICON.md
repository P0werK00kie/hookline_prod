# Favicon Generation

The project includes an SVG favicon at `public/favicon.svg`. To generate PNG versions for better browser compatibility, you have two options:

## Option 1: Using an Online Tool

1. Go to https://realfavicongenerator.net/
2. Upload `public/favicon.svg`
3. Generate all favicon formats
4. Download and extract to the `public/` folder

## Option 2: Using ImageMagick (if installed)

```bash
# Install ImageMagick first (if not already installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# Windows: Download from https://imagemagick.org/

# Generate PNG favicons
cd public
magick favicon.svg -resize 16x16 favicon-16x16.png
magick favicon.svg -resize 32x32 favicon-32x32.png
magick favicon.svg -resize 180x180 apple-touch-icon.png
magick favicon.svg -resize 192x192 android-chrome-192x192.png
magick favicon.svg -resize 512x512 android-chrome-512x512.png
```

## Required Files

- ✅ `favicon.svg` - Modern browsers
- ⏳ `favicon-16x16.png` - Legacy support
- ⏳ `favicon-32x32.png` - Legacy support
- ⏳ `apple-touch-icon.png` - iOS devices
- ⏳ `android-chrome-192x192.png` - Android devices
- ⏳ `android-chrome-512x512.png` - Android devices (high-res)

## SEO Optimization

The `index.html` file includes:

- Meta tags for search engines
- Open Graph tags for social media sharing
- Twitter Card tags
- Structured data for better search results
- Proper semantic HTML
