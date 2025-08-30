# 🚀 AtmosInsight Management Scripts

This directory contains three essential scripts for managing your AtmosInsight development environment.

## 📋 **Available Scripts**

### 1. **`start-atmosinsight.sh`** - Universal Startup Script

**Purpose:** Starts both proxy-server and Next.js web app with automatic port conflict resolution.

**Features:**

- ✅ Checks for port conflicts (3001, 3002)
- ✅ Automatically kills conflicting processes
- ✅ Starts services in the correct order (proxy-server first, then web app)
- ✅ Runs services in background (non-blocking)
- ✅ Comprehensive error handling and status reporting
- ✅ Color-coded output for easy reading

**Usage:**

```bash
./start-atmosinsight.sh
```

**What it does:**

1. Verifies you're in the correct directory
2. Checks if ports 3001 or 3002 are in use
3. Kills any conflicting processes (graceful shutdown, then force kill if needed)
4. Starts proxy-server on port 3001
5. Waits for proxy-server to be ready
6. Starts Next.js web app on port 3002
7. Confirms both services are running
8. Exits cleanly (services continue running in background)

---

### 2. **`stop-atmosinsight.sh`** - Teardown Script

**Purpose:** Stops all running services and confirms ports are free.

**Features:**

- ✅ Stops both proxy-server and Next.js web app
- ✅ Graceful shutdown with fallback to force kill
- ✅ Confirms ports are actually free
- ✅ Kills any remaining pnpm processes
- ✅ Comprehensive status reporting
- ✅ Final verification of cleanup

**Usage:**

```bash
./stop-atmosinsight.sh
```

**What it does:**

1. Checks current status of all services
2. Stops proxy-server (port 3001) if running
3. Stops Next.js web app (port 3002) if running
4. Kills any remaining pnpm processes
5. Verifies all ports are free
6. Reports final status

---

### 3. **`status-atmosinsight.sh`** - Status Check Script

**Purpose:** Shows current status of all services and ports.

**Features:**

- ✅ Real-time status of both services
- ✅ Process details (PID, command, user, uptime)
- ✅ Health checks (HTTP response testing)
- ✅ Summary of running services
- ✅ Quick action suggestions
- ✅ Non-intrusive (read-only)

**Usage:**

```bash
./status-atmosinsight.sh
```

**What it shows:**

1. Proxy-server status (port 3001)
2. Next.js web app status (port 3002)
3. Other pnpm processes
4. Summary and quick actions
5. Health check results

---

## 🔧 **Setup Requirements**

### **Prerequisites:**

- `lsof` command available (usually pre-installed on Linux/macOS)
- `curl` command available (for health checks)
- Running from AtmosInsight root directory

### **Make Scripts Executable:**

```bash
chmod +x start-atmosinsight.sh stop-atmosinsight.sh status-atmosinsight.sh
```

---

## 🚀 **Typical Workflow**

### **Starting Development:**

```bash
# Start all services (choose one):
pnpm start                    # Using package.json script
./start-atmosinsight.sh      # Direct script execution

# Check status (choose one):
pnpm status                  # Using package.json script
./status-atmosinsight.sh    # Direct script execution

# Open browser to http://localhost:3002
```

### **During Development:**

```bash
# Check status anytime (choose one):
pnpm status                  # Using package.json script
./status-atmosinsight.sh    # Direct script execution
```

### **Stopping Development:**

```bash
# Stop all services (choose one):
pnpm stop                    # Using package.json script
./stop-atmosinsight.sh      # Direct script execution
```

### **Restart Everything:**

```bash
# Restart all services (choose one):
pnpm restart                 # Using package.json script
./stop-atmosinsight.sh && ./start-atmosinsight.sh  # Direct execution
```

---

## 🎯 **Port Configuration**

| Service             | Port | Purpose                           |
| ------------------- | ---- | --------------------------------- |
| **proxy-server**    | 3000 | API proxy, tile services, GLM TOE |
| **Next.js Web App** | 3002 | Frontend application              |

---

## 🛠️ **Troubleshooting**

### **Port Already in Use:**

- Scripts automatically handle this
- If manual intervention needed: `lsof -i :3001` or `lsof -i :3002`

### **Services Won't Start:**

- Check logs: `proxy-server/proxy-server.log` and `apps/web/Next.js web app.log`
- Verify environment variables are set
- Check `pnpm install` was run in both directories

### **Permission Denied:**

- Ensure scripts are executable: `chmod +x *.sh`
- Run from AtmosInsight root directory

---

## 🔍 **Manual Commands (if needed)**

### **Start Individual Services:**

```bash
# Start proxy-server only
cd proxy-server && pnpm run dev

# Start web app only
cd apps/web && pnpm run dev
```

### **Stop All Services:**

```bash
pkill -f "pnpm run dev"
```

### **Check Ports:**

```bash
lsof -i :3001  # proxy-server
lsof -i :3002  # web app
```

---

## 📝 **Log Files**

- **Proxy Server:** `proxy-server/proxy-server.log`
- **Web App:** `apps/web/Next.js web app.log`

---

## 🎨 **Features**

- **Color-coded output** for easy reading
- **Comprehensive error handling** with helpful messages
- **Automatic port conflict resolution**
- **Background service management**
- **Health checks** for running services
- **Non-blocking operation** (startup script exits after starting services)

---

## 💡 **Tips**

1. **Always run from root directory** - scripts check this automatically
2. **Use status script** to check health anytime
3. **Startup script is non-blocking** - you get your terminal back
4. **Teardown script is thorough** - confirms everything is stopped
5. **Scripts handle errors gracefully** - they won't leave things in a bad state

---

## 🚨 **Important Notes**

- Scripts use `set -e` for strict error handling
- Services run in background after startup
- Port conflicts are automatically resolved
- Graceful shutdown is attempted before force kill
- All operations are logged for debugging

---

**Happy coding with AtmosInsight! 🎉**
