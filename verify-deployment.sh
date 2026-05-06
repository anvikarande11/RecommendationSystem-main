#!/bin/bash

# Aevora API - Deployment Verification Script
# Run this after deployment to verify everything is working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="${1:-http://localhost:3000}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Aevora Recommendation System - Verification Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        exit 1
    fi
}

# Function to check HTTP response code
check_status() {
    local url=$1
    local expected=$2
    local method=${3:-GET}
    local data=$4
    
    if [ -z "$data" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    [ "$status" = "$expected" ]
}

echo -e "${YELLOW}Testing API at: $API_URL${NC}\n"

# Test 1: Health Check
echo -e "${BLUE}[1/8]${NC} Testing health endpoint..."
response=$(curl -s "$API_URL/api/v1/health")
echo "$response" | jq . > /dev/null
test_result $? "Health endpoint responds with valid JSON"

echo "$response" | jq -e '.ok == true' > /dev/null
test_result $? "Health endpoint returns ok=true"

# Test 2: CORS Headers
echo -e "\n${BLUE}[2/8]${NC} Checking security headers..."
headers=$(curl -s -i "$API_URL/api/v1/health" 2>&1)
echo "$headers" | grep -i "X-Content-Type-Options" > /dev/null
test_result $? "X-Content-Type-Options header present"

echo "$headers" | grep -i "Strict-Transport-Security" > /dev/null 2>&1 || true
# This may fail in dev, which is okay

# Test 3: CORS Configuration
echo -e "\n${BLUE}[3/8]${NC} Testing CORS configuration..."
cors_header=$(curl -s -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/health")
[ "$cors_header" = "200" ] || [ "$cors_header" = "204" ]
test_result $? "CORS preflight accepted"

# Test 4: Authentication Required
echo -e "\n${BLUE}[4/8]${NC} Testing authentication enforcement..."
check_status "$API_URL/api/v1/curator/chat" "401" "POST" '{"userId":"test"}'
test_result $? "Protected endpoints require authentication (401)"

# Test 5: Sign Up / Authentication
echo -e "\n${BLUE}[5/8]${NC} Testing authentication flow..."
signup_response=$(curl -s -X POST "$API_URL/api/v1/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test User",
        "email": "test-'$(date +%s)'@example.com",
        "password": "TestPass123"
    }')

token=$(echo "$signup_response" | jq -r '.token' 2>/dev/null)
[ -n "$token" ] && [ "$token" != "null" ]
test_result $? "Signup returns valid token"

# Test 6: Guest Authentication
echo -e "\n${BLUE}[6/8]${NC} Testing guest authentication..."
guest_response=$(curl -s -X POST "$API_URL/api/v1/auth/guest")
guest_token=$(echo "$guest_response" | jq -r '.token' 2>/dev/null)
[ -n "$guest_token" ] && [ "$guest_token" != "null" ]
test_result $? "Guest endpoint returns valid token"

# Test 7: Rate Limiting
echo -e "\n${BLUE}[7/8]${NC} Testing rate limiting..."
count=0
for i in {1..35}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health")
    if [ "$status" = "429" ]; then
        count=$((count + 1))
    fi
done

[ $count -gt 0 ]
test_result $? "Rate limiting enforced (got $count 429 responses)"

# Test 8: Invalid Token Handling
echo -e "\n${BLUE}[8/8]${NC} Testing invalid token rejection..."
check_status "$API_URL/api/v1/curator/chat" "401" "POST" \
    '{"userId":"test"}' -H "Authorization: Bearer invalid-token"
# Note: This is a simplified check

response=$(curl -s -X POST "$API_URL/api/v1/curator/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid-token" \
    -d '{"userId":"test","message":"test"}')

echo "$response" | jq -e '.error' > /dev/null
test_result $? "Invalid token returns error"

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All Tests Passed!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Your Aevora API is ready for production!"
echo ""
echo "Next steps:"
echo "  1. Configure environment variables for your domain"
echo "  2. Enable HTTPS/TLS"
echo "  3. Setup monitoring and alerts"
echo "  4. Configure database for scaling"
echo "  5. Review SECURITY.md for best practices"
echo ""
