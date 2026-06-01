// pages/api/meta.js
// Vercel Function — lee META_ACCESS_TOKEN desde env vars, llama a Meta Graph API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN no configurado' });
  }

  const { account_id, since, until, fields } = req.query;

  // Si piden las cuentas disponibles
  if (!account_id) {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency,account_status,amount_spent&access_token=${token}`
      );
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Métricas de una cuenta específica
  const sinceDate = since || daysAgo(30);
  const untilDate = until || today();
  const metricFields = fields || 'impressions,clicks,spend,reach,cpm,cpc,actions';

  try {
    const url = `https://graph.facebook.com/v19.0/${account_id}/insights?fields=${metricFields}&time_range={"since":"${sinceDate}","until":"${untilDate}"}&time_increment=1&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    // Agregar totales
    const rows = data.data || [];
    const totals = rows.reduce((acc, row) => {
      acc.impressions = (acc.impressions || 0) + parseInt(row.impressions || 0);
      acc.clicks = (acc.clicks || 0) + parseInt(row.clicks || 0);
      acc.spend = (acc.spend || 0) + parseFloat(row.spend || 0);
      acc.reach = (acc.reach || 0) + parseInt(row.reach || 0);
      // Mensajes (actions de tipo messaging)
      const msgs = (row.actions || []).find(a =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.messaging_first_reply'
      );
      if (msgs) acc.messages = (acc.messages || 0) + parseInt(msgs.value || 0);
      return acc;
    }, {});

    return res.json({ daily: rows, totals, period: { since: sinceDate, until: untilDate } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
