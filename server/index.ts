import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import * as schema from '../shared/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.select().from(schema.businesses).limit(1);
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get search results
app.get('/api/search-results/:searchJobId', async (req, res) => {
  try {
    const { searchJobId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get search job
    const searchJob = await db
      .select()
      .from(schema.searchJobs)
      .where(eq(schema.searchJobs.id, searchJobId))
      .limit(1);

    if (searchJob.length === 0) {
      return res.status(404).json({ error: 'Search job not found' });
    }

    // Get lead views with business data
    const leadViews = await db
      .select({
        id: schema.leadViews.id,
        score: schema.leadViews.score,
        subscoresJson: schema.leadViews.subscoresJson,
        rank: schema.leadViews.rank,
        business: {
          id: schema.businesses.id,
          name: schema.businesses.name,
          vertical: schema.businesses.vertical,
          website: schema.businesses.website,
          phone: schema.businesses.phone,
          addressJson: schema.businesses.addressJson,
          lat: schema.businesses.lat,
          lng: schema.businesses.lng,
          franchiseBool: schema.businesses.franchiseBool,
          createdAt: schema.businesses.createdAt,
        }
      })
      .from(schema.leadViews)
      .innerJoin(schema.businesses, eq(schema.leadViews.businessId, schema.businesses.id))
      .where(eq(schema.leadViews.searchJobId, searchJobId))
      .orderBy(schema.leadViews.rank)
      .limit(limit)
      .offset(offset);

    // Get signals for businesses
    const businessIds = leadViews.map(lv => lv.business.id);
    const signals = businessIds.length > 0 ? await db
      .select()
      .from(schema.signals)
      .where(sql`${schema.signals.businessId} = ANY(${businessIds})`) : [];

    // Get people for businesses
    const people = businessIds.length > 0 ? await db
      .select()
      .from(schema.people)
      .where(sql`${schema.people.businessId} = ANY(${businessIds})`) : [];

    // Group signals and people by business ID
    const signalsByBusiness = signals.reduce((acc, signal) => {
      if (!acc[signal.businessId]) acc[signal.businessId] = [];
      acc[signal.businessId].push(signal);
      return acc;
    }, {} as Record<string, any[]>);

    const peopleByBusiness = people.reduce((acc, person) => {
      if (!acc[person.businessId]) acc[person.businessId] = [];
      acc[person.businessId].push(person);
      return acc;
    }, {} as Record<string, any[]>);

    // Transform to lead format
    const leads = leadViews.map(leadView => {
      const business = leadView.business;
      const businessSignals = signalsByBusiness[business.id] || [];
      const businessPeople = peopleByBusiness[business.id] || [];

      // Transform signals to object
      const signalsObj = businessSignals.reduce((acc, signal) => {
        acc[signal.type] = signal.valueJson;
        return acc;
      }, {} as Record<string, any>);

      // Find owner
      const owner = businessPeople.find(person => 
        person.role?.toLowerCase().includes('owner') ||
        person.role?.toLowerCase().includes('principal') ||
        person.role?.toLowerCase().includes('dr')
      );

      return {
        rank: leadView.rank,
        score: leadView.score,
        name: business.name,
        city: business.addressJson?.city || '',
        state: business.addressJson?.state || '',
        website: business.website,
        phone: business.phone,
        signals: signalsObj,
        owner: owner?.name,
        owner_email: owner?.email,
        business,
        people: businessPeople,
        signal_details: businessSignals,
      };
    });

    res.json({
      search_job: searchJob[0],
      leads,
      total: leadViews.length
    });

  } catch (error) {
    console.error('Error in get-search-results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create search job (simplified version)
app.post('/api/search-leads', async (req, res) => {
  try {
    const { dsl, original_prompt, custom_name, search_tags, lead_type } = req.body;

    // Create search job
    const [searchJob] = await db
      .insert(schema.searchJobs)
      .values({
        dslJson: dsl,
        status: 'running',
        originalPrompt: original_prompt,
        customName: custom_name,
        searchTags: search_tags || [],
        leadType: lead_type,
      })
      .returning();

    // For now, return job ID - in a real implementation, this would trigger background processing
    res.json({ 
      job_id: searchJob.id,
      status: 'queued',
      message: 'Search job created successfully'
    });

  } catch (error) {
    console.error('Error in search-leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// Parse prompt endpoint (simplified)
app.post('/api/parse-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Simple parsing logic (in real implementation, this would use OpenAI)
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
      warnings: ['Using simplified parsing - OpenAI integration needed for full functionality'],
      confidence: 0.6
    });

  } catch (error) {
    console.error('Error in parse-prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});