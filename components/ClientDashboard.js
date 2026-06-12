import { useEffect, useState, useRef } from 'react';

const DMODS = {
  meta_resumen: true, meta_rendimiento: true, meta_resultados: true, meta_campanas: true,
  facebook_organico: false, instagram_organico: false, woocommerce: false, bot: false,
};

function fmt(n) { if (!n && n !== 0) return '—'; if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return Math.round(n).toString(); }
function fm(n) { return n ? '$' + fmt(n) : '—'; }
function fp(n) { return n ? n.toFixed(2) + '%' : '—'; }

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
      <div className={'kpi-dropdown' + (isOpen ? ' open' : '')} onClick={e => e.stopPropagation()}>
        <div className="kpi-dd-title">Visualización</div>
        {vizOptions.map(o => (
          <div key={o.key} className={'kpi-dd-item' + (viz === o.key ? ' active' : '')} onClick={e => { e.stopPropagation(); setViz(id, o.key); setOpenMenu(null); }}>
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


export default function ClientDashboard({ client: c, dateFrom: df, dateTo: dt }) {
  const [md, setMd] = useState(null);
  const [fb, setFb] = useState(null);
  const [ig, setIg] = useState(null);
  const [ga4, setGa4] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [woo, setWoo] = useState(null);
  const [wooLoading, setWooLoading] = useState(false);
  const [botData, setBotData] = useState([]);
  const [botLoading, setBotLoading] = useState(false);
  const [showBotForm, setShowBotForm] = useState(false);
  const [botForm, setBotForm] = useState({ period: '', consultas: '', tx: '', contactos: '', facturacion: '' });
  const [tab, setTab] = useState('resumen');
  const [drillCampaign, setDrillCampaign] = useState(null); // { id, name }
  const [drillAdset, setDrillAdset] = useState(null); // { id, name }
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [vizTypes, setVizTypes] = useState({});
  const [openMenu, setOpenMenu] = useState(null);
  const ref = useRef(null);
  const ci = useRef(null);

  const setViz = (metric, type) => { setVizTypes(p => { const n = {...p, [metric]: type}; try { localStorage.setItem('pv_'+c?.slug, JSON.stringify(n)); } catch {} return n; }); };

  useEffect(() => {
    console.log('[DEBUG] effect fired', { c: c?.id, df, dt, mods: c?.modulos });
    if (!c) return;
    const mods = { ...DMODS, ...(c.modulos || {}) };
    if ((mods.meta_resumen || mods.meta_rendimiento || mods.meta_resultados || mods.meta_campanas) && c.meta_ad_account_id) {
      setMetaLoading(true); setMd(null);
      fetch(`/api/meta?account_id=${c.meta_ad_account_id}&since=${df}&until=${dt}`)
        .then(r => r.json()).then(d => { if (!d.error) setMd(d); }).catch(()=>{}).finally(() => setMetaLoading(false));
    }
    if (mods.facebook_organico && c.fb_page_id) {
      setFbLoading(true); setFb(null);
      fetch(`/api/organic?page_id=${c.fb_page_id}&since=${df}&until=${dt}`)
        .then(r => r.json()).then(d => { if (!d.error) setFb(d); }).catch(()=>{}).finally(() => setFbLoading(false));
    }
    if (mods.instagram_organico && c.ig_account_id) {
      setIgLoading(true); setIg(null);
      const igDiff = (new Date(dt) - new Date(df)) / (1000*60*60*24);
      const igSince = igDiff > 30 ? (() => { const d = new Date(dt); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })() : df;
      // Fetch current + prev period in parallel
      const prevUntil = new Date(igSince); prevUntil.setDate(prevUntil.getDate()-1);
      const prevSince = new Date(prevUntil); prevSince.setDate(prevSince.getDate()-30);
      Promise.all([
        fetch(`/api/organic?ig_id=${c.ig_account_id}&since=${igSince}&until=${dt}`).then(r=>r.json()),
        fetch(`/api/organic?ig_id=${c.ig_account_id}&since=${prevSince.toISOString().slice(0,10)}&until=${prevUntil.toISOString().slice(0,10)}`).then(r=>r.json()),
      ]).then(([cur, prev]) => {
        if (!cur.error) {
          const delta = (a, b) => b > 0 ? Math.round(((a-b)/b)*100) : null;
          cur.deltas = {
            reach: delta(cur.totals?.reach, prev.totals?.reach),
            total_interactions: delta(cur.totals?.total_interactions, prev.totals?.total_interactions),
            profile_views: delta(cur.totals?.profile_views, prev.totals?.profile_views),
            likes: delta(cur.totals?.likes, prev.totals?.likes),
            comments: delta(cur.totals?.comments, prev.totals?.comments),
          };
          setIg(cur);
        }
      }).catch(()=>{}).finally(() => setIgLoading(false));
    }
    if (mods.ga4) {
      setGa4Loading(true); setGa4(null);
      fetch(`/api/ga4?slug=${c.slug}&since=${df}&until=${dt}`)
        .then(r => r.json()).then(d => { if (!d.error) setGa4(d); }).catch(()=>{}).finally(() => setGa4Loading(false));
    }
    if (mods.woocommerce) {
      setWooLoading(true); setWoo(null);
      fetch(`/api/woocommerce?slug=${c.slug}&since=${df}&until=${dt}`)
        .then(r => r.json()).then(d => { if (!d.error) setWoo(d); }).catch(()=>{}).finally(() => setWooLoading(false));
    }
    if (mods.bot) {
      setBotLoading(true);
      fetch(`/api/manual-data?slug=${c.slug}&type=bot`)
        .then(r => r.json()).then(d => { if (d.rows) setBotData(d.rows); })
        .catch(() => {}).finally(() => setBotLoading(false));
    }
    setTab('resumen');
  }, [c?.id, df, dt, JSON.stringify(c?.modulos)]);

  useEffect(() => {
    if (!md?.daily || !ref.current) return;
    const build = () => {
      if (!window.Chart || !ref.current) return;
      if (ci.current) ci.current.destroy();
      const rows = md.daily;
      const lbs = rows.map(d => d.date_start?.slice(5));
      const ds = tab === 'rendimiento'
        ? [{ label:'CTR%', data:rows.map(d=>parseFloat(d.ctr||0)), borderColor:'#185FA5', backgroundColor:'rgba(24,95,165,0.1)', fill:true, tension:0.3, type:'line', yAxisID:'y' },
           { label:'CPM', data:rows.map(d=>parseFloat(d.cpm||0)), backgroundColor:'#B5D4F4', borderRadius:3, yAxisID:'y2' }]
        : [{ label:'Clics', data:rows.map(d=>parseInt(d.clicks||0)), borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.15)', fill:true, tension:0.4, type:'line', yAxisID:'y', pointRadius:0, borderWidth:2 },
           { label:'Gasto', data:rows.map(d=>parseFloat(d.spend||0)), borderColor:'#9FE1CB', backgroundColor:'rgba(159,225,203,0.1)', fill:true, tension:0.4, type:'line', yAxisID:'y2', pointRadius:0, borderWidth:1.5 }];
      ci.current = new window.Chart(ref.current, {
        type:'bar', data:{ labels:lbs, datasets:ds },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} },
          scales:{ x:{grid:{display:false}, ticks:{font:{size:9}}, border:{color:'#e0e0e0'}},
            y:{grid:{color:'rgba(0,0,0,0.06)'}, ticks:{font:{size:9}}, border:{display:false}},
            y2:{position:'right', grid:{display:false}, ticks:{font:{size:9}}, border:{display:false}} } }
      });
    };
    const s = document.getElementById('cjs');
    if (!s) { const el=document.createElement('script'); el.id='cjs'; el.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'; el.onload=build; document.head.appendChild(el); }
    else if (window.Chart) build();
    else s.addEventListener('load', build);
  }, [md, tab]);

  if (!c) return null;

  const mods = { ...DMODS, ...(c.modulos || {}) };
  const t = md?.totals || {};
  const dl = md?.deltas || {};
  const camps = md?.campaigns || [];

  const tabs = [];
  tabs.push({ k: 'resumen', l: 'Resumen' });
  if (mods.meta_resumen || mods.meta_rendimiento || mods.meta_resultados || mods.meta_campanas) tabs.push({ k: 'metaads', l: 'Meta Ads' });
  if (mods.facebook_organico && c.fb_page_id) tabs.push({ k: 'facebook', l: '📘 Facebook' });
  if (mods.instagram_organico && c.ig_account_id) tabs.push({ k: 'instagram', l: '📸 Instagram' });
  if (mods.ga4) tabs.push({ k: 'ga4', l: '📊 GA4' });
  if (mods.woocommerce) tabs.push({ k: 'woocommerce', l: '🛒 WooCommerce' });
  if (mods.bot) tabs.push({ k: 'bot', l: '🤖 Bot' });

  const tabKeys = tabs.map(t => t.k);
  const activeTab = tabKeys.includes(tab) ? tab : (tabKeys[0] || 'resumen');

  const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #e0e0e0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
      Cargando datos...
    </div>
  );

  return (
    <div onClick={() => setOpenMenu(null)} style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: '#f5f5f2', minHeight: '100%', padding: '1.5rem' }}>
      <style>{`
        .kpi-lbl { font-family: 'Inter', sans-serif; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; font-weight: 600; margin-bottom: 5px; }
        .kpi-val { font-family: 'DM Sans', sans-serif; font-size: 28px; font-weight: 700; color: #18181b; letter-spacing: -.03em; line-height: 1; }
        .kpi-sub { font-family: 'Inter', sans-serif; font-size: 11px; color: #a1a1aa; margin-top: 5px; display: flex; align-items: center; gap: 6px; }
        .kpi-badge-up { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: #dcfce7; color: #15803d; }
        .kpi-badge-dn { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: #fee2e2; color: #dc2626; }
        .kpi-menu-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 20px; border: none; background: none; cursor: pointer; color: #d4d4d8; font-size: 13px; font-weight: 800; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; border-radius: 5px; padding: 0; transition: background .15s, color .15s; }
        .kpi-menu-btn:hover { background: #f4f4f5; color: #71717a; }
        .kpi-dropdown { display: none; position: absolute; top: 30px; right: 8px; background: #fff; border: .5px solid rgba(0,0,0,.1); border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.08); z-index: 200; min-width: 140px; overflow: hidden; }
        .kpi-dropdown.open { display: block; }
        .kpi-dd-title { font-size: 9px; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; padding: 8px 12px 4px; font-family: 'Inter', sans-serif; font-weight: 600; }
        .kpi-dd-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; font-size: 12px; color: #3f3f46; cursor: pointer; transition: background .1s; }
        .kpi-dd-item:hover { background: #f4f4f5; }
        .kpi-dd-item.active { color: #1D9E75; font-weight: 600; }
        .sect-hdr { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
        .sect-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .sect-title { font-size: 10px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; font-family: 'Inter', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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
            <div onClick={() => setOpenMenu(null)}>

              {/* META ADS */}
              {(mods.meta_resumen || mods.meta_rendimiento || mods.meta_resultados || mods.meta_campanas) && c.meta_ad_account_id && (
                <div style={{ marginBottom: 16 }}>
                  <div className="sect-hdr" style={{ marginBottom: 10 }}>
                    <div className="sect-dot" style={{ background: '#1D9E75' }} />
                    <span className="sect-title">Meta Ads</span>
                    {metaLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                  </div>
                  {metaLoading && !md ? <Spinner /> : md ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 10 }}>
                        <KpiCard id="reach" label="Alcance" val={fmt(t.reach)} sub="personas" delta={dl.reach} invertDelta={false} color="#1D9E75" defViz="spark" dailyData={md.daily?.map(d=>parseInt(d.reach||0))||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                        <KpiCard id="clicks" label="Clics" val={fmt(t.clicks)} sub="en anuncios" delta={dl.clicks} invertDelta={false} color="#2563eb" defViz="bars" dailyData={md.daily?.map(d=>parseInt(d.clicks||0))||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                        <KpiCard id="spend" label="Gasto" val={fm(t.spend)} sub="total USD" delta={dl.spend} invertDelta={true} color="#f59e0b" defViz="donut" dailyData={md.daily?.map(d=>parseFloat(d.spend||0))||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                        <KpiCard id="ctr" label="CTR" val={fp(t.ctr)} sub="click rate" delta={dl.ctr} invertDelta={false} color="#7c3aed" defViz="spark" dailyData={md.daily?.map(d=>parseFloat(d.ctr||0))||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                      </div>
                      <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 10, padding: '8px 14px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a1a1aa' }}>Período anterior</span>
                        {[['Alcance', fmt(md.totalsPrev?.reach)],['Clics', fmt(md.totalsPrev?.clicks)],['Gasto', fm(md.totalsPrev?.spend)],['CPM', fm(md.totalsPrev?.cpm)],['CTR', fp(md.totalsPrev?.ctr)]].map(([l,v]) => (
                          <span key={l} style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#71717a' }}>{l} <strong style={{ color: '#18181b', fontWeight: 600 }}>{v}</strong></span>
                        ))}
                      </div>
                    </>
                  ) : <div style={{ fontSize: 12, color: '#a1a1aa', padding: '1rem' }}>Sin datos para el período.</div>}
                </div>
              )}

              {/* INSTAGRAM + FACEBOOK en fila */}
              {(mods.instagram_organico || mods.facebook_organico) && (
                <div style={{ display: 'grid', gridTemplateColumns: mods.instagram_organico && mods.facebook_organico ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 16 }}>
                  {mods.instagram_organico && c.ig_account_id && (
                    <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                      <div style={{ height: 3, background: '#e1306c', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div className="sect-hdr">
                        <div className="sect-dot" style={{ background: '#e1306c' }} />
                        <span className="sect-title">Instagram Orgánico</span>
                        {igLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#e1306c', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                      </div>
                      {ig ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                          {[['Seguidores', (() => { const nf = ig.totals?.net_followers ?? ig.totals?.follows_and_unfollows; return (nf === null || nf === undefined) ? '—' : (nf >= 0 ? '+'+fmt(nf) : fmt(nf)); })()],['Alcance', fmt(ig.totals?.reach)],['Interacciones', fmt(ig.totals?.total_interactions)],['Visitas perfil', fmt(ig.totals?.profile_views)]].map(([l,v]) => (
                            <div key={l}><div className="kpi-lbl">{l}</div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 18, fontWeight: 700, color: '#18181b' }}>{v||'—'}</div></div>
                          ))}
                        </div>
                      ) : igLoading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div> : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos</div>}
                    </div>
                  )}
                  {mods.facebook_organico && c.fb_page_id && (
                    <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                      <div style={{ height: 3, background: '#1877f2', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div className="sect-hdr">
                        <div className="sect-dot" style={{ background: '#1877f2' }} />
                        <span className="sect-title">Facebook Orgánico</span>
                        {fbLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#1877f2', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                      </div>
                      {fb ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[['Fans', fmt(fb.page?.fan_count)],['Seguidores', fmt(fb.page?.followers_count)],['Hablando', fmt(fb.page?.talking_about_count)],['Posts', String(fb.posts?.length||0)]].map(([l,v]) => (
                            <div key={l}><div className="kpi-lbl">{l}</div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 20, fontWeight: 700, color: '#18181b' }}>{v||'—'}</div></div>
                          ))}
                        </div>
                      ) : fbLoading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div> : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos</div>}
                    </div>
                  )}
                </div>
              )}

              {/* GA4 */}
              {mods.ga4 && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, position: 'relative' }}>
                  <div style={{ height: 3, background: '#4285f4', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="sect-hdr">
                    <div className="sect-dot" style={{ background: '#4285f4' }} />
                    <span className="sect-title">Google Analytics 4</span>
                    {ga4Loading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                  </div>
                  {ga4 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                      {[['Sesiones', fmt(ga4.totals?.sessions),'#4285f4'],['Usuarios', fmt(ga4.totals?.users),'#34a853'],['Páginas vistas', fmt(ga4.totals?.pageviews),'#ea4335'],['Rebote', ga4.totals?.bounceRate ? (ga4.totals.bounceRate*100).toFixed(1)+'%' : '—','#fbbc04']].map(([l,v,c]) => (
                        <div key={l}><div className="kpi-lbl">{l}</div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 20, fontWeight: 700, color: '#18181b' }}>{v||'—'}</div></div>
                      ))}
                    </div>
                  ) : ga4Loading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div> : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos</div>}
                </div>
              )}

              {/* WOOCOMMERCE */}
              {mods.woocommerce && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, position: 'relative' }}>
                  <div style={{ height: 3, background: '#7f54b3', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div className="sect-hdr">
                    <div className="sect-dot" style={{ background: '#7f54b3' }} />
                    <span className="sect-title">WooCommerce</span>
                    {wooLoading && <div style={{ width: 12, height: 12, border: '2px solid #e0e0e0', borderTopColor: '#7f54b3', borderRadius: '50%', animation: 'spin .7s linear infinite', marginLeft: 8 }} />}
                  </div>
                  {woo ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                      {[['Ingresos', '$'+(woo.totals?.revenue?.toLocaleString('es-AR',{minimumFractionDigits:0})||'0')],['Pedidos', String(woo.totals?.orders||0)],['Ticket prom.', '$'+Math.round(woo.totals?.avgOrderValue||0).toLocaleString('es-AR')],['Productos top', String(woo.topProducts?.length||0)]].map(([l,v]) => (
                        <div key={l}><div className="kpi-lbl">{l}</div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 20, fontWeight: 700, color: '#18181b' }}>{v||'—'}</div></div>
                      ))}
                    </div>
                  ) : wooLoading ? <div style={{ fontSize: 12, color: '#a1a1aa' }}>Cargando...</div> : <div style={{ fontSize: 12, color: '#a1a1aa' }}>Sin datos</div>}
                </div>
              )}

              {/* Sin módulos */}
              {!c.meta_ad_account_id && !mods.instagram_organico && !mods.facebook_organico && !mods.ga4 && !mods.woocommerce && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9c9a92', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                  No hay módulos activos. Activalos desde ⚙ Módulos.
                </div>
              )}

            </div>
        )}


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
              {(drillCampaign || drillAdset) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <span style={{ color: '#a1a1aa', fontSize: 11 }}>›</span>
                  <button onClick={() => { setDrillCampaign(null); setDrillAdset(null); setDrillData(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>Campañas</button>
                  {drillCampaign && <><span style={{ color: '#a1a1aa', fontSize: 11 }}>›</span><span style={{ fontSize: 11, color: drillAdset ? '#1D9E75' : '#18181b', fontFamily: 'Inter,sans-serif', cursor: drillAdset ? 'pointer' : 'default', fontWeight: 600 }} onClick={() => drillAdset && (setDrillAdset(null), setDrillData(null))}>{drillCampaign.name}</span></>}
                  {drillAdset && <><span style={{ color: '#a1a1aa', fontSize: 11 }}>›</span><span style={{ fontSize: 11, color: '#18181b', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{drillAdset.name}</span></>}
                </div>
              )}
            </div>

            {/* TABLA CAMPAÑAS */}
            {!drillCampaign && (
              <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                {camps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 12 }}>No se encontraron campañas en este período.</div>
                    <button onClick={() => { setDrillLoading(true); fetch(`/api/meta-drilldown?account_id=${c.meta_ad_account_id}&since=${df}&until=${dt}`).then(r=>r.json()).then(d=>setDrillData(d)).finally(()=>setDrillLoading(false)); }} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Ver todas las campañas</button>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#f9f9f8' }}>
                        {['Campaña', 'Estado', 'Impresiones', 'Clics', 'CTR', 'Gasto', 'Resultados', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', borderBottom: '.5px solid rgba(0,0,0,.08)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {camps.map((camp, i) => {
                        const res = (camp.actions || []).reduce((s, a) => s + parseInt(a.value || 0), 0);
                        return (
                          <tr key={i} style={{ borderBottom: '.5px solid rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => {
                            if (!camp.campaign_id) return;
                            setDrillCampaign({ id: camp.campaign_id, name: camp.campaign_name });
                            setDrillAdset(null);
                            setDrillData(null);
                            setDrillLoading(true);
                            fetch(`/api/meta-drilldown?campaign_id=${camp.campaign_id}&since=${df}&until=${dt}`)
                              .then(r => r.json()).then(d => setDrillData(d)).finally(() => setDrillLoading(false));
                          }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {camp.campaign_name}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: camp.status === 'ACTIVE' ? '#dcfce7' : '#f4f4f5', color: camp.status === 'ACTIVE' ? '#15803d' : '#a1a1aa' }}>
                                {camp.status === 'ACTIVE' ? '● Activa' : '○ Pausada'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(camp.impressions || 0))}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(camp.clicks || 0))}</td>
                            <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 600, color: '#7c3aed', fontSize: 13 }}>{fp(parseFloat(camp.ctr || 0))}</span></td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{fm(parseFloat(camp.spend || 0))}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {res > 0 ? <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>{res}</span> : <span style={{ color: '#a1a1aa' }}>—</span>}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#a1a1aa', fontSize: 12 }}>→</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* DRILL: AD SETS */}
            {drillCampaign && !drillAdset && (
              <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                {drillLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>Cargando ad sets...</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#f9f9f8' }}>
                        {['Ad Set', 'Estado', 'Impresiones', 'Clics', 'CTR', 'Gasto', 'Presupuesto', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', borderBottom: '.5px solid rgba(0,0,0,.08)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(drillData?.adsets || []).map((adset, i) => {
                        const ins = adset.insights || {};
                        const budget = adset.daily_budget ? `$${Math.round(adset.daily_budget/100).toLocaleString('es-AR')}/día` : adset.lifetime_budget ? `$${Math.round(adset.lifetime_budget/100).toLocaleString('es-AR')} total` : '—';
                        return (
                          <tr key={i} style={{ borderBottom: '.5px solid rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => {
                            setDrillAdset({ id: adset.id, name: adset.name });
                            setDrillData(null);
                            setDrillLoading(true);
                            fetch(`/api/meta-drilldown?adset_id=${adset.id}&since=${df}&until=${dt}`)
                              .then(r => r.json()).then(d => setDrillData(d)).finally(() => setDrillLoading(false));
                          }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{adset.name}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: adset.status === 'ACTIVE' ? '#dcfce7' : '#f4f4f5', color: adset.status === 'ACTIVE' ? '#15803d' : '#a1a1aa' }}>
                                {adset.status === 'ACTIVE' ? '● Activo' : '○ Pausado'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(ins.impressions || 0))}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#3f3f46' }}>{fmt(parseInt(ins.clicks || 0))}</td>
                            <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 600, color: '#7c3aed', fontSize: 13 }}>{fp(parseFloat(ins.ctr || 0))}</span></td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{fm(parseFloat(ins.spend || 0))}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: '#71717a' }}>{budget}</td>
                            <td style={{ padding: '12px 14px', color: '#a1a1aa', fontSize: 12 }}>→</td>
                          </tr>
                        );
                      })}
                      {!drillLoading && (drillData?.adsets || []).length === 0 && (
                        <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa', fontSize: 13 }}>Sin ad sets encontrados.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* DRILL: ADS / CREATIVOS */}
            {drillAdset && (
              <div style={{ marginBottom: 16 }}>
                {drillLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>Cargando anuncios...</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
                    {(drillData?.ads || []).map((ad, i) => {
                      const ins = ad.insights || {};
                      const img = ad.creative?.image_url || ad.creative?.thumbnail_url;
                      const res = (ins.actions || []).reduce((s, a) => s + parseInt(a.value || 0), 0);
                      return (
                        <div key={i} style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden' }}>
                          {img && <img src={img} alt="" style={{ width: '100%', aspectRatio: '1.91', objectFit: 'cover', display: 'block' }} onError={e => e.target.style.display='none'} />}
                          {!img && <div style={{ width: '100%', aspectRatio: '1.91', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎨</div>}
                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ad.status === 'ACTIVE' ? '#dcfce7' : '#f4f4f5', color: ad.status === 'ACTIVE' ? '#15803d' : '#a1a1aa' }}>
                                {ad.status === 'ACTIVE' ? '● Activo' : '○ Pausado'}
                              </span>
                            </div>
                            <div style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
                            {ad.creative?.title && <div style={{ fontSize: 12, color: '#3f3f46', marginBottom: 4, fontWeight: 500 }}>{ad.creative.title}</div>}
                            {ad.creative?.body && <div style={{ fontSize: 11, color: '#71717a', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ad.creative.body}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, borderTop: '.5px solid rgba(0,0,0,.06)', paddingTop: 10 }}>
                              {[['Clics', fmt(parseInt(ins.clicks||0))], ['CTR', fp(parseFloat(ins.ctr||0))], ['Gasto', fm(parseFloat(ins.spend||0))]].map(([l,v]) => (
                                <div key={l} style={{ textAlign: 'center' }}>
                                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 9, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{l}</div>
                                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#18181b' }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            {res > 0 && <div style={{ marginTop: 8, textAlign: 'center' }}><span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>{res} resultados</span></div>}
                          </div>
                        </div>
                      );
                    })}
                    {!drillLoading && (drillData?.ads || []).length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#a1a1aa', fontSize: 13 }}>Sin anuncios encontrados.</div>
                    )}
                  </div>
                )}
              </div>
            )}

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
              <KpiCard id="ig_followers" label="Seguidores nuevos" val={(() => { const nf = ig.totals?.net_followers ?? ig.totals?.follows_and_unfollows; return (nf === null || nf === undefined) ? '—' : (nf >= 0 ? '+'+fmt(nf) : fmt(nf)); })()} sub={`total cuenta: ${fmt(ig.account?.followers_count)}`} color="#e1306c" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_reach" label="Alcance" val={fmt(ig.totals?.reach)} sub="personas" delta={ig.deltas?.reach} invertDelta={false} color="#e1306c" defViz="spark" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_interactions" label="Interacciones" val={fmt(ig.totals?.total_interactions)} sub="total" delta={ig.deltas?.total_interactions} invertDelta={false} color="#f09433" defViz="bars" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_profile_views" label="Visitas perfil" val={fmt(ig.totals?.profile_views)} sub="total" delta={ig.deltas?.profile_views} invertDelta={false} color="#cc2366" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              <KpiCard id="ig_likes" label="Likes" val={fmt(ig.totals?.likes)} sub="total" delta={ig.deltas?.likes} invertDelta={false} color="#e1306c" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_comments" label="Comentarios" val={fmt(ig.totals?.comments)} sub="total" delta={ig.deltas?.comments} invertDelta={false} color="#f09433" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_shares" label="Shares" val={fmt(ig.totals?.shares)} sub="total" color="#cc2366" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ig_saves" label="Saves" val={fmt(ig.totals?.saved)} sub="total" color="#833ab4" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
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
              <KpiCard id="ga4_sessions" label="Sesiones" val={fmt(ga4.totals?.sessions)} sub="total" delta={ga4.deltas?.sessions} invertDelta={false} color="#4285f4" defViz="spark" dailyData={ga4.daily?.map(d=>d.sessions)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ga4_users" label="Usuarios" val={fmt(ga4.totals?.users)} sub="únicos" delta={ga4.deltas?.users} invertDelta={false} color="#34a853" defViz="bars" dailyData={ga4.daily?.map(d=>d.users)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ga4_new_users" label="Nuevos usuarios" val={fmt(ga4.totals?.newUsers)} sub="primera visita" delta={ga4.deltas?.newUsers} invertDelta={false} color="#fbbc04" defViz="spark" dailyData={ga4.daily?.map(d=>d.newUsers)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ga4_pageviews" label="Páginas vistas" val={fmt(ga4.totals?.pageviews)} sub="total" delta={ga4.deltas?.pageviews} invertDelta={false} color="#ea4335" defViz="bars" dailyData={ga4.daily?.map(d=>d.pageviews)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              <KpiCard id="ga4_bounce" label="Tasa de rebote" val={ga4.totals?.bounceRate ? (ga4.totals.bounceRate*100).toFixed(1)+'%' : '—'} sub="bounce rate" delta={ga4.deltas?.bounceRate} invertDelta={true} color="#4285f4" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ga4_duration" label="Duración media" val={ga4.totals?.avgSession ? Math.floor(ga4.totals.avgSession/60)+'m '+Math.floor(ga4.totals.avgSession%60)+'s' : '—'} sub="por sesión" color="#34a853" defViz="number" dailyData={ga4.daily?.map(d=>d.avgSession)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="ga4_conversions" label="Conversiones" val={fmt(ga4.totals?.conversions)} sub="total" delta={ga4.deltas?.conversions} invertDelta={false} color="#ea4335" defViz="bars" dailyData={ga4.daily?.map(d=>d.conversions)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
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
        {/* TAB: WOOCOMMERCE */}
        {activeTab === 'woocommerce' && (
          wooLoading ? <Spinner /> :
          !woo ? <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>Sin datos de WooCommerce.</div> :
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7f54b3' }} />
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>WooCommerce</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              <KpiCard id="woo_revenue" label="Ingresos" val={'$' + (woo.totals?.revenue?.toLocaleString('es-AR', {minimumFractionDigits:0}) || '0')} sub="total período" delta={woo.deltas?.revenue} invertDelta={false} color="#7f54b3" defViz="spark" dailyData={woo.daily?.map(d=>d.revenue)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="woo_orders" label="Pedidos" val={String(woo.totals?.orders || 0)} sub="completados" delta={woo.deltas?.orders} invertDelta={false} color="#7f54b3" defViz="bars" dailyData={woo.daily?.map(d=>d.orders)||[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="woo_avg" label="Ticket promedio" val={'$' + Math.round(woo.totals?.avgOrderValue || 0).toLocaleString('es-AR')} sub="por pedido" color="#9b6dce" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
              <KpiCard id="woo_tax" label="Impuestos" val={'$' + Math.round(woo.totals?.totalTax || 0).toLocaleString('es-AR')} sub="total" color="#b89dda" defViz="number" dailyData={[]} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {woo.topProducts?.length > 0 && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px' }}>
                  <div className="kpi-lbl" style={{ marginBottom: 12 }}>Productos más vendidos</div>
                  {woo.topProducts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < woo.topProducts.length - 1 ? '.5px solid rgba(0,0,0,.05)' : 'none' }}>
                      <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: '#3f3f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{p.name}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 600, color: '#7f54b3' }}>${Math.round(p.revenue).toLocaleString('es-AR')}</div>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: '#a1a1aa' }}>{p.qty} uds</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {woo.daily?.length > 0 && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px' }}>
                  <div className="kpi-lbl" style={{ marginBottom: 12 }}>Pedidos por día</div>
                  {(() => {
                    const max = Math.max(...woo.daily.map(d => d.revenue));
                    return woo.daily.slice(-14).map((d, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: '#a1a1aa' }}>{d.date?.slice(5)}</span>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#3f3f46' }}>${Math.round(d.revenue).toLocaleString('es-AR')} · {d.orders} ped.</span>
                        </div>
                        <div style={{ height: 4, background: '#f4f4f5', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: max > 0 ? (d.revenue/max*100)+'%' : '0', background: '#7f54b3', borderRadius: 2 }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: BOT */}
        {activeTab === 'bot' && (() => {
          const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const totals = botData.reduce((a, r) => ({
            consultas: a.consultas + (parseInt(r.data?.consultas) || 0),
            tx: a.tx + (parseInt(r.data?.tx) || 0),
            contactos: a.contactos + (parseInt(r.data?.contactos) || 0),
            facturacion: a.facturacion + (parseFloat(r.data?.facturacion) || 0),
          }), { consultas: 0, tx: 0, contactos: 0, facturacion: 0 });
          const tasa = totals.consultas > 0 ? ((totals.tx / totals.consultas) * 100).toFixed(1) : '—';
          const lastRow = botData[botData.length - 1];
          const prevRow = botData[botData.length - 2];
          const delta = (cur, prev) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

          const saveRow = async () => {
            if (!botForm.period) return;
            await fetch(`/api/manual-data?slug=${c.slug}&type=bot`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ period: botForm.period, data: { consultas: parseInt(botForm.consultas)||0, tx: parseInt(botForm.tx)||0, contactos: parseInt(botForm.contactos)||0, facturacion: parseFloat(botForm.facturacion)||0 } })
            });
            setBotForm({ period: '', consultas: '', tx: '', contactos: '', facturacion: '' });
            setShowBotForm(false);
            setBotLoading(true);
            fetch(`/api/manual-data?slug=${c.slug}&type=bot`).then(r=>r.json()).then(d=>{if(d.rows)setBotData(d.rows);}).finally(()=>setBotLoading(false));
          };

          const deleteRow = async (period) => {
            await fetch(`/api/manual-data?slug=${c.slug}&type=bot`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period }) });
            setBotData(prev => prev.filter(r => r.period !== period));
          };

          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#25d366' }} />
                <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.08em' }}>WhatsApp Bot</span>
                <button onClick={() => setShowBotForm(!showBotForm)} style={{ marginLeft: 'auto', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>+ Agregar mes</button>
              </div>
              {showBotForm && (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div className="kpi-lbl" style={{ marginBottom: 4 }}>Mes</div>
                    <select value={botForm.period} onChange={e => setBotForm(p => ({...p, period: e.target.value}))} style={{ width: '100%', padding: '6px 8px', border: '.5px solid rgba(0,0,0,.15)', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 12 }}>
                      <option value="">Seleccionar</option>
                      {months.map((m, i) => <option key={m} value={`2026-${String(i+1).padStart(2,'0')}`}>{m} 2026</option>)}
                    </select>
                  </div>
                  {[['consultas','Consultas Bot'],['tx','TX Bot'],['contactos','Total Contactos'],['facturacion','Facturación $']].map(([k,l]) => (
                    <div key={k}>
                      <div className="kpi-lbl" style={{ marginBottom: 4 }}>{l}</div>
                      <input type="number" value={botForm[k]} onChange={e => setBotForm(p => ({...p, [k]: e.target.value}))} placeholder="0" style={{ width: '100%', padding: '6px 8px', border: '.5px solid rgba(0,0,0,.15)', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 12 }} />
                    </div>
                  ))}
                  <button onClick={saveRow} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Guardar</button>
                </div>
              )}
              {botData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
                  <KpiCard id="bot_consultas" label="Consultas Bot" val={fmt(lastRow?.data?.consultas)} sub="último mes" delta={lastRow&&prevRow?delta(lastRow.data?.consultas,prevRow.data?.consultas):null} invertDelta={false} color="#25d366" defViz="number" dailyData={botData.map(r=>r.data?.consultas||0)} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                  <KpiCard id="bot_tx" label="TX Bot" val={fmt(lastRow?.data?.tx)} sub="transacciones" delta={lastRow&&prevRow?delta(lastRow.data?.tx,prevRow.data?.tx):null} invertDelta={false} color="#128c7e" defViz="bars" dailyData={botData.map(r=>r.data?.tx||0)} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                  <KpiCard id="bot_contactos" label="Total Contactos" val={fmt(lastRow?.data?.contactos)} sub="último mes" delta={lastRow&&prevRow?delta(lastRow.data?.contactos,prevRow.data?.contactos):null} invertDelta={false} color="#075e54" defViz="spark" dailyData={botData.map(r=>r.data?.contactos||0)} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                  <KpiCard id="bot_facturacion" label="Facturación" val={lastRow?.data?.facturacion ? '$'+Math.round(lastRow.data.facturacion).toLocaleString('es-AR') : '—'} sub="último mes" delta={lastRow&&prevRow?delta(lastRow.data?.facturacion,prevRow.data?.facturacion):null} invertDelta={false} color="#25d366" defViz="number" dailyData={botData.map(r=>r.data?.facturacion||0)} vizTypes={vizTypes} setViz={setViz} openMenu={openMenu} setOpenMenu={setOpenMenu} />
                  <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                    <div style={{ height: 3, background: '#25d366', borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                    <div className="kpi-lbl">Tasa conversión</div>
                    <div className="kpi-val">{tasa}{tasa !== '—' ? '%' : ''}</div>
                    <div className="kpi-sub">TX / Consultas</div>
                  </div>
                </div>
              )}
              {botData.length > 0 ? (
                <div style={{ background: '#fff', border: '.5px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#f9f9f8' }}>
                        {['Mes','Consultas Bot','TX Bot','Total Contactos','Facturación','Tasa Conv.',''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 600, color: '#a1a1aa', borderBottom: '.5px solid rgba(0,0,0,.08)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {botData.map((row, i) => {
                        const t = ((row.data?.tx||0)/(row.data?.consultas||1)*100).toFixed(1);
                        const mName = months[parseInt(row.period?.slice(5,7))-1] || row.period;
                        return (
                          <tr key={i} style={{ borderBottom: '.5px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13 }}>{mName}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(row.data?.consultas)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(row.data?.tx)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(row.data?.contactos)}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13 }}>{row.data?.facturacion ? '$'+Math.round(row.data.facturacion).toLocaleString('es-AR') : '—'}</td>
                            <td style={{ padding: '11px 14px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{t}%</span></td>
                            <td style={{ padding: '11px 14px', display: 'flex', gap: 6 }}>
                              <button onClick={() => { setBotForm({ period: row.period, consultas: String(row.data?.consultas||''), tx: String(row.data?.tx||''), contactos: String(row.data?.contactos||''), facturacion: String(row.data?.facturacion||'') }); setShowBotForm(true); window.scrollTo(0,0); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#a1a1aa', fontSize:14 }} title="Editar">✏️</button>
                              <button onClick={()=>deleteRow(row.period)} style={{ background:'none', border:'none', cursor:'pointer', color:'#e5e7eb', fontSize:16 }} title="Eliminar">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f9f9f8', fontWeight: 700 }}>
                        <td style={{ padding: '11px 14px', fontSize: 13 }}>TOTAL</td>
                        <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(totals.consultas)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(totals.tx)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13 }}>{fmt(totals.contactos)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700 }}>{totals.facturacion > 0 ? '$'+Math.round(totals.facturacion).toLocaleString('es-AR') : '—'}</td>
                        <td style={{ padding: '11px 14px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tasa}{tasa!=='—'?'%':''}</span></td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : botLoading ? <Spinner /> : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  No hay datos todavía.<br />
                  <button onClick={()=>setShowBotForm(true)} style={{ marginTop: 12, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ Agregar primer mes</button>
                </div>
              )}
            </>
          );
        })()}

    </div>
  );
}
