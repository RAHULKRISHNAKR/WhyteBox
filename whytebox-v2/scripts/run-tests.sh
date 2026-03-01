#!/bin/bash

# WhyteBox v2.0 - Comprehensive Test Runner
# This script runs all tests: backend unit/integration tests and frontend unit/E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parse command line arguments
TEST_TYPE="${1:-all}"
COVERAGE="${2:-true}"

print_status "WhyteBox v2.0 Test Runner"
echo "Test Type: $TEST_TYPE"
echo "Coverage: $COVERAGE"
echo ""

# Track test results
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
E2E_TESTS_PASSED=false

# Function to run backend tests
run_backend_tests() {
    print_status "Running Backend Tests..."
    cd backend
    
    if [ "$COVERAGE" = "true" ]; then
        print_status "Running with coverage..."
        if pytest -v --cov=app --cov-report=html --cov-report=term-missing; then
            print_success "Backend tests passed!"
            BACKEND_TESTS_PASSED=true
        else
            print_error "Backend tests failed!"
            return 1
        fi
    else
        if pytest -v; then
            print_success "Backend tests passed!"
            BACKEND_TESTS_PASSED=true
        else
            print_error "Backend tests failed!"
            return 1
        fi
    fi
    
    cd ..
}

# Function to run frontend unit tests
run_frontend_tests() {
    print_status "Running Frontend Unit Tests..."
    cd frontend
    
    if [ "$COVERAGE" = "true" ]; then
        print_status "Running with coverage..."
        if npm run test:coverage; then
            print_success "Frontend unit tests passed!"
            FRONTEND_TESTS_PASSED=true
        else
            print_error "Frontend unit tests failed!"
            return 1
        fi
    else
        if npm run test; then
            print_success "Frontend unit tests passed!"
            FRONTEND_TESTS_PASSED=true
        else
            print_error "Frontend unit tests failed!"
            return 1
        fi
    fi
    
    cd ..
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E Tests..."
    cd frontend
    
    # Check if dev server is running
    if ! curl -s http://localhost:3000 > /dev/null; then
        print_warning "Dev server not running. Starting..."
        npm run dev &
        DEV_SERVER_PID=$!
        sleep 10
    fi
    
    if npx playwright test; then
        print_success "E2E tests passed!"
        E2E_TESTS_PASSED=true
    else
        print_error "E2E tests failed!"
        if [ ! -z "$DEV_SERVER_PID" ]; then
            kill $DEV_SERVER_PID
        fi
        return 1
    fi
    
    # Kill dev server if we started it
    if [ ! -z "$DEV_SERVER_PID" ]; then
        kill $DEV_SERVER_PID
    fi
    
    cd ..
}

# Function to run linting
run_linting() {
    print_status "Running Linting..."
    
    # Backend linting
    print_status "Linting backend..."
    cd backend
    if flake8 app tests; then
        print_success "Backend linting passed!"
    else
        print_warning "Backend linting issues found"
    fi
    cd ..
    
    # Frontend linting
    print_status "Linting frontend..."
    cd frontend
    if npm run lint; then
        print_success "Frontend linting passed!"
    else
        print_warning "Frontend linting issues found"
    fi
    cd ..
}

# Function to run type checking
run_type_checking() {
    print_status "Running Type Checking..."
    
    # Backend type checking
    print_status "Type checking backend..."
    cd backend
    if mypy app; then
        print_success "Backend type checking passed!"
    else
        print_warning "Backend type checking issues found"
    fi
    cd ..
    
    # Frontend type checking
    print_status "Type checking frontend..."
    cd frontend
    if npm run type-check; then
        print_success "Frontend type checking passed!"
    else
        print_warning "Frontend type checking issues found"
    fi
    cd ..
}

# Main test execution
case $TEST_TYPE in
    "backend")
        run_backend_tests
        ;;
    "frontend")
        run_frontend_tests
        ;;
    "e2e")
        run_e2e_tests
        ;;
    "lint")
        run_linting
        ;;
    "type")
        run_type_checking
        ;;
    "all")
        print_status "Running all tests..."
        echo ""
        
        # Run linting first
        run_linting || true
        echo ""
        
        # Run type checking
        run_type_checking || true
        echo ""
        
        # Run backend tests
        run_backend_tests || true
        echo ""
        
        # Run frontend tests
        run_frontend_tests || true
        echo ""
        
        # Run E2E tests
        run_e2e_tests || true
        echo ""
        ;;
    *)
        print_error "Unknown test type: $TEST_TYPE"
        echo "Usage: $0 [backend|frontend|e2e|lint|type|all] [coverage]"
        exit 1
        ;;
esac

# Print summary
echo ""
print_status "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "backend" ]; then
    if [ "$BACKEND_TESTS_PASSED" = true ]; then
        print_success "Backend Tests: PASSED"
    else
        print_error "Backend Tests: FAILED"
    fi
fi

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "frontend" ]; then
    if [ "$FRONTEND_TESTS_PASSED" = true ]; then
        print_success "Frontend Tests: PASSED"
    else
        print_error "Frontend Tests: FAILED"
    fi
fi

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "e2e" ]; then
    if [ "$E2E_TESTS_PASSED" = true ]; then
        print_success "E2E Tests: PASSED"
    else
        print_error "E2E Tests: FAILED"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with appropriate code
if [ "$TEST_TYPE" = "all" ]; then
    if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ] && [ "$E2E_TESTS_PASSED" = true ]; then
        print_success "All tests passed!"
        exit 0
    else
        print_error "Some tests failed!"
        exit 1
    fi
else
    # For individual test types, exit based on that test's result
    if [ "$BACKEND_TESTS_PASSED" = true ] || [ "$FRONTEND_TESTS_PASSED" = true ] || [ "$E2E_TESTS_PASSED" = true ]; then
        exit 0
    else
        exit 1
    fi
fi

# Made with Bob
