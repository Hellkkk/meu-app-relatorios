# Post-Deployment Validation Guide

## Overview

After merging this PR and deploying to production, follow these steps to validate the implementation.

## Prerequisites

- Access to production server
- Admin JWT token
- Company ID(s) to test
- `jq` installed (for JSON parsing)
- `curl` installed

## Validation Steps

### 1. Deploy Backend

```bash
git pull origin main
npm ci
pm2 restart relatorios-backend
```

**Verify deployment:**
```bash
curl http://localhost:5001/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-19T20:00:00.000Z"
}
```

### 2. Test Sync Endpoint (Admin Only)

**Set environment variables:**
```bash
export TOKEN=your_admin_jwt_token
export COMPANY=your_company_id
export BASE_URL=http://localhost:5001
```

**Sync purchases:**
```bash
curl -X POST "$BASE_URL/api/reports/$COMPANY/sync?type=purchases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully synced 404 purchases records",
  "data": {
    "success": true,
    "inserted": 404,
    "stats": {
      "totalValue": 2578714.28,
      "totalICMS": 90957.00,
      "totalIPI": 5283.71,
      "totalPIS": 5484.08,
      "totalCOFINS": 25265.21,
      "count": 404
    },
    "lastSyncAt": "2025-11-19T20:00:00.000Z"
  }
}
```

**Sync sales:**
```bash
curl -X POST "$BASE_URL/api/reports/$COMPANY/sync?type=sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully synced 152 sales records",
  "data": {
    "success": true,
    "inserted": 152,
    "stats": {
      "totalValue": 1628763.53,
      "totalICMS": 48340.93,
      "totalIPI": 0.00,
      "totalPIS": 26076.96,
      "totalCOFINS": 120112.24,
      "count": 152
    },
    "lastSyncAt": "2025-11-19T20:00:00.000Z"
  }
}
```

### 3. Verify Records Endpoint

**Get first page of purchases:**
```bash
curl "$BASE_URL/api/reports/$COMPANY/records?type=purchases&page=0&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.records[0]'
```

**Verify values are non-zero:**
- Check that `valor_total` > 0
- Check that `icms`, `ipi`, `pis`, `cofins` have reasonable values
- Check that `fornecedor` is not empty
- Check that `data_compra` is a valid date
- Check that `numero_nfe` is not empty

### 4. Verify Summary Endpoint

**Get purchases summary:**
```bash
curl "$BASE_URL/api/reports/$COMPANY/summary?type=purchases" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.summary'
```

**Verify totals match:**
```bash
# Expected for Compras_AVM.xlsx:
# totalRecords: 404
# totalValue: 2578714.28
# totalICMS: 90957.00
# totalIPI: 5283.71
# totalPIS: 5484.08
# totalCOFINS: 25265.21
```

### 5. Run Validation Scripts

**Dev sync test:**
```bash
TOKEN=$TOKEN COMPANY=$COMPANY ./scripts/dev-sync.sh
```

**Summary validation:**
```bash
TOKEN=$TOKEN COMPANY=$COMPANY TYPE=purchases ./scripts/check-summary.sh
```

Expected output:
```
✓ Count matches
✓ Total Value matches
✓ ICMS matches
✓ IPI matches
✓ PIS matches
✓ COFINS matches
```

### 6. Deploy Frontend

```bash
npm run client:build
pm2 restart relatorios-frontend
```

### 7. Frontend Validation

Open browser and navigate to the application:

**Login as admin:**
1. Navigate to login page
2. Enter admin credentials
3. Verify successful login

**Test Purchases/Sales:**
1. Select a company from dropdown
2. Verify data loads in summary cards
3. Check that charts display data
4. Scroll to table section

**Verify Table Display:**
1. Check that table shows records (not empty)
2. Verify monetary values are NOT R$ 0,00
3. Check that fornecedor/cliente names are displayed
4. Verify dates are formatted correctly
5. Verify CFOP codes are shown

**Test Pagination:**
1. Change page size (5, 10, 25, 50)
2. Navigate between pages
3. Verify page count is correct
4. Check that different records appear on different pages

**Test Search:**
1. Type supplier/customer name in search box
2. Verify results are filtered
3. Clear search and verify all records return

**Test Sync Button (Admin Only):**
1. Click "Sincronizar Dados" button
2. Verify loading indicator appears
3. Wait for success message
4. Check that data refreshes

**Switch Report Types:**
1. Toggle between "Compras" and "Vendas"
2. Verify data updates accordingly
3. Check that table columns adjust (Fornecedor vs Cliente)
4. Verify all values remain non-zero

### 8. Performance Check

**Measure response times:**
```bash
# Summary endpoint
time curl "$BASE_URL/api/reports/$COMPANY/summary?type=purchases" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -s -w '%{time_total}\n'

# Should be < 0.5s after initial sync
```

```bash
# Records endpoint
time curl "$BASE_URL/api/reports/$COMPANY/records?type=purchases&page=0&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -s -w '%{time_total}\n'

# Should be < 0.1s
```

### 9. Error Handling Validation

**Test rate limiting:**
```bash
# First sync (should succeed)
curl -X POST "$BASE_URL/api/reports/$COMPANY/sync?type=purchases" \
  -H "Authorization: Bearer $TOKEN"

# Immediate second sync (should return 429)
curl -X POST "$BASE_URL/api/reports/$COMPANY/sync?type=purchases" \
  -H "Authorization: Bearer $TOKEN"
```

Expected second response:
```json
{
  "success": false,
  "message": "Please wait X seconds before syncing again",
  "cooldownRemaining": 300
}
```

**Test invalid type:**
```bash
curl "$BASE_URL/api/reports/$COMPANY/records?type=invalid" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "success": false,
  "message": "Invalid type. Use \"purchases\" or \"sales\"."
}
```

**Test unauthorized access:**
```bash
# Without token
curl "$BASE_URL/api/reports/$COMPANY/records?type=purchases"
```

Expected: 401 Unauthorized

### 10. MongoDB Verification

**Check collections:**
```bash
# Connect to MongoDB
mongo your_mongodb_uri

# Switch to database
use relatorios

# Check purchase_records count
db.purchase_records.count()
# Expected: 404 (for Compras_AVM.xlsx)

# Check sales_records count
db.sales_records.count()
# Expected: 152 (for Vendas_AVM.xlsx)

# Sample document
db.purchase_records.findOne()

# Verify indices
db.purchase_records.getIndexes()
```

**Expected indices:**
- `_id`
- `{ companyId: 1, numero_nfe: 1 }`
- `{ companyId: 1, fornecedor: 1 }`
- `{ companyId: 1, cfop: 1 }`
- `{ companyId: 1, data_compra: -1 }`

### 11. Log Verification

**Check server logs:**
```bash
pm2 logs relatorios-backend --lines 100
```

**Look for:**
- ✅ Successful sync messages
- ✅ Record counts matching expected values
- ✅ No error stack traces
- ✅ Response times < 1s for queries

### 12. Comparison with Excel Files

**Manual verification (sample check):**

1. Open `Compras_AVM.xlsx` in Excel
2. Check first row values:
   - Fornecedor
   - Data Compra
   - Nº NFe
   - CFOP
   - Valor Total
   - ICMS
   - IPI
   - PIS
   - COFINS

3. Fetch first record from API:
```bash
curl "$BASE_URL/api/reports/$COMPANY/records?type=purchases&page=0&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.records[0]'
```

4. Compare values manually
5. Verify they match exactly

### 13. Load Testing (Optional)

**Concurrent requests:**
```bash
# Install apache bench
sudo apt-get install apache2-utils

# Test records endpoint
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/reports/$COMPANY/records?type=purchases&page=0&pageSize=10"
```

**Check results:**
- Requests per second > 100
- No failed requests
- Mean response time < 100ms

## Success Criteria

All of the following must be true:

✅ Backend deploys without errors
✅ Sync endpoints return correct record counts
✅ Records endpoint returns non-zero monetary values
✅ Summary endpoint aggregations match manual calculations
✅ Frontend displays correct values (no R$ 0,00)
✅ Pagination works correctly
✅ Search filters results
✅ Sync button works for admins
✅ Rate limiting prevents abuse
✅ MongoDB indices exist
✅ Performance < 0.5s for summary, < 0.1s for records
✅ Values match Excel files

## Rollback Plan

If validation fails:

```bash
# Revert to previous version
git checkout previous_commit_hash
npm ci
pm2 restart all

# Or use PM2 rollback
pm2 stop all
pm2 delete all
pm2 start previous_ecosystem.config.js
```

## Support Contacts

- **Backend Issues**: Check `SECURITY_SUMMARY.md`
- **API Documentation**: See `API_PERSISTENCE_DOCS.md`
- **Implementation Details**: See `PERSISTENCE_IMPLEMENTATION_SUMMARY.md`

## Post-Validation Monitoring

After successful validation, monitor for 24-48 hours:

1. **Response Times**: Track API response times
2. **Error Rates**: Monitor 4xx and 5xx responses
3. **Sync Operations**: Track sync frequency and duration
4. **Database Performance**: Monitor MongoDB slow queries
5. **Memory Usage**: Check for memory leaks
6. **User Feedback**: Collect feedback on data accuracy

---

**Last Updated:** November 19, 2025
**Version:** 1.0
