# Interactive Port Killer 💀

A powerful, cross-platform tool to kill processes running on specific ports using multiple detection methods. Compatible with Linux, macOS, Windows, and WSL.

## Features ✨

- **Multi-Method Detection**: Uses netstat, ss, fuser, lsof, and ps for maximum compatibility
- **Cross-Platform**: Works on Linux, macOS, Windows, and WSL
- **Interactive Menu**: User-friendly interface with numbered options
- **Force Kill Option**: SIGTERM (graceful) or SIGKILL (force) termination
- **Batch Operations**: Kill processes on multiple ports at once
- **Common Ports**: Pre-defined list of frequently used service ports
- **Process Information**: Detailed process details before killing
- **Kill History**: Track all killed and failed processes
- **Results Export**: Save kill results to JSON files
- **Command Line**: Can be used non-interactively with arguments

## Quick Start 🚀

### Interactive Mode (Recommended)

```bash
python3 port_killer.py
```

### NPM Scripts (Easiest)

```bash
# Interactive mode
npm run kill

# Kill process on specific port
npm run kill:port 8080

# Kill processes on common ports
npm run kill:common

# Force kill (SIGKILL)
npm run kill:force -- --port 8080

# Kill web services
npm run kill:web

# Kill database services
npm run kill:database
```

### Command Line Mode

```bash
# Kill process on port 8080
python3 port_killer.py --port 8080

# Kill processes on multiple ports
python3 port_killer.py --port 80,443,8080

# Kill processes on common ports
python3 port_killer.py --common

# Force kill (SIGKILL)
python3 port_killer.py --port 8080 --force
```

## Interactive Menu Options 📋

1. **Kill process on specific port** - Terminate process on a single port
2. **Kill processes on multiple ports** - Batch kill on multiple ports
3. **Kill processes on common ports** - Kill on well-known service ports
4. **Scan ports for processes** - Read-only port scanning
5. **Show system information** - Display platform and system details
6. **View kill history** - See recently killed/failed processes
7. **Save results to file** - Export results to JSON format
8. **Exit** - Quit the application

## NPM Scripts 🚀

The port killer is integrated into your project's package.json for easy access:

| Script                  | Description            | Equivalent Command                               |
| ----------------------- | ---------------------- | ------------------------------------------------ |
| `npm run kill`          | Interactive mode       | `python3 port_killer.py`                         |
| `npm run kill:port`     | Kill on specific port  | `python3 port_killer.py --port PORT`             |
| `npm run kill:common`   | Kill on common ports   | `python3 port_killer.py --common`                |
| `npm run kill:force`    | Force kill option      | `python3 port_killer.py --force`                 |
| `npm run kill:web`      | Kill web services      | `python3 port_killer.py --port 80,443,8080,8443` |
| `npm run kill:database` | Kill database services | `python3 port_killer.py --port 3306,5432,27017`  |

## Detection Methods 🔍

The port killer uses multiple methods to find processes, ensuring maximum compatibility:

### 1. **netstat** (Primary)

- **Linux/macOS**: `netstat -tlnp`
- **Windows/WSL**: `netstat -ano`
- **Pros**: Widely available, reliable
- **Cons**: Slower on some systems

### 2. **ss** (Socket Statistics)

- **Command**: `ss -tlnp`
- **Pros**: Fast, modern replacement for netstat
- **Cons**: Not available on all systems

### 3. **fuser**

- **Command**: `fuser PORT/tcp`
- **Pros**: Very fast, direct port-to-PID mapping
- **Cons**: Linux only, may require root

### 4. **lsof** (List Open Files)

- **Command**: `lsof -ti :PORT`
- **Pros**: Detailed process information
- **Cons**: Not always available, slower

### 5. **ps** (Process Status)

- **Command**: `ps aux`
- **Pros**: Always available
- **Cons**: Less accurate, slower

## Common Ports Scanned 🔌

The tool automatically checks these frequently used service ports:

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

## Command Line Arguments 🖥️

| Argument   | Description                       | Example               |
| ---------- | --------------------------------- | --------------------- |
| `--port`   | Port(s) to kill (comma-separated) | `--port 80,443,8080`  |
| `--common` | Kill processes on common ports    | `--common`            |
| `--force`  | Force kill (SIGKILL)              | `--force`             |
| `--save`   | Save results to specified file    | `--save results.json` |

## Examples 💡

### Quick Port Freeing

```bash
# Free up port 8080 for your development server
npm run kill:port 8080

# Force kill if graceful termination fails
npm run kill:force -- --port 8080
```

### Web Development

```bash
# Kill all web services to start fresh
npm run kill:web

# Kill specific development ports
npm run kill:port 3000,3001,8000
```

### Database Management

```bash
# Kill database services for maintenance
npm run kill:database

# Kill specific database port
npm run kill:port 3306
```

### System Administration

```bash
# Kill processes on common ports
npm run kill:common

# Interactive mode for complex scenarios
npm run kill
```

## Safety Features 🛡️

### Confirmation Prompts

- **Interactive mode**: Always asks for confirmation before killing
- **Command line**: Use `--force` to skip confirmations
- **Batch operations**: Single confirmation for multiple ports

### Process Information

- Shows process details before termination
- Displays PID, method used, and process info
- Helps identify important system processes

### Graceful Termination

- **Default**: SIGTERM (graceful shutdown)
- **Force**: SIGKILL (immediate termination)
- Fallback methods if primary kill fails

## Output Format 📊

### Interactive Display

```
🔍 Finding processes on port 8080...
📊 Found 1 process(es) on port 8080:
  • PID 12345 (via netstat)
    python3 app.py

⚠️  Kill all processes on port 8080? (y/N): y
🔄 Killing PID 12345...
✅ Successfully killed PID 12345
✅ Port 8080 is now free!
```

### JSON Export

Results are automatically saved to timestamped files:

```json
{
  "system_info": {
    "system": "linux",
    "is_wsl": true,
    "platform": "Linux-5.10.0-...",
    "python_version": "3.9.0",
    "timestamp": "2024-01-15T14:30:25.123456"
  },
  "killed_processes": [
    {
      "pid": 12345,
      "port": 8080,
      "method": "netstat",
      "timestamp": "2024-01-15T14:30:25.123456"
    }
  ],
  "failed_kills": [],
  "summary": {
    "total_killed": 1,
    "total_failed": 0,
    "timestamp": "2024-01-15T14:30:25.123456"
  }
}
```

## Cross-Platform Compatibility 🌍

### Linux

- **Primary**: netstat, ss, fuser
- **Fallback**: lsof, ps
- **Kill**: `kill -TERM` / `kill -9`

### macOS

- **Primary**: netstat, lsof
- **Fallback**: ps
- **Kill**: `kill -TERM` / `kill -9`

### Windows/WSL

- **Primary**: netstat
- **Fallback**: tasklist
- **Kill**: `taskkill /PID` / `taskkill /PID /F`

### WSL Detection

- Automatically detects WSL environment
- Uses appropriate Windows commands
- Maintains Linux compatibility

## Performance Tips ⚡

- **Single port**: ~0.1-0.5 seconds
- **Multiple ports**: ~0.1-1 second per port
- **Common ports scan**: ~1-2 seconds for 20 ports
- **Detection method priority**: Fastest available method is used first
- **Batch operations**: More efficient than individual kills

## Safety & Ethics 🛡️

⚠️ **Important**: This tool is for legitimate system administration and development purposes only.

- **Only kill processes you own or have permission to terminate**
- **Be careful with system services and daemons**
- **Use force kill sparingly - it can cause data loss**
- **Some processes may restart automatically**
- **Check process details before killing**

## Requirements 📋

- **Python 3.7+** (uses f-strings and typing features)
- **No external dependencies** - uses only built-in Python modules
- **System commands**: netstat, ss, fuser, lsof, ps (varies by system)
- **Administrative privileges** may be required for some operations

## Troubleshooting 🔧

### Common Issues

**Permission Denied**

```bash
# Try running with sudo (Linux/macOS)
sudo python3 port_killer.py --port 80

# Or use higher port ranges that don't require privileges
python3 port_killer.py --port 8080
```

**Process Not Found**

```bash
# Try different detection methods
python3 port_killer.py --port 8080

# Check if port is actually in use
netstat -tlnp | grep :8080
```

**Kill Fails**

```bash
# Use force kill option
python3 port_killer.py --port 8080 --force

# Check process permissions
ps aux | grep PID
```

**System Compatibility**

```bash
# Check available commands
which netstat ss fuser lsof ps

# Use interactive mode to see which methods work
python3 port_killer.py
```

## Advanced Usage 🚀

### Batch Operations

```bash
# Kill processes on multiple ports
python3 port_killer.py --port 3000,3001,3002,8000,8080

# Kill all development ports
for port in {3000..3010}; do
    python3 port_killer.py --port $port --force
done
```

### Integration with Other Tools

```bash
# Kill processes found by port scanner
python3 port_scanner.py --common | grep "Port.*:" | awk '{print $2}' | xargs -I {} python3 port_killer.py --port {}

# Kill processes and start new service
python3 port_killer.py --port 8080 && python3 app.py
```

### Custom Detection Methods

```bash
# Test specific detection method
netstat -tlnp | grep :8080
ss -tlnp | grep :8080
fuser 8080/tcp
lsof -ti :8080
```

## Contributing 🤝

Feel free to enhance this tool with:

- Additional detection methods
- Process filtering options
- Network interface selection
- Kill scheduling
- Process monitoring
- GUI interface

## License 📄

This tool is provided as-is for legitimate system administration and development purposes.

---

**Happy Port Killing! 💀✨**
