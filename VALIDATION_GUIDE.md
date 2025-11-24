# Manager Access Fix - Validation Guide

## Summary
Fixed the `hasAccessToCompany` method to properly handle both ObjectId references and populated Mongoose documents, resolving the 403 error that managers were experiencing when accessing company reports.

## What Changed
**File**: `models/User.js`  
**Method**: `hasAccessToCompany` (lines 96-104)  
**Lines Changed**: 4 lines  

### Before
```javascript
userSchema.methods.hasAccessToCompany = function(companyId) {
  if (this.role === 'admin') return true;
  return this.companies.some(company => company.toString() === companyId.toString());
};
```

### After
```javascript
userSchema.methods.hasAccessToCompany = function(companyId) {
  if (this.role === 'admin') return true;
  // Suportar tanto ObjectIds simples quanto documentos populados
  return this.companies.some(c => {
    const id = c?._id ? c._id.toString() : c.toString();
    return id === companyId.toString();
  });
};
```

## Why This Fix Works
1. The `authenticate` middleware calls `.populate('companies')` which converts ObjectIds to full Mongoose documents
2. When companies are populated, each entry has properties like `_id`, `name`, `cnpj`, etc.
3. Calling `.toString()` on a Mongoose document returns `'[object Object]'` (not the ID)
4. The fix checks if the entry has an `_id` property (populated document) and uses that, otherwise treats it as a plain ObjectId
5. Both paths use `.toString()` for consistent string comparison

## Testing Performed
✅ Unit tests (11 tests passed):
- Admin always has access regardless of companies array
- Manager with plain ObjectIds in companies array
- Manager with populated documents in companies array
- Manager with mixed types (both ObjectIds and documents)
- Manager with empty companies array (denied access)
- Regular user with companies (access control works)
- Different companyId parameter types (string, ObjectId)

✅ Security scan: No vulnerabilities (CodeQL)
✅ Code review: Passed with 1 minor style nitpick (optional chaining is fine)

## How to Validate (Manual Testing)

### Prerequisites
1. MongoDB running with at least one company and one manager user
2. Manager user must be linked to a company (user.companies includes company._id)
3. Company must have purchasesReportPath or salesReportPath configured
4. Backend server running

### Test Script
The repository includes a comprehensive test script at `scripts/test-manager-access.js`:

```bash
# Set environment variables
export API_URL=http://localhost:5000/api

# Run test script with manager credentials
node scripts/test-manager-access.js manager@example.com password123 [companyId]
```

### Expected Results
1. ✅ Login as manager succeeds
2. ✅ GET /api/reports/{companyId}/summary?type=purchases returns 200
3. ✅ GET /api/reports/xlsx-files returns 200  
4. ✅ GET /api/admin/users returns 403 (blocked)
5. ✅ GET /api/companies/{companyId}/report-files returns 200
6. ✅ GET /api/reports/stats/overview returns 200
7. ✅ PUT /api/companies/{companyId}/report-files returns 403 (blocked)

### Manual API Tests
```bash
# 1. Login as manager
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"password123"}'

# Save the token from response
TOKEN="<token_from_login_response>"

# 2. Test report summary (should return 200)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/reports/{companyId}/summary?type=purchases"

# 3. Test company report files (should return 200)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/companies/{companyId}/report-files"

# 4. Test admin endpoint (should return 403)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/users"
```

## Affected Endpoints
The fix affects all endpoints that call `req.user.hasAccessToCompany()`:

### Read Endpoints (Manager with company access can now access)
- ✅ GET /api/reports/:companyId/summary
- ✅ GET /api/companies/:id/report-files
- ✅ GET /api/reports/:id (individual report details)
- ✅ GET /api/reports (list with company filter)
- ✅ GET /api/reports/stats/overview (filtered by company)

### Write Endpoints (No changes - access control already correct)
- 🔒 PUT /api/companies/:id/report-files (Admin only)
- 🔒 PUT /api/reports/:id (Admin or manager with company access)
- 🔒 POST /api/reports (Admin or user with company access)
- 🔒 DELETE /api/reports/:id (Admin or report creator with company access)

### Admin Endpoints (No changes - still Admin only)
- 🔒 GET /api/admin/users
- 🔒 POST /api/admin/... (all admin endpoints)

## Rollback Plan (if needed)
To rollback this change:
```bash
git revert e31a0c2d55c3ad7b7f051ac82df1917063ef9f10
```

This will restore the previous implementation, but managers will again receive 403 errors.

## Related Issues
- Resolves: Managers receiving 403 on /api/reports/:companyId/summary
- Related PR: #67 (previous attempt that added middleware but didn't fix the core issue)

## Deployment Notes
- ✅ No database migrations required
- ✅ No environment variable changes needed
- ✅ No dependency updates required
- ✅ Backward compatible with existing code
- ✅ No restart required (but recommended for Node.js apps)
- ✅ Safe to deploy to production immediately

## Success Metrics
After deployment, managers should be able to:
1. View report summaries for their linked companies
2. View report file configurations for their linked companies
3. View statistics filtered to their linked companies
4. Still be blocked from admin endpoints (security maintained)
