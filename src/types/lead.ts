// Core types for the Lead Finder application

export interface LeadQuery {
  version: number;
  vertical: 'dentist' | 'law_firm' | 'contractor' | 'hvac' | 'roofing' | 'generic';
  geo: {
    city: string;
    state: string;
    radius_km?: number;
  };
  constraints: {
    must: Constraint[];
    optional?: Constraint[];
  };
  exclusions?: string[];
  result_size: {
    target: number;
  };
  sort_by: 'score_desc' | 'score_asc' | 'name_asc';
  lead_profile: string;
  output: {
    contract: 'csv' | 'json';
  };
  notify: {
    on_complete: boolean;
  };
  compliance_flags: string[];
}

export interface Constraint {
  no_website?: boolean;
  has_chatbot?: boolean;
  has_online_booking?: boolean;
  owner_identified?: boolean;
  franchise?: boolean;
}

export interface Business {
  id: string;
  name: string;
  vertical?: string;
  website?: string;
  phone?: string;
  address_json: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  lat?: number;
  lng?: number;
  franchise_bool?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  business_id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  source_url?: string;
  confidence: number;
  created_at: string;
}

export interface Signal {
  id: string;
  business_id: string;
  type: string;
  value_json: any;
  confidence: number;
  evidence_url?: string;
  evidence_snippet?: string;
  source_key: string;
  detected_at: string;
  overridden_by_user: boolean;
}

export interface LeadView {
  id: string;
  search_job_id: string;
  business_id: string;
  score: number;
  subscores_json: {
    ICP: number;
    Pain: number;
    Reachability: number;
    ComplianceRisk: number;
  };
  rank: number;
  created_at: string;
}

export interface Lead {
  rank: number;
  score: number;
  name: string;
  city: string;
  state: string;
  website?: string;
  phone?: string;
  signals: {
    no_website?: boolean;
    has_chatbot?: boolean;
    has_online_booking?: boolean;
    owner_identified?: boolean;
    franchise_guess?: boolean;
  };
  owner?: string;
  owner_email?: string;
  review_count?: number;
  status: 'new' | 'qualified' | 'ignored';
  tags: string[];
  business: Business;
  people: Person[];
  signal_details: Signal[];
  notes: Note[];
  // Enrichment fields (optional, present in enriched-only mode)
  confidence_score?: number;
  detected_features?: Record<string, any>;
  verified_contacts?: Array<Record<string, any>>;
  enrichment_data?: Record<string, any>;
  evidence_log?: EvidenceEntry[];
}

export interface Note {
  id: string;
  business_id: string;
  text: string;
  created_at: string;
}

export interface SearchJob {
  id: string;
  dsl_json: LeadQuery;
  created_at: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  summary_stats?: {
    total_found: number;
    total_enriched: number;
    total_scored: number;
    processing_time_ms: number;
  };
  error_text?: string;
  custom_name?: string;
  original_prompt?: string;
  search_tags?: string[];
}

export interface ParseResult {
  dsl: LeadQuery;
  warnings: string[];
}

// Evidence logging structure for enrichment
export interface EvidenceEntry {
  timestamp: string;
  check_type: 'website' | 'booking' | 'contact' | 'social';
  source: 'gmb' | 'serp' | 'dom' | 'api';
  url?: string;
  selector?: string;
  snippet?: string;
  status: 'found' | 'not_found' | 'error';
  confidence: number; // 0-1
}