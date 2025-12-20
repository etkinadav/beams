# Landbot Authentication Bypass Setup

## Heroku Config Vars Setup

To enable TEST MODE bypass for `/api/landbot/send`, you need to set the following Config Vars in Heroku:

### Required Config Vars:

1. **LAND_BOT_TEST_BYPASS**
   - Value: `true` (string, not boolean)
   - Purpose: Enables bypass mode when combined with non-production environment

2. **NODE_ENV**
   - Value: Leave unset OR set to anything other than `"production"` (e.g., `development`, `staging`, `test`)
   - Purpose: Bypass only works when `NODE_ENV !== "production"`
   - **Important**: If `NODE_ENV=production`, bypass is DISABLED regardless of `LAND_BOT_TEST_BYPASS`

### How to Set in Heroku:

#### Option 1: Heroku Dashboard
1. Go to your Heroku app dashboard
2. Click on **Settings** tab
3. Scroll to **Config Vars** section
4. Click **Reveal Config Vars**
5. Click **Edit**
6. Add or update:
   - Key: `LAND_BOT_TEST_BYPASS`, Value: `true`
   - Key: `NODE_ENV`, Value: `development` (or leave unset if you want bypass)
7. Click **Save**

#### Option 2: Heroku CLI
```bash
# Set bypass flag
heroku config:set LAND_BOT_TEST_BYPASS=true -a your-app-name

# Ensure NODE_ENV is NOT "production" (unset it or set to something else)
heroku config:unset NODE_ENV -a your-app-name
# OR
heroku config:set NODE_ENV=development -a your-app-name

# Verify
heroku config -a your-app-name
```

### Testing:

1. **Check debug endpoint:**
   ```
   GET /api/landbot/debug
   ```
   Should return:
   ```json
   {
     "nodeEnv": "development",
     "bypassEnv": "true",
     "allowBypass": true,
     "isNonProduction": true,
     "bypassEnabled": true
   }
   ```

2. **If `allowBypass` is `true`, then POST `/api/landbot/send` should work without authentication.**

### Security Notes:

- **Production Safety**: When `NODE_ENV=production`, bypass is **completely disabled** even if `LAND_BOT_TEST_BYPASS=true`
- **Bypass Logic**: `allowBypass = (LAND_BOT_TEST_BYPASS === "true") && (NODE_ENV !== "production")`
- Bypass is only intended for development/staging environments

### Local Development (.env file):

Create or update `beams/backend/.env`:

```env
NODE_ENV=development
LAND_BOT_TEST_BYPASS=true
LANDBOT_CUSTOMER_ID=your_customer_id
LANDBOT_TOKEN=your_landbot_token
JWT_KEY=your_jwt_secret
MONGO_URI=your_mongodb_uri
```

