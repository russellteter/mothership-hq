// Complete search functionality test
const SUPABASE_URL = 'https://kwmoaikxwfnsisgaejyq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bW9haWt4d2Zuc2lzZ2FlanlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ5ODcsImV4cCI6MjA3MzAzMDk4N30.VXtjgno3GFEEMlDx_CInUVEOeD20DgxZNRMMJehrq7U';

// First we need to sign in to get a proper session token
async function signIn() {
  console.log('🔐 Signing in...');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    },
    body: JSON.stringify({
      email: 'test@example.com', // You'll need to replace with a real user
      password: 'testpassword'    // You'll need to replace with real password
    })
  });
  
  if (!response.ok) {
    // Try to create a test user first
    console.log('Creating test user...');
    const signupResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123!'
      })
    });
    
    if (!signupResponse.ok) {
      console.log('Could not create test user. Please use the UI to test.');
      return null;
    }
    
    const signupData = await signupResponse.json();
    return signupData.access_token;
  }
  
  const data = await response.json();
  return data.access_token;
}

async function testSearchPipeline() {
  console.log('🔍 Testing Complete Search Pipeline\n');
  
  // Step 1: Test parse-prompt with OpenAI
  console.log('1. Testing prompt parsing with OpenAI...');
  try {
    const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        prompt: 'Find 5 dentists in Columbia, South Carolina without websites'
      })
    });
    
    const parseResult = await parseResponse.json();
    
    if (parseResult.error) {
      console.log('❌ Parse failed:', parseResult.error);
      if (parseResult.fallback) {
        console.log('⚠️  Using fallback DSL:', JSON.stringify(parseResult.fallback, null, 2));
      }
      return;
    }
    
    console.log('✅ Successfully parsed prompt!');
    console.log('DSL Generated:', JSON.stringify(parseResult.dsl, null, 2));
    console.log();
    
    // Step 2: Test search-leads with the parsed DSL
    console.log('2. Testing lead search with Google Places API...');
    
    // Get a proper auth token (would need real user credentials)
    // For now, we'll show what the request would look like
    console.log('Note: Full search requires authentication. Use the UI to test the complete flow.');
    console.log();
    
    // Show the request that would be made
    console.log('The search would call:');
    console.log('POST', `${SUPABASE_URL}/functions/v1/search-leads`);
    console.log('With DSL:', JSON.stringify(parseResult.dsl, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Step 3: Check current system status
  console.log('\n3. Current System Status:');
  const healthResponse = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    }
  });
  
  const health = await healthResponse.json();
  console.log('Overall Status:', health.status);
  console.log('- Supabase:', health.checks.supabase.status ? '✅ Working' : '❌ Not working');
  console.log('- Google Places:', health.checks.googlePlacesApi.status ? '✅ Working' : '❌ ' + (health.checks.googlePlacesApi.message || 'Not working'));
  console.log('- OpenAI:', health.checks.openAiApi.status ? '✅ Working' : '❌ Not working');
  
  console.log('\n📊 Summary:');
  if (health.status === 'healthy') {
    console.log('✅ All systems operational! Search should work in the UI.');
  } else if (health.status === 'degraded') {
    console.log('⚠️  Some issues detected. Check the messages above.');
    if (!health.checks.googlePlacesApi.status) {
      console.log('\n🔧 To fix Google Places API:');
      console.log('1. The API key is set but using legacy endpoints');
      console.log('2. You may need to enable "Places API" (not just "Places API (New)") in Google Cloud Console');
      console.log('3. Or we need to update the code to use the new Places API endpoints');
    }
  } else {
    console.log('❌ System has critical issues. Review the health check results.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. If Google Places is still failing, enable both "Places API" and "Places API (New)" in Google Cloud Console');
  console.log('2. Test the search in the UI by signing in and using the search panel');
  console.log('3. Monitor the browser console for detailed error messages');
}

testSearchPipeline().catch(console.error);