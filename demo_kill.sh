#!/bin/bash

echo "💀 Interactive Port Killer Demo"
echo "==============================="
echo ""

echo "1️⃣  Testing help and system info..."
echo "   Getting help information..."
python3 port_killer.py --help

echo ""
echo "2️⃣  Testing system information..."
echo "   Getting system details..."
echo "5" | python3 port_killer.py > /dev/null 2>&1

echo ""
echo "3️⃣  Testing port scanning (read-only)..."
echo "   Scanning port 8080 for processes..."
echo "4" | python3 port_killer.py > /dev/null 2>&1

echo ""
echo "4️⃣  Testing pnpm scripts..."
echo "   Testing kill:web script..."
pnpm run kill:web > /dev/null 2>&1

echo ""
echo "✅ Demo completed! Now you can:"
echo "   • Run 'python3 port_killer.py' for interactive mode"
echo "   • Use 'pnpm run kill' for interactive mode"
echo "   • Use 'pnpm run kill:port 8080' to kill specific ports"
echo "   • Use 'pnpm run kill:common' to kill common service ports"
echo "   • Use 'pnpm run kill:force -- --port 8080' for force kill"
echo ""
echo "⚠️  IMPORTANT: Always check what processes you're killing!"
echo "📚 See README_port_killer.md for full documentation"

