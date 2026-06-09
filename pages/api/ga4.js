import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nlouwkcytkmyjexperyt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW'
);

// Generate JWT for Google OAuth2
async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const sigInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemKey = credentials.private_key;
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const keyBuffer = Buffer.from(keyData, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(sigInput)
  );

  const jwt = `${sigInput}.${Buffer.from(sig).toString('base64url')}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Token error: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

export default async function handler(req, res) {
  const { slug, since, until } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  try {
    // Get client
    const { data: client } = await sb.from('clientes').select('id').eq('slug', slug).single();
    if (!client) return res.status(404).json({ error: 'client not found' });

    // Get GA4 integration
    const { data: integration } = await sb
      .from('client_integrations')
      .select('credentials, config')
      .eq('client_id', client.id)
      .eq('integration_type', 'ga4')
      .eq('active', true)
      .single();

    if (!integration) return res.status(404).json({ error: 'no ga4 integration' });

    const { credentials, config } = integration;
    const propertyId = config.property_id;

    const accessToken = await getAccessToken(credentials);

    const dateRange = { startDate: since || '30daysAgo', endDate: until || 'today' };

    // Run GA4 Data API request
    const gaRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
      }
    );

    const gaData = await gaRes.json();
    if (gaData.error) return res.status(400).json({ error: gaData.error.message });

    // Parse rows
    const rows = (gaData.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || 0),
      users: parseInt(row.metricValues[1].value || 0),
      newUsers: parseInt(row.metricValues[2].value || 0),
      pageviews: parseInt(row.metricValues[3].value || 0),
      bounceRate: parseFloat(row.metricValues[4].value || 0),
      avgSession: parseFloat(row.metricValues[5].value || 0),
      conversions: parseInt(row.metricValues[6].value || 0),
    }));

    // Totals
    const totals = rows.reduce((acc, r) => ({
      sessions: (acc.sessions || 0) + r.sessions,
      users: (acc.users || 0) + r.users,
      newUsers: (acc.newUsers || 0) + r.newUsers,
      pageviews: (acc.pageviews || 0) + r.pageviews,
      bounceRate: rows.length ? rows.reduce((s, x) => s + x.bounceRate, 0) / rows.length : 0,
      avgSession: rows.length ? rows.reduce((s, x) => s + x.avgSession, 0) / rows.length : 0,
      conversions: (acc.conversions || 0) + r.conversions,
    }), {});

    // Top pages
    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
          dimensions: [{ name: 'pagePath' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
      }
    );

    const pagesData = await pagesRes.json();
    const topPages = (pagesData.rows || []).map(row => ({
      path: row.dimensionValues[0].value,
      pageviews: parseInt(row.metricValues[0].value || 0),
      users: parseInt(row.metricValues[1].value || 0),
    }));

    // Traffic sources
    const sourcesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        }),
      }
    );

    const sourcesData = await sourcesRes.json();
    const sources = (sourcesData.rows || []).map(row => ({
      channel: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || 0),
    }));

    res.json({ totals, daily: rows, topPages, sources });
  } catch (e) {
    console.error('GA4 error:', e);
    res.status(500).json({ error: e.message });
  }
}
