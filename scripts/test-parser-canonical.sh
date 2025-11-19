#!/bin/bash

# Script to test canonical field presence in Excel parser output
# Usage: ./scripts/test-parser-canonical.sh <TOKEN> <COMPANY_ID>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <TOKEN> <COMPANY_ID>"
  echo "Example: $0 eyJhbGc... 507f1f77bcf86cd799439011"
  exit 1
fi

TOKEN="$1"
COMPANY_ID="$2"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Testing Excel Parser Canonical Fields"
echo "======================================"
echo "Base URL: $BASE_URL"
echo "Company ID: $COMPANY_ID"
echo ""

# Function to test endpoint
test_endpoint() {
  local TYPE=$1
  local ENTITY_FIELD=$2
  local DATE_FIELD=$3
  
  echo "Testing $TYPE endpoint..."
  echo "Expected entity field: $ENTITY_FIELD"
  echo "Expected date field: $DATE_FIELD"
  
  RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/reports/$COMPANY_ID/summary?type=$TYPE")
  
  # Check if request was successful
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  if [ "$SUCCESS" != "true" ]; then
    echo "❌ Request failed:"
    echo "$RESPONSE" | jq '.'
    return 1
  fi
  
  # Get first record
  FIRST_RECORD=$(echo "$RESPONSE" | jq -r '.data.records[0]')
  
  if [ "$FIRST_RECORD" == "null" ] || [ -z "$FIRST_RECORD" ]; then
    echo "❌ No records found in response"
    return 1
  fi
  
  echo "First record:"
  echo "$FIRST_RECORD" | jq '.'
  
  # Check canonical fields
  CHECKS_PASSED=0
  CHECKS_FAILED=0
  
  # Check entity field
  if echo "$FIRST_RECORD" | jq -e "has(\"$ENTITY_FIELD\")" > /dev/null; then
    echo "✅ $ENTITY_FIELD field present"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo "❌ $ENTITY_FIELD field missing"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  
  # Check date field
  if echo "$FIRST_RECORD" | jq -e "has(\"$DATE_FIELD\")" > /dev/null; then
    echo "✅ $DATE_FIELD field present"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo "❌ $DATE_FIELD field missing"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  
  # Check required fields
  REQUIRED_FIELDS=("numero_nfe" "cfop" "valor_total" "icms" "ipi" "pis" "cofins")
  
  for FIELD in "${REQUIRED_FIELDS[@]}"; do
    if echo "$FIRST_RECORD" | jq -e "has(\"$FIELD\")" > /dev/null; then
      VALUE=$(echo "$FIRST_RECORD" | jq -r ".$FIELD")
      echo "✅ $FIELD: $VALUE"
      CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      echo "❌ $FIELD field missing"
      CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
  done
  
  # Check that valor_total is not 0
  VALOR_TOTAL=$(echo "$FIRST_RECORD" | jq -r '.valor_total')
  if [ "$VALOR_TOTAL" != "0" ] && [ "$VALOR_TOTAL" != "null" ]; then
    echo "✅ valor_total is non-zero: $VALOR_TOTAL"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo "❌ valor_total is zero or null"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  
  # Check summary totals
  TOTAL_PIS=$(echo "$RESPONSE" | jq -r '.data.summary.totalPIS')
  echo ""
  echo "Summary totals:"
  echo "  Total PIS: $TOTAL_PIS"
  echo "  Total Value: $(echo "$RESPONSE" | jq -r '.data.summary.totalValue')"
  echo "  Total ICMS: $(echo "$RESPONSE" | jq -r '.data.summary.totalICMS')"
  echo "  Total Records: $(echo "$RESPONSE" | jq -r '.data.summary.totalRecords')"
  
  echo ""
  echo "Results: $CHECKS_PASSED passed, $CHECKS_FAILED failed"
  echo ""
  
  if [ $CHECKS_FAILED -gt 0 ]; then
    return 1
  fi
  
  return 0
}

# Test purchases
echo "=== PURCHASES ==="
if test_endpoint "purchases" "fornecedor" "data_compra"; then
  echo "✅ Purchases test PASSED"
  PURCHASES_PASSED=1
else
  echo "❌ Purchases test FAILED"
  PURCHASES_PASSED=0
fi

echo ""
echo "=== SALES ==="
if test_endpoint "sales" "cliente" "data_emissao"; then
  echo "✅ Sales test PASSED"
  SALES_PASSED=1
else
  echo "❌ Sales test FAILED"
  SALES_PASSED=0
fi

echo ""
echo "======================================"
echo "FINAL RESULTS"
echo "======================================"

if [ $PURCHASES_PASSED -eq 1 ] && [ $SALES_PASSED -eq 1 ]; then
  echo "✅ ALL TESTS PASSED"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  exit 1
fi
