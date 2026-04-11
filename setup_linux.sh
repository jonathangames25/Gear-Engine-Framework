#!/bin/bash

# Gear Engine Linux Setup Script
# This script installs dependencies and prepares the project for Linux

echo "🚀 Starting Gear Engine Linux Setup..."

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Fix permissions for scripts
echo "🔧 Setting executable permissions for bash scripts..."
chmod +x tests/linux/*.sh

# 4. Check for common Electron dependencies on Linux
# This varies by distro, but we can give a hint
echo "💡 Note: If Electron fails to start, you might need to install system dependencies."
echo "For Ubuntu/Debian: sudo apt-get install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libmesa-glx libgbm1"

echo "✅ Setup complete! You can now run:"
echo "   npm start      - To start the Engine (Electron + Server)"
echo "   npm run dev    - To start in development mode"
