export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { account_id, since, until } = req.query;

  if (!account_id) {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id,currency,account_status,amount_spent&access_token=${token}`
      );
      const d = await r.json();
      if (d.error) return res.status(400).json({ error: d.error.message });
      return res.json(d);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const s = since || ago(30);
  const u = until || today();

  // Calcular período anterior (misma duración)
  const diffDays = Math.round((new Date(u) - new Date(s)) / (1000 * 60 * 60 * 24));
  const prevUntil = new Date(s);
  prevUntil.setDate(prevUntil.getDate() - 1);
  const prevSince = new Date(prevUntil);
  prevSince.setDate(prevSince.getDate() - diffDays);
  const sPrev = prevSince.toISOString().slice(0, 10);
  const uPrev = prevUntil.toISOString().slice(0, 10);

  const timeRange = `{"since":"${s}","until":"${u}"}`;
  const timeRangePrev = `{"since":"${sPrev}","until":"${uPrev}"}`;

  try {
    const [rDaily, rCampaigns, rPrev] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/insights` +
        `?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions` +
        `&time_range=${timeRange}&time_increment=1&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/insights` +
        `?fields=campaign_id,campaign_name,impressions,clicks,spend,cpm,cpc,ctr,actions` +
        `&time_range=${timeRange}&level=campaign&limit=50&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/insights` +
        `?fields=impressions,clicks,spend,reach,actions` +
        `&time_range=${timeRangePrev}&time_increment=1&access_token=${token}`
      ),
    ]);

    const safeJson = async (r) => {
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { error: { message: `Non-JSON response (status ${r.status}): ${text.slice(0,200)}` } }; }
    };
    const [dDaily, dCampaigns, dPrev] = await Promise.all([
      safeJson(rDaily), safeJson(rCampaigns), safeJson(rPrev)
    ]);

    if (dDaily.error) return res.status(400).json({ error: dDaily.error.message });

    const rows = dDaily.data || [];
    const camps = dCampaigns.data || [];
    const rowsPrev = dPrev.data || [];

    // Calcular totales
    const calcTotals = (data) => {
      const t = data.reduce((acc, row) => {
        acc.impressions = (acc.impressions || 0) + parseInt(row.impressions || 0);
        acc.clicks      = (acc.clicks || 0)      + parseInt(row.clicks || 0);
        acc.spend       = (acc.spend || 0)        + parseFloat(row.spend || 0);
        acc.reach       = (acc.reach || 0)        + parseInt(row.reach || 0);
        for (const a of (row.actions || [])) {
          if (
            a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            a.action_type === 'onsite_conversion.messaging_first_reply'
          ) { acc.messages = (acc.messages || 0) + parseInt(a.value || 0); }
          if (a.action_type === 'lead') { acc.leads = (acc.leads || 0) + parseInt(a.value || 0); }
          if (a.action_type === 'purchase' || a.action_type === 'omni_purchase') {
            acc.purchases = (acc.purchases || 0) + parseInt(a.value || 0);
          }
        }
        return acc;
      }, {});
      if (t.impressions > 0) {
        t.cpm       = (t.spend / t.impressions) * 1000;
        t.ctr       = (t.clicks / t.impressions) * 100;
        t.frequency = t.reach > 0 ? t.impressions / t.reach : null;
      }
      if (t.clicks > 0) { t.cpc = t.spend / t.clicks; }
      return t;
    };

    const totals = calcTotals(rows);
    const totalsPrev = calcTotals(rowsPrev);

    // Calcular deltas % redondeados
    const delta = (cur, prev) => {
      if (!prev || prev === 0) return null;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const deltas = {
      reach:       delta(totals.reach, totalsPrev.reach),
      impressions: delta(totals.impressions, totalsPrev.impressions),
      clicks:      delta(totals.clicks, totalsPrev.clicks),
      spend:       delta(totals.spend, totalsPrev.spend),
      cpm:         delta(totals.cpm, totalsPrev.cpm),
      cpc:         delta(totals.cpc, totalsPrev.cpc),
      ctr:         delta(totals.ctr, totalsPrev.ctr),
      messages:    delta(totals.messages, totalsPrev.messages),
      leads:       delta(totals.leads, totalsPrev.leads),
    };

    return res.json({
      daily: rows,
      totals,
      totalsPrev,
      deltas,
      campaigns: camps,
      period: { since: s, until: u },
      periodPrev: { since: sPrev, until: uPrev },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function ago(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
