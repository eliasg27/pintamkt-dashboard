export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { account_id, campaign_id, adset_id, since, until } = req.query;
  const s = since || new Date(Date.now()-30*24*60*60*1000).toISOString().slice(0,10);
  const u = until || new Date().toISOString().slice(0,10);
  const timeRange = encodeURIComponent(JSON.stringify({ since: s, until: u }));
  const fields = 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions';

  try {
    // Ads dentro de un adset
    if (adset_id) {
      const [ads, adsInsights] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${adset_id}/ads?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url}&limit=50&access_token=${token}`).then(r=>r.json()),
        fetch(`https://graph.facebook.com/v21.0/${adset_id}/insights?fields=${fields}&time_range=${timeRange}&level=ad&limit=50&access_token=${token}`).then(r=>r.json()),
      ]);
      const insightsMap = {};
      (adsInsights.data || []).forEach(i => { insightsMap[i.ad_id] = i; });
      const result = (ads.data || []).map(a => ({ ...a, insights: insightsMap[a.id] || {} }));
      return res.json({ ads: result });
    }

    // Adsets dentro de una campaña
    if (campaign_id) {
      const [adsets, adsetsInsights] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${campaign_id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&limit=50&access_token=${token}`).then(r=>r.json()),
        fetch(`https://graph.facebook.com/v21.0/${campaign_id}/insights?fields=${fields}&time_range=${timeRange}&level=adset&limit=50&access_token=${token}`).then(r=>r.json()),
      ]);
      const insightsMap = {};
      (adsetsInsights.data || []).forEach(i => { insightsMap[i.adset_id] = i; });
      const result = (adsets.data || []).map(a => ({ ...a, insights: insightsMap[a.id] || {} }));
      return res.json({ adsets: result });
    }

    // Campañas de una cuenta
    if (account_id) {
      const [campaigns, insights] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=50&access_token=${token}`).then(r=>r.json()),
        fetch(`https://graph.facebook.com/v21.0/${account_id}/insights?fields=${fields}&time_range=${timeRange}&level=campaign&limit=50&access_token=${token}`).then(r=>r.json()),
      ]);
      const insightsMap = {};
      (insights.data || []).forEach(i => { insightsMap[i.campaign_id] = i; });
      const result = (campaigns.data || []).map(c => ({ ...c, insights: insightsMap[c.id] || {} }));
      return res.json({ campaigns: result });
    }

    return res.status(400).json({ error: 'account_id, campaign_id o adset_id requerido' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
