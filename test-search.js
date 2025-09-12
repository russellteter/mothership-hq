// Test script to verify search functionality
const SUPABASE_URL = 'https://kwmoaikxwfnsisgaejyq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bW9haWt4d2Zuc2lzZ2FlanlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ5ODcsImV4cCI6MjA3MzAzMDk4N30.VXtjgno3GFEEMlDx_CInUVEOeD20DgxZNRMMJehrq7U';

async function testSearch() {
  console.log('🔍 Testing Search Functionality...\n');
  
  // First, check health status
  console.log('1. Checking system health...');
  const healthResponse = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    }
  });
  
  const health = await healthResponse.json();
  console.log('Health Status:', health.status);
  console.log('- Supabase:', health.checks.supabase.status ? '✅' : '❌', health.checks.supabase.message || '');
  console.log('- Google Places API:', health.checks.googlePlacesApi.status ? '✅' : '❌', health.checks.googlePlacesApi.message || '');
  console.log('- OpenAI API:', health.checks.openAiApi.status ? '✅' : '❌', health.checks.openAiApi.message || '');
  console.log();
  
  // Try a simple parse-prompt test (this will fail without proper OpenAI key)
  console.log('2. Testing prompt parsing...');
  try {
    const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        prompt: 'dentists in Columbia SC without websites'
      })
    });
    
    if (!parseResponse.ok) {
      const error = await parseResponse.text();
      console.log('❌ Parse prompt failed:', error);
    } else {
      const parsed = await parseResponse.json();
      console.log('✅ Parsed successfully:', JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.log('❌ Parse prompt error:', error.message);
  }
  
  console.log('\n📊 Summary:');
  console.log('- Google Places API needs to be enabled in Google Cloud Console');
  console.log('- OpenAI API key needs to be replaced with a valid key');
  console.log('- Once both APIs are configured, search will work');
}

testSearch().catch(console.error);