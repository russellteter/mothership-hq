// Replaced Supabase client with API client that provides working functionality
import { apiClient } from '@/lib/api-client';

export const supabase = apiClient;