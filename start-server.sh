#!/bin/bash

echo "🚀 Starting Family Todo & Calendar Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🎯 Server will be available at: http://localhost:3000"
echo "📱 Mobile-friendly and responsive design"
echo "🎨 Features: 5 themes, dark mode, calendar view"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

# Start the server
npm start
