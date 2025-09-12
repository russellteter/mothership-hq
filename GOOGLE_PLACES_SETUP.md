# Google Places API Setup Guide

## Critical Issue Identified
The search functionality is failing because the Google Places API is not properly configured in your Supabase Edge Functions environment.

## Setup Steps

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API (New)** - NOT the deprecated Places API
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **API Key**
6. Copy the API key

### 2. Configure API Key Security (Important!)

1. Click on your API key to edit it
2. Under **API restrictions**, select **Restrict key**
3. Select **Places API (New)** from the list
4. Under **Application restrictions**, add your domain/IP restrictions
5. Save the changes

### 3. Add API Key to Supabase Edge Functions

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** > **Edge Functions**
4. Add a new secret:
   - Name: `GOOGLE_PLACES_API_KEY`
   - Value: Your Google Places API key
5. Save the secret

#### Option B: Using Supabase CLI
```bash
supabase secrets set GOOGLE_PLACES_API_KEY="your-api-key-here"
```

### 4. Deploy the Updated Edge Functions

```bash
# From the project root
cd supabase/functions

# Deploy the search functions
supabase functions deploy search-leads
supabase functions deploy search-enriched-leads
supabase functions deploy parse-prompt
supabase functions deploy get-search-results
```

## Verify Setup

### Test the API Key
You can test if the API key is working by making a simple request:

```bash
curl -X POST "https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants+in+Columbia+SC&key=YOUR_API_KEY"
```

### Check Edge Function Logs
Monitor the Edge Function logs in Supabase Dashboard:
1. Go to **Functions** in your Supabase Dashboard
2. Click on `search-leads`
3. View the **Logs** tab
4. Look for any API key related errors

## Common Issues

### Error: "Google Places API key is not configured"
- The `GOOGLE_PLACES_API_KEY` environment variable is not set in Supabase Edge Functions

### Error: "REQUEST_DENIED"
- API key is invalid
- Places API (New) is not enabled for your project
- API key restrictions are blocking the request

### Error: "OVER_QUERY_LIMIT"
- You've exceeded the API quota
- Check your Google Cloud Console for usage limits

## Implementation Changes Made

1. **Implemented `searchGooglePlacesWithPagination` function** - Now makes actual API calls to Google Places
2. **Implemented `processPlace` function** - Processes and stores business data in the database
3. **Enhanced error handling** - Better error messages for API configuration issues
4. **Fixed location parsing** - Added support for major city names without state codes

## Next Steps

After configuring the API key:
1. Test a simple search like "dentists in Columbia, SC"
2. Monitor the Edge Function logs for any errors
3. Verify that results are being stored in the database

## Support

If you continue to experience issues after following this guide:
1. Check the Edge Function logs for specific error messages
2. Verify your API key has the correct permissions
3. Ensure your Supabase project has the latest Edge Functions deployed