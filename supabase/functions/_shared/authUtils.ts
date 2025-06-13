// supabase/functions/_shared/authUtils.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AuthResult {
  user: any | null; // Replace 'any' with your actual user type
  role: string | null;
  tenant_id: string | null;
  error: string | null;
  status: number | null;
}

export async function authenticateAndAuthorize(req: Request): Promise<AuthResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role key for backend operations
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, role: null, tenant_id: null, error: 'Authorization header missing', status: 401 };
  }

  const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"
  if (!token) {
    return { user: null, role: null, tenant_id: null, error: 'Authorization token malformed', status: 401 };
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData?.user) {
    console.error('Authentication error:', authError?.message);
    return { user: null, role: null, tenant_id: null, error: `Unauthorized: ${authError?.message}`, status: 401 };
  }

  const user = userData.user;

  // --- NEW LOGIC: Fetch role and tenant_id from user_profile table ---
  const { data: userProfile, error: profileError } = await supabase
    .from('users_profile')
    .select('role, tenant_id') // Select the specific columns you need
    .eq('id', user.id) // Join using the user's ID from auth.users
    .single(); // Expecting one row for the user

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError?.message || 'User profile not found');
    return { user, role: null, tenant_id: null, error: 'User profile data missing or inaccessible', status: 403 };
  }
  // --- END NEW LOGIC ---

  const role = userProfile.role;
  const tenant_id = userProfile.tenant_id;

  // The existing security check
  if (!tenant_id && role !== 'global_admin') {
    return { user, role, tenant_id, error: 'No tenant access configured', status: 403 };
  }

  return { user, role, tenant_id, error: null, status: 200 };
}