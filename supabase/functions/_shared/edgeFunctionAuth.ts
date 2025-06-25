import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function authenticateAndAuthorize(req: Request) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return { error: 'Missing token', role: null, tenant_id: null }
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { error: error?.message || 'Unauthorized', role: null, tenant_id: null }
  }

  const { tenant_id, role } = data.user.user_metadata || {}

  return {
    error: null,
    tenant_id: tenant_id ?? null,
    role: role ?? null,
  }
}
