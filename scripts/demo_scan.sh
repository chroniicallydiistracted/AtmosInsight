#!/bin/bash

echo "🚀 Interactive Port Scanner Demo"
echo "================================"
echo ""

echo "1️⃣  Testing command line mode..."
echo "   Scanning common ports on localhost..."
python3 port_scanner.py --host localhost --common --timeout 1.0

echo ""
echo "2️⃣  Testing custom port range..."
echo "   Scanning ports 80-443 (web services)..."
python3 port_scanner.py --host localhost --range 80 443 --timeout 1.0

echo ""
echo "3️⃣  Testing network info..."
echo "   Getting system network information..."
python3 port_scanner.py --host localhost --range 22 22 --timeout 0.5 > /dev/null 2>&1

echo ""
echo "✅ Demo completed! Now you can:"
echo "   • Run 'python3 port_scanner.py' for interactive mode"
echo "   • Use command line arguments for automation"
echo "   • Check the generated JSON files for results"
echo ""
echo "📚 See README_port_scanner.md for full documentation"

