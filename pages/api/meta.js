export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });

  const { account_id, since, until } = req.query;

  // Sin account_id → devuelve lista de cuentas disponibles
  if (!account_id) {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency,account_status,amount_spent&access_token=${token}`
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
  const timeRange = `{"since":"${s}","until":"${u}"}`;

  try {
    // Llamadas en paralelo: insights diarios + insights por campaña
    const [rDaily, rCampaigns] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v19.0/${account_id}/insights` +
        `?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions` +
        `&time_range=${timeRange}&time_increment=1&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v19.0/${account_id}/insights` +
        `?fields=campaign_name,impressions,clicks,spend,cpm,cpc,ctr,actions` +
        `&time_range=${timeRange}&level=campaign&limit=50&access_token=${token}`
      ),
    ]);

    const [dDaily, dCampaigns] = await Promise.all([rDaily.json(), rCampaigns.json()]);

    if (dDaily.error) return res.status(400).json({ error: dDaily.error.message });

    const rows = dDaily.data || [];
    const camps = dCampaigns.data || [];

    // Totales agregados desde datos diarios
    const totals = rows.reduce((acc, row) => {
      acc.impressions = (acc.impressions || 0) + parseInt(row.impressions || 0);
      acc.clicks      = (acc.clicks || 0)      + parseInt(row.clicks || 0);
      acc.spend       = (acc.spend || 0)        + parseFloat(row.spend || 0);
      acc.reach       = (acc.reach || 0)        + parseInt(row.reach || 0);

      // Acciones: mensajes, leads, compras
      for (const a of (row.actions || [])) {
        if (
          a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          a.action_type === 'onsite_conversion.messaging_first_reply'
        ) {
          acc.messages = (acc.messages || 0) + parseInt(a.value || 0);
        }
        if (a.action_type === 'lead') {
          acc.leads = (acc.leads || 0) + parseInt(a.value || 0);
        }
        if (a.action_type === 'purchase' || a.action_type === 'omni_purchase') {
          acc.purchases = (acc.purchases || 0) + parseInt(a.value || 0);
        }
      }
      return acc;
    }, {});

    // CPM, CPC, CTR, Frecuencia: se calculan sobre totales (no promedio de promedios)
    if (totals.impressions > 0) {
      totals.cpm       = (totals.spend / totals.impressions) * 1000;
      totals.ctr       = (totals.clicks / totals.impressions) * 100;
      totals.frequency = totals.reach > 0 ? totals.impressions / totals.reach : null;
    }
    if (totals.clicks > 0) {
      totals.cpc = totals.spend / totals.clicks;
    }

    return res.json({
      daily: rows,
      totals,
      campaigns: camps,
      period: { since: s, until: u },
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
