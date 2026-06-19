export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { page_id, ig_id, since, until } = req.query;
  const untilDate = until || today();
  const sinceDate = since || ago(30);

  // Instagram insights: máximo 30 días
  const igUntilDate = untilDate;
  const igSinceDate = (() => {
    const s = new Date(sinceDate);
    const u = new Date(untilDate);
    const diffDays = (u - s) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      const capped = new Date(u);
      capped.setDate(capped.getDate() - 30);
      return capped.toISOString().slice(0, 10);
    }
    return sinceDate;
  })();

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
      // Obtener page access token
      const rAccounts = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,fan_count,followers_count&access_token=${token}`);
      const dAccounts = await rAccounts.json();
      if (dAccounts.error) return res.status(400).json({ error: dAccounts.error.message });

      const pageData = (dAccounts.data || []).find(p => p.id === page_id);
      if (!pageData) return res.status(404).json({ error: 'Página no encontrada' });

      const pageToken = pageData.access_token;

      // Info completa de la página + posts
      const [rPage, rPosts] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${page_id}?fields=name,fan_count,followers_count,talking_about_count,about,website,picture{url}&access_token=${pageToken}`),
        fetch(`https://graph.facebook.com/v21.0/${page_id}/posts?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares&limit=9&access_token=${pageToken}`)
      ]);

      const [dPage, dPosts] = await Promise.all([rPage.json(), rPosts.json()]);

      if (dPage.error) return res.status(400).json({ error: dPage.error.message, code: dPage.error.code });

      // Intentar insights — pueden fallar sin permiso de admin
      let totals = {};
      try {
        const rI = await fetch(`https://graph.facebook.com/v21.0/${page_id}/insights?metric=page_total_actions,page_impressions_unique,page_daily_follows&period=day&since=${sinceDate}&until=${untilDate}&access_token=${pageToken}`);
        const dI = await rI.json();
        if (!dI.error) {
          (dI.data || []).forEach(m => {
            totals[m.name] = (m.values || []).reduce((acc, v) => acc + (typeof v.value === 'number' ? v.value : 0), 0);
          });
        }
      } catch (e) { /* insights opcionales */ }

      return res.json({
        type: 'facebook',
        page: dPage,
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
      const metricsTotal = [
        'reach', 'profile_views', 'accounts_engaged',
        'total_interactions', 'likes', 'comments',
        'shares', 'saves', 'website_clicks', 'follows_and_unfollows',
      ].join(',');

      // follower_count solo soporta últimos 30 días excluyendo hoy
      const today = new Date();
      const maxUntil = new Date(today); maxUntil.setDate(maxUntil.getDate() - 1);
      const minSince = new Date(today); minSince.setDate(minSince.getDate() - 30);
      const reqSince = new Date(igSinceDate);
      const reqUntil = new Date(igUntilDate);
      const fcSince = (reqSince < minSince ? minSince : reqSince).toISOString().slice(0,10);
      const fcUntilDate = (reqUntil > maxUntil ? maxUntil : reqUntil);
      const fcUntil = fcUntilDate.toISOString().slice(0,10);
      const fcRangeValid = new Date(fcSince) <= fcUntilDate;

      const [rI, rMedia, rAccount, rFollowers] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=${metricsTotal}&period=day&metric_type=total_value&since=${igSinceDate}&until=${igUntilDate}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&since=${igSinceDate}&until=${igUntilDate}&limit=12&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}?fields=name,username,followers_count,media_count,profile_picture_url&access_token=${token}`),
        fcRangeValid
          ? fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=follower_count&period=day&since=${fcSince}&until=${fcUntil}&access_token=${token}`)
          : Promise.resolve({ json: async () => ({ data: [] }) })
      ]);

      const [dI, dMedia, dAccount, dFollowers] = await Promise.all([rI.json(), rMedia.json(), rAccount.json(), rFollowers.json()]);

      if (dI.error) {
        console.error('IG Insights error:', JSON.stringify(dI.error));
        return res.status(400).json({ error: dI.error.message, code: dI.error.code });
      }

      const totals = {};
      (dI.data || []).forEach(m => {
        totals[m.name] = m.total_value?.value ?? 0;
      });
      totals.followers_total = dAccount.followers_count || 0;

      // Calcular ganancia neta de seguidores: suma de valores diarios (follower_count es delta diario)
      let netFollowers = null;
      const followerValues = dFollowers.data?.[0]?.values || [];
      if (followerValues.length > 0) {
        netFollowers = followerValues.reduce((sum, v) => sum + (v.value || 0), 0);
      }
      totals.net_followers = netFollowers;
      if (req.query.debug) totals._followers_debug = dFollowers;

      return res.json({
        type: 'instagram',
        account: dAccount,
        totals,
        posts: dMedia.data || [],
        period: { since: igSinceDate, until: igUntilDate }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Requiere page_id o ig_id' });
}

function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
