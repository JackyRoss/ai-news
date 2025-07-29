#!/bin/bash

# AI News Aggregator Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if required files exist
    if [[ ! -f "$PROJECT_DIR/.env.$ENVIRONMENT" ]]; then
        error "Environment file .env.$ENVIRONMENT not found."
    fi
    
    if [[ ! -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        error "docker-compose.yml not found."
    fi
    
    success "Prerequisites check passed."
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +'%Y%m%d-%H%M%S')"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup configuration files
    cp -r "$PROJECT_DIR/.env"* "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_DIR/nginx.conf" "$BACKUP_PATH/" 2>/dev/null || true
    
    # Backup logs
    if [[ -d "$PROJECT_DIR/logs" ]]; then
        cp -r "$PROJECT_DIR/logs" "$BACKUP_PATH/"
    fi
    
    # Backup data if exists
    if [[ -d "$PROJECT_DIR/data" ]]; then
        cp -r "$PROJECT_DIR/data" "$BACKUP_PATH/"
    fi
    
    success "Backup created at $BACKUP_PATH"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        warning "Services are currently running. They will be restarted."
    fi
    
    # Validate Docker Compose configuration
    if ! docker-compose config > /dev/null 2>&1; then
        error "Docker Compose configuration is invalid."
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 1048576 ]]; then  # Less than 1GB
        warning "Low disk space available: $(($AVAILABLE_SPACE / 1024))MB"
    fi
    
    success "Pre-deployment checks passed."
}

# Build and deploy
deploy() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    cd "$PROJECT_DIR"
    
    # Set environment
    export NODE_ENV="$ENVIRONMENT"
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose down || true
    
    # Pull latest images (if using external images)
    log "Pulling latest images..."
    docker-compose pull || true
    
    # Build application
    log "Building application..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Health check
    health_check
    
    success "Deployment completed successfully!"
}

# Health check
health_check() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
            success "Health check passed!"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed. Retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts."
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."
    
    # Check if all services are running
    if ! docker-compose ps | grep -q "Up"; then
        error "Some services are not running properly."
    fi
    
    # Test API endpoints
    log "Testing API endpoints..."
    
    # Test health endpoint
    if ! curl -f -s http://localhost:3001/health > /dev/null; then
        error "Health endpoint is not responding."
    fi
    
    # Test news endpoint
    if ! curl -f -s http://localhost:3001/api/news > /dev/null; then
        error "News API endpoint is not responding."
    fi
    
    # Test categories endpoint
    if ! curl -f -s http://localhost:3001/api/categories > /dev/null; then
        error "Categories API endpoint is not responding."
    fi
    
    # Check logs for errors
    if docker-compose logs --tail=50 | grep -i error; then
        warning "Errors found in recent logs. Please review."
    fi
    
    success "Post-deployment verification completed."
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        # Keep only last 10 backups
        ls -t "$BACKUP_DIR" | tail -n +11 | xargs -I {} rm -rf "$BACKUP_DIR/{}" 2>/dev/null || true
        success "Old backups cleaned up."
    fi
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        error "No backup found for rollback."
    fi
    
    BACKUP_PATH="$BACKUP_DIR/$LATEST_BACKUP"
    
    # Stop current services
    docker-compose down
    
    # Restore configuration files
    cp "$BACKUP_PATH/.env"* "$PROJECT_DIR/" 2>/dev/null || true
    cp "$BACKUP_PATH/docker-compose.yml" "$PROJECT_DIR/" 2>/dev/null || true
    cp "$BACKUP_PATH/nginx.conf" "$PROJECT_DIR/" 2>/dev/null || true
    
    # Restore data
    if [[ -d "$BACKUP_PATH/data" ]]; then
        rm -rf "$PROJECT_DIR/data"
        cp -r "$BACKUP_PATH/data" "$PROJECT_DIR/"
    fi
    
    # Start services
    docker-compose up -d
    
    success "Rollback completed using backup: $LATEST_BACKUP"
}

# Main deployment flow
main() {
    log "Starting AI News Aggregator deployment script..."
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            pre_deployment_checks
            deploy
            post_deployment_verification
            cleanup_old_backups
            ;;
        "rollback")
            rollback
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|health] [environment]"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous version"
            echo "  health   - Run health check only"
            echo "  environment - production (default) or development"
            exit 1
            ;;
    esac
    
    success "Script completed successfully!"
}

# Handle script interruption
trap 'error "Script interrupted by user"' INT TERM

# Run main function
main "$@"