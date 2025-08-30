#!/bin/bash

# GLM TOE Service Startup Script
# This script starts the GLM TOE service with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="GLM TOE Service"
DEFAULT_PORT=8000
DEFAULT_HOST="0.0.0.0"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

# Function to check Python environment
check_python() {
    print_status "Checking Python environment..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed or not in PATH"
        exit 1
    fi
    
    local python_version=$(python3 --version 2>&1 | awk '{print $2}')
    print_success "Found Python $python_version"
    
    # Check if virtual environment exists
    if [ -d "venv" ]; then
        print_status "Virtual environment found, activating..."
        source venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_warning "No virtual environment found"
        print_status "Creating virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        print_success "Virtual environment created and activated"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        print_success "Dependencies installed"
    else
        print_error "requirements.txt not found"
        exit 1
    fi
}

# Function to set environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Set defaults if not already set
    export GLM_USE_ABI_GRID=${GLM_USE_ABI_GRID:-"true"}
    export GLM_ABI_LON0=${GLM_ABI_LON0:-"-75.0"}
    export GLM_TILE_CACHE_SIZE=${GLM_TILE_CACHE_SIZE:-"128"}
    export GLM_S3_POLL_ENABLED=${GLM_S3_POLL_ENABLED:-"false"}
    export GLM_S3_POLL_INTERVAL=${GLM_S3_POLL_INTERVAL:-"60"}
    export GLM_S3_BUCKET=${GLM_S3_BUCKET:-"noaa-goes18"}
    export PORT=${PORT:-$DEFAULT_PORT}
    export HOST=${HOST:-$DEFAULT_HOST}
    
    print_success "Environment variables configured:"
    echo "  GLM_USE_ABI_GRID: $GLM_USE_ABI_GRID"
    echo "  GLM_ABI_LON0: $GLM_ABI_LON0"
    echo "  GLM_TILE_CACHE_SIZE: $GLM_TILE_CACHE_SIZE"
    echo "  GLM_S3_POLL_ENABLED: $GLM_S3_POLL_ENABLED"
    echo "  GLM_S3_BUCKET: $GLM_S3_BUCKET"
    echo "  PORT: $PORT"
    echo "  HOST: $HOST"
}

# Function to check if service is already running
check_running() {
    local port=$1
    if check_port $port; then
        print_warning "Port $port is already in use"
        if lsof -Pi :$port -sTCP:LISTEN -t | grep -q python; then
            print_status "GLM TOE service appears to be running on port $port"
            read -p "Do you want to stop it and restart? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_status "Stopping existing service..."
                pkill -f "glm_toe\|uvicorn.*$port" || true
                sleep 2
            else
                print_status "Exiting..."
                exit 0
            fi
        else
            print_error "Port $port is in use by another service"
            exit 1
        fi
    fi
}

# Function to start the service
start_service() {
    local port=$1
    local host=$2
    
    print_status "Starting $SERVICE_NAME on $host:$port..."
    
    # Check if we're in the right directory
    if [ ! -f "app/main.py" ]; then
        print_error "app/main.py not found. Please run this script from the glm_toe directory."
        exit 1
    fi
    
    # Start the service
    if [ "$1" = "dev" ]; then
        print_status "Starting in development mode..."
        python -m app.main
    else
        print_status "Starting in production mode..."
        uvicorn app.main:app --host $host --port $port --reload
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -p, --port PORT     Set port (default: $DEFAULT_PORT)"
    echo "  -H, --host HOST     Set host (default: $DEFAULT_HOST)"
    echo "  -d, --dev           Start in development mode"
    echo "  -e, --env FILE      Load environment variables from FILE"
    echo ""
    echo "Environment Variables:"
    echo "  GLM_USE_ABI_GRID     Use ABI fixed grid (default: true)"
    echo "  GLM_ABI_LON0         ABI grid longitude center (default: -75.0)"
    echo "  GLM_TILE_CACHE_SIZE  Maximum cached tiles (default: 128)"
    echo "  GLM_S3_POLL_ENABLED  Enable S3 polling (default: false)"
    echo "  GLM_S3_BUCKET        S3 bucket name (default: noaa-goes18)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start with default settings"
    echo "  $0 -p 8080          # Start on port 8080"
    echo "  $0 -d               # Start in development mode"
    echo "  $0 -e .env.local    # Load environment from .env.local"
}

# Parse command line arguments
DEV_MODE=false
PORT=$DEFAULT_PORT
HOST=$DEFAULT_HOST
ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -H|--host)
            HOST="$2"
            shift 2
            ;;
        -d|--dev)
            DEV_MODE=true
            shift
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Load environment file if specified
if [ -n "$ENV_FILE" ]; then
    if [ -f "$ENV_FILE" ]; then
        print_status "Loading environment from $ENV_FILE..."
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        print_success "Environment loaded from $ENV_FILE"
    else
        print_error "Environment file $ENV_FILE not found"
        exit 1
    fi
fi

# Main execution
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  $SERVICE_NAME Startup Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
    
    # Check Python environment
    check_python
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_environment
    
    # Check if service is already running
    check_running $PORT
    
    # Start the service
    if [ "$DEV_MODE" = true ]; then
        start_service "dev"
    else
        start_service $PORT $HOST
    fi
}

# Run main function
main "$@"
