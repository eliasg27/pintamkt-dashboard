export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { page_id, ig_id, since, until } = req.query;

  // Calcular rango — máximo 30 días para IG insights
  const untilDate = until || today();
  const sinceDate = since || ago(30);

  if (!page_id && !ig_id) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=name,id,access_token,fan_count&access_token=${token}`);
      const d = await r.json();
      if (d.error) return res.status(400).json({ error: d.error.message });
      return res.json(d);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // FACEBOOK ORGÁNICO
  if (page_id) {
    try {
      // Obtener page access token desde el user token
      const rAccounts = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,fan_count,followers_count&access_token=${token}`);
      const dAccounts = await rAccounts.json();
      if (dAccounts.error) return res.status(400).json({ error: dAccounts.error.message });

      const pageData = (dAccounts.data || []).find(p => p.id === page_id);
      if (!pageData) return res.status(404).json({ error: 'Página no encontrada en las cuentas del token' });

      const pageToken = pageData.access_token;

      // Métricas válidas en v21 para páginas
      const metrics = [
        'page_total_actions',
        'page_impressions_unique',
        'page_daily_follows',
        'page_daily_follows_unique',
        'page_video_views',
      ].join(',');

      const [rI, rPosts] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${page_id}/insights?metric=${metrics}&period=day&since=${sinceDate}&until=${untilDate}&access_token=${pageToken}`),
        fetch(`https://graph.facebook.com/v21.0/${page_id}/posts?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares&since=${sinceDate}&until=${untilDate}&limit=10&access_token=${pageToken}`)
      ]);

      const [dI, dPosts] = await Promise.all([rI.json(), rPosts.json()]);

      if (dI.error) {
        console.error('FB Insights error:', JSON.stringify(dI.error));
        return res.status(400).json({ error: dI.error.message, code: dI.error.code });
      }

      const totals = {};
      (dI.data || []).forEach(m => {
        totals[m.name] = (m.values || []).reduce((acc, v) => acc + (typeof v.value === 'number' ? v.value : 0), 0);
      });

      return res.json({
        type: 'facebook',
        page: {
          id: pageData.id,
          name: pageData.name,
          fan_count: pageData.fan_count,
          followers_count: pageData.followers_count,
        },
        totals,
        posts: dPosts.data || [],
        period: { since: sinceDate, until: untilDate }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // INSTAGRAM ORGÁNICO
  if (ig_id) {
    try {
      // Métricas que requieren metric_type=total_value (nuevas métricas 2024+)
      const metricsTotal = [
        'reach',
        'profile_views',
        'accounts_engaged',
        'total_interactions',
        'likes',
        'comments',
        'shares',
        'saves',
        'website_clicks',
        'follows_and_unfollows',
      ].join(',');

      const [rI, rMedia, rAccount] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=${metricsTotal}&period=day&metric_type=total_value&since=${sinceDate}&until=${untilDate}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&since=${sinceDate}&until=${untilDate}&limit=12&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}?fields=name,username,followers_count,media_count,profile_picture_url&access_token=${token}`)
      ]);

      const [dI, dMedia, dAccount] = await Promise.all([rI.json(), rMedia.json(), rAccount.json()]);

      if (dI.error) {
        console.error('IG Insights error:', JSON.stringify(dI.error));
        return res.status(400).json({ error: dI.error.message, code: dI.error.code });
      }

      // Con metric_type=total_value, los datos vienen en total_value.value
      const totals = {};
      (dI.data || []).forEach(m => {
        totals[m.name] = m.total_value?.value ?? 0;
      });
      totals.followers_total = dAccount.followers_count || 0;

      return res.json({
        type: 'instagram',
        account: dAccount,
        totals,
        posts: dMedia.data || [],
        period: { since: sinceDate, until: untilDate }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Requiere page_id o ig_id' });
}

function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
