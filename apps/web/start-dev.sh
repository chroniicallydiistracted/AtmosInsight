#!/bin/bash

echo "🚀 Starting AtmosInsight Development Environment"
echo "================================================"
echo ""
echo "📋 Setup Instructions:"
echo "1. Copy env.example to .env.local:"
echo "   cp env.example .env.local"
echo ""
echo "2. Start proxy-server (Terminal 1):"
echo "   cd ../proxy-server && pnpm run dev"
echo "   (This will run on port 3001)"
echo ""
echo "3. Start Next.js web app (Terminal 2):"
echo "   pnpm run dev"
echo "   (This will run on port 3002)"
echo ""
echo "4. Open browser to: http://localhost:3002"
echo ""
echo "🔧 Port Configuration:"
echo "   - Proxy Server: http://localhost:3001"
echo "   - Next.js App:  http://localhost:3002"
echo "   - No port conflicts!"
echo ""
echo "📱 Your weather app will be available at:"
echo "   http://localhost:3002"
echo ""
echo "Press Enter to continue with setup..."
read

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp env.example .env.local
    echo "✅ .env.local created successfully!"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎯 Ready to start development!"
echo "Run: pnpm run dev"
