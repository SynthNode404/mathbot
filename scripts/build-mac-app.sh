#!/bin/bash
# Build MathBot as a Mac app

echo "🚀 Building MathBot for macOS..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the mathbot root directory"
    exit 1
fi

# Create static export configuration
echo "📝 Configuring static export..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: './',
  basePath: './'
}

module.exports = nextConfig
EOF

# Build the Next.js app as static files
echo "📦 Building Next.js static app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Next.js build failed"
    exit 1
fi

# Install Electron dependencies
echo "⬇️ Installing Electron dependencies..."
cd electron
npm install

if [ $? -ne 0 ]; then
    echo "❌ Electron install failed"
    exit 1
fi

# Create a simple icon (placeholder)
echo "🎨 Creating app icon..."
if [ ! -f "assets/icon.icns" ]; then
    # Create a minimal icon file (this is a placeholder - in production, use a proper icon)
    echo "Placeholder icon - replace with actual icon for production" > assets/icon.icns
fi

# Build the Mac app
echo "🍎 Building Mac app..."
npm run build-mac

if [ $? -ne 0 ]; then
    echo "❌ Mac app build failed"
    exit 1
fi

# Go back to root directory
cd ..

echo "✅ Mac app built successfully!"
echo "📁 Find it in: electron/dist/MathBot-1.0.0.dmg"
echo ""
echo "To distribute:"
echo "1. Upload the DMG file to GitHub Releases"
echo "2. Users download and open the DMG"
echo "3. Drag MathBot to Applications folder"
echo "4. Launch from Applications (no terminal needed!)"
echo ""
echo "⚠️  Note: Users still need to install Ollama separately for AI functionality"
echo "   The app will show setup instructions on first launch"
