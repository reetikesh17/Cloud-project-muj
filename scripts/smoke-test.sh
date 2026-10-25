#!/bin/bash
# ==============================================================================
# Smoke Test Verification Script for Library Management System
# ==============================================================================

TARGET_URL="${1:-http://localhost:3000}"

echo "Testing target: $TARGET_URL"

echo -n "1. Checking /health: "
curl -s -f "$TARGET_URL/health" > /dev/null && echo "PASSED [200 OK]" || { echo "FAILED"; exit 1; }

echo -n "2. Checking /health/ready: "
curl -s -f "$TARGET_URL/health/ready" > /dev/null && echo "PASSED [200 OK]" || { echo "FAILED"; exit 1; }

echo -n "3. Checking /api/books: "
curl -s -f "$TARGET_URL/api/books" > /dev/null && echo "PASSED [200 OK]" || { echo "FAILED"; exit 1; }

echo -n "4. Checking /api/books/stats: "
curl -s -f "$TARGET_URL/api/books/stats" > /dev/null && echo "PASSED [200 OK]" || { echo "FAILED"; exit 1; }

echo "🎉 All smoke tests passed successfully!"
