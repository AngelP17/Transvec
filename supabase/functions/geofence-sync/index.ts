import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const geofences = Array.isArray(body?.geofences) ? body.geofences : [];
    const alerts = Array.isArray(body?.alerts) ? body.alerts : [];

    let geofenceInserted = 0;
    if (geofences.length > 0) {
      const tables = ['transvec_geofences', 'geofences'];
      for (const table of tables) {
        const { error } = await supabase.from(table).insert(geofences);
        if (!error) {
          geofenceInserted = geofences.length;
          break;
        }
      }
    }

    let alertsInserted = 0;
    if (alerts.length > 0) {
      const { error } = await supabase.from('transvec_alerts').insert(alerts);
      if (!error) alertsInserted = alerts.length;
    }

    return new Response(
      JSON.stringify({ ok: true, geofences: geofenceInserted, alerts: alertsInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
