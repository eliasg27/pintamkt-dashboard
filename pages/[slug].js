import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
 
const sb = createClient(
  'https://nlouwkcytkmyjexperyt.supabase.co',
  'sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW'
);
 
const DMODS = {
  meta_resumen: true,
  meta_rendimiento: true,
  meta_resultados: true,
  meta_campanas: true,
  facebook_organico: false,
  instagram_organico: false,
};
 
function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toString();
}
function fm(n) { return n ? '$' + fmt(n) : '—'; }
function fp(n) { return n ? n.toFixed(2) + '%' : '—'; }
function fd(d) { return d.toISOString().slice(0, 10); }
function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return fd(d); }
function hoy() { return fd(new Date()); }
 
function Dlt({ v }) {
  if (v == null) return null;
  return (
    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: v >= 0 ? '#E1F5EE' : '#FBEAEA', color: v >= 0 ? '#0F6E56' : '#A32D2D', marginLeft: 6 }}>
      {v >= 0 ? '↑' : '↓'}{Math.abs(v)}%
    </span>
  );
}
 
function KPI({ label, val, sub, delta, invertDelta }) {
  // invertDelta: true para métricas donde bajar es bueno (CPM, CPC, spend)
  const isGood = delta == null ? null : (invertDelta ? delta <= 0 : delta >= 0);
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.09)', borderRadius: 12, padding: '1rem 1.1rem', position: 'relative', overflow: 'hidden' }}>
      {delta != null && (
        <div style={{
          position: 'absolute', top: 0, right: 0, left: 0, height: 3,
          background: isGood ? '#1D9E75' : '#E53935', borderRadius: '12px 12px 0 0'
        }} />
      )}
      <div style={{ fontSize: 10, color: '#9c9a92', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>{val}</div>
      <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{sub}</span>
        {delta != null && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: isGood ? '#E1F5EE' : '#FBEAEA',
            color: isGood ? '#0F6E56' : '#C62828'
          }}>
            {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
 
function SparkCanvas({ data, color, type }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !window.Chart || !data?.length) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: type === 'line' ? 'line' : 'bar',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: type === 'line' ? color + '18' : color + '99',
          fill: type === 'line',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: type === 'line' ? 2 : 0,
          borderRadius: type === 'bar' ? 2 : 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, color, type]);
  return <div style={{ height: 48, marginTop: 10, position: 'relative' }}><canvas ref={canvasRef} /></div>;
}

function KpiCard({ id, label, val, sub, delta, invertDelta, color, defViz, dailyData, vizTypes, setViz, openMenu, setOpenMenu }) {
  const viz = vizTypes[id] || defViz;
  const good = delta == null ? null : (invertDelta ? delta <= 0 : delta >= 0);
  const isOpen = openMenu === id;
  const vizOptions = [
    { key: 'spark', icon: '〰', label: 'Línea' },
    { key: 'bars', icon: '▐', label: 'Barras' },
    ...(id === 'spend' ? [{ key: 'donut', icon: '◔', label: 'Donut' }] : []),
    { key: 'number', icon: '#', label: 'Solo número' },
  ];
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'visible' }}>
      <div style={{ height: 3, background: color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
      <button className="kpi-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(isOpen ? null : id); }}>···</button>
      <div className={'kpi-dropdown' + (isOpen ? ' open' : '')}>
        <div className="kpi-dd-title">Visualización</div>
        {vizOptions.map(o => (
          <div key={o.key} className={'kpi-dd-item' + (viz === o.key ? ' active' : '')} onClick={() => setViz(id, o.key)}>
            <span style={{ fontSize: 12, width: 16, textAlign: 'center', color: viz === o.key ? color : '#a1a1aa' }}>{o.icon}</span>
            {o.label}
          </div>
        ))}
      </div>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">{val}</div>
      <div className="kpi-sub">{sub}
        {delta != null && <span className={good ? 'kpi-badge-up' : 'kpi-badge-dn'}>{delta > 0 ? '↑' : '↓'}{Math.abs(delta)}%</span>}
      </div>
      {viz === 'spark' && dailyData?.length > 0 && <SparkCanvas data={dailyData} color={color} type="line" />}
      {viz === 'bars' && dailyData?.length > 0 && <SparkCanvas data={dailyData} color={color} type="bar" />}
      {viz === 'donut' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="20" fill="none" stroke="#f4f4f5" strokeWidth="6"/>
            <circle cx="26" cy="26" r="20" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray="100.5 125.6" transform="rotate(-90 26 26)" strokeLinecap="round"/>
            <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#18181b">80%</text>
          </svg>
          <div>
            <div style={{ fontSize: 10, color: '#a1a1aa', fontFamily: 'Inter, sans-serif' }}>del presupuesto</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#18181b' }}>{val} / $480K</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientePage() {
  const { slug } = useRouter().query;
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [df, setDf] = useState(ago(30));
  const [dt, setDt] = useState(hoy());
  const [md, setMd] = useState(null);
  const [fb, setFb] = useState(null);
  const [ig, setIg] = useState(null);
  const [ga4, setGa4] = useState(null);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [tab, setTab] = useState('resumen');
  const [metaLoading, setMetaLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
  const [vizTypes, setVizTypes] = useState({});
  useEffect(() => {
    try { setVizTypes(JSON.parse(localStorage.getItem('pintamkt_viz_' + window.location.pathname) || '{}')); } catch {}
  }, []);
  const [openMenu, setOpenMenu] = useState(null);

  const setViz = (metric, type) => {
    const next = { ...vizTypes, [metric]: type };
    setVizTypes(next);
    try { localStorage.setItem('pintamkt_viz_' + window.location.pathname, JSON.stringify(next)); } catch {}
    setOpenMenu(null);
  };
  const ref = useRef(null);
  const ci = useRef(null);
 
  // Cargar cliente desde Supabase — IDs vienen del row, no de dicts hardcodeados
  useEffect(() => {
    if (!slug) return;
    sb.from('clientes')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Supabase error:', error);
        setC(data);
        setLoading(false);
      });
  }, [slug]);
 
  // Cargar datos de APIs cuando el cliente ya está cargado
  useEffect(() => {
    if (!c) return;
    const mods = { ...DMODS, ...(c.modulos || {}) };
 
    // META ADS — usa c.meta_ad_account_id directo de Supabase
    if ((mods.meta_resumen || mods.meta_rendimiento || mods.meta_resultados || mods.meta_campanas) && c.meta_ad_account_id) {
      setMetaLoading(true);
      setMd(null);
      fetch(`/api/meta?account_id=${c.meta_ad_account_id}&since=${df}&until=${dt}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setMd(d); else console.error('Meta API error:', d.error); })
        .catch(e => console.error('Meta fetch error:', e))
        .finally(() => setMetaLoading(false));
    }
 
    // FACEBOOK ORGÁNICO — usa c.fb_page_id directo de Supabase
    if (mods.facebook_organico && c.fb_page_id) {
      setFbLoading(true);
      setFb(null);
      fetch(`/api/organic?page_id=${c.fb_page_id}&since=${df}&until=${dt}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setFb(d); else console.error('FB organic error:', d.error); })
        .catch(e => console.error('FB fetch error:', e))
        .finally(() => setFbLoading(false));
    }
 
    // GA4
    if (mods.ga4) {
      setGa4Loading(true);
      setGa4(null);
      fetch(`/api/ga4?slug=${c.slug}&since=${df}&until=${dt}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setGa4(d); else console.error('GA4 error:', d.error); })
        .catch(e => console.error('GA4 fetch error:', e))
        .finally(() => setGa4Loading(false));
    } 
    // INSTAGRAM ORGÁNICO — usa c.ig_account_id directo de Supabase
    if (mods.instagram_organico && c.ig_account_id) {
      setIgLoading(true);
      setIg(null);
      // IG insights: Meta limita a max 30 dias
      const igDiff = (new Date(dt) - new Date(df)) / (1000*60*60*24);
      const igSince = igDiff > 30 ? (() => { const d = new Date(dt); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })() : df;
      fetch(`/api/organic?ig_id=${c.ig_account_id}&since=${igSince}&until=${dt}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setIg(d); else console.error('IG organic error:', d.error); })
        .catch(e => console.error('IG fetch error:', e))
        .finally(() => setIgLoading(false));
    }
  }, [c, df, dt]);
 
  // Chart.js
  useEffect(() => {
    if (!md?.daily || !ref.current) return;
    const build = () => {
      if (!window.Chart || !ref.current) return;
      if (ci.current) ci.current.destroy();
      const rows = md.daily;
      const lbs = rows.map(d => d.date_start?.slice(5));
      const isResumen = tab === 'resumen';
      const ds = tab === 'rendimiento'
        ? [
            { label: 'CTR%', data: rows.map(d => parseFloat(d.ctr || 0)), borderColor: '#185FA5', backgroundColor: 'rgba(24,95,165,0.1)', fill: true, tension: 0.3, type: 'line', yAxisID: 'y' },
            { label: 'CPM', data: rows.map(d => parseFloat(d.cpm || 0)), backgroundColor: '#B5D4F4', borderRadius: 3, yAxisID: 'y2' }
          ]
        : isResumen
        ? [
            { label: 'Clics', data: rows.map(d => parseInt(d.clicks || 0)), borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.15)', fill: true, tension: 0.4, type: 'line', yAxisID: 'y', pointRadius: 0, borderWidth: 2 },
            { label: 'Gasto', data: rows.map(d => parseFloat(d.spend || 0)), borderColor: '#9FE1CB', backgroundColor: 'rgba(159,225,203,0.1)', fill: true, tension: 0.4, type: 'line', yAxisID: 'y2', pointRadius: 0, borderWidth: 1.5 }
          ]
        : [
            { label: 'Clics', data: rows.map(d => parseInt(d.clicks || 0)), backgroundColor: '#1D9E75', borderRadius: 3, yAxisID: 'y' },
            { label: 'Gasto', data: rows.map(d => parseFloat(d.spend || 0)), backgroundColor: '#9FE1CB', borderRadius: 3, yAxisID: 'y2' }
          ];
      ci.current = new window.Chart(ref.current, {
        type: 'bar',
        data: { labels: lbs, datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9 }, color: isResumen ? '#6b6a65' : '#888' },
              border: { color: isResumen ? '#333' : '#e0e0e0' }
            },
            y: {
              grid: { color: isResumen ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
              ticks: { font: { size: 9 }, color: isResumen ? '#6b6a65' : '#888' },
              border: { display: false }
            },
            y2: {
              position: 'right',
              grid: { display: false },
              ticks: { font: { size: 9 }, color: isResumen ? '#6b6a65' : '#888' },
              border: { display: false }
            }
          }
        }
      });
    };
    const s = document.getElementById('cjs');
    if (!s) {
      const el = document.createElement('script');
      el.id = 'cjs';
      el.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      el.onload = build;
      document.head.appendChild(el);
    } else if (window.Chart) {
      build();
    } else {
      s.addEventListener('load', build);
    }
  }, [md, tab]);
 
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9c9a92', fontFamily: '-apple-system,sans-serif', fontSize: 13 }}>
      Cargando...
    </div>
  );
  if (!c) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9c9a92', fontFamily: '-apple-system,sans-serif', fontSize: 13 }}>
      Cliente no encontrado.
    </div>
  );
 
  const mods = { ...DMODS, ...(c.modulos || {}) };
  const t = md?.totals || {};
  const dl = md?.deltas || {};
  const camps = md?.campaigns || [];
 
  // Tabs visibles según módulos del cliente
  const tabs = [];
  tabs.push({ k: 'resumen', l: 'Resumen' });
  if (mods.meta_resumen || mods.meta_rendimiento || mods.meta_resultados || mods.meta_campanas) tabs.push({ k: 'metaads', l: 'Meta Ads' });
  if (mods.facebook_organico && c.fb_page_id) tabs.push({ k: 'facebook', l: '📘 Facebook' });
  if (mods.instagram_organico && c.ig_account_id) tabs.push({ k: 'instagram', l: '📸 Instagram' });
  if (mods.ga4) tabs.push({ k: 'ga4', l: '📊 GA4' });
 
  // Asegurarse que el tab activo es válido
  const tabKeys = tabs.map(t => t.k);
  const activeTab = tabKeys.includes(tab) ? tab : (tabKeys[0] || 'resumen');
 
  const g4 = { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: '1rem' };
  const card = { background: '#fff', border: '.5px solid rgba(0,0,0,.09)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' };
 
  const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #e0e0e0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
      Cargando datos...
    </div>
  );
 
  return (
    <>
      <Head><title>{c.nombre} — Reporte pintamkt</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #f5f5f2; color: #18181b; font-size: 14px; }
        .kpi-lbl { font-family: 'Inter', sans-serif; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; font-weight: 600; margin-bottom: 5px; }
        .kpi-val { font-family: 'DM Sans', sans-serif; font-size: 28px; font-weight: 700; color: #18181b; letter-spacing: -.03em; line-height: 1; }
        .kpi-sub { font-family: 'Inter', sans-serif; font-size: 11px; color: #a1a1aa; margin-top: 5px; display: flex; align-items: center; gap: 6px; }
        .kpi-badge-up { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: #dcfce7; color: #15803d; font-family: 'Inter', sans-serif; }
        .kpi-badge-dn { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: #fee2e2; color: #dc2626; font-family: 'Inter', sans-serif; }
        .kpi-menu-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 20px; border: none; background: none; cursor: pointer; color: #d4d4d8; font-size: 13px; font-weight: 800; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; border-radius: 5px; padding: 0; transition: background .15s, color .15s; }
        .kpi-menu-btn:hover { background: #f4f4f5; color: #71717a; }
        .kpi-dropdown { display: none; position: absolute; top: 30px; right: 8px; background: #fff; border: .5px solid rgba(0,0,0,.1); border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.08); z-index: 200; min-width: 140px; overflow: hidden; }
        .kpi-dropdown.open { display: block; }
        .kpi-dd-title { font-size: 9px; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; padding: 8px 12px 4px; font-family: 'Inter', sans-serif; font-weight: 600; }
        .kpi-dd-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; font-size: 12px; color: #3f3f46; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background .1s; }
        .kpi-dd-item:hover { background: #f4f4f5; }
        .kpi-dd-item.active { color: #1D9E75; font-weight: 600; }
        .spark-wrap { height: 48px; margin-top: 10px; position: relative; }
        .bar-row { display: flex; gap: 2px; align-items: flex-end; height: 40px; margin-top: 10px; }
        .prog-track { height: 5px; background: #f4f4f5; border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
        .sect-hdr { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
        .sect-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .sect-title { font-size: 10px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; font-family: 'Inter', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .np { display: none !important }
          body { background: #fff }
          .print-header { display: flex !important }
          @page { margin: 1.5cm 2cm; }
        }
        .print-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0 0 16px 0;
          margin-bottom: 20px;
          border-bottom: 2px solid #1D9E75;
        }
        .print-header img { height: 36px; background: #000; border-radius: 6px; padding: 4px 8px; }
        .print-header-info { text-align: right; font-size: 11px; color: #9c9a92; }
        .print-header-info strong { display: block; font-size: 14px; color: #1a1a18; margin-bottom: 2px; }
      `}</style>
 
      {/* HEADER */}
      <div style={{ background: '#fff', borderBottom: '.5px solid rgba(0,0,0,.09)', padding: '0 2rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 600, color: '#1D9E75', fontSize: 13 }}>● pintamkt</div>
          <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,.09)' }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nombre}</div>
          <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f8f7f4', border: '.5px solid rgba(0,0,0,.09)', color: '#6b6a65' }}>{df} → {dt}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="np">
          <input type="date" value={df} onChange={e => setDf(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '.5px solid rgba(0,0,0,.15)', background: '#f8f7f4', color: '#1a1a18' }} />
          <span style={{ fontSize: 12, color: '#9c9a92' }}>→</span>
          <input type="date" value={dt} onChange={e => setDt(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '.5px solid rgba(0,0,0,.15)', background: '#f8f7f4', color: '#1a1a18' }} />
          {[7, 30, 90].map(n => (
            <button key={n} onClick={() => { setDf(ago(n)); setDt(hoy()); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '.5px solid rgba(0,0,0,.15)', background: '#f8f7f4', cursor: 'pointer' }}>{n}d</button>
          ))}
          <button onClick={() => window.print()} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>⬇ PDF</button>
        </div>
      </div>
 
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        {/* HEADER SOLO PARA PDF */}
        <div className="print-header">
          <img src="data:image/png;base64,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" alt="pintamkt" />
          <div className="print-header-info">
            <strong>{c.nombre}</strong>
            <span>Reporte de desempeño · {df} → {dt}</span>
          </div>
        </div>
 
        {/* HERO BANNER */}
        <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75)', borderRadius: 16, padding: '1.5rem 2rem', color: '#fff', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{c.nombre}</div>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>Período: {df} → {dt}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,.2)' }}>{tabs.length} módulos activos</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 6 }}>Reporte pintamkt</div>
          </div>
        </div>
 
        {/* TABS */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '.5px solid rgba(0,0,0,.09)', marginBottom: '1.5rem', overflowX: 'auto' }} className="np">
          {tabs.map(tb => (
            <div key={tb.k} onClick={() => setTab(tb.k)} style={{ fontSize: 13, padding: '8px 20px', cursor: 'pointer', color: activeTab === tb.k ? '#1D9E75' : '#6b6a65', borderBottom: activeTab === tb.k ? '2px solid #1D9E75' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', fontWeight: activeTab === tb.k ? 600 : 400 }}>
              {tb.l}
            </div>
          ))}
        </div>
 
        {/* TAB: RESUMEN */}
        {activeTab === 'resumen' && (() => {
          const dailyReach = md?.daily?.map(d => parseInt(d.reach || 0)) || [];
          const dailyClicks = md?.daily?.map(d => parseInt(d.clicks || 0)) || [];
          const dailySpend = md?.daily?.map(d => parseFloat(d.spend || 0)) || [];
          const dailyCtr = md?.daily?.map(d => parseFloat(d.ctr || 0)) || [];

          return metaLoading && !md ? <Spinner /> :
            !c.meta_ad_account_id ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin cuenta de Meta Ads configurada.</div>
            ) : (
              <div onClick={() => setOpenMenu(null)}>

                {/* SECTION HEADER META */}
                <div className="sect-hdr" style={{ marginBottom: 10 }}>
                  <div className="sect-dot" style={{ background: '#1D9E75' }} />
                  <span className="sect-title">Meta Ads</span>
                  {metaLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                </div>

                {/* KPI GRID 4 cols */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 10 }}>
                  {md ? <>
                    <KpiCard id="reach" label="Alcance" val={fmt(t.reach)} sub="personas" delta={dl.reach} invertDelta={false} color="#1D9E75" defViz="spark" dailyData={dailyReach} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                    <KpiCard id="clicks" label="Clics" val={fmt(t.clicks)} sub="en anuncios" delta={dl.clicks} invertDelta={false} color="#2563eb" defViz="bars" dailyData={dailyClicks} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                    <KpiCard id="spend" label="Gasto" val={fm(t.spend)} sub="total USD" delta={dl.spend} invertDelta={true} color="#f59e0b" defViz="donut" dailyData={dailySpend} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                    <KpiCard id="ctr" label="CTR" val={fp(t.ctr)} sub="click rate" delta={dl.ctr} invertDelta={false} color="#7c3aed" defViz="spark" dailyData={dailyCtr} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                  </> : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#9c9a92' }}>Sin datos para el período.</div>
                  )}
                </div>

                {/* SEGUNDA FILA: CPM CPC Frecuencia Impresiones */}
                {md && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 10 }}>
                    {[
                      { id: 'cpm', label: 'CPM', val: fm(t.cpm), sub: 'por mil imp.', delta: dl.cpm, inv: true, color: '#f59e0b' },
                      { id: 'cpc', label: 'CPC', val: fm(t.cpc), sub: 'por clic', delta: dl.cpc, inv: true, color: '#2563eb' },
                      { id: 'impressions', label: 'Impresiones', val: fmt(t.impressions), sub: 'total', delta: dl.impressions, inv: false, color: '#1D9E75' },
                      { id: 'frequency', label: 'Frecuencia', val: t.frequency ? t.frequency.toFixed(2) : '—', sub: 'veces/persona', delta: null, inv: false, color: '#a1a1aa' },
                    ].map(k => (
                      <div key={k.id} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '12px 14px', position: 'relative' }}>
                        <div style={{ height: 3, background: k.color + '55', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                        <div className="kpi-lbl">{k.label}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-.02em' }}>{k.val}</div>
                        <div className="kpi-sub">{k.sub}
                          {k.delta != null && (() => { const good = k.inv ? k.delta <= 0 : k.delta >= 0; return <span className={good ? 'kpi-badge-up' : 'kpi-badge-dn'}>{k.delta > 0 ? '↑' : '↓'}{Math.abs(k.delta)}%</span>; })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* IG + FB */}
                {(mods.instagram_organico || mods.facebook_organico) && (
                  <div style={{ display: 'grid', gridTemplateColumns: mods.instagram_organico && mods.facebook_organico ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>

                    {mods.instagram_organico && (
                      <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                        <div style={{ height: 3, background: '#e1306c', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                        <div className="sect-hdr">
                          <div className="sect-dot" style={{ background: '#e1306c' }} />
                          <span className="sect-title">Instagram Orgánico</span>
                          {igLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#e1306c', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                        </div>
                        {ig ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                              {[
                                { label: 'Seguidores', val: fmt(ig.totals?.followers_total) },
                                { label: 'Alcance', val: fmt(ig.totals?.reach) },
                                { label: 'Interacciones', val: fmt(ig.totals?.total_interactions) },
                                { label: 'Visitas perfil', val: fmt(ig.totals?.profile_views) },
                              ].map(k => (
                                <div key={k.label}>
                                  <div className="kpi-lbl">{k.label}</div>
                                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#18181b', letterSpacing: '-.01em' }}>{k.val || '—'}</div>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Distribución de interacciones</div>
                              <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: fmt(ig.totals?.likes) > 0 ? '55%' : '0', background: '#e1306c' }} />
                                <div style={{ width: fmt(ig.totals?.comments) > 0 ? '20%' : '0', background: '#f09433' }} />
                                <div style={{ width: fmt(ig.totals?.shares) > 0 ? '15%' : '0', background: '#cc2366' }} />
                                <div style={{ flex: 1, background: '#f4f4f5' }} />
                              </div>
                              <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#e1306c' }}>● Likes</span>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#f09433' }}>● Comentarios</span>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#cc2366' }}>● Shares</span>
                              </div>
                            </div>
                          </>
                        ) : igLoading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div>
                          : !c.ig_account_id ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin cuenta configurada</div>
                          : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos disponibles</div>}
                      </div>
                    )}

                    {mods.facebook_organico && (
                      <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                        <div style={{ height: 3, background: '#1877f2', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                        <div className="sect-hdr">
                          <div className="sect-dot" style={{ background: '#1877f2' }} />
                          <span className="sect-title">Facebook Orgánico</span>
                          {fbLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#1877f2', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                        </div>
                        {fb ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              { label: 'Fans', val: fmt(fb.page?.fan_count) },
                              { label: 'Seguidores', val: fmt(fb.page?.followers_count) },
                              { label: 'Hablando', val: fmt(fb.page?.talking_about_count) },
                              { label: 'Posts', val: String(fb.posts?.length || 0) },
                            ].map(k => (
                              <div key={k.label}>
                                <div className="kpi-lbl">{k.label}</div>
                                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-.02em' }}>{k.val || '—'}</div>
                              </div>
                            ))}
                          </div>
                        ) : fbLoading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div>
                          : !c.fb_page_id ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin página configurada</div>
                          : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos disponibles</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* PERÍODO ANTERIOR */}
                {md && (
                  <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a1a1aa' }}>Período anterior</span>
                    {[
                      ['Alcance', fmt(md.totalsPrev?.reach)],
                      ['Clics', fmt(md.totalsPrev?.clicks)],
                      ['Gasto', fm(md.totalsPrev?.spend)],
                      ['CPM', fm(md.totalsPrev?.cpm)],
                      ['CPC', fm(md.totalsPrev?.cpc)],
                      ['CTR', fp(md.totalsPrev?.ctr)],
                    ].map(([l, v]) => (
                      <span key={l} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#71717a' }}>
                        {l} <strong style={{ color: '#18181b', fontWeight: 600 }}>{v}</strong>
                      </span>
                    ))}
                  </div>
                )}

              </div>
            );
        })()}


                       {/* TAB: META ADS */}
        {activeTab === 'metaads' && (
          metaLoading ? <Spinner /> :
          !md ? <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>Sin datos disponibles.</div> :
          <>
            {/* SECCIÓN: RENDIMIENTO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Rendimiento</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Alcance', val: fmt(t.reach), sub: 'personas', delta: dl.reach, inv: false, color: '#1D9E75' },
                { label: 'Impresiones', val: fmt(t.impressions), sub: 'total', delta: dl.impressions, inv: false, color: '#2563eb' },
                { label: 'Clics', val: fmt(t.clicks), sub: 'en anuncios', delta: dl.clicks, inv: false, color: '#7c3aed' },
                { label: 'Gasto', val: fm(t.spend), sub: 'total USD', delta: dl.spend, inv: true, color: '#f59e0b' },
                { label: 'CTR', val: fp(t.ctr), sub: 'click-through rate', delta: dl.ctr, inv: false, color: '#7c3aed' },
                { label: 'CPM', val: fm(t.cpm), sub: 'costo por mil', delta: dl.cpm, inv: true, color: '#f59e0b' },
                { label: 'CPC', val: fm(t.cpc), sub: 'costo por clic', delta: dl.cpc, inv: true, color: '#2563eb' },
                { label: 'Frecuencia', val: t.frequency ? t.frequency.toFixed(2) : '—', sub: 'veces/persona', delta: null, inv: false, color: '#a1a1aa' },
              ].map(k => {
                const good = k.delta == null ? null : (k.inv ? k.delta <= 0 : k.delta >= 0);
                return (
                  <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                    <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                    <div className="kpi-lbl">{k.label}</div>
                    <div className="kpi-val">{k.val}</div>
                    <div className="kpi-sub">{k.sub}
                      {k.delta != null && <span className={good ? 'kpi-badge-up' : 'kpi-badge-dn'}>{k.delta > 0 ? '↑' : '↓'}{Math.abs(k.delta)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GRÁFICO DIARIO */}
            <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: 16 }}>
              <div className="kpi-lbl" style={{ marginBottom: 12 }}>Clics y Gasto diario</div>
              <div style={{ position: 'relative', height: 200 }}>
                <canvas ref={ref} role="img" aria-label="Meta Ads diario" />
              </div>
            </div>

            {/* SECCIÓN: RESULTADOS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Resultados · conversiones</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Mensajes', val: fmt(t.messages) || '0', sub: 'conversaciones', delta: dl.messages, inv: false, color: '#1D9E75' },
                { label: 'Leads', val: fmt(t.leads) || '0', sub: 'formularios', delta: dl.leads, inv: false, color: '#2563eb' },
                { label: 'Compras', val: fmt(t.purchases) || '0', sub: 'transacciones', delta: dl.purchases, inv: false, color: '#7c3aed' },
                { label: 'ROAS', val: t.roas ? t.roas.toFixed(2) + 'x' : '—', sub: 'retorno en ads', delta: null, inv: false, color: '#f59e0b' },
              ].map(k => {
                const good = k.delta == null ? null : (k.inv ? k.delta <= 0 : k.delta >= 0);
                return (
                  <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                    <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                    <div className="kpi-lbl">{k.label}</div>
                    <div className="kpi-val">{k.val}</div>
                    <div className="kpi-sub">{k.sub}
                      {k.delta != null && <span className={good ? 'kpi-badge-up' : 'kpi-badge-dn'}>{k.delta > 0 ? '↑' : '↓'}{Math.abs(k.delta)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECCIÓN: CAMPAÑAS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Campañas · {camps.length} en el período</span>
            </div>
            <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {camps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa', fontSize: 13 }}>Sin campañas en el período.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif' }}>
                  <thead>
                    <tr style={{ background: '#f9f9f8' }}>
                      {['Campaña', 'Impresiones', 'Clics', 'CTR', 'CPM', 'Gasto', 'Resultados'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', borderBottom: '.5px solid rgba(0,0,0,.08)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const maxSpend = Math.max(...camps.map(c => parseFloat(c.spend || 0)));
                      return camps.map((camp, i) => {
                        const res = (camp.actions || []).reduce((s, a) => s + parseInt(a.value || 0), 0);
                        const spendPct = maxSpend > 0 ? (parseFloat(camp.spend || 0) / maxSpend) * 100 : 0;
                        return (
                          <tr key={i} style={{ borderBottom: '.5px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp.campaign_name}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(camp.impressions || 0))}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(camp.clicks || 0))}</td>
                            <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 600, color: '#7c3aed', fontSize: 13 }}>{fp(parseFloat(camp.ctr || 0))}</span></td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fm(parseFloat(camp.cpm || 0))}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{fm(parseFloat(camp.spend || 0))}</div>
                              <div style={{ height: 3, background: '#f4f4f5', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: spendPct + '%', background: '#1D9E75', borderRadius: 2 }} />
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {res > 0 ? <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>{res}</span> : <span style={{ color: '#a1a1aa' }}>—</span>}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* PERÍODO ANTERIOR */}
            <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a1a1aa' }}>Período anterior</span>
              {[['Alcance', fmt(md.totalsPrev?.reach)], ['Clics', fmt(md.totalsPrev?.clicks)], ['Gasto', fm(md.totalsPrev?.spend)], ['CPM', fm(md.totalsPrev?.cpm)], ['CPC', fm(md.totalsPrev?.cpc)], ['CTR', fp(md.totalsPrev?.ctr)]].map(([l, v]) => (
                <span key={l} style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#71717a' }}>{l} <strong style={{ color: '#18181b', fontWeight: 600 }}>{v}</strong></span>
              ))}
            </div>
          </>
        )}

        {/* TAB: FACEBOOK */}
        {activeTab === 'facebook' && (
          fbLoading ? <Spinner /> :
          !fb ? <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>Sin datos disponibles.</div> :
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1877f2' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Facebook Orgánico</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Fans', val: fmt(fb.page?.fan_count), color: '#1877f2' },
                { label: 'Seguidores', val: fmt(fb.page?.followers_count), color: '#1877f2' },
                { label: 'Hablando de esto', val: fmt(fb.page?.talking_about_count), color: '#1877f2' },
                { label: 'Posts', val: String(fb.posts?.length || 0), color: '#1877f2' },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val">{k.val || '—'}</div>
                </div>
              ))}
            </div>
            {fb.posts?.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1877f2' }} />
                  <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Posts · {fb.posts.length} en el período</span>
                </div>
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#f9f9f8' }}>
                        {['Post', 'Likes', 'Comentarios', 'Compartidos', 'Fecha'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', borderBottom: '.5px solid rgba(0,0,0,.08)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fb.posts.map((post, i) => (
                        <tr key={i} style={{ borderBottom: '.5px solid rgba(0,0,0,.06)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.message || '(sin texto)'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{post.likes || 0}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{post.comments || 0}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{post.shares || 0}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#a1a1aa' }}>{post.created_time ? new Date(post.created_time).toLocaleDateString('es-AR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* TAB: INSTAGRAM */}
        {activeTab === 'instagram' && (
          igLoading ? <Spinner /> :
          !ig ? <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>Sin datos disponibles.</div> :
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e1306c' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Instagram Orgánico</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Seguidores', val: fmt(ig.totals?.followers_total), color: '#e1306c' },
                { label: 'Alcance', val: fmt(ig.totals?.reach), color: '#e1306c' },
                { label: 'Interacciones', val: fmt(ig.totals?.total_interactions), color: '#f09433' },
                { label: 'Visitas perfil', val: fmt(ig.totals?.profile_views), color: '#cc2366' },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val">{k.val || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Likes', val: fmt(ig.totals?.likes), color: '#e1306c' },
                { label: 'Comentarios', val: fmt(ig.totals?.comments), color: '#f09433' },
                { label: 'Shares', val: fmt(ig.totals?.shares), color: '#cc2366' },
                { label: 'Saves', val: fmt(ig.totals?.saved), color: '#833ab4' },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val">{k.val || '—'}</div>
                </div>
              ))}
            </div>
            {ig.posts?.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e1306c' }} />
                  <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Posts · {ig.posts.length} publicaciones</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                  {ig.posts.slice(0,12).map((post, i) => (
                    <div key={i} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden' }}>
                      {post.thumbnail_url || post.media_url ? (
                        <img src={post.thumbnail_url || post.media_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📸</div>
                      )}
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, color: '#3f3f46', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.caption || '(sin caption)'}</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#e1306c' }}>♥ {post.like_count || 0}</span>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#a1a1aa' }}>💬 {post.comments_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* TAB: GA4 */}
        {activeTab === 'ga4' && (
          ga4Loading ? <Spinner /> :
          !ga4 ? <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>Sin datos de GA4 disponibles.</div> :
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4285f4' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>Google Analytics 4</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Sesiones', val: fmt(ga4.totals?.sessions), sub: 'total', color: '#4285f4' },
                { label: 'Usuarios', val: fmt(ga4.totals?.users), sub: 'únicos', color: '#34a853' },
                { label: 'Nuevos usuarios', val: fmt(ga4.totals?.newUsers), sub: 'primera visita', color: '#fbbc04' },
                { label: 'Páginas vistas', val: fmt(ga4.totals?.pageviews), sub: 'total', color: '#ea4335' },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val">{k.val || '—'}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Tasa de rebote', val: ga4.totals?.bounceRate ? (ga4.totals.bounceRate * 100).toFixed(1) + '%' : '—', sub: 'bounce rate', color: '#4285f4' },
                { label: 'Duración media', val: ga4.totals?.avgSession ? Math.floor(ga4.totals.avgSession / 60) + 'm ' + Math.floor(ga4.totals.avgSession % 60) + 's' : '—', sub: 'por sesión', color: '#34a853' },
                { label: 'Conversiones', val: fmt(ga4.totals?.conversions), sub: 'total', color: '#ea4335' },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ height: 3, background: k.color, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val">{k.val || '—'}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Fuentes de tráfico + Top páginas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {ga4.sources?.length > 0 && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px' }}>
                  <div className="kpi-lbl" style={{ marginBottom: 12 }}>Fuentes de tráfico</div>
                  {(() => {
                    const total = ga4.sources.reduce((s, x) => s + x.sessions, 0);
                    const colors = ['#4285f4','#34a853','#fbbc04','#ea4335','#9c27b0','#ff6d00'];
                    return ga4.sources.map((s, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: '#3f3f46' }}>{s.channel}</span>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 600, color: '#18181b' }}>{fmt(s.sessions)}</span>
                        </div>
                        <div style={{ height: 4, background: '#f4f4f5', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: (s.sessions / total * 100) + '%', background: colors[i % colors.length], borderRadius: 2 }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
              {ga4.topPages?.length > 0 && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px' }}>
                  <div className="kpi-lbl" style={{ marginBottom: 12 }}>Páginas más vistas</div>
                  {ga4.topPages.slice(0, 8).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < ga4.topPages.length - 1 ? '.5px solid rgba(0,0,0,.05)' : 'none' }}>
                      <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#3f3f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.path}</span>
                      <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, fontWeight: 600, color: '#4285f4', flexShrink: 0 }}>{fmt(p.pageviews)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '2rem', fontSize: 11, color: '#9c9a92', borderTop: '.5px solid rgba(0,0,0,.09)', marginTop: '2rem' }}>
          Reporte generado por <strong>pintamkt</strong> · {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}
 
