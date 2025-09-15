// Deprecated Supabase client - replaced with server API
// This file is kept for compatibility but no longer used

export const supabase = {
  // Dummy object to prevent import errors during migration
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signIn: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
  }),
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
};