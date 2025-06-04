import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function DebugTokenButton() {
  const [token, setToken] = useState('');

  const fetchToken = async () => {
    const { data } = await supabase.auth.getSession();
    setToken(data.session?.access_token || 'No token found');
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={fetchToken}>
        🔐 Show Supabase Token
      </button>
      {token && (
        <div style={{ marginTop: 10, wordBreak: 'break-all' }}>
          <strong>Access Token:</strong>
          <pre>{token}</pre>
        </div>
      )}
    </div>
  );
}
