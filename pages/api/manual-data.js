import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { slug, type } = req.method === 'GET' ? req.query : req.body;

  if (!slug || !type) return res.status(400).json({ error: 'Falta slug o type' });

  // Obtener client_id
  const { data: client, error: clientErr } = await sb
    .from('clientes')
    .select('id')
    .eq('slug', slug)
    .single();

  if (clientErr || !client) return res.status(404).json({ error: 'Cliente no encontrado', detail: clientErr });

  const client_id = client.id;

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('client_manual_data')
      .select('*')
      .eq('client_id', client_id)
      .eq('month', type) // usamos "month" como campo de tipo+período
      .order('created_at', { ascending: true });

    // En realidad guardamos por type+period en el campo "month" como "bot:2026-05"
    // Rediseño: usar campo data->type y month = período
    const { data: rows, error: rowsErr } = await sb
      .from('client_manual_data')
      .select('*')
      .eq('client_id', client_id)
      .like('month', `${type}:%`)
      .order('month', { ascending: true });

    if (rowsErr) return res.status(500).json({ error: rowsErr.message });

    const formatted = (rows || []).map(r => ({
      period: r.month.replace(`${type}:`, ''),
      data: r.data,
      id: r.id,
    }));

    return res.json({ rows: formatted });
  }

  if (req.method === 'POST') {
    const { period, data } = req.body;
    if (!period || !data) return res.status(400).json({ error: 'Falta period o data' });

    const month = `${type}:${period}`;

    // Upsert
    const { error } = await sb
      .from('client_manual_data')
      .upsert(
        { client_id, month, data, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,month' }
      );

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'Falta period' });

    const month = `${type}:${period}`;
    const { error } = await sb
      .from('client_manual_data')
      .delete()
      .eq('client_id', client_id)
      .eq('month', month);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no soportado' });
}
