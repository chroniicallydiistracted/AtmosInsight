#!/usr/bin/env python3
"""
Interactive Port Scanner
A comprehensive tool to scan ports on your system with interactive options.
"""

import socket
import threading
import time
import argparse
import sys
from typing import List, Dict, Tuple
import concurrent.futures
from datetime import datetime
import json

class PortScanner:
    def __init__(self):
        self.open_ports = []
        self.scan_results = {}
        self.scan_start_time = None
        self.scan_end_time = None
        self.total_ports = 0
        self.scanned_ports = 0
        
    def scan_port(self, host: str, port: int, timeout: float = 1.0) -> Tuple[int, bool, str]:
        """Scan a single port and return results."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                service_name = self.get_service_name(port)
                return port, True, service_name
            else:
                return port, False, ""
                
        except socket.error:
            return port, False, ""
        except Exception as e:
            return port, False, f"Error: {str(e)}"
    
    def get_service_name(self, port: int) -> str:
        """Get common service name for well-known ports."""
        common_services = {
            21: "FTP",
            22: "SSH",
            23: "Telnet",
            25: "SMTP",
            53: "DNS",
            80: "HTTP",
            110: "POP3",
            143: "IMAP",
            443: "HTTPS",
            993: "IMAPS",
            995: "POP3S",
            1433: "MSSQL",
            3306: "MySQL",
            3389: "RDP",
            5432: "PostgreSQL",
            5900: "VNC",
            6379: "Redis",
            8080: "HTTP-Alt",
            8443: "HTTPS-Alt",
            27017: "MongoDB"
        }
        return common_services.get(port, "Unknown")
    
    def scan_range(self, host: str, start_port: int, end_port: int,
                   timeout: float = 1.0, max_workers: int = 100) -> Dict:
        """Scan a range of ports using multiple threads."""
        self.scan_start_time = time.time()
        self.total_ports = end_port - start_port + 1
        self.scanned_ports = 0
        self.open_ports = []
        self.scan_results = {}
        
        print(f"🔍 Starting scan of {self.total_ports} ports on {host}")
        print(f"📊 Port range: {start_port} - {end_port}")
        print(f"⚡ Timeout: {timeout}s | Max workers: {max_workers}")
        print("=" * 60)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_port = {
                executor.submit(self.scan_port, host, port, timeout): port
                for port in range(start_port, end_port + 1)
            }
            
            for future in concurrent.futures.as_completed(future_to_port):
                port, is_open, service = future.result()
                self.scanned_ports += 1
                
                if is_open:
                    self.open_ports.append(port)
                    self.scan_results[port] = {
                        'status': 'open',
                        'service': service,
                        'timestamp': datetime.now().isoformat()
                    }
                    print(f"✅ Port {port:5d} - {service}")
                
                # Progress indicator
                if self.scanned_ports % 100 == 0 or self.scanned_ports == self.total_ports:
                    progress = (self.scanned_ports / self.total_ports) * 100
                    print(f"📈 Progress: {self.scanned_ports}/{self.total_ports} ({progress:.1f}%)")
        
        self.scan_end_time = time.time()
        return self.scan_results
    
    def scan_common_ports(self, host: str, timeout: float = 1.0) -> Dict:
        """Scan common ports that are typically used by services."""
        common_ports = [
            21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995,
            1433, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017
        ]
        
        print(f"🔍 Scanning {len(common_ports)} common ports on {host}")
        print("=" * 50)
        
        # Scan each common port individually instead of using range
        self.scan_start_time = time.time()
        self.total_ports = len(common_ports)
        self.scanned_ports = 0
        self.open_ports = []
        self.scan_results = {}
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            future_to_port = {
                executor.submit(self.scan_port, host, port, timeout): port 
                for port in common_ports
            }
            
            for future in concurrent.futures.as_completed(future_to_port):
                port, is_open, service = future.result()
                self.scanned_ports += 1
                
                if is_open:
                    self.open_ports.append(port)
                    self.scan_results[port] = {
                        'status': 'open',
                        'service': service,
                        'timestamp': datetime.now().isoformat()
                    }
                    print(f"✅ Port {port:5d} - {service}")
                
                # Progress indicator
                if self.scanned_ports % 5 == 0 or self.scanned_ports == self.total_ports:
                    progress = (self.scanned_ports / self.total_ports) * 100
                    print(f"📈 Progress: {self.scanned_ports}/{self.total_ports} ({progress:.1f}%)")
        
        self.scan_end_time = time.time()
        return self.scan_results
    
    def get_network_info(self) -> Dict:
        """Get network interface information."""
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            
            # Try to get external IP
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    s.connect(("8.8.8.8", 80))
                    external_ip = s.getsockname()[0]
            except:
                external_ip = "Unable to determine"
            
            return {
                'hostname': hostname,
                'local_ip': local_ip,
                'external_ip': external_ip
            }
        except Exception as e:
            return {'error': str(e)}
    
    def generate_report(self) -> str:
        """Generate a comprehensive scan report."""
        if not self.scan_results:
            return "No scan results available."
        
        duration = self.scan_end_time - self.scan_start_time if self.scan_end_time else 0
        
        report = f"""
{'='*60}
                    PORT SCAN REPORT
{'='*60}
Scan Summary:
  • Total ports scanned: {self.total_ports}
  • Open ports found: {len(self.open_ports)}
  • Scan duration: {duration:.2f} seconds
  • Scan completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Open Ports:
"""
        
        if self.open_ports:
            for port in sorted(self.open_ports):
                info = self.scan_results[port]
                report += f"  • Port {port:5d} - {info['service']} (Detected: {info['timestamp']})\n"
        else:
            report += "  • No open ports found\n"
        
        report += f"\n{'='*60}"
        return report
    
    def save_results(self, filename: str = None):
        """Save scan results to a file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"port_scan_{timestamp}.json"
        
        try:
            data = {
                'scan_info': {
                    'timestamp': datetime.now().isoformat(),
                    'total_ports': self.total_ports,
                    'open_ports_count': len(self.open_ports),
                    'duration': self.scan_end_time - self.scan_start_time if self.scan_end_time else 0
                },
                'open_ports': self.scan_results,
                'network_info': self.get_network_info()
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
    scanner = PortScanner()
    
    while True:
        print("\n" + "="*60)
        print("                    INTERACTIVE PORT SCANNER")
        print("="*60)
        print("1. Scan common ports (21, 22, 80, 443, etc.)")
        print("2. Scan custom port range")
        print("3. Scan all ports (1-65535)")
        print("4. Show network information")
        print("5. View last scan results")
        print("6. Save results to file")
        print("7. Exit")
        print("-"*60)
        
        try:
            choice = input("Select an option (1-7): ").strip()
            
            if choice == '1':
                host = input("Enter host to scan (default: localhost): ").strip() or "localhost"
                timeout = float(input("Enter timeout in seconds (default: 1.0): ").strip() or "1.0")
                
                print(f"\n🚀 Starting common ports scan on {host}...")
                scanner.scan_common_ports(host, timeout)
                print(scanner.generate_report())
                
            elif choice == '2':
                host = input("Enter host to scan (default: localhost): ").strip() or "localhost"
                start_port = int(input("Enter start port (1-65535): ").strip())
                end_port = int(input("Enter end port (1-65535): ").strip())
                timeout = float(input("Enter timeout in seconds (default: 1.0): ").strip() or "1.0")
                max_workers = int(input("Enter max workers (default: 100): ").strip() or "100")
                
                if 1 <= start_port <= 65535 and 1 <= end_port <= 65535 and start_port <= end_port:
                    print(f"\n🚀 Starting custom range scan on {host}...")
                    scanner.scan_range(host, start_port, end_port, timeout, max_workers)
                    print(scanner.generate_report())
                else:
                    print("❌ Invalid port range! Ports must be 1-65535 and start <= end.")
                
            elif choice == '3':
                host = input("Enter host to scan (default: localhost): ").strip() or "localhost"
                timeout = float(input("Enter timeout in seconds (default: 1.0): ").strip() or "1.0")
                max_workers = int(input("Enter max workers (default: 200): ").strip() or "200")
                
                confirm = input("⚠️  This will scan ALL 65535 ports and may take a long time. Continue? (y/N): ").strip().lower()
                if confirm in ['y', 'yes']:
                    print(f"\n🚀 Starting full port scan on {host}...")
                    scanner.scan_range(host, 1, 65535, timeout, max_workers)
                    print(scanner.generate_report())
                else:
                    print("Scan cancelled.")
                
            elif choice == '4':
                network_info = scanner.get_network_info()
                print("\n🌐 Network Information:")
                print("-" * 30)
                for key, value in network_info.items():
                    print(f"  {key.replace('_', ' ').title()}: {value}")
                
            elif choice == '5':
                if scanner.scan_results:
                    print(scanner.generate_report())
                else:
                    print("❌ No scan results available. Run a scan first.")
                
            elif choice == '6':
                if scanner.scan_results:
                    filename = input("Enter filename (default: auto-generated): ").strip()
                    scanner.save_results(filename if filename else None)
                else:
                    print("❌ No scan results available. Run a scan first.")
                
            elif choice == '7':
                print("👋 Goodbye!")
                break
                
            else:
                print("❌ Invalid option! Please select 1-7.")
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Scan interrupted by user.")
            break
        except ValueError as e:
            print(f"❌ Invalid input: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
        
        input("\nPress Enter to continue...")

def main():
    """Main function with command line argument support."""
    parser = argparse.ArgumentParser(
        description="Interactive Port Scanner - Check all ports on your system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Interactive mode
  %(prog)s --host 192.168.1.1 --range 80 443  # Quick scan
  %(prog)s --host localhost --common          # Common ports only
  %(prog)s --host 127.0.0.1 --all            # Full port scan
        """
    )
    
    parser.add_argument('--host', default='localhost', help='Host to scan (default: localhost)')
    parser.add_argument('--range', nargs=2, type=int, metavar=('START', 'END'),
                       help='Port range to scan (e.g., 80 443)')
    parser.add_argument('--common', action='store_true', help='Scan common ports only')
    parser.add_argument('--all', action='store_true', help='Scan all ports (1-65535)')
    parser.add_argument('--timeout', type=float, default=1.0, help='Socket timeout in seconds (default: 1.0)')
    parser.add_argument('--workers', type=int, default=100, help='Max concurrent workers (default: 100)')
    parser.add_argument('--save', help='Save results to specified file')
    
    args = parser.parse_args()
    
    # If no arguments provided, run interactive mode
    if len(sys.argv) == 1:
        interactive_menu()
        return
    
    # Command line mode
    scanner = PortScanner()
    
    try:
        if args.common:
            print(f"🔍 Scanning common ports on {args.host}...")
            results = scanner.scan_common_ports(args.host, args.timeout)
        elif args.range:
            start_port, end_port = args.range
            if 1 <= start_port <= 65535 and 1 <= end_port <= 65535 and start_port <= end_port:
                print(f"🔍 Scanning ports {start_port}-{end_port} on {args.host}...")
                results = scanner.scan_range(args.host, start_port, end_port, args.timeout, args.workers)
            else:
                print("❌ Invalid port range! Ports must be 1-65535 and start <= end.")
                return
        elif args.all:
            print(f"🔍 Scanning ALL ports on {args.host}...")
            results = scanner.scan_range(args.host, 1, 65535, args.timeout, args.workers)
        else:
            print("❌ Please specify --common, --range, or --all")
            return
        
        print(scanner.generate_report())
        
        if args.save:
            scanner.save_results(args.save)
        else:
            scanner.save_results()  # Auto-save with timestamp
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Scan interrupted by user.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
