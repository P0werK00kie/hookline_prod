#!/bin/bash

# Favicon Generator Script
# This script generates PNG favicons from the SVG source

echo "🎨 Generating favicon PNG files from SVG..."

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo ""
    echo "Please install ImageMagick:"
    echo "  - macOS: brew install imagemagick"
    echo "  - Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  - Windows: Download from https://imagemagick.org/"
    echo ""
    echo "Or use an online tool like https://realfavicongenerator.net/"
    exit 1
fi

# Determine which command to use
if command -v magick &> /dev/null; then
    CMD="magick"
else
    CMD="convert"
fi

cd public

# Generate PNG favicons
echo "Generating favicon-16x16.png..."
$CMD favicon.svg -resize 16x16 favicon-16x16.png

echo "Generating favicon-32x32.png..."
$CMD favicon.svg -resize 32x32 favicon-32x32.png

echo "Generating apple-touch-icon.png..."
$CMD favicon.svg -resize 180x180 apple-touch-icon.png

echo "Generating android-chrome-192x192.png..."
$CMD favicon.svg -resize 192x192 android-chrome-192x192.png

echo "Generating android-chrome-512x512.png..."
$CMD favicon.svg -resize 512x512 android-chrome-512x512.png

echo ""
echo "✅ All favicon files generated successfully!"
echo ""
echo "Generated files:"
echo "  - favicon-16x16.png"
echo "  - favicon-32x32.png"
echo "  - apple-touch-icon.png"
echo "  - android-chrome-192x192.png"
echo "  - android-chrome-512x512.png"
