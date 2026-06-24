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
        `?fields=campaign_id,campaign_name,impressions,clicks,spend,reach,cpm,cpc,ctr,actions` +
        `&time_range=${timeRange}&level=campaign&limit=50&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/insights` +
        `?fields=impressions,clicks,spend,reach,actions` +
        `&time_range=${timeRangePrev}&time_increment=1&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${account_id}/campaigns` +
        `?fields=id,objective,status,effective_status,adsets.limit(5){optimization_goal,destination_type,promoted_object}` +
        `&limit=200&access_token=${token}`
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

    // Mapa de objective/status/adsets por campaign_id
    const campMetaById = {};
    for (const cm of (dCampMeta.data || [])) {
      campMetaById[cm.id] = {
        objective: cm.objective,
        status: cm.status,
        effective_status: cm.effective_status,
        adsets: (cm.adsets?.data || []),
      };
    }

    // Mapa optimization_goal → { types: [action_types que cuentan], label: string, useMetric?: 'reach' | 'impressions' }
    // optimization_goal es el indicador MÁS preciso del resultado real de Meta
    const OPT_GOAL_MAP = {
      REACH:                          { useMetric: 'reach',       label: 'alcance' },
      IMPRESSIONS:                    { useMetric: 'impressions', label: 'impresiones' },
      LINK_CLICKS:                    { types: ['link_click'],                                                      label: 'clics al enlace' },
      LANDING_PAGE_VIEWS:             { types: ['landing_page_view'],                                                label: 'vistas de página' },
      POST_ENGAGEMENT:                { types: ['post_engagement'],                                                  label: 'interacciones' },
      PAGE_LIKES:                     { types: ['like'],                                                             label: 'me gusta' },
      THRUPLAY:                       { types: ['video_thruplay_watched_actions', 'video_view'],                     label: 'reproducciones' },
      VIDEO_VIEWS:                    { types: ['video_view'],                                                       label: 'reproducciones' },
      ONSITE_CONVERSIONS:             { types: ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection'], label: 'conversaciones' },
      CONVERSATIONS:                  { types: ['onsite_conversion.messaging_conversation_started_7d'],              label: 'conversaciones' },
      MESSAGING_PURCHASE_CONVERSION:  { types: ['onsite_conversion.messaging_conversation_started_7d'],              label: 'conversaciones' },
      MESSAGING_APPOINTMENT_CONVERSION:{ types: ['onsite_conversion.messaging_conversation_started_7d'],             label: 'conversaciones' },
      LEAD_GENERATION:                { types: ['lead', 'onsite_conversion.lead_grouped'],                           label: 'leads' },
      QUALITY_LEAD:                   { types: ['lead', 'onsite_conversion.lead_grouped'],                           label: 'leads' },
      OFFSITE_CONVERSIONS:            { types: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'], label: 'compras' },
      VALUE:                          { types: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'], label: 'compras' },
      AD_RECALL_LIFT:                 { useMetric: 'impressions', label: 'impresiones' },
      APP_INSTALLS:                   { types: ['app_install', 'mobile_app_install'],                                label: 'instalaciones' },
    };

    // Fallback por objective de campaña (cuando optimization_goal del adset no está mapeado o no existe)
    const OBJECTIVE_FALLBACK = {
      OUTCOME_AWARENESS:    { useMetric: 'reach', label: 'alcance' },
      REACH:                { useMetric: 'reach', label: 'alcance' },
      BRAND_AWARENESS:      { useMetric: 'reach', label: 'alcance' },
      OUTCOME_TRAFFIC:      { types: ['link_click'], label: 'clics' },
      LINK_CLICKS:          { types: ['link_click'], label: 'clics' },
      OUTCOME_ENGAGEMENT:   { types: ['post_engagement'], label: 'interacciones' },
      POST_ENGAGEMENT:      { types: ['post_engagement'], label: 'interacciones' },
      PAGE_LIKES:           { types: ['like'], label: 'me gusta' },
      MESSAGES:             { types: ['onsite_conversion.messaging_conversation_started_7d'], label: 'conversaciones' },
      OUTCOME_LEADS:        { types: ['lead', 'onsite_conversion.lead_grouped'], label: 'leads' },
      LEAD_GENERATION:      { types: ['lead', 'onsite_conversion.lead_grouped'], label: 'leads' },
      OUTCOME_SALES:        { types: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'], label: 'compras' },
      CONVERSIONS:          { types: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'], label: 'compras' },
      VIDEO_VIEWS:          { types: ['video_view'], label: 'reproducciones' },
      OUTCOME_APP_PROMOTION:{ types: ['app_install', 'mobile_app_install'], label: 'instalaciones' },
      APP_INSTALLS:         { types: ['app_install', 'mobile_app_install'], label: 'instalaciones' },
    };

    // Enriquecer cada campaña con objective, status, result y result_label
    for (const c of camps) {
      const meta = campMetaById[c.campaign_id] || {};
      c.objective = meta.objective || null;
      c.status = meta.status || null;
      c.effective_status = meta.effective_status || null;

      // 1) Intentar con optimization_goal del primer adset (la fuente más precisa)
      const firstAdset = (meta.adsets || [])[0];
      const optGoal = firstAdset?.optimization_goal;
      const destType = firstAdset?.destination_type;

      let rule = optGoal ? OPT_GOAL_MAP[optGoal] : null;

      // 2) Si destination_type apunta a Messenger/WhatsApp, forzar conversaciones
      if (!rule && (destType === 'MESSENGER' || destType === 'WHATSAPP' || destType === 'INSTAGRAM_DIRECT')) {
        rule = { types: ['onsite_conversion.messaging_conversation_started_7d'], label: 'conversaciones' };
      }

      // 3) Fallback al objective de la campaña
      if (!rule) {
        rule = OBJECTIVE_FALLBACK[c.objective] || { types: ['link_click'], label: 'resultados' };
      }

      // Calcular result según la regla
      if (rule.useMetric === 'reach') {
        c.result = parseInt(c.reach || 0);
      } else if (rule.useMetric === 'impressions') {
        c.result = parseInt(c.impressions || 0);
      } else {
        c.result = (c.actions || []).reduce((s, a) => {
          return rule.types.includes(a.action_type) ? s + parseInt(a.value || 0) : s;
        }, 0);
      }
      c.result_label = rule.label;
      c.optimization_goal = optGoal || null;
      c.destination_type = destType || null;
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
