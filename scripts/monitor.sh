#!/bin/bash

# AI News Aggregator Monitoring Script
# Usage: ./scripts/monitor.sh [check|status|logs]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
API_URL="http://localhost:3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status indicators
check_status() {
    local service=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service is not responding"
        return 1
    fi
}

# System health check
health_check() {
    echo -e "${BLUE}=== AI News Aggregator Health Check ===${NC}"
    echo ""
    
    local all_good=true
    
    # Check API health
    if ! check_status "API Health" "$API_URL/health"; then
        all_good=false
    fi
    
    # Check news endpoint
    if ! check_status "News API" "$API_URL/api/news"; then
        all_good=false
    fi
    
    # Check categories endpoint
    if ! check_status "Categories API" "$API_URL/api/categories"; then
        all_good=false
    fi
    
    # Check system status
    if ! check_status "System Status" "$API_URL/api/status"; then
        all_good=false
    fi
    
    # Check scheduler status
    if ! check_status "Scheduler Status" "$API_URL/api/scheduler/status"; then
        all_good=false
    fi
    
    echo ""
    
    if $all_good; then
        echo -e "${GREEN}✓ All systems operational${NC}"
    else
        echo -e "${RED}✗ Some systems are not responding${NC}"
        return 1
    fi
}

# Detailed system status
system_status() {
    echo -e "${BLUE}=== System Status ===${NC}"
    echo ""
    
    # Docker containers status
    echo -e "${YELLOW}Docker Containers:${NC}"
    docker-compose ps 2>/dev/null || echo "Docker Compose not available"
    echo ""
    
    # System resources
    echo -e "${YELLOW}System Resources:${NC}"
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h "$PROJECT_DIR"
    echo ""
    
    # API Status
    echo -e "${YELLOW}API Status:${NC}"
    if curl -s "$API_URL/api/status" | jq . 2>/dev/null; then
        echo ""
    else
        echo "API status not available"
    fi
    
    # Scheduler Status
    echo -e "${YELLOW}Scheduler Status:${NC}"
    if curl -s "$API_URL/api/scheduler/status" | jq . 2>/dev/null; then
        echo ""
    else
        echo "Scheduler status not available"
    fi
    
    # Recent logs
    echo -e "${YELLOW}Recent Error Logs:${NC}"
    if [[ -f "$PROJECT_DIR/logs/error.log" ]]; then
        tail -n 5 "$PROJECT_DIR/logs/error.log" 2>/dev/null || echo "No recent errors"
    else
        echo "Error log file not found"
    fi
}

# Show logs
show_logs() {
    local log_type=${1:-combined}
    
    echo -e "${BLUE}=== Logs ($log_type) ===${NC}"
    echo ""
    
    case $log_type in
        "error")
            if [[ -f "$PROJECT_DIR/logs/error.log" ]]; then
                tail -f "$PROJECT_DIR/logs/error.log"
            else
                echo "Error log file not found"
            fi
            ;;
        "performance")
            if [[ -f "$PROJECT_DIR/logs/performance.log" ]]; then
                tail -f "$PROJECT_DIR/logs/performance.log"
            else
                echo "Performance log file not found"
            fi
            ;;
        "docker")
            docker-compose logs -f 2>/dev/null || echo "Docker Compose not available"
            ;;
        *)
            if [[ -f "$PROJECT_DIR/logs/combined.log" ]]; then
                tail -f "$PROJECT_DIR/logs/combined.log"
            else
                echo "Combined log file not found"
            fi
            ;;
    esac
}

# Performance metrics
performance_metrics() {
    echo -e "${BLUE}=== Performance Metrics ===${NC}"
    echo ""
    
    # API response times
    echo -e "${YELLOW}API Response Times:${NC}"
    
    for endpoint in "/health" "/api/news" "/api/categories" "/api/status"; do
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$API_URL$endpoint" 2>/dev/null || echo "N/A")
        echo "$endpoint: ${response_time}s"
    done
    
    echo ""
    
    # Docker stats
    echo -e "${YELLOW}Container Resource Usage:${NC}"
    docker stats --no-stream 2>/dev/null || echo "Docker stats not available"
    
    echo ""
    
    # News collection stats
    echo -e "${YELLOW}News Collection Stats:${NC}"
    if curl -s "$API_URL/api/status" | jq -r '.data.storage // "N/A"' 2>/dev/null; then
        echo ""
    else
        echo "Collection stats not available"
    fi
}

# Alert check
alert_check() {
    echo -e "${BLUE}=== Alert Check ===${NC}"
    echo ""
    
    local alerts=()
    
    # Check if API is responding
    if ! curl -f -s "$API_URL/health" > /dev/null 2>&1; then
        alerts+=("API is not responding")
    fi
    
    # Check disk space
    local disk_usage=$(df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        alerts+=("Disk usage is high: ${disk_usage}%")
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $mem_usage -gt 90 ]]; then
        alerts+=("Memory usage is high: ${mem_usage}%")
    fi
    
    # Check for recent errors
    if [[ -f "$PROJECT_DIR/logs/error.log" ]]; then
        local recent_errors=$(tail -n 10 "$PROJECT_DIR/logs/error.log" | wc -l)
        if [[ $recent_errors -gt 5 ]]; then
            alerts+=("High number of recent errors: $recent_errors")
        fi
    fi
    
    # Display alerts
    if [[ ${#alerts[@]} -eq 0 ]]; then
        echo -e "${GREEN}✓ No alerts${NC}"
    else
        echo -e "${RED}⚠ Alerts detected:${NC}"
        for alert in "${alerts[@]}"; do
            echo -e "${RED}  • $alert${NC}"
        done
    fi
}

# Main function
main() {
    case "${1:-check}" in
        "check"|"health")
            health_check
            ;;
        "status")
            system_status
            ;;
        "logs")
            show_logs "${2:-combined}"
            ;;
        "performance"|"perf")
            performance_metrics
            ;;
        "alerts")
            alert_check
            ;;
        "all")
            health_check
            echo ""
            system_status
            echo ""
            performance_metrics
            echo ""
            alert_check
            ;;
        *)
            echo "Usage: $0 [check|status|logs|performance|alerts|all] [log_type]"
            echo ""
            echo "Commands:"
            echo "  check       - Run health check (default)"
            echo "  status      - Show detailed system status"
            echo "  logs        - Show logs (combined|error|performance|docker)"
            echo "  performance - Show performance metrics"
            echo "  alerts      - Check for alerts"
            echo "  all         - Run all checks"
            echo ""
            echo "Examples:"
            echo "  $0 check"
            echo "  $0 logs error"
            echo "  $0 performance"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"