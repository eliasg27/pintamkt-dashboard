import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://tjpwiwtwapxspdtmvjbo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHdpd3R3YXB4c3BkdG12amJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDU5NjksImV4cCI6MjA5MzMyMTk2OX0.AtlQgeRcEPxjxg-epFkG-pd_BSttJEtbQE-cOy3LBxY'
);

export default async function handler(req, res) {
  const { slug, type } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug requerido' });

  // Buscar el cliente por slug
  const { data: cliente, error: clienteError } = await sb
    .from('clientes')
    .select('id')
    .eq('slug', slug)
    .single();

  if (clienteError || !cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const client_id = cliente.id;

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('client_manual_data')
      .select('month, data')
      .eq('client_id', client_id)
      .order('month', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const rows = (data || []).map(r => ({ period: r.month, ...r.data }));
    return res.json({ rows });
  }

  if (req.method === 'POST') {
    const { period, data } = req.body;
    if (!period) return res.status(400).json({ error: 'period requerido' });

    const { error } = await sb
      .from('client_manual_data')
      .upsert({ client_id, month: period, data }, { onConflict: 'client_id,month' });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'period requerido' });

    const { error } = await sb
      .from('client_manual_data')
      .delete()
      .eq('client_id', client_id)
      .eq('month', period);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
