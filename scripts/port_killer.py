#!/usr/bin/env python3
"""
Interactive Port Killer
A comprehensive tool to kill processes running on specific ports using multiple methods.
Compatible with Linux, macOS, and Windows (WSL).
"""

import subprocess
import sys
import os
import signal
import argparse
import json
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import platform

class PortKiller:
    def __init__(self):
        self.system = platform.system().lower()
        self.is_wsl = "microsoft" in platform.uname().release.lower()
        # In WSL, we still use Linux commands, not Windows commands
        self.use_windows_commands = False  # WSL uses Linux commands
        self.killed_processes = []
        self.failed_kills = []
        
    def get_processes_on_port(self, port: int) -> List[Dict]:
        """Get all processes running on a specific port using multiple methods."""
        processes = []
        
        # Try different methods based on system
        methods = [
            self._get_processes_netstat,
            self._get_processes_ss,
            self._get_processes_fuser,
            self._get_processes_lsof,
            self._get_processes_ps
        ]
        
        for method in methods:
            try:
                result = method(port)
                if result:
                    processes.extend(result)
                    break  # Use first successful method
            except Exception as e:
                continue
        
        # Remove duplicates based on PID
        unique_processes = {}
        for proc in processes:
            if proc['pid'] not in unique_processes:
                unique_processes[proc['pid']] = proc
        
        return list(unique_processes.values())
    
    def _get_processes_netstat(self, port: int) -> List[Dict]:
        """Get processes using netstat."""
        try:
            if self.system == "windows" or self.is_wsl:
                cmd = ["netstat", "-ano"]
            else:
                cmd = ["netstat", "-tlnp"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return []
            
            processes = []
            for line in result.stdout.split('\n'):
                if f":{port}" in line and ("LISTEN" in line or "ESTABLISHED" in line):
                    parts = line.split()
                    if len(parts) >= 7:
                        pid = parts[-1]
                        if pid.isdigit():
                            processes.append({
                                'pid': int(pid),
                                'method': 'netstat',
                                'raw_line': line.strip()
                            })
            return processes
        except Exception:
            return []
    
    def _get_processes_ss(self, port: int) -> List[Dict]:
        """Get processes using ss (socket statistics)."""
        try:
            cmd = ["ss", "-tlnp"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return []
            
            processes = []
            for line in result.stdout.split('\n'):
                if f":{port}" in line and "LISTEN" in line:
                    # Parse ss output: tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=1234,fd=3))
                    if "pid=" in line:
                        pid_start = line.find("pid=") + 4
                        pid_end = line.find(",", pid_start)
                        if pid_end == -1:
                            pid_end = line.find(")", pid_start)
                        if pid_start < pid_end:
                            pid = line[pid_start:pid_end]
                            if pid.isdigit():
                                processes.append({
                                    'pid': int(pid),
                                    'method': 'ss',
                                    'raw_line': line.strip()
                                })
            return processes
        except Exception:
            return []
    
    def _get_processes_fuser(self, port: int) -> List[Dict]:
        """Get processes using fuser."""
        try:
            cmd = ["fuser", str(port), "/tcp"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return []
            
            processes = []
            pids = result.stdout.strip().split()
            for pid in pids:
                if pid.isdigit():
                    processes.append({
                        'pid': int(pid),
                        'method': 'fuser',
                        'raw_line': f"fuser found PID {pid}"
                    })
            return processes
        except Exception:
            return []
    
    def _get_processes_lsof(self, port: int) -> List[Dict]:
        """Get processes using lsof."""
        try:
            cmd = ["lsof", "-ti", f":{port}"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return []
            
            processes = []
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid.isdigit():
                    processes.append({
                        'pid': int(pid),
                        'method': 'lsof',
                        'raw_line': f"lsof found PID {pid}"
                    })
            return processes
        except Exception:
            return []
    
    def _get_processes_ps(self, port: int) -> List[Dict]:
        """Get processes using ps (fallback method)."""
        try:
            # This is a fallback that might not be as accurate
            cmd = ["ps", "aux"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return []
            
            processes = []
            for line in result.stdout.split('\n'):
                if str(port) in line:
                    parts = line.split()
                    if len(parts) > 1:
                        pid = parts[1]
                        if pid.isdigit():
                            processes.append({
                                'pid': int(pid),
                                'method': 'ps',
                                'raw_line': line.strip()
                            })
            return processes
        except Exception:
            return []
    
    def get_process_info(self, pid: int) -> Dict:
        """Get detailed information about a process."""
        try:
            # Get process name and command
            # WSL uses Linux commands, not Windows commands
            if self.system == "windows" and not self.is_wsl:
                cmd = ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV"]
            else:
                cmd = ["ps", "-p", str(pid), "-o", "pid,ppid,comm,args", "--no-headers"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return {
                    'pid': pid,
                    'info': result.stdout.strip(),
                    'command': cmd
                }
        except Exception:
            pass
        
        return {'pid': pid, 'info': 'Unable to get process info', 'command': 'N/A'}
    
    def kill_process(self, pid: int, force: bool = False) -> bool:
        """Kill a process by PID."""
        try:
            if force:
                signal_to_use = signal.SIGKILL if hasattr(signal, 'SIGKILL') else 9
            else:
                signal_to_use = signal.SIGTERM if hasattr(signal, 'SIGTERM') else 15
            
            # WSL uses Linux commands, not Windows commands
            if self.system == "windows" and not self.is_wsl:
                # Use taskkill only on actual Windows
                cmd = ["taskkill", "/PID", str(pid)]
                if force:
                    cmd.append("/F")
            else:
                # Use kill on Unix-like systems (including WSL)
                cmd = ["kill", "-" + str(signal_to_use), str(pid)]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return True
            else:
                # Try alternative methods on Unix-like systems
                if self.system != "windows" or self.is_wsl:
                    # Try kill -9 as fallback
                    result = subprocess.run(["kill", "-9", str(pid)],
                                         capture_output=True, text=True, timeout=10)
                    return result.returncode == 0
                return False
                
        except Exception as e:
            print(f"❌ Error killing PID {pid}: {e}")
            return False
    
    def kill_port(self, port: int, force: bool = False, interactive: bool = True) -> Dict:
        """Kill all processes running on a specific port."""
        print(f"🔍 Finding processes on port {port}...")
        
        processes = self.get_processes_on_port(port)
        if not processes:
            print(f"✅ No processes found on port {port}")
            return {'killed': 0, 'failed': 0, 'total': 0}
        
        print(f"📊 Found {len(processes)} process(es) on port {port}:")
        
        for proc in processes:
            info = self.get_process_info(proc['pid'])
            print(f"  • PID {proc['pid']} (via {proc['method']})")
            if info['info'] != 'Unable to get process info':
                print(f"    {info['info']}")
        
        if interactive:
            confirm = input(f"\n⚠️  Kill all processes on port {port}? (y/N): ").strip().lower()
            if confirm not in ['y', 'yes']:
                print("❌ Operation cancelled.")
                return {'killed': 0, 'failed': 0, 'total': len(processes)}
        
        killed_count = 0
        failed_count = 0
        
        for proc in processes:
            pid = proc['pid']
            print(f"🔄 Killing PID {pid}...")
            
            if self.kill_process(pid, force):
                print(f"✅ Successfully killed PID {pid}")
                killed_count += 1
                self.killed_processes.append({
                    'pid': pid,
                    'port': port,
                    'method': proc['method'],
                    'timestamp': datetime.now().isoformat()
                })
            else:
                print(f"❌ Failed to kill PID {pid}")
                failed_count += 1
                self.failed_kills.append({
                    'pid': pid,
                    'port': port,
                    'method': proc['method'],
                    'timestamp': datetime.now().isoformat()
                })
        
        # Verify port is free
        remaining = self.get_processes_on_port(port)
        if not remaining:
            print(f"✅ Port {port} is now free!")
        else:
            print(f"⚠️  Port {port} still has {len(remaining)} process(es) running")
        
        return {
            'killed': killed_count,
            'failed': failed_count,
            'total': len(processes),
            'remaining': len(remaining)
        }
    
    def kill_multiple_ports(self, ports: List[int], force: bool = False, interactive: bool = True) -> Dict:
        """Kill processes on multiple ports."""
        total_killed = 0
        total_failed = 0
        total_ports = len(ports)
        
        print(f"🚀 Killing processes on {total_ports} port(s)...")
        
        for i, port in enumerate(ports, 1):
            print(f"\n📍 Port {i}/{total_ports}: {port}")
            result = self.kill_port(port, force, interactive)
            total_killed += result['killed']
            total_failed += result['failed']
        
        return {
            'killed': total_killed,
            'failed': total_failed,
            'total_ports': total_ports
        }
    
    def scan_and_kill_common_ports(self, force: bool = False, interactive: bool = True) -> Dict:
        """Scan common ports and kill processes on them."""
        common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995,
                       1433, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017]
        
        print(f"🔍 Scanning {len(common_ports)} common ports for processes to kill...")
        
        ports_with_processes = []
        for port in common_ports:
            processes = self.get_processes_on_port(port)
            if processes:
                ports_with_processes.append(port)
                print(f"  • Port {port}: {len(processes)} process(es)")
        
        if not ports_with_processes:
            print("✅ No processes found on common ports")
            return {'killed': 0, 'failed': 0, 'total_ports': 0}
        
        if interactive:
            confirm = input(f"\n⚠️  Kill processes on {len(ports_with_processes)} ports? (y/N): ").strip().lower()
            if confirm not in ['y', 'yes']:
                print("❌ Operation cancelled.")
                return {'killed': 0, 'failed': 0, 'total_ports': len(ports_with_processes)}
        
        return self.kill_multiple_ports(ports_with_processes, force, interactive)
    
    def get_system_info(self) -> Dict:
        """Get system information."""
        return {
            'system': self.system,
            'is_wsl': self.is_wsl,
            'platform': platform.platform(),
            'python_version': sys.version,
            'timestamp': datetime.now().isoformat()
        }
    
    def save_results(self, filename: str = None) -> str:
        """Save kill results to a file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"port_kill_{timestamp}.json"
        
        try:
            data = {
                'system_info': self.get_system_info(),
                'killed_processes': self.killed_processes,
                'failed_kills': self.failed_kills,
                'summary': {
                    'total_killed': len(self.killed_processes),
                    'total_failed': len(self.failed_kills),
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"💾 Results saved to: {filename}")
            return filename
        except Exception as e:
            print(f"❌ Error saving results: {e}")
            return None

def interactive_menu():
    """Display interactive menu and handle user input."""
    killer = PortKiller()
    
    while True:
        print("\n" + "="*60)
        print("                    INTERACTIVE PORT KILLER")
        print("="*60)
        print("1. Kill process on specific port")
        print("2. Kill processes on multiple ports")
        print("3. Kill processes on common ports (21, 22, 80, 443, etc.)")
        print("4. Scan ports for processes (read-only)")
        print("5. Show system information")
        print("6. View kill history")
        print("7. Save results to file")
        print("8. Exit")
        print("-"*60)
        
        try:
            choice = input("Select an option (1-8): ").strip()
            
            if choice == '1':
                port = int(input("Enter port number: ").strip())
                force = input("Force kill (SIGKILL)? (y/N): ").strip().lower() in ['y', 'yes']
                killer.kill_port(port, force, True)
                
            elif choice == '2':
                ports_input = input("Enter ports (comma-separated, e.g., 80,443,8080): ").strip()
                ports = [int(p.strip()) for p in ports_input.split(',') if p.strip().isdigit()]
                if ports:
                    force = input("Force kill (SIGKILL)? (y/N): ").strip().lower() in ['y', 'yes']
                    killer.kill_multiple_ports(ports, force, True)
                else:
                    print("❌ Invalid port list")
                
            elif choice == '3':
                force = input("Force kill (SIGKILL)? (y/N): ").strip().lower() in ['y', 'yes']
                killer.scan_and_kill_common_ports(force, True)
                
            elif choice == '4':
                port = int(input("Enter port number to scan: ").strip())
                processes = killer.get_processes_on_port(port)
                if processes:
                    print(f"\n📊 Found {len(processes)} process(es) on port {port}:")
                    for proc in processes:
                        info = killer.get_process_info(proc['pid'])
                        print(f"  • PID {proc['pid']} (via {proc['method']})")
                        if info['info'] != 'Unable to get process info':
                            print(f"    {info['info']}")
                else:
                    print(f"✅ No processes found on port {port}")
                
            elif choice == '5':
                info = killer.get_system_info()
                print("\n🖥️  System Information:")
                print("-" * 30)
                for key, value in info.items():
                    print(f"  {key.replace('_', ' ').title()}: {value}")
                
            elif choice == '6':
                if killer.killed_processes or killer.failed_kills:
                    print("\n📋 Kill History:")
                    print("-" * 30)
                    if killer.killed_processes:
                        print(f"✅ Successfully killed: {len(killer.killed_processes)}")
                        for proc in killer.killed_processes[-5:]:  # Show last 5
                            print(f"  • PID {proc['pid']} on port {proc['port']} ({proc['timestamp']})")
                    if killer.failed_kills:
                        print(f"❌ Failed to kill: {len(killer.failed_kills)}")
                        for proc in killer.failed_kills[-5:]:  # Show last 5
                            print(f"  • PID {proc['pid']} on port {proc['port']} ({proc['timestamp']})")
                else:
                    print("📋 No kill history available")
                
            elif choice == '7':
                if killer.killed_processes or killer.failed_kills:
                    filename = input("Enter filename (default: auto-generated): ").strip()
                    killer.save_results(filename if filename else None)
                else:
                    print("❌ No results to save")
                
            elif choice == '8':
                print("👋 Goodbye!")
                break
                
            else:
                print("❌ Invalid option! Please select 1-8.")
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Operation interrupted by user.")
            break
        except ValueError as e:
            print(f"❌ Invalid input: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
        
        input("\nPress Enter to continue...")

def main():
    """Main function with command line argument support."""
    parser = argparse.ArgumentParser(
        description="Interactive Port Killer - Kill processes on specific ports",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Interactive mode
  %(prog)s --port 8080       # Kill process on port 8080
  %(prog)s --port 80,443     # Kill processes on ports 80 and 443
  %(prog)s --common          # Kill processes on common ports
  %(prog)s --force           # Force kill (SIGKILL)
        """
    )
    
    parser.add_argument('--port', help='Port(s) to kill (comma-separated for multiple)')
    parser.add_argument('--common', action='store_true', help='Kill processes on common ports')
    parser.add_argument('--force', action='store_true', help='Force kill (SIGKILL)')
    parser.add_argument('--save', help='Save results to specified file')
    
    args = parser.parse_args()
    
    # If no arguments provided, run interactive mode
    if len(sys.argv) == 1:
        interactive_menu()
        return
    
    # Command line mode
    killer = PortKiller()
    
    try:
        if args.common:
            print("🚀 Killing processes on common ports...")
            result = killer.scan_and_kill_common_ports(args.force, False)
        elif args.port:
            ports = [int(p.strip()) for p in args.port.split(',') if p.strip().isdigit()]
            if ports:
                print(f"🚀 Killing processes on ports: {', '.join(map(str, ports))}")
                result = killer.kill_multiple_ports(ports, args.force, False)
            else:
                print("❌ Invalid port specification")
                return
        else:
            print("❌ Please specify --port or --common")
            return
        
        print(f"\n📊 Summary: Killed {result['killed']}, Failed {result['failed']}")
        
        if args.save:
            killer.save_results(args.save)
        else:
            killer.save_results()  # Auto-save with timestamp
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation interrupted by user.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
