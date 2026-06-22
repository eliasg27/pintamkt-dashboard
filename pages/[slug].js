import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import ClientDashboard from '../components/ClientDashboard';

const sb = createClient(
  'https://tjpwiwtwapxspdtmvjbo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHdpd3R3YXB4c3BkdG12amJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDU5NjksImV4cCI6MjA5MzMyMTk2OX0.AtlQgeRcEPxjxg-epFkG-pd_BSttJEtbQE-cOy3LBxY'
);

function fd(d) { return d.toISOString().slice(0, 10); }
function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return fd(d); }
function hoy() { return fd(new Date()); }

const REPORT_STYLE = `
  :root {
    --bg: #F8F7F4;
    --s:  #FFFFFF;
    --b:  rgba(0,0,0,.07);
    --bm: rgba(0,0,0,.13);
    --t:  #1A1A18;
    --m:  #6B6A65;
    --f:  #8A8983;
    --a:  #EBE300;
    --ad: #C8BC00;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--t);
    font-size: 14px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 3px; }
`;

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
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLE }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--m)' }}>
        Cliente no encontrado
      </div>
    </>
  );

  if (!client || !dateFrom) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLE }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(235,227,0,.2)', borderTopColor: '#EBE300', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>{client.nombre} · Reporte Pintamkt</title>
      </Head>
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLE }} />

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* HEADER */}
        <div style={{ background: '#EBE300', padding: '1.6rem 2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              {/* Logo + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#111110' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#111110', textTransform: 'uppercase', letterSpacing: '.1em' }}>Reporte Pintamkt</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#111110', letterSpacing: '-.02em', lineHeight: 1.1 }}>{client.nombre}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginTop: 4 }}>
                Período: {dateFrom} → {dateTo}
              </div>
            </div>

            {/* Controles de fecha */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} max={dateTo}
                style={{ background: 'rgba(0,0,0,.1)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#111110', fontSize: 12, colorScheme: 'light' }}
              />
              <span style={{ color: 'rgba(0,0,0,.4)', fontSize: 12 }}>→</span>
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)} max={hoy()}
                style={{ background: 'rgba(0,0,0,.1)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#111110', fontSize: 12, colorScheme: 'light' }}
              />
              {[['7d', 7], ['30d', 30], ['90d', 90]].map(([l, n]) => (
                <button
                  key={l}
                  onClick={() => { setDateFrom(ago(n)); setDateTo(hoy()); }}
                  style={{ background: 'rgba(0,0,0,.12)', border: 'none', borderRadius: 6, padding: '4px 12px', color: '#111110', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Franja decorativa */}
        <div style={{ height: 3, background: 'linear-gradient(90deg,#EBE300 0%,#b8ad00 100%)' }} />

        <ClientDashboard client={client} dateFrom={dateFrom} dateTo={dateTo} />

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '2rem', fontSize: 11, color: 'var(--f)', borderTop: '.5px solid var(--b)', marginTop: 8 }}>
          Reporte generado por{' '}
          <strong style={{ color: '#EBE300', fontWeight: 700 }}>pintamkt</strong>
          {' '}·{' '}
          {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}
