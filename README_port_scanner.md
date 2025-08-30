# Interactive Port Scanner 🔍

A comprehensive, interactive Python tool to scan all ports on your system with multiple scanning options and detailed reporting.

## Features ✨

- **Interactive Menu**: User-friendly interface with numbered options
- **Multiple Scan Types**: Common ports, custom ranges, or full port scan (1-65535)
- **Multi-threaded**: Fast scanning with configurable worker threads
- **Service Detection**: Identifies common services on well-known ports
- **Progress Tracking**: Real-time progress updates during scans
- **Network Info**: Shows hostname, local IP, and external IP
- **Results Export**: Save scan results to JSON files
- **Command Line**: Can be used non-interactively with command line arguments

## Quick Start 🚀

### Interactive Mode (Recommended)

```bash
python3 port_scanner.py
```

### NPM Scripts (Easiest)

```bash
# Interactive mode
npm run scan

# Quick common ports scan
npm run scan:common

# Web services scan (ports 80-443)
npm run scan:web

# SSH port check
npm run scan:ssh

# Database ports scan
npm run scan:database

# Local network scan
npm run scan:local

# Full port scan (all 65535 ports)
npm run scan:all

# Run demo script
npm run scan:demo
```

### Command Line Mode

```bash
# Scan common ports on localhost
python3 port_scanner.py --common

# Scan specific port range
python3 port_scanner.py --host 192.168.1.1 --range 80 443

# Scan all ports (full scan)
python3 port_scanner.py --host 127.0.0.1 --all

# Custom timeout and workers
python3 port_scanner.py --host localhost --common --timeout 2.0 --workers 200
```

## Interactive Menu Options 📋

1. **Scan Common Ports** - Quick scan of well-known service ports
2. **Scan Custom Port Range** - Specify start and end ports
3. **Scan All Ports** - Complete scan of all 65535 ports (⚠️ may take time)
4. **Show Network Information** - Display hostname and IP addresses
5. **View Last Scan Results** - Show results from the most recent scan
6. **Save Results to File** - Export results to JSON format
7. **Exit** - Quit the application

## Common Ports Scanned 🔌

The tool automatically identifies these common services:

- **21** - FTP
- **22** - SSH
- **23** - Telnet
- **25** - SMTP
- **53** - DNS
- **80** - HTTP
- **110** - POP3
- **143** - IMAP
- **443** - HTTPS
- **993** - IMAPS
- **995** - POP3S
- **1433** - MSSQL
- **3306** - MySQL
- **3389** - RDP
- **5432** - PostgreSQL
- **5900** - VNC
- **6379** - Redis
- **8080** - HTTP-Alt
- **8443** - HTTPS-Alt
- **27017** - MongoDB

## NPM Scripts 🚀

The port scanner is integrated into your project's package.json for easy access:

| Script                  | Description           | Equivalent Command                                  |
| ----------------------- | --------------------- | --------------------------------------------------- |
| `npm run scan`          | Interactive mode      | `python3 port_scanner.py`                           |
| `npm run scan:common`   | Common ports scan     | `python3 port_scanner.py --common`                  |
| `npm run scan:web`      | Web services (80-443) | `python3 port_scanner.py --range 80 443`            |
| `npm run scan:ssh`      | SSH port check        | `python3 port_scanner.py --range 22 22`             |
| `npm run scan:database` | Database ports        | `python3 port_scanner.py --range 3306 5432`         |
| `npm run scan:local`    | Local network scan    | `python3 port_scanner.py --host 127.0.0.1 --common` |
| `npm run scan:all`      | Full port scan        | `python3 port_scanner.py --all`                     |
| `npm run scan:demo`     | Run demo script       | `./demo_scan.sh`                                    |

## Command Line Arguments 🖥️

| Argument            | Description                    | Default        |
| ------------------- | ------------------------------ | -------------- |
| `--host`            | Host to scan                   | localhost      |
| `--range START END` | Port range to scan             | N/A            |
| `--common`          | Scan common ports only         | False          |
| `--all`             | Scan all ports (1-65535)       | False          |
| `--timeout`         | Socket timeout in seconds      | 1.0            |
| `--workers`         | Max concurrent workers         | 100            |
| `--save`            | Save results to specified file | Auto-generated |

## Examples 💡

### Quick Network Assessment

```bash
# Scan your local network for common services
python3 port_scanner.py --host 192.168.1.1 --common
```

### Web Server Check

```bash
# Check if web services are running
python3 port_scanner.py --host localhost --range 80 443
```

### Full Security Audit

```bash
# Complete port scan (use with caution)
python3 port_scanner.py --host 127.0.0.1 --all --workers 500
```

### Custom Configuration

```bash
# High-speed scan with custom settings
python3 port_scanner.py --host localhost --range 1 1024 --timeout 0.5 --workers 300
```

## Output Format 📊

### Interactive Display

```
🔍 Starting scan of 20 common ports on localhost
📊 Port range: 21 - 27017
⚡ Timeout: 1.0s | Max workers: 50
============================================================
✅ Port    22 - SSH
✅ Port    80 - HTTP
✅ Port   443 - HTTPS
✅ Port  3306 - MySQL
📈 Progress: 20/20 (100.0%)
```

### JSON Export

Results are automatically saved to timestamped files:

```json
{
  "scan_info": {
    "timestamp": "2024-01-15T14:30:25.123456",
    "total_ports": 20,
    "open_ports_count": 4,
    "duration": 2.45
  },
  "open_ports": {
    "22": {
      "status": "open",
      "service": "SSH",
      "timestamp": "2024-01-15T14:30:25.123456"
    }
  },
  "network_info": {
    "hostname": "mycomputer",
    "local_ip": "192.168.1.100",
    "external_ip": "203.0.113.1"
  }
}
```

## Performance Tips ⚡

- **Common ports scan**: ~1-2 seconds for 20 ports
- **Custom range**: ~1 second per 100 ports (depends on network)
- **Full scan**: 5-15 minutes depending on network and system resources
- **Increase workers** for faster scanning on fast networks
- **Decrease timeout** for faster results (may miss slow services)

## Safety & Ethics 🛡️

⚠️ **Important**: This tool is for legitimate network administration and security testing only.

- **Only scan networks you own or have permission to test**
- **Respect rate limits and network policies**
- **Don't use for malicious purposes or unauthorized access**
- **Some networks may flag port scanning as suspicious activity**

## Requirements 📋

- **Python 3.7+** (uses f-strings and typing features)
- **No external dependencies** - uses only built-in Python modules
- **Network access** to target hosts
- **Administrative privileges** may be required for some scans

## Troubleshooting 🔧

### Common Issues

**Permission Denied**

```bash
# Try running with sudo (Linux/Mac)
sudo python3 port_scanner.py

# Or use higher port ranges that don't require privileges
python3 port_scanner.py --range 1024 65535
```

**Slow Scanning**

```bash
# Increase timeout for slow networks
python3 port_scanner.py --timeout 3.0

# Increase workers for faster networks
python3 port_scanner.py --workers 500
```

**Network Unreachable**

```bash
# Check if host is reachable first
ping localhost

# Try different host formats
python3 port_scanner.py --host 127.0.0.1
python3 port_scanner.py --host 0.0.0.0
```

## Advanced Usage 🚀

### Batch Scanning

```bash
# Scan multiple hosts
for host in 192.168.1.{1..10}; do
    echo "Scanning $host..."
    python3 port_scanner.py --host $host --common --save "scan_$host.json"
done
```

### Integration with Other Tools

```bash
# Pipe results to other tools
python3 port_scanner.py --host localhost --common | grep "SSH"

# Save and analyze
python3 port_scanner.py --host 192.168.1.1 --range 1 1024 --save results.json
jq '.open_ports | keys[]' results.json
```

## Contributing 🤝

Feel free to enhance this tool with:

- Additional service detection
- Different output formats (CSV, XML)
- Network topology mapping
- Vulnerability assessment features
- GUI interface

## License 📄

This tool is provided as-is for educational and legitimate network administration purposes.

---

**Happy Scanning! 🔍✨**
