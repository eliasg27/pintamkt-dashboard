import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const SUPABASE_URL = 'https://nlouwkcytkmyjexperyt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const LABEL_CANAL = {
  meta: 'Meta Ads', google_ads: 'Google Ads', ga4: 'GA4',
  mensajes: 'Mensajes', wordpress: 'WordPress', search_console: 'Search Console'
};

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toString();
}

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [current, setCurrent] = useState(null);
  const [page, setPage] = useState('overview');
  const [days, setDays] = useState(30);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre: '', estado: 'activo', canales: [] });
  const [selectedMetaAccount, setSelectedMetaAccount] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => { loadClientes(); loadMetaAccounts(); }, []);

  useEffect(() => {
    if (current && current.canales?.includes('meta') && selectedMetaAccount) {
      loadMetaData(selectedMetaAccount, days);
    }
  }, [current, days, selectedMetaAccount]);

  useEffect(() => {
    if (metaData && chartRef.current) renderChart();
  }, [metaData]);

  async function loadClientes() {
    const { data } = await sb.from('clientes').select('*').order('nombre');
    setClientes(data || []);
  }

  async function loadMetaAccounts() {
    try {
      const r = await fetch('/api/meta');
      const d = await r.json();
      if (d.data) {
        setMetaAccounts(d.data);
        if (d.data.length > 0) setSelectedMetaAccount(d.data[0].id);
      }
    } catch (e) { console.error(e); }
  }

  async function loadMetaData(accountId, numDays) {
    setMetaLoading(true);
    setMetaData(null);
    try {
      const since = daysAgo(numDays);
      const until = today();
      const r = await fetch(`/api/meta?account_id=${accountId}&since=${since}&until=${until}`);
      const d = await r.json();
      if (!d.error) setMetaData(d);
    } catch (e) { console.error(e); }
    setMetaLoading(false);
  }

  function renderChart() {
    if (!metaData?.daily?.length) return;
    if (typeof window === 'undefined') return;

    import('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js').catch(() => {});

    const script = document.getElementById('chartjs-script');
    if (!script) {
      const s = document.createElement('script');
      s.id = 'chartjs-script';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => buildChart();
      document.head.appendChild(s);
    } else if (window.Chart) {
      buildChart();
    } else {
      script.addEventListener('load', buildChart);
    }
  }

  function buildChart() {
    if (!chartRef.current || !metaData?.daily) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const labels = metaData.daily.map(d => d.date_start?.slice(5));
    const clicks = metaData.daily.map(d => parseInt(d.clicks || 0));
    const spend = metaData.daily.map(d => parseFloat(d.spend || 0));
    chartInstance.current = new window.Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Clics', data: clicks, backgroundColor: '#1D9E75', borderRadius: 3, yAxisID: 'y' },
          { label: 'Gasto $', data: spend, backgroundColor: '#9FE1CB', borderRadius: 3, yAxisID: 'y2' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { font: { size: 9 } } },
          y2: { position: 'right', grid: { display: false }, ticks: { font: { size: 9 } } }
        }
      }
    });
  }

  async function saveCliente() {
    if (!newCliente.nombre.trim()) return;
    const slug = newCliente.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    await sb.from('clientes').insert({ ...newCliente, slug });
    setShowModal(false);
    setNewCliente({ nombre: '', estado: 'activo', canales: [] });
    loadClientes();
  }

  function toggleCanal(c) {
    setNewCliente(prev => ({
      ...prev,
      canales: prev.canales.includes(c) ? prev.canales.filter(x => x !== c) : [...prev.canales, c]
    }));
  }

  function showClient(c) {
    setCurrent(c);
    setPage('client');
    setMetaData(null);
    if (c.canales?.includes('meta') && selectedMetaAccount) {
      loadMetaData(selectedMetaAccount, days);
    }
  }

  const activos = clientes.filter(c => c.estado === 'activo').length;
  const revisar = clientes.filter(c => c.estado === 'revisar').length;
  const pausados = clientes.filter(c => c.estado === 'pausado').length;

  return (
    <>
      <Head><title>Pintamkt — Dashboard</title></Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #f8f7f4; --surface: #ffffff; --border: rgba(0,0,0,0.09);
          --border-md: rgba(0,0,0,0.15); --text: #1a1a18; --muted: #6b6a65;
          --faint: #9c9a92; --accent: #1D9E75; --accent-dark: #0F6E56;
        }
        @media (prefers-color-scheme: dark) {
          :root { --bg: #111110; --surface: #1c1c1a; --border: rgba(255,255,255,0.08);
            --border-md: rgba(255,255,255,0.15); --text: #e8e6e0; --muted: #9c9a92; --faint: #6b6a65; }
        }
        body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); font-size: 14px; }
        .topbar { position: sticky; top: 0; z-index: 100; background: var(--surface); border-bottom: 0.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; height: 52px; }
        .logo { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
        .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
        .layout { display: flex; height: calc(100vh - 52px); }
        .sidebar { width: 210px; min-width: 210px; border-right: 0.5px solid var(--border); padding: 1rem 0; overflow-y: auto; }
        .sidebar-section { padding: 8px 1rem 4px; font-size: 10px; font-weight: 600; letter-spacing: .06em; color: var(--faint); text-transform: uppercase; }
        .nav-item { display: flex; align-items: center; gap: 9px; padding: 7px 1rem; font-size: 13px; color: var(--muted); cursor: pointer; border-right: 2px solid transparent; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--bg); color: var(--text); font-weight: 500; border-right-color: var(--accent); }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .nav-divider { height: 0.5px; background: var(--border); margin: 8px 1rem; }
        .main { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .page-title { font-size: 18px; font-weight: 600; letter-spacing: -.02em; margin-bottom: 4px; }
        .page-sub { font-size: 12px; color: var(--faint); margin-bottom: 1.25rem; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 1.25rem; }
        .kpi-card { background: var(--surface); border: 0.5px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; }
        .kpi-label { font-size: 11px; color: var(--faint); margin-bottom: 6px; }
        .kpi-value { font-size: 24px; font-weight: 600; }
        .kpi-delta { font-size: 11px; color: var(--faint); margin-top: 4px; }
        .delta-down { color: #A32D2D; }
        .clients-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .client-card { background: var(--surface); border: 0.5px solid var(--border); border-radius: 14px; padding: 1rem 1.1rem; cursor: pointer; }
        .client-card:hover { border-color: var(--border-md); }
        .client-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .client-name { font-size: 14px; font-weight: 600; }
        .status-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--faint); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-green { background: #1D9E75; } .dot-yellow { background: #EF9F27; } .dot-gray { background: #888780; }
        .client-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
        .tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; border: 0.5px solid var(--border-md); color: var(--muted); background: var(--bg); }
        .tag-meta { background: #E6F1FB; color: #185FA5; border-color: #B5D4F4; }
        .tag-google_ads { background: #EAF3DE; color: #3B6D11; border-color: #C0DD97; }
        .tag-ga4 { background: #EAF3DE; color: #3B6D11; border-color: #C0DD97; }
        .tag-mensajes { background: #FBEAF0; color: #993556; border-color: #F4C0D1; }
        .tag-wordpress { background: #EEEDFE; color: #534AB7; border-color: #CECBF6; }
        .client-footer { border-top: 0.5px solid var(--border); margin-top: 10px; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: var(--faint); }
        .btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 8px; border: 0.5px solid var(--border-md); background: var(--surface); color: var(--text); cursor: pointer; }
        .btn:hover { background: var(--bg); }
        .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn-primary:hover { background: var(--accent-dark); }
        .detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 0.5px solid var(--border); }
        .back-btn { background: none; border: 0.5px solid var(--border-md); cursor: pointer; color: var(--muted); font-size: 16px; padding: 5px 10px; border-radius: 8px; }
        .detail-name { font-size: 18px; font-weight: 600; }
        .detail-sub { font-size: 12px; color: var(--faint); }
        .widgets-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .widget { background: var(--surface); border: 0.5px solid var(--border); border-radius: 14px; padding: 1rem 1.1rem; }
        .widget-full { grid-column: 1 / -1; }
        .widget-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .widget-title { font-size: 11px; font-weight: 600; color: var(--faint); letter-spacing: .04em; text-transform: uppercase; }
        .widget-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
        .wk-label { font-size: 10px; color: var(--faint); }
        .wk-val { font-size: 20px; font-weight: 600; margin-top: 2px; }
        .wk-delta { font-size: 10px; color: var(--faint); margin-top: 2px; }
        .chart-wrap { position: relative; width: 100%; height: 140px; }
        .account-select { font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 0.5px solid var(--border-md); background: var(--bg); color: var(--text); }
        .period-select { font-size: 12px; padding: 5px 10px; border-radius: 8px; border: 0.5px solid var(--border-md); background: var(--bg); color: var(--text); }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border-md); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal { background: var(--surface); border-radius: 14px; border: 0.5px solid var(--border-md); padding: 1.5rem; width: 460px; max-width: 95vw; }
        .modal-title { font-size: 16px; font-weight: 600; margin-bottom: 1rem; }
        .form-group { margin-bottom: 14px; }
        .form-label { font-size: 11px; font-weight: 600; color: var(--faint); letter-spacing: .04em; text-transform: uppercase; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 0.5px solid var(--border-md); background: var(--bg); color: var(--text); font-size: 13px; }
        .channel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .channel-opt { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; border: 0.5px solid var(--border-md); cursor: pointer; font-size: 12px; background: var(--bg); }
        .channel-opt.selected { border-color: var(--accent); background: #E1F5EE; color: #0F6E56; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 1.25rem; }
        .meta-accounts-bar { background: #E6F1FB; border: 0.5px solid #B5D4F4; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .meta-accounts-bar span { font-size: 11px; color: #185FA5; font-weight: 600; }
      `}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo"><div className="logo-dot" />pintamkt</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="period-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>EA</div>
        </div>
      </div>

      <div className="layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-section">Agencia</div>
          <div className={`nav-item${page === 'overview' ? ' active' : ''}`} onClick={() => setPage('overview')}>
            ▪ Panel general
          </div>
          <div className="nav-divider" />
          <div className="sidebar-section">Clientes</div>
          {clientes.map(c => (
            <div key={c.id} className={`nav-item${current?.id === c.id && page === 'client' ? ' active' : ''}`} onClick={() => showClient(c)}>
              <span className="dot" style={{ background: c.color || '#888' }} />
              {c.nombre}
            </div>
          ))}
          <div className="nav-divider" />
          <div className="sidebar-section">Conectar</div>
          <div className="nav-item" onClick={() => setShowModal(true)}>+ Nuevo cliente</div>
          {metaAccounts.length > 0 && (
            <div className="nav-item" style={{ color: '#1D9E75', fontWeight: 500 }}>
              ✓ Meta conectado ({metaAccounts.length})
            </div>
          )}
        </div>

        {/* MAIN */}
        <div className="main">

          {/* OVERVIEW */}
          {page === 'overview' && (
            <div>
              <div className="page-title">Panel general</div>
              <div className="page-sub">{clientes.length} clientes · actualizado ahora</div>

              {metaAccounts.length > 0 && (
                <div className="meta-accounts-bar">
                  <span>✓ Meta Ads conectado —</span>
                  {metaAccounts.map(a => (
                    <span key={a.id} style={{ fontSize: 11, color: '#185FA5' }}>{a.name}</span>
                  ))}
                </div>
              )}

              <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-label">Clientes activos</div><div className="kpi-value">{activos}</div><div className="kpi-delta">en operación</div></div>
                <div className="kpi-card"><div className="kpi-label">En revisión</div><div className="kpi-value">{revisar}</div><div className={`kpi-delta${revisar > 0 ? ' delta-down' : ''}`}>requieren atención</div></div>
                <div className="kpi-card"><div className="kpi-label">Pausados</div><div className="kpi-value">{pausados}</div><div className="kpi-delta">temporalmente</div></div>
                <div className="kpi-card"><div className="kpi-label">Total clientes</div><div className="kpi-value">{clientes.length}</div><div className="kpi-delta">en la agencia</div></div>
              </div>

              <div className="clients-grid">
                {clientes.map(c => {
                  const dotClass = c.estado === 'activo' ? 'dot-green' : c.estado === 'revisar' ? 'dot-yellow' : 'dot-gray';
                  const estadoLabel = c.estado === 'activo' ? 'Activo' : c.estado === 'revisar' ? 'Revisar' : 'Pausado';
                  return (
                    <div key={c.id} className="client-card" onClick={() => showClient(c)}>
                      <div className="client-header">
                        <div className="client-name">{c.nombre}</div>
                        <div className="status-pill"><span className={`status-dot ${dotClass}`} />{estadoLabel}</div>
                      </div>
                      <div className="client-tags">
                        {(c.canales || []).map(ch => <span key={ch} className={`tag tag-${ch}`}>{LABEL_CANAL[ch] || ch}</span>)}
                        {!c.canales?.length && <span className="tag">Sin canales</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                        <div><div className="wk-label">Canales</div><div style={{ fontSize: 14, fontWeight: 600 }}>{(c.canales || []).length}</div></div>
                        <div><div className="wk-label">Estado</div><div style={{ fontSize: 14, fontWeight: 600 }}>{estadoLabel}</div></div>
                        <div><div className="wk-label">Meta</div><div style={{ fontSize: 14, fontWeight: 600 }}>{c.canales?.includes('meta') && metaAccounts.length > 0 ? '✓' : '—'}</div></div>
                      </div>
                      <div className="client-footer"><span>Clic para ver métricas</span><span>›</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CLIENT DETAIL */}
          {page === 'client' && current && (
            <div>
              <div className="detail-header">
                <button className="back-btn" onClick={() => setPage('overview')}>←</button>
                <div>
                  <div className="detail-name">{current.nombre}</div>
                  <div className="detail-sub">{(current.canales || []).map(c => LABEL_CANAL[c] || c).join(' · ')}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(window.location.href)}>↗ Compartir</button>
                </div>
              </div>

              <div className="widgets-grid">

                {/* META ADS WIDGET */}
                {current.canales?.includes('meta') && (
                  <div className="widget widget-full">
                    <div className="widget-header">
                      <div className="widget-title">Meta Ads — datos reales</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {metaAccounts.length > 1 && (
                          <select className="account-select" value={selectedMetaAccount || ''} onChange={e => { setSelectedMetaAccount(e.target.value); loadMetaData(e.target.value, days); }}>
                            {metaAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        )}
                        {metaLoading && <div className="spinner" />}
                      </div>
                    </div>

                    {metaData ? (
                      <>
                        <div className="widget-kpis">
                          <div><div className="wk-label">Alcance</div><div className="wk-val">{fmt(metaData.totals?.reach)}</div><div className="wk-delta">personas</div></div>
                          <div><div className="wk-label">Impresiones</div><div className="wk-val">{fmt(metaData.totals?.impressions)}</div><div className="wk-delta">total</div></div>
                          <div><div className="wk-label">Clics</div><div className="wk-val">{fmt(metaData.totals?.clicks)}</div><div className="wk-delta">en anuncios</div></div>
                          <div><div className="wk-label">Gasto</div><div className="wk-val">${metaData.totals?.spend ? metaData.totals.spend.toFixed(0) : '0'}</div><div className="wk-delta">USD</div></div>
                        </div>
                        {metaData.totals?.messages > 0 && (
                          <div style={{ marginBottom: 10, padding: '6px 10px', background: '#FBEAF0', borderRadius: 8, fontSize: 12, color: '#993556' }}>
                            💬 {fmt(metaData.totals.messages)} mensajes generados por anuncios
                          </div>
                        )}
                        <div className="chart-wrap">
                          <canvas ref={chartRef} role="img" aria-label="Clics y gasto diario Meta Ads" />
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--faint)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75', display: 'inline-block' }} /> Clics</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#9FE1CB', display: 'inline-block' }} /> Gasto $</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--faint)', fontSize: 13 }}>
                        {metaLoading ? 'Cargando datos de Meta...' : metaAccounts.length === 0 ? 'Token de Meta no configurado en Vercel' : 'Seleccioná una cuenta para ver datos'}
                      </div>
                    )}
                  </div>
                )}

                {/* PLACEHOLDER OTROS CANALES */}
                {current.canales?.filter(c => c !== 'meta').map(canal => (
                  <div key={canal} className="widget">
                    <div className="widget-header">
                      <div className="widget-title">{LABEL_CANAL[canal] || canal}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--faint)', fontSize: 12 }}>
                      Integración próximamente
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Nuevo cliente</div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={newCliente.nombre} onChange={e => setNewCliente(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Grand Bar" />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={newCliente.estado} onChange={e => setNewCliente(p => ({ ...p, estado: e.target.value }))}>
                <option value="activo">Activo</option>
                <option value="revisar">Revisar</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Canales</label>
              <div className="channel-grid">
                {Object.entries(LABEL_CANAL).map(([k, v]) => (
                  <div key={k} className={`channel-opt${newCliente.canales.includes(k) ? ' selected' : ''}`} onClick={() => toggleCanal(k)}>{v}</div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }
