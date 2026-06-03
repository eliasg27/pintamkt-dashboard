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
 
export default function ClientePage() {
  const { slug } = useRouter().query;
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [df, setDf] = useState(ago(30));
  const [dt, setDt] = useState(hoy());
  const [md, setMd] = useState(null);
  const [fb, setFb] = useState(null);
  const [ig, setIg] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [metaLoading, setMetaLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
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
      const ds = tab === 'rendimiento'
        ? [
            { label: 'CTR%', data: rows.map(d => parseFloat(d.ctr || 0)), borderColor: '#185FA5', backgroundColor: 'rgba(24,95,165,0.1)', fill: true, tension: 0.3, type: 'line', yAxisID: 'y' },
            { label: 'CPM', data: rows.map(d => parseFloat(d.cpm || 0)), backgroundColor: '#B5D4F4', borderRadius: 3, yAxisID: 'y2' }
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
          plugins: { legend: { display: true, labels: { font: { size: 10 }, boxWidth: 10 } } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: { ticks: { font: { size: 9 } } },
            y2: { position: 'right', grid: { display: false }, ticks: { font: { size: 9 } } }
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
  if (mods.meta_resumen) tabs.push({ k: 'resumen', l: 'Resumen' });
  if (mods.meta_rendimiento) tabs.push({ k: 'rendimiento', l: 'Rendimiento' });
  if (mods.meta_resultados) tabs.push({ k: 'resultados', l: 'Resultados' });
  if (mods.meta_campanas) tabs.push({ k: 'campanas', l: 'Campañas' });
  if (mods.facebook_organico) tabs.push({ k: 'facebook', l: '📘 Facebook' });
  if (mods.instagram_organico) tabs.push({ k: 'instagram', l: '📸 Instagram' });
 
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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #f8f7f4; color: #1a1a18; font-size: 14px; }
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
        {activeTab === 'resumen' && (
          metaLoading ? <Spinner /> :
          !c.meta_ad_account_id ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin cuenta de Meta Ads configurada para este cliente.</div>
          ) : !md ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin datos disponibles para el período seleccionado.</div>
          ) : <>
            <div style={g4}>
              <KPI label="Alcance" val={fmt(t.reach)} sub="personas" delta={dl.reach} />
              <KPI label="Impresiones" val={fmt(t.impressions)} sub="total" delta={dl.impressions} />
              <KPI label="Clics" val={fmt(t.clicks)} sub="en anuncios" delta={dl.clicks} />
              <KPI label="Gasto" val={fm(t.spend)} sub="total" delta={dl.spend} invertDelta />
            </div>
            <div style={g4}>
              <KPI label="CPM" val={fm(t.cpm)} sub="por mil imp." delta={dl.cpm} invertDelta />
              <KPI label="CPC" val={fm(t.cpc)} sub="por clic" delta={dl.cpc} invertDelta />
              <KPI label="CTR" val={fp(t.ctr)} sub="click rate" delta={dl.ctr} />
              <KPI label="Frecuencia" val={t.frequency ? t.frequency.toFixed(2) : '—'} sub="veces/persona" />
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Clics y Gasto diario</div>
              <div style={{ position: 'relative', height: 200 }}>
                <canvas ref={ref} role="img" aria-label="Meta Ads diario" />
              </div>
            </div>
          </>
        )}
 
        {/* TAB: RENDIMIENTO */}
        {activeTab === 'rendimiento' && (
          metaLoading ? <Spinner /> :
          !md ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin datos disponibles.</div>
          ) : <>
            <div style={g4}>
              <KPI label="CTR" val={fp(t.ctr)} sub="click-through rate" delta={dl.ctr} />
              <KPI label="CPM" val={fm(t.cpm)} sub="costo por mil" delta={dl.cpm} invertDelta />
              <KPI label="CPC" val={fm(t.cpc)} sub="costo por clic" delta={dl.cpc} invertDelta />
              <KPI label="Frecuencia" val={t.frequency ? t.frequency.toFixed(2) : '—'} sub="veces/persona" />
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>CTR y CPM diario</div>
              <div style={{ position: 'relative', height: 200 }}>
                <canvas ref={ref} role="img" aria-label="Rendimiento" />
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8f7f4', borderRadius: 10, fontSize: 12, color: '#6b6a65', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#9c9a92', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>Período anterior</span>
              <span>CPM {fm(md.totalsPrev?.cpm)}</span>
              <span>CPC {fm(md.totalsPrev?.cpc)}</span>
              <span>CTR {fp(md.totalsPrev?.ctr)}</span>
              <span>Alcance {fmt(md.totalsPrev?.reach)}</span>
              <span>Clics {fmt(md.totalsPrev?.clicks)}</span>
              <span>Gasto {fm(md.totalsPrev?.spend)}</span>
            </div>
          </>
        )}
 
        {/* TAB: RESULTADOS */}
        {activeTab === 'resultados' && (
          metaLoading ? <Spinner /> :
          !md ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin datos disponibles.</div>
          ) : (
            <div style={g4}>
              <KPI label="Mensajes" val={fmt(t.messages) || '0'} sub="conversaciones" delta={dl.messages} />
              <KPI label="Leads" val={fmt(t.leads) || '0'} sub="formularios" delta={dl.leads} />
              <KPI label="Compras" val={fmt(t.purchases) || '0'} sub="transacciones" delta={dl.purchases} />
              <KPI label="ROAS" val={t.roas ? t.roas.toFixed(2) + 'x' : '—'} sub="retorno en ads" />
            </div>
          )
        )}
 
        {/* TAB: CAMPAÑAS */}
        {activeTab === 'campanas' && (
          metaLoading ? <Spinner /> :
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Campañas · {camps.length} activas
            </div>
            {camps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9c9a92', fontSize: 13 }}>Sin campañas en el período.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Campaña', 'Imp.', 'Clics', 'CTR', 'CPM', 'Gasto', 'Result.'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: '#9c9a92', borderBottom: '.5px solid rgba(0,0,0,.09)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {camps.map((camp, i) => {
                      const res = (camp.actions || []).reduce((s, a) => s + parseInt(a.value || 0), 0);
                      return (
                        <tr key={i}>
                          <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '.5px solid rgba(0,0,0,.09)' }}>{camp.campaign_name}</td>
                          {[fmt(parseInt(camp.impressions || 0)), fmt(parseInt(camp.clicks || 0)), fp(parseFloat(camp.ctr || 0)), fm(parseFloat(camp.cpm || 0))].map((v, j) => (
                            <td key={j} style={{ padding: '10px 12px', borderBottom: '.5px solid rgba(0,0,0,.09)' }}>{v}</td>
                          ))}
                          <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '.5px solid rgba(0,0,0,.09)' }}>{fm(parseFloat(camp.spend || 0))}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '.5px solid rgba(0,0,0,.09)' }}>
                            {res > 0 ? <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E1F5EE', color: '#0F6E56', fontWeight: 600 }}>{res}</span> : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
 
        {/* TAB: FACEBOOK ORGÁNICO */}
        {activeTab === 'facebook' && (
          fbLoading ? <Spinner /> :
          !c.fb_page_id ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin Page ID de Facebook configurado para este cliente.</div>
          ) : !fb ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin datos de Facebook orgánico.</div>
          ) : <>
            {/* Header de página */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#fff', borderRadius: 12, border: '.5px solid rgba(0,0,0,.09)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>📘</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{fb.page?.name}</div>
                <div style={{ fontSize: 12, color: '#9c9a92' }}>{fmt(fb.page?.fan_count)} seguidores · {fb.page?.talking_about_count || 0} hablando de esto</div>
              </div>
            </div>
            {/* KPIs */}
            <div style={g4}>
              <KPI label="Fans" val={fmt(fb.page?.fan_count)} sub="total" />
              <KPI label="Seguidores" val={fmt(fb.page?.followers_count)} sub="total" />
              <KPI label="Hablando" val={fmt(fb.page?.talking_about_count)} sub="esta semana" />
              <KPI label="Interacciones" val={fmt(fb.totals?.page_total_actions) || '—'} sub="período" />
            </div>
            {/* Posts recientes */}
            {fb.posts?.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Posts recientes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                {fb.posts.slice(0, 9).map((p, i) => (
                  <div key={i} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.09)', borderRadius: 10, overflow: 'hidden' }}>
                    {p.full_picture && <img src={p.full_picture} style={{ width: '100%', height: 110, objectFit: 'cover' }} alt="post" onError={e => { e.target.style.display = 'none'; }} />}
                    <div style={{ padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#9c9a92', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.message?.slice(0, 60) || '(sin texto)'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, color: '#9c9a92' }}>
                        <span>❤️ {p.likes?.summary?.total_count || 0}</span>
                        <span>💬 {p.comments?.summary?.total_count || 0}</span>
                        <span>🔁 {p.shares?.count || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>}
            {!fb.posts?.length && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9c9a92', fontSize: 12, background: '#fff', borderRadius: 10, border: '.5px solid rgba(0,0,0,.09)' }}>
                Sin posts en el período seleccionado
              </div>
            )}
          </>
        )}
 
        {/* TAB: INSTAGRAM ORGÁNICO */}
        {activeTab === 'instagram' && (
          igLoading ? <Spinner /> :
          !c.ig_account_id ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin cuenta de Instagram configurada para este cliente.</div>
          ) : !ig ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>Sin datos de Instagram.</div>
          ) : <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#fff', borderRadius: 12, border: '.5px solid rgba(0,0,0,.09)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>📸</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>@{ig.account?.username || ig.account?.name}</div>
                <div style={{ fontSize: 12, color: '#9c9a92' }}>{fmt(ig.totals?.followers_total)} seguidores</div>
              </div>
            </div>
            <div style={g4}>
              <KPI label="Seguidores" val={fmt(ig.totals?.followers_total)} sub="total" />
              <KPI label="Alcance" val={fmt(ig.totals?.reach)} sub="período" />
              <KPI label="Impresiones" val={fmt(ig.totals?.impressions)} sub="total" />
              <KPI label="Visitas perfil" val={fmt(ig.totals?.profile_views)} sub="período" />
            </div>
            {ig.posts?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                {ig.posts.slice(0, 9).map((p, i) => {
                  const ins = p.insights?.data || [];
                  const gm = name => { const m = ins.find(x => x.name === name); return m?.values?.[0]?.value || 0; };
                  return (
                    <div key={i} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.09)', borderRadius: 10, overflow: 'hidden' }}>
                      {(p.media_url || p.thumbnail_url) && (
                        <img src={p.thumbnail_url || p.media_url} style={{ width: '100%', height: 110, objectFit: 'cover', background: '#f8f7f4' }} alt="post" onError={e => { e.target.style.display = 'none'; }} />
                      )}
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#9c9a92', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption?.slice(0, 50) || '(sin caption)'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, color: '#9c9a92' }}>
                          <span>❤️ {fmt(gm('likes'))}</span>
                          <span>💬 {fmt(gm('comments'))}</span>
                          <span>👁 {fmt(gm('reach'))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
 
