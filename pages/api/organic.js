export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { page_id, ig_id, since, until } = req.query;
  const s = since || ago(30);
  const u = until || today();

  if (!page_id && !ig_id) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=name,id,instagram_business_account,fan_count&access_token=${token}`);
      const d = await r.json();
      if (d.error) return res.status(400).json({ error: d.error.message, code: d.error.code });
      return res.json(d);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // FACEBOOK ORGÁNICO
  if (page_id) {
    try {
      // Métricas actuales de Facebook Pages (2024+)
      const metrics = [
        'page_post_engagements',
        'page_fan_adds',
        'page_fan_removes',
        'page_views_total',
        'page_impressions',
        'page_impressions_organic_v2',
        'page_reach',
        'page_engaged_users',
      ].join(',');

      const [rI, rF] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${page_id}/insights?metric=${metrics}&period=day&since=${s}&until=${u}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${page_id}?fields=name,fan_count,followers_count&access_token=${token}`)
      ]);
      const [dI, dF] = await Promise.all([rI.json(), rF.json()]);

      if (dI.error) {
        console.error('FB Insights error:', JSON.stringify(dI.error));
        return res.status(400).json({ error: dI.error.message, code: dI.error.code });
      }

      const totals = {};
      (dI.data || []).forEach(m => {
        totals[m.name] = (m.values || []).reduce((acc, v) => acc + (typeof v.value === 'number' ? v.value : 0), 0);
      });
      totals.fans_total = dF.fan_count || 0;

      return res.json({ type: 'facebook', page: dF, totals, period: { since: s, until: u } });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // INSTAGRAM ORGÁNICO
  if (ig_id) {
    try {
      // Métricas actuales de Instagram Business (2024+)
      const igMetrics = [
        'reach',
        'profile_views',
        'accounts_engaged',
        'total_interactions',
        'likes',
        'comments',
        'shares',
        'saves',
        'follows_and_unfollows',
        'website_clicks',
      ].join(',');

      const [rI, rP, rF] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=${igMetrics}&period=day&since=${s}&until=${u}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&since=${s}&until=${u}&limit=20&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}?fields=name,username,followers_count,media_count,profile_picture_url&access_token=${token}`)
      ]);
      const [dI, dP, dF] = await Promise.all([rI.json(), rP.json(), rF.json()]);

      if (dI.error) {
        console.error('IG Insights error:', JSON.stringify(dI.error));
        return res.status(400).json({ error: dI.error.message, code: dI.error.code });
      }

      const totals = {};
      (dI.data || []).forEach(m => {
        totals[m.name] = (m.values || []).reduce((acc, v) => {
          const val = v.value;
          return acc + (typeof val === 'number' ? val : 0);
        }, 0);
      });
      totals.followers_total = dF.followers_count || 0;

      return res.json({
        type: 'instagram',
        account: dF,
        totals,
        posts: dP.data || [],
        period: { since: s, until: u }
      });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(400).json({ error: 'Requiere page_id o ig_id' });
}

function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
