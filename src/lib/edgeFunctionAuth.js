// src/lib/edgeFunctionAuth.js
import supabase from './supabaseClient';

/**
 * Enterprise-grade helper for calling edge functions with proper auth
 * Handles token refresh, retries, and proper error handling
 */
export const callEdgeFunction = async (functionUrl, options = {}) => {
  const maxRetries = 2;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Always get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        // Try to refresh session
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Unable to obtain valid session');
        }

        // Use refreshed token
        const response = await fetch(functionUrl, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${refreshedSession.access_token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }

      // Normal flow with existing session
      const response = await fetch(functionUrl, {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.status === 401 && attempt < maxRetries) {
        // Token might be expired, force refresh on next attempt
        await supabase.auth.refreshSession();
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      lastError = error;
      console.error(`Edge function call attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(`Edge function call failed after ${maxRetries + 1} attempts: ${error.message}`);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError;
};

/**
 * Get current auth token for edge function calls
 * Use this when you need the token for other purposes
 */
export const getAuthToken = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    // Try to refresh
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
      
    if (refreshError || !refreshedSession?.access_token) {
      throw new Error('No valid authentication session');
    }
    
    return refreshedSession.access_token;
  }
  
  return session.access_token;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch {
    return false;
  }
};