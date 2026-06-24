// Endpoint debug: muestra el objective real de cada campaña + destination_type del adset
export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN;
  const { account_id } = req.query;
  if (!token || !account_id) return res.json({ error: 'falta account_id o token' });

  try {
    // 1) Campañas con objective
    const r1 = await fetch(
      `https://graph.facebook.com/v21.0/${account_id}/campaigns?fields=id,name,objective,status,effective_status&limit=50&access_token=${token}`
    );
    const d1 = await r1.json();
    if (d1.error) return res.json({ error: d1.error });

    const camps = d1.data || [];

    // 2) Para cada campaña, traer sus ad sets con destination_type y optimization_goal
    const enriched = await Promise.all(camps.map(async (c) => {
      const r2 = await fetch(
        `https://graph.facebook.com/v21.0/${c.id}/adsets?fields=id,name,destination_type,optimization_goal,billing_event,promoted_object&limit=20&access_token=${token}`
      );
      const d2 = await r2.json();
      return {
        campaign_id: c.id,
        campaign_name: c.name,
        objective: c.objective,
        status: c.status,
        effective_status: c.effective_status,
        adsets: (d2.data || []).map(a => ({
          name: a.name,
          destination_type: a.destination_type,
          optimization_goal: a.optimization_goal,
          billing_event: a.billing_event,
          promoted_object: a.promoted_object,
        })),
      };
    }));

    return res.json(enriched);
  } catch (e) {
    return res.json({ error: e.message });
  }
}
