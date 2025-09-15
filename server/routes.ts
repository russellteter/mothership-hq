import express from 'express';
import { z } from 'zod';
import { storage } from './storage.js';

const router = express.Router();

// Zod schemas for validation
const searchJobSchema = z.object({
  dslJson: z.object({
    version: z.number(),
    vertical: z.string(),
    geo: z.object({
      city: z.string(),
      state: z.string(),
      radius_km: z.number().optional(),
    }),
    constraints: z.object({
      must: z.array(z.any()),
      optional: z.array(z.any()).optional(),
    }),
    result_size: z.object({
      target: z.number(),
    }),
    sort_by: z.string(),
    lead_profile: z.string(),
    output: z.object({
      contract: z.string(),
    }),
    notify: z.object({
      on_complete: z.boolean(),
    }),
    compliance_flags: z.array(z.string()),
  }),
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
  userId: z.string(),
  customName: z.string().optional(),
  originalPrompt: z.string().optional(),
  searchTags: z.array(z.string()).optional(),
  leadType: z.string().optional(),
});

const savedSearchSchema = z.object({
  userId: z.string(),
  name: z.string(),
  dslJson: z.object({
    version: z.number(),
    vertical: z.string(),
    geo: z.object({
      city: z.string(),
      state: z.string(),
    }),
    constraints: z.any(),
    result_size: z.any(),
    sort_by: z.string(),
    lead_profile: z.string(),
    output: z.any(),
    notify: z.any(),
    compliance_flags: z.array(z.string()),
  }),
  searchJobId: z.string().optional(),
});

const updateSavedSearchSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

// Search Jobs endpoints
router.get('/search-jobs', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'migration-user';
    const jobs = await storage.getSearchJobs(userId);
    res.json({ data: jobs, error: null });
  } catch (error) {
    console.error('Error getting search jobs:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.post('/search-jobs', async (req, res) => {
  try {
    const validatedData = searchJobSchema.parse(req.body);
    const job = await storage.createSearchJob(validatedData);
    res.json({ data: job, error: null });
  } catch (error) {
    console.error('Error creating search job:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.put('/search-jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await storage.updateSearchJob(id, req.body);
    res.json({ data: job, error: null });
  } catch (error) {
    console.error('Error updating search job:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// Saved Searches endpoints
router.get('/saved-searches', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'migration-user';
    const searches = await storage.getSavedSearches(userId);
    res.json({ data: searches, error: null });
  } catch (error) {
    console.error('Error getting saved searches:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.post('/saved-searches', async (req, res) => {
  try {
    const validatedData = savedSearchSchema.parse(req.body);
    const search = await storage.createSavedSearch(validatedData);
    res.json({ data: search, error: null });
  } catch (error) {
    console.error('Error creating saved search:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.put('/saved-searches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateSavedSearchSchema.parse(req.body);
    const search = await storage.updateSavedSearch(id, validatedData);
    res.json({ data: search, error: null });
  } catch (error) {
    console.error('Error updating saved search:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.delete('/saved-searches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSavedSearch(id);
    res.json({ data: null, error: null });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// Dashboard Stats endpoint
router.get('/dashboard-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'migration-user';
    const stats = await storage.getDashboardStats(userId);
    res.json({ data: stats, error: null });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// Lead Actions endpoints
router.post('/lead-status', async (req, res) => {
  try {
    const { businessId, status } = req.body;
    await storage.updateLeadStatus(businessId, status);
    res.json({ data: null, error: null });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.post('/lead-notes', async (req, res) => {
  try {
    const { businessId, text } = req.body;
    await storage.addNote(businessId, text);
    res.json({ data: null, error: null });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

router.post('/lead-tags', async (req, res) => {
  try {
    const { businessId, tag } = req.body;
    await storage.addTag(businessId, tag);
    res.json({ data: null, error: null });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// Signal overrides endpoint
router.post('/signal-overrides', async (req, res) => {
  try {
    // For now, just return success - signal overrides can be added to storage later
    res.json({ data: { id: `override-${Date.now()}`, ...req.body }, error: null });
  } catch (error) {
    console.error('Error creating signal override:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

export default router;