import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nlouwkcytkmyjexperyt.supabase.co',
  'sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW'
);

async function getAccessToken(credentials) {
  if (credentials.type === 'oauth2') {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('OAuth token error: ' + JSON.stringify(data));
    return data.access_token;
  }

  // Service account JWT flow
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sigInput = `${header}.${payload}`;
  const pemKey = credentials.private_key;
  const keyData = pemKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const keyBuffer = Buffer.from(keyData, 'base64');
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, Buffer.from(sigInput));
  const jwt = `${sigInput}.${Buffer.from(sig).toString('base64url')}`;

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
    const { data: client } = await sb.from('clientes').select('id').eq('slug', slug).single();
    if (!client) return res.status(404).json({ error: 'client not found' });

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

    const [mainRes, pagesRes, sourcesRes] = await Promise.all([
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [
            { name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' },
            { name: 'screenPageViews' }, { name: 'bounceRate' },
            { name: 'averageSessionDuration' }, { name: 'conversions' },
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
          dimensions: [{ name: 'pagePath' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        }),
      }),
    ]);

    const [mainData, pagesData, sourcesData] = await Promise.all([
      mainRes.json(), pagesRes.json(), sourcesRes.json()
    ]);

    if (mainData.error) return res.status(400).json({ error: mainData.error.message });

    const rows = (mainData.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || 0),
      users: parseInt(row.metricValues[1].value || 0),
      newUsers: parseInt(row.metricValues[2].value || 0),
      pageviews: parseInt(row.metricValues[3].value || 0),
      bounceRate: parseFloat(row.metricValues[4].value || 0),
      avgSession: parseFloat(row.metricValues[5].value || 0),
      conversions: parseInt(row.metricValues[6].value || 0),
    }));

    const totals = {
      sessions: rows.reduce((s, r) => s + r.sessions, 0),
      users: rows.reduce((s, r) => s + r.users, 0),
      newUsers: rows.reduce((s, r) => s + r.newUsers, 0),
      pageviews: rows.reduce((s, r) => s + r.pageviews, 0),
      bounceRate: rows.length ? rows.reduce((s, r) => s + r.bounceRate, 0) / rows.length : 0,
      avgSession: rows.length ? rows.reduce((s, r) => s + r.avgSession, 0) / rows.length : 0,
      conversions: rows.reduce((s, r) => s + r.conversions, 0),
    };

    const topPages = (pagesData.rows || []).map(row => ({
      path: row.dimensionValues[0].value,
      pageviews: parseInt(row.metricValues[0].value || 0),
      users: parseInt(row.metricValues[1].value || 0),
    }));

    const sources = (sourcesData.rows || []).map(row => ({
      channel: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || 0),
    }));

    // Calculate prev period
    const days = Math.ceil((new Date(until || 'today') - new Date(since || '30daysAgo')) / (1000*60*60*24)) || 30;
    const prevUntil = new Date(since || new Date(Date.now()-30*24*60*60*1000)); prevUntil.setDate(prevUntil.getDate()-1);
    const prevSince = new Date(prevUntil); prevSince.setDate(prevSince.getDate()-days);
    const prevRange = { startDate: prevSince.toISOString().slice(0,10), endDate: prevUntil.toISOString().slice(0,10) };

    let prevTotals = {};
    try {
      const prevRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRanges: [prevRange], metrics: [{ name:'sessions'},{ name:'totalUsers'},{ name:'newUsers'},{ name:'screenPageViews'},{ name:'bounceRate'},{ name:'averageSessionDuration'},{ name:'conversions'}], dimensions: [{ name:'date' }] }),
      });
      const prevData = await prevRes.json();
      if (!prevData.error) {
        const prevRows = (prevData.rows || []).map(r => ({
          sessions: parseInt(r.metricValues[0].value||0), users: parseInt(r.metricValues[1].value||0),
          newUsers: parseInt(r.metricValues[2].value||0), pageviews: parseInt(r.metricValues[3].value||0),
          bounceRate: parseFloat(r.metricValues[4].value||0), avgSession: parseFloat(r.metricValues[5].value||0),
          conversions: parseInt(r.metricValues[6].value||0),
        }));
        prevTotals = {
          sessions: prevRows.reduce((s,r)=>s+r.sessions,0), users: prevRows.reduce((s,r)=>s+r.users,0),
          newUsers: prevRows.reduce((s,r)=>s+r.newUsers,0), pageviews: prevRows.reduce((s,r)=>s+r.pageviews,0),
          bounceRate: prevRows.length ? prevRows.reduce((s,r)=>s+r.bounceRate,0)/prevRows.length : 0,
          avgSession: prevRows.length ? prevRows.reduce((s,r)=>s+r.avgSession,0)/prevRows.length : 0,
          conversions: prevRows.reduce((s,r)=>s+r.conversions,0),
        };
      }
    } catch(e) {}

    const delta = (cur, prev) => prev > 0 ? Math.round(((cur-prev)/prev)*100) : null;
    const deltas = {
      sessions: delta(totals.sessions, prevTotals.sessions),
      users: delta(totals.users, prevTotals.users),
      newUsers: delta(totals.newUsers, prevTotals.newUsers),
      pageviews: delta(totals.pageviews, prevTotals.pageviews),
      bounceRate: delta(totals.bounceRate, prevTotals.bounceRate),
      conversions: delta(totals.conversions, prevTotals.conversions),
    };

    res.json({ totals, daily: rows, topPages, sources, prevTotals, deltas });
  } catch (e) {
    console.error('GA4 error:', e);
    res.status(500).json({ error: e.message });
  }
}
