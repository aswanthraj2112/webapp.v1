#!/bin/bash

echo "🧪 Video Web Application - Comprehensive Test Suite"
echo "=================================================="
echo ""

DOMAIN="n11817143-videoapp.cab432.com"
FRONTEND_PORT="3000"
BACKEND_PORT="8080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -n "🔍 Testing $test_name... "
    
    result=$(eval "$test_command" 2>/dev/null)
    exit_code=$?
    
    if [[ $exit_code -eq 0 ]] && [[ $result =~ $expected_pattern ]]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   Expected: $expected_pattern"
        echo "   Got: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "🌐 Testing Domain Resolution"
echo "----------------------------"
run_test "DNS Resolution" "nslookup $DOMAIN | grep 'Name:'" "Name:"
echo ""

echo "🖥️  Testing Backend Services"
echo "----------------------------"
run_test "Backend Health Check" "curl -s http://$DOMAIN:$BACKEND_PORT/api/health" '"status":"ok"'
run_test "Backend CORS Headers" "curl -s -I http://$DOMAIN:$BACKEND_PORT/api/health | grep -i 'access-control'" "Access-Control"
run_test "Auth Endpoint (401 Expected)" "curl -s -w '%{http_code}' http://$DOMAIN:$BACKEND_PORT/api/auth/me" "401"
run_test "Videos Endpoint (401 Expected)" "curl -s -w '%{http_code}' http://$DOMAIN:$BACKEND_PORT/api/videos" "401"
echo ""

echo "🌐 Testing Frontend Services"
echo "----------------------------"
run_test "Frontend Accessibility" "curl -s -w '%{http_code}' http://$DOMAIN:$FRONTEND_PORT/" "200"
run_test "Frontend CORS Headers" "curl -s -I http://$DOMAIN:$FRONTEND_PORT/ | grep -i 'access-control'" "Access-Control-Allow-Origin"
echo ""

echo "🗃️  Testing Database & Storage"
echo "-----------------------------"
run_test "SQLite Database Exists" "ls -la /home/ubuntu/my-node-server/webapp.v1/server/data.sqlite" "data.sqlite"
run_test "Video Storage Directory" "ls -la /home/ubuntu/my-node-server/webapp.v1/server/src/public/videos/" "total"
run_test "Thumbnail Storage Directory" "ls -la /home/ubuntu/my-node-server/webapp.v1/server/src/public/thumbs/" "total"
echo ""

echo "⚙️  Testing System Dependencies"
echo "------------------------------"
run_test "FFmpeg Installation" "ffmpeg -version | head -1" "ffmpeg version"
run_test "Node.js Version" "node --version" "v22"
run_test "NPM Version" "npm --version" "[0-9]"
echo ""

echo "🔄 Testing Process Status"
echo "-------------------------"
run_test "Backend Process Running" "ps aux | grep 'node src/index.js' | grep -v grep" "node src/index.js"
run_test "Frontend Process Running" "ps aux | grep 'vite' | grep -v grep" "vite"
run_test "Nodemon Process Running" "ps aux | grep 'nodemon' | grep -v grep" "nodemon"
echo ""

echo "📊 Test Results Summary"
echo "======================"
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "📈 Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed! Application is fully functional.${NC}"
    echo "🌍 Frontend: http://$DOMAIN:$FRONTEND_PORT"
    echo "🔧 Backend API: http://$DOMAIN:$BACKEND_PORT/api"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above for details.${NC}"
fi

echo ""
echo "📝 Application URLs:"
echo "   Frontend: http://$DOMAIN:$FRONTEND_PORT"
echo "   Backend:  http://$DOMAIN:$BACKEND_PORT"
echo "   Health:   http://$DOMAIN:$BACKEND_PORT/api/health"