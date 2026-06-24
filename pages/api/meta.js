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
    const [rDaily, rCampaigns, rPrev, rCampMeta] = await Promise.all([
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
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/campaigns` +
        `?fields=id,objective,status,effective_status&limit=200&access_token=${token}`
      ),
    ]);

    const safeJson = async (r) => {
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { error: { message: `Non-JSON response (status ${r.status}): ${text.slice(0,200)}` } }; }
    };
    const [dDaily, dCampaigns, dPrev, dCampMeta] = await Promise.all([
      safeJson(rDaily), safeJson(rCampaigns), safeJson(rPrev), safeJson(rCampMeta)
    ]);

    if (dDaily.error) return res.status(400).json({ error: dDaily.error.message || dDaily.error, _full: dDaily.error });

    const rows = dDaily.data || [];
    const camps = dCampaigns.data || [];
    const rowsPrev = dPrev.data || [];

    // Mapa de objective/status por campaign_id
    const campMetaById = {};
    for (const cm of (dCampMeta.data || [])) {
      campMetaById[cm.id] = { objective: cm.objective, status: cm.status, effective_status: cm.effective_status };
    }

    // Mapeo objective → action_type(s) que cuentan como "Resultado"
    // Soporta tanto objectives clásicos como los nuevos OUTCOME_*
    const OBJECTIVE_TO_RESULT = {
      MESSAGES:                ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection'],
      OUTCOME_ENGAGEMENT:      ['onsite_conversion.messaging_conversation_started_7d', 'post_engagement'],
      LEAD_GENERATION:         ['lead', 'onsite_conversion.lead_grouped'],
      OUTCOME_LEADS:           ['lead', 'onsite_conversion.lead_grouped'],
      CONVERSIONS:             ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'],
      OUTCOME_SALES:           ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'],
      LINK_CLICKS:             ['link_click'],
      OUTCOME_TRAFFIC:         ['link_click'],
      POST_ENGAGEMENT:         ['post_engagement'],
      PAGE_LIKES:              ['like'],
      VIDEO_VIEWS:             ['video_view'],
      OUTCOME_AWARENESS:       ['post_engagement'],
      OUTCOME_APP_PROMOTION:   ['app_install', 'mobile_app_install'],
      APP_INSTALLS:            ['app_install', 'mobile_app_install'],
      REACH:                   [], // reach es métrica, no action
      BRAND_AWARENESS:         [],
    };

    // Etiqueta legible por objective
    const OBJECTIVE_LABEL = {
      MESSAGES: 'mensajes',
      OUTCOME_ENGAGEMENT: 'interacciones',
      LEAD_GENERATION: 'leads',
      OUTCOME_LEADS: 'leads',
      CONVERSIONS: 'compras',
      OUTCOME_SALES: 'compras',
      LINK_CLICKS: 'clics',
      OUTCOME_TRAFFIC: 'clics',
      POST_ENGAGEMENT: 'interacciones',
      PAGE_LIKES: 'me gusta',
      VIDEO_VIEWS: 'reproducciones',
      OUTCOME_AWARENESS: 'alcance',
      OUTCOME_APP_PROMOTION: 'instalaciones',
      APP_INSTALLS: 'instalaciones',
      REACH: 'alcance',
      BRAND_AWARENESS: 'alcance',
    };

    // Enriquecer cada campaña con objective, status, result y result_label
    for (const c of camps) {
      const meta = campMetaById[c.campaign_id] || {};
      c.objective = meta.objective || null;
      c.status = meta.status || null;
      c.effective_status = meta.effective_status || null;

      const types = OBJECTIVE_TO_RESULT[c.objective] || [];
      if (types.length > 0) {
        c.result = (c.actions || []).reduce((s, a) => {
          return types.includes(a.action_type) ? s + parseInt(a.value || 0) : s;
        }, 0);
      } else {
        // Fallback razonable si no conocemos el objective: usar link_clicks o 0
        c.result = (c.actions || []).reduce((s, a) => {
          return a.action_type === 'link_click' ? s + parseInt(a.value || 0) : s;
        }, 0);
      }
      c.result_label = OBJECTIVE_LABEL[c.objective] || 'resultados';
    }

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
