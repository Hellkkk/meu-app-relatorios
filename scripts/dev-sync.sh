#!/bin/bash
# dev-sync.sh - Script to test sync endpoints and verify data

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================================"
echo "Development Sync and Verification Script"
echo "================================================"
echo ""

# Check for required environment variables
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Error: TOKEN environment variable not set${NC}"
  echo "Usage: TOKEN=your_jwt_token COMPANY=company_id ./scripts/dev-sync.sh"
  exit 1
fi

if [ -z "$COMPANY" ]; then
  echo -e "${RED}Error: COMPANY environment variable not set${NC}"
  echo "Usage: TOKEN=your_jwt_token COMPANY=company_id ./scripts/dev-sync.sh"
  exit 1
fi

# Set defaults
BASE_URL="${BASE_URL:-http://localhost:5001}"
API_BASE="$BASE_URL/api"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Company ID: $COMPANY"
echo ""

# Test sync for purchases
echo -e "${YELLOW}1. Syncing Purchases Data...${NC}"
SYNC_PURCHASES=$(curl -s -X POST "$API_BASE/reports/$COMPANY/sync?type=purchases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SYNC_PURCHASES" | jq '.'

if echo "$SYNC_PURCHASES" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Purchases sync successful${NC}"
  PURCHASES_COUNT=$(echo "$SYNC_PURCHASES" | jq -r '.data.inserted')
  echo "  Inserted: $PURCHASES_COUNT records"
else
  echo -e "${RED}✗ Purchases sync failed${NC}"
fi

echo ""
echo "Waiting 2 seconds..."
sleep 2
echo ""

# Test sync for sales
echo -e "${YELLOW}2. Syncing Sales Data...${NC}"
SYNC_SALES=$(curl -s -X POST "$API_BASE/reports/$COMPANY/sync?type=sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SYNC_SALES" | jq '.'

if echo "$SYNC_SALES" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Sales sync successful${NC}"
  SALES_COUNT=$(echo "$SYNC_SALES" | jq -r '.data.inserted')
  echo "  Inserted: $SALES_COUNT records"
else
  echo -e "${RED}✗ Sales sync failed${NC}"
fi

echo ""
echo "================================================"
echo ""

# Fetch first page of purchases
echo -e "${YELLOW}3. Fetching First Page of Purchases...${NC}"
PURCHASES_PAGE=$(curl -s "$API_BASE/reports/$COMPANY/records?type=purchases&page=0&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$PURCHASES_PAGE" | jq '.data.pagination'
echo ""
echo "First record:"
echo "$PURCHASES_PAGE" | jq '.data.records[0]'

echo ""
echo "================================================"
echo ""

# Fetch first page of sales
echo -e "${YELLOW}4. Fetching First Page of Sales...${NC}"
SALES_PAGE=$(curl -s "$API_BASE/reports/$COMPANY/records?type=sales&page=0&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$SALES_PAGE" | jq '.data.pagination'
echo ""
echo "First record:"
echo "$SALES_PAGE" | jq '.data.records[0]'

echo ""
echo "================================================"
echo -e "${GREEN}Script Complete${NC}"
echo "================================================"
