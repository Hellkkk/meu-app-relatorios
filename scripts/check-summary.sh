#!/bin/bash
# check-summary.sh - Compare summary aggregation with manual calculation

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================================"
echo "Summary Validation Script"
echo "================================================"
echo ""

# Check for required environment variables
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Error: TOKEN environment variable not set${NC}"
  echo "Usage: TOKEN=your_jwt_token COMPANY=company_id TYPE=purchases ./scripts/check-summary.sh"
  exit 1
fi

if [ -z "$COMPANY" ]; then
  echo -e "${RED}Error: COMPANY environment variable not set${NC}"
  echo "Usage: TOKEN=your_jwt_token COMPANY=company_id TYPE=purchases ./scripts/check-summary.sh"
  exit 1
fi

# Set defaults
BASE_URL="${BASE_URL:-http://localhost:5001}"
API_BASE="$BASE_URL/api"
TYPE="${TYPE:-purchases}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Company ID: $COMPANY"
echo "  Type: $TYPE"
echo ""

# Fetch summary from API
echo -e "${YELLOW}1. Fetching Summary from API...${NC}"
SUMMARY=$(curl -s "$API_BASE/reports/$COMPANY/summary-from-db?type=$TYPE" \
  -H "Authorization: Bearer $TOKEN")

echo "$SUMMARY" | jq '.data.summary'
echo ""

# Extract summary values
SUMMARY_TOTAL=$(echo "$SUMMARY" | jq -r '.data.summary.totalValue')
SUMMARY_ICMS=$(echo "$SUMMARY" | jq -r '.data.summary.totalICMS')
SUMMARY_IPI=$(echo "$SUMMARY" | jq -r '.data.summary.totalIPI')
SUMMARY_PIS=$(echo "$SUMMARY" | jq -r '.data.summary.totalPIS')
SUMMARY_COFINS=$(echo "$SUMMARY" | jq -r '.data.summary.totalCOFINS')
SUMMARY_COUNT=$(echo "$SUMMARY" | jq -r '.data.summary.totalRecords')

echo -e "${YELLOW}2. Fetching All Records for Manual Calculation...${NC}"

# Fetch all records (in batches) to calculate manual sum
PAGE_SIZE=100
PAGE=0
ALL_RECORDS=""

while true; do
  RECORDS=$(curl -s "$API_BASE/reports/$COMPANY/records?type=$TYPE&page=$PAGE&pageSize=$PAGE_SIZE" \
    -H "Authorization: Bearer $TOKEN")
  
  CURRENT_RECORDS=$(echo "$RECORDS" | jq -r '.data.records | length')
  
  if [ "$CURRENT_RECORDS" -eq 0 ]; then
    break
  fi
  
  if [ -z "$ALL_RECORDS" ]; then
    ALL_RECORDS=$(echo "$RECORDS" | jq '.data.records')
  else
    ALL_RECORDS=$(echo "$ALL_RECORDS" | jq ". + $(echo "$RECORDS" | jq '.data.records')")
  fi
  
  echo "  Fetched page $PAGE ($CURRENT_RECORDS records)..."
  PAGE=$((PAGE + 1))
  
  # Safety limit
  if [ "$PAGE" -ge 50 ]; then
    echo -e "${YELLOW}  Warning: Reached page limit (50). Stopping.${NC}"
    break
  fi
done

echo ""
echo -e "${YELLOW}3. Calculating Manual Totals...${NC}"

# Calculate manual totals using jq
MANUAL_COUNT=$(echo "$ALL_RECORDS" | jq 'length')
MANUAL_TOTAL=$(echo "$ALL_RECORDS" | jq '[.[].valor_total] | add')
MANUAL_ICMS=$(echo "$ALL_RECORDS" | jq '[.[].icms] | add')
MANUAL_IPI=$(echo "$ALL_RECORDS" | jq '[.[].ipi] | add')
MANUAL_PIS=$(echo "$ALL_RECORDS" | jq '[.[].pis] | add')
MANUAL_COFINS=$(echo "$ALL_RECORDS" | jq '[.[].cofins] | add')

echo "Manual calculation from /records:"
echo "  Count: $MANUAL_COUNT"
echo "  Total Value: $MANUAL_TOTAL"
echo "  Total ICMS: $MANUAL_ICMS"
echo "  Total IPI: $MANUAL_IPI"
echo "  Total PIS: $MANUAL_PIS"
echo "  Total COFINS: $MANUAL_COFINS"

echo ""
echo "================================================"
echo -e "${YELLOW}4. Comparison Results:${NC}"
echo "================================================"

# Compare values with tolerance for floating point
compare_values() {
  local name=$1
  local api_val=$2
  local manual_val=$3
  
  # Use awk for floating point comparison with 0.01 tolerance
  local diff=$(awk "BEGIN {print ($api_val - $manual_val) < 0 ? -($api_val - $manual_val) : ($api_val - $manual_val)}")
  local match=$(awk "BEGIN {print ($diff < 0.01) ? 1 : 0}")
  
  if [ "$match" -eq 1 ]; then
    echo -e "${GREEN}✓ $name matches${NC} (API: $api_val, Manual: $manual_val)"
  else
    echo -e "${RED}✗ $name MISMATCH${NC} (API: $api_val, Manual: $manual_val, Diff: $diff)"
  fi
}

compare_values "Count" "$SUMMARY_COUNT" "$MANUAL_COUNT"
compare_values "Total Value" "$SUMMARY_TOTAL" "$MANUAL_TOTAL"
compare_values "ICMS" "$SUMMARY_ICMS" "$MANUAL_ICMS"
compare_values "IPI" "$SUMMARY_IPI" "$MANUAL_IPI"
compare_values "PIS" "$SUMMARY_PIS" "$MANUAL_PIS"
compare_values "COFINS" "$SUMMARY_COFINS" "$MANUAL_COFINS"

echo ""
echo "================================================"
echo -e "${GREEN}Validation Complete${NC}"
echo "================================================"
