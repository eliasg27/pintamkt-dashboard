import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import ClientDashboard from '../components/ClientDashboard';

const sb = createClient(
  'https://nlouwkcytkmyjexperyt.supabase.co',
  'sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW'
);

function fd(d) { return d.toISOString().slice(0, 10); }
function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return fd(d); }
function hoy() { return fd(new Date()); }

export default function ClientePage() {
  const { query } = useRouter();
  const slug = query.slug;
  const [client, setClient] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setDateFrom(ago(30));
    setDateTo(hoy());
  }, []);

  useEffect(() => {
    if (!slug) return;
    sb.from('clientes').select('*').eq('slug', slug).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setClient(data);
      });
  }, [slug]);

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', color: '#a1a1aa' }}>
      Cliente no encontrado
    </div>
  );

  if (!client || !dateFrom) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #e0e0e0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>{client.nombre} · Reporte Pintamkt</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f5f5f2' }}>
        {/* HEADER público */}
        <div style={{ background: '#1D9E75', padding: '2rem 2.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{client.nombre}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                Período: {dateFrom} → {dateTo}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 12, colorScheme: 'dark' }} />
              <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} max={hoy()} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 12, colorScheme: 'dark' }} />
              {[['7d', 7], ['30d', 30], ['90d', 90]].map(([l, n]) => (
                <button key={l} onClick={() => { setDateFrom(ago(n)); setDateTo(hoy()); }} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, padding: '4px 12px', color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard — mismo componente que usa la agencia, sin sidebar ni controles de módulos */}
        <ClientDashboard client={client} dateFrom={dateFrom} dateTo={dateTo} />

        <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#c4c2bb' }}>
          Reporte generado por <strong>pintamkt</strong> · {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}
