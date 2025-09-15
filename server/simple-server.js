// Simplified server for testing
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'mock'
  });
});

// Mock search leads endpoint
app.post('/api/search-leads', (req, res) => {
  const jobId = `job-${Date.now()}`;
  res.json({ 
    job_id: jobId,
    status: 'queued',
    message: 'Search job created successfully (mock)'
  });
});

// Mock get search results endpoint
app.get('/api/search-results/:searchJobId', (req, res) => {
  const { searchJobId } = req.params;
  
  // Return mock data
  res.json({
    search_job: {
      id: searchJobId,
      status: 'completed',
      dsl_json: { mock: true },
      created_at: new Date().toISOString()
    },
    leads: [
      {
        rank: 1,
        score: 0.95,
        name: 'Mock Business 1',
        city: 'New York',
        state: 'NY',
        website: 'https://example.com',
        phone: '(555) 123-4567',
        signals: { online_presence: true },
        owner: 'John Doe',
        owner_email: 'john@example.com'
      },
      {
        rank: 2,
        score: 0.87,
        name: 'Mock Business 2', 
        city: 'Los Angeles',
        state: 'CA',
        website: 'https://example2.com',
        phone: '(555) 987-6543',
        signals: { has_website: true },
        owner: 'Jane Smith',
        owner_email: 'jane@example2.com'
      }
    ],
    total: 2
  });
});

// Mock parse prompt endpoint
app.post('/api/parse-prompt', (req, res) => {
  const defaultDSL = {
    version: 1,
    vertical: 'generic',
    geo: {
      city: 'New York',
      state: 'NY',
      radius_km: 25
    },
    constraints: {
      must: []
    },
    result_size: {
      target: 250
    },
    sort_by: 'score_desc',
    output: {
      contract: 'json'
    },
    notify: {
      on_complete: true
    },
    compliance_flags: ['respect_dnc']
  };

  res.json({
    dsl: defaultDSL,
    warnings: ['Using mock parsing - OpenAI integration needed for full functionality'],
    confidence: 0.6
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock server running on port ${PORT}`);
});