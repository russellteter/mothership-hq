#!/usr/bin/env node

/**
 * Test script to verify the search API is working with Google Places
 * Run with: node test-search-api.js
 */

const SUPABASE_URL = 'https://kwmoaikxwfnsisgaejyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bW9haWt4d2Zuc2lzZ2FlanlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ5ODcsImV4cCI6MjA3MzAzMDk4N30.VXtjgno3GFEEMlDx_CInUVEOeD20DgxZNRMMJehrq7U';

async function testSearch() {
  console.log('🔍 Testing Search API with Google Places...\n');
  
  try {
    // Step 1: Parse the search prompt
    console.log('1️⃣ Parsing search prompt...');
    const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        prompt: 'dentists in Columbia, SC with no chat widget'
      })
    });
    
    if (!parseResponse.ok) {
      const error = await parseResponse.text();
      throw new Error(`Parse failed: ${error}`);
    }
    
    const parseResult = await parseResponse.json();
    console.log('✅ Parse successful:', JSON.stringify(parseResult.dsl, null, 2));
    
    // Step 2: Execute the search
    console.log('\n2️⃣ Executing search...');
    const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        dsl: parseResult.dsl,
        original_prompt: 'dentists in Columbia, SC with no chat widget'
      })
    });
    
    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      throw new Error(`Search failed: ${error}`);
    }
    
    const searchResult = await searchResponse.json();
    console.log('✅ Search initiated:', searchResult);
    
    // Step 3: Poll for results
    if (searchResult.job_id) {
      console.log('\n3️⃣ Polling for results...');
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const resultsResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-search-results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            search_job_id: searchResult.job_id
          })
        });
        
        if (resultsResponse.ok) {
          const results = await resultsResponse.json();
          
          if (results.search_job.status === 'completed') {
            console.log(`✅ Search completed! Found ${results.leads.length} leads`);
            
            if (results.leads.length > 0) {
              console.log('\n📊 Sample leads:');
              results.leads.slice(0, 3).forEach((lead, i) => {
                console.log(`  ${i + 1}. ${lead.name} - ${lead.city}, ${lead.state}`);
                console.log(`     Score: ${lead.score}, Website: ${lead.website || 'None'}`);
              });
            }
            
            return;
          } else if (results.search_job.status === 'failed') {
            throw new Error(`Search failed: ${results.search_job.error_text}`);
          }
          
          process.stdout.write('.');
          attempts++;
        }
      }
      
      console.log('\n⏱️ Search timed out');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('Google Places API')) {
      console.log('\n📝 Solution: The Google Places API key needs to be configured in Supabase Edge Functions.');
      console.log('   Run: supabase secrets set GOOGLE_PLACES_API_KEY="AIzaSyA66DnqAKNyvVEzwQjddwrTKhUsawyfTh0"');
    }
  }
}

// Run the test
testSearch();