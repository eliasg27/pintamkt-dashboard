import{useEffect,useState,useRef}from'react';import{createClient}from'@supabase/supabase-js';import Head from'next/head';
const SUPABASE_URL='https://nlouwkcytkmyjexperyt.supabase.co';
const SUPABASE_KEY='sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY);

const ALL_MODULES=[
  {key:'meta_resumen',label:'Meta Ads — Resumen',group:'Meta Ads',icon:'📢'},
  {key:'meta_rendimiento',label:'Meta Ads — Rendimiento',group:'Meta Ads',icon:'📢'},
  {key:'meta_resultados',label:'Meta Ads — Resultados',group:'Meta Ads',icon:'📢'},
  {key:'meta_campanas',label:'Meta Ads — Campañas',group:'Meta Ads',icon:'📢'},
  {key:'facebook_organico',label:'Facebook Orgánico',group:'Orgánico',icon:'📘'},
  {key:'instagram_organico',label:'Instagram Orgánico',group:'Orgánico',icon:'📸'},
  {key:'mensajes',label:'Mensajes',group:'Canales',icon:'💬'},
  {key:'google_ads',label:'Google Ads',group:'Google',icon:'🔵'},
  {key:'ga4',label:'GA4 Analytics',group:'Google',icon:'🔵'},
  {key:'wordpress',label:'WordPress',group:'Web',icon:'🌐'},
];
const LC={meta:'Meta Ads',google_ads:'Google Ads',ga4:'GA4',mensajes:'Mensajes',wordpress:'WordPress',search_console:'Search Console'};
const DEFAULT_MODS={meta_resumen:true,meta_rendimiento:true,meta_resultados:true,meta_campanas:true,facebook_organico:false,instagram_organico:false,mensajes:false,google_ads:false,ga4:false,wordpress:false};
function fmt(n,dec=0){if(!n&&n!==0)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return typeof n==='number'?n.toFixed(dec):String(Math.round(n));}
function fmtMoney(n){if(!n&&n!==0)return'—';return'$'+fmt(n,0);}
function fmtPct(n){if(!n&&n!==0)return'—';return n.toFixed(2)+'%';}
function fmtDate(d){return d.toISOString().slice(0,10);}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return fmtDate(d);}
function today(){return fmtDate(new Date());}
function Delta({v}){if(v===null||v===undefined)return null;const up=v>=0;return<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:up?'#E1F5EE':'#FBEAEA',color:up?'#0F6E56':'#A32D2D',marginLeft:6}}>{up?'↑':'↓'}{Math.abs(v)}%</span>;}

export default function Dashboard(){
const[clientes,setClientes]=useState([]);
const[current,setCurrent]=useState(null);
const[page,setPage]=useState('overview');
const[dateFrom,setDateFrom]=useState(ago(30));
const[dateTo,setDateTo]=useState(today());
const[metaData,setMetaData]=useState(null);
const[metaLoading,setMetaLoading]=useState(false);
const[orgFbData,setOrgFbData]=useState(null);
const[orgIgData,setOrgIgData]=useState(null);
const[orgLoading,setOrgLoading]=useState(false);
const[showModal,setShowModal]=useState(false);
const[showConfig,setShowConfig]=useState(false);
const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
const[newCliente,setNewCliente]=useState({nombre:'',estado:'activo',canales:[],slug:''});
const[editMods,setEditMods]=useState({});
const[activeTab,setActiveTab]=useState('resumen');
const chartRef=useRef(null);
const chartInst=useRef(null);

useEffect(()=>{load();},[]);
useEffect(()=>{
  if(!current)return;
  if(current.meta_ad_account_id)loadMetaData();
  if(current.fb_page_id||current.ig_account_id)loadOrganic();
},[current,dateFrom,dateTo]);
useEffect(()=>{if(metaData?.daily&&chartRef.current)renderChart();},[metaData,activeTab]);

async function load(){
  const{data}=await sb.from('clientes').select('*').order('nombre');
  setClientes(data||[]);
}

async function loadMetaData(){
  if(!current.meta_ad_account_id){setMetaData(null);return;}
  setMetaLoading(true);setMetaData(null);
  try{const r=await fetch('/api/meta?account_id='+current.meta_ad_account_id+'&since='+dateFrom+'&until='+dateTo);const d=await r.json();if(!d.error)setMetaData(d);}catch(e){}
  setMetaLoading(false);
}

async function loadOrganic(){
  setOrgFbData(null);setOrgIgData(null);setOrgLoading(true);
  try{
    const[fb,ig]=await Promise.all([
      current.fb_page_id?fetch('/api/organic?page_id='+current.fb_page_id+'&since='+dateFrom+'&until='+dateTo).then(r=>r.json()):Promise.resolve(null),
      current.ig_account_id?fetch('/api/organic?ig_id='+current.ig_account_id+'&since='+dateFrom+'&until='+dateTo).then(r=>r.json()):Promise.resolve(null)
    ]);
    if(fb&&!fb.error)setOrgFbData(fb);
    if(ig&&!ig.error)setOrgIgData(ig);
  }catch(e){}
  setOrgLoading(false);
}

function renderChart(){
  const s=document.getElementById('cjs');
  if(!s){const el=document.createElement('script');el.id='cjs';el.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';el.onload=buildChart;document.head.appendChild(el);}
  else if(window.Chart)buildChart();else s.addEventListener('load',buildChart);
}
function buildChart(){
  if(!chartRef.current||!metaData?.daily)return;
  if(chartInst.current)chartInst.current.destroy();
  const dark=window.matchMedia('(prefers-color-scheme:dark)').matches;
  const grid=dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
  const rows=metaData.daily;const labels=rows.map(d=>d.date_start?.slice(5));
  let ds=[];
  if(activeTab==='resumen'){ds=[{label:'Clics',data:rows.map(d=>parseInt(d.clicks||0)),backgroundColor:'#1D9E75',borderRadius:3,yAxisID:'y'},{label:'Gasto',data:rows.map(d=>parseFloat(d.spend||0)),backgroundColor:'#9FE1CB',borderRadius:3,yAxisID:'y2'}];}
  else if(activeTab==='rendimiento'){ds=[{label:'CTR%',data:rows.map(d=>parseFloat(d.ctr||0)),borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,0.1)',fill:true,tension:0.3,type:'line',yAxisID:'y'},{label:'CPM',data:rows.map(d=>parseFloat(d.cpm||0)),backgroundColor:'#B5D4F4',borderRadius:3,yAxisID:'y2'}];}
  else if(activeTab==='resultados'){const gA=(row,type)=>{const a=(row.actions||[]).find(x=>x.action_type===type);return a?parseInt(a.value||0):0;};ds=[{label:'Mensajes',data:rows.map(d=>gA(d,'onsite_conversion.messaging_conversation_started_7d')+gA(d,'onsite_conversion.messaging_first_reply')),backgroundColor:'#993556',borderRadius:3},{label:'Leads',data:rows.map(d=>gA(d,'lead')),backgroundColor:'#534AB7',borderRadius:3}];}
  chartInst.current=new window.Chart(chartRef.current,{type:'bar',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{font:{size:10},boxWidth:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{grid:{color:grid},ticks:{font:{size:9}}},y2:{position:'right',grid:{display:false},ticks:{font:{size:9}}}}}});
}

async function saveCliente(){
  if(!newCliente.nombre.trim())return;
  const slug=newCliente.slug||newCliente.nombre.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-');
  await sb.from('clientes').insert({...newCliente,slug,modulos:DEFAULT_MODS});
  setShowModal(false);setNewCliente({nombre:'',estado:'activo',canales:[],slug:''});load();
}
async function deleteCliente(){
  if(!current)return;
  await sb.from('clientes').delete().eq('id',current.id);
  setShowDeleteConfirm(false);setCurrent(null);setPage('overview');load();
}
async function saveModulos(){
  await sb.from('clientes').update({modulos:editMods}).eq('id',current.id);
  setCurrent(prev=>({...prev,modulos:editMods}));
  setShowConfig(false);setActiveTab('resumen');
}
function openConfig(){setEditMods({...DEFAULT_MODS,...(current.modulos||{})});setShowConfig(true);}
function openClient(c){setCurrent(c);setPage('client');setMetaData(null);setOrgFbData(null);setOrgIgData(null);setActiveTab('resumen');}
function toggleCanal(c){setNewCliente(p=>({...p,canales:p.canales.includes(c)?p.canales.filter(x=>x!==c):[...p.canales,c]}));}

const mods={...DEFAULT_MODS,...(current?.modulos||{})};
const t=metaData?.totals||{};const dl=metaData?.deltas||{};const camps=metaData?.campaigns||[];
const activos=clientes.filter(c=>c.estado==='activo').length;
const revisar=clientes.filter(c=>c.estado==='revisar').length;
const pausados=clientes.filter(c=>c.estado==='pausado').length;
const groups=[...new Set(ALL_MODULES.map(m=>m.group))];

const activeTabs=[];
if(mods.meta_resumen&&current?.meta_ad_account_id)activeTabs.push({key:'resumen',label:'Resumen'});
if(mods.meta_rendimiento&&current?.meta_ad_account_id)activeTabs.push({key:'rendimiento',label:'Rendimiento'});
if(mods.meta_resultados&&current?.meta_ad_account_id)activeTabs.push({key:'resultados',label:'Resultados'});
if(mods.meta_campanas&&current?.meta_ad_account_id)activeTabs.push({key:'campañas',label:'Campañas'});
if(mods.facebook_organico&&current?.fb_page_id)activeTabs.push({key:'facebook',label:'📘 Facebook'});
if(mods.instagram_organico&&current?.ig_account_id)activeTabs.push({key:'instagram',label:'📸 Instagram'});
if(mods.mensajes)activeTabs.push({key:'mensajes',label:'💬 Mensajes'});

return(<>
<Head><title>Pintamkt</title></Head>
<style>{`*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#f8f7f4;--s:#fff;--b:rgba(0,0,0,.09);--bm:rgba(0,0,0,.15);--t:#1a1a18;--m:#6b6a65;--f:#9c9a92;--a:#1D9E75;--ad:#0F6E56}@media(prefers-color-scheme:dark){:root{--bg:#111110;--s:#1c1c1a;--b:rgba(255,255,255,.08);--bm:rgba(255,255,255,.15);--t:#e8e6e0;--m:#9c9a92;--f:#6b6a65}}body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--t);font-size:14px}.tb{position:sticky;top:0;z-index:100;background:var(--s);border-bottom:.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:52px;gap:10px}.lo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}.ld{width:8px;height:8px;border-radius:50%;background:var(--a)}.lay{display:flex;height:calc(100vh - 52px)}.sb{width:220px;min-width:220px;border-right:.5px solid var(--b);padding:1rem 0;overflow-y:auto}.ss{padding:8px 1rem 4px;font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--f);text-transform:uppercase}.ni{display:flex;align-items:center;gap:9px;padding:7px 1rem;font-size:13px;color:var(--m);cursor:pointer;border-right:2px solid transparent}.ni:hover{background:var(--bg)}.ni.ac{background:var(--bg);font-weight:500;border-right-color:var(--a)}.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.dv{height:.5px;background:var(--b);margin:8px 1rem}.mn{flex:1;overflow-y:auto;padding:1.5rem}.pt{font-size:18px;font-weight:600;margin-bottom:4px}.ps{font-size:12px;color:var(--f);margin-bottom:1.25rem}.kg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1.25rem}.kc{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:1rem 1.1rem}.kl{font-size:11px;color:var(--f);margin-bottom:6px}.kv{font-size:24px;font-weight:600}.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cc{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;cursor:pointer;transition:border-color .15s}.cc:hover{border-color:var(--bm)}.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.cn{font-size:14px;font-weight:600}.stp{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--f)}.sd{width:6px;height:6px;border-radius:50%}.dg{background:#1D9E75}.dy{background:#EF9F27}.dgr{background:#888}.ct{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.tg{font-size:10px;padding:2px 8px;border-radius:20px;border:.5px solid var(--bm);color:var(--m);background:var(--bg)}.cf{border-top:.5px solid var(--b);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:var(--f)}.bn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;border:.5px solid var(--bm);background:var(--s);color:var(--t);cursor:pointer}.bn:hover{background:var(--bg)}.bp{background:var(--a);border-color:var(--a);color:#fff}.bp:hover{background:var(--ad)}.bdanger{background:#FBEAEA;border-color:#F4C0C0;color:#A32D2D}.dh{display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:.5px solid var(--b)}.dn{font-size:18px;font-weight:600}.ds{font-size:12px;color:var(--f)}.bb{background:none;border:.5px solid var(--bm);cursor:pointer;color:var(--m);font-size:16px;padding:5px 10px;border-radius:8px}.di{width:18px;height:18px;border:2px solid var(--bm);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.date-inp{font-size:12px;padding:5px 10px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t)}.date-btn{font-size:11px;padding:5px 10px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--m);cursor:pointer}.tabs{display:flex;gap:0;margin-bottom:1rem;border-bottom:.5px solid var(--b);overflow-x:auto}.tab{font-size:12px;padding:7px 16px;cursor:pointer;color:var(--m);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;flex-shrink:0}.tab.ac{color:var(--a);border-bottom-color:var(--a);font-weight:500}.kpi-big{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-box{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:.9rem 1rem}.kpi-lbl{font-size:10px;color:var(--f);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}.kpi-val{font-size:22px;font-weight:600;letter-spacing:-.02em}.kpi-sub{font-size:10px;color:var(--f);margin-top:3px;display:flex;align-items:center;gap:4px}.cw{position:relative;width:100%;height:180px;margin-bottom:.5rem}.wi{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;margin-bottom:10px}.wh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.wt{font-size:11px;font-weight:600;color:var(--f);letter-spacing:.04em;text-transform:uppercase}.camp-table{width:100%;border-collapse:collapse;font-size:12px}.camp-table th{text-align:left;padding:6px 10px;font-size:10px;font-weight:600;color:var(--f);border-bottom:.5px solid var(--b);text-transform:uppercase}.camp-table td{padding:8px 10px;border-bottom:.5px solid var(--b)}.camp-table tr:last-child td{border-bottom:none}.camp-table tr:hover td{background:var(--bg)}.posts-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.post-card{background:var(--s);border:.5px solid var(--b);border-radius:10px;overflow:hidden}.post-img{width:100%;height:100px;object-fit:cover;background:var(--bg)}.post-body{padding:8px}.post-metric{display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--f)}.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid var(--b)}.toggle-row:last-child{border-bottom:none}.toggle-group{font-size:10px;color:var(--f);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:12px}.toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;flex-shrink:0}.toggle.on{background:var(--a)}.toggle.off{background:var(--bm)}.toggle-knob{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s}.toggle.on .toggle-knob{left:18px}.toggle.off .toggle-knob{left:2px}.mod-count{font-size:10px;padding:2px 8px;border-radius:20px;background:#E1F5EE;color:#0F6E56;margin-left:8px}.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center}.mo{background:var(--s);border-radius:14px;padding:1.5rem;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto}.mo-lg{width:560px}.mt{font-size:16px;font-weight:600;margin-bottom:1rem}.fg{margin-bottom:14px}.fl{font-size:11px;font-weight:600;color:var(--f);display:block;margin-bottom:6px;text-transform:uppercase}.fi{width:100%;padding:8px 12px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t);font-size:13px}.chg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.co{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;border:.5px solid var(--bm);cursor:pointer;font-size:12px;background:var(--bg)}.co.sel{border-color:var(--a);background:#E1F5EE;color:#0F6E56}.mf{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem}.danger-zone{margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #F4C0C0}.danger-title{font-size:11px;font-weight:600;color:#A32D2D;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}.conn-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.conn-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500}`}</style>

<div className="tb">
  <div className="lo"><div className="ld"/>pintamkt</div>
  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,justifyContent:'flex-end'}}>
    <span style={{fontSize:12,color:'var(--f)'}}>Desde</span>
    <input type="date" className="date-inp" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} max={dateTo}/>
    <span style={{fontSize:12,color:'var(--f)'}}>→</span>
    <input type="date" className="date-inp" value={dateTo} onChange={e=>setDateTo(e.target.value)} min={dateFrom} max={today()}/>
    <button className="date-btn" onClick={()=>{setDateFrom(ago(7));setDateTo(today());}}>7d</button>
    <button className="date-btn" onClick={()=>{setDateFrom(ago(30));setDateTo(today());}}>30d</button>
    <button className="date-btn" onClick={()=>{setDateFrom(ago(90));setDateTo(today());}}>90d</button>
    <div style={{width:30,height:30,borderRadius:'50%',background:'var(--a)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>EA</div>
  </div>
</div>

<div className="lay">
  <div className="sb">
    <div className="ss">Agencia</div>
    <div className={`ni${page==='overview'?' ac':''}`} onClick={()=>setPage('overview')}>▪ Panel general</div>
    <div className="dv"/>
    <div className="ss">Clientes</div>
    {clientes.map(c=><div key={c.id} className={`ni${current?.id===c.id&&page==='client'?' ac':''}`} onClick={()=>openClient(c)}>
      <span className="dot" style={{background:c.color||'#888'}}/>{c.nombre}
    </div>)}
    <div className="dv"/>
    <div className="ss">Agencia</div>
    <div className="ni" onClick={()=>setShowModal(true)}>+ Nuevo cliente</div>
  </div>

  <div className="mn">
    {page==='overview'&&<div>
      <div className="pt">Panel general</div>
      <div className="ps">{clientes.length} clientes · {dateFrom} → {dateTo}</div>
      <div className="kg">
        <div className="kc"><div className="kl">Activos</div><div className="kv">{activos}</div></div>
        <div className="kc"><div className="kl">En revisión</div><div className="kv" style={{color:revisar>0?'#A32D2D':'inherit'}}>{revisar}</div></div>
        <div className="kc"><div className="kl">Pausados</div><div className="kv">{pausados}</div></div>
        <div className="kc"><div className="kl">Total</div><div className="kv">{clientes.length}</div></div>
      </div>
      <div className="cg">{clientes.map(c=>{
        const dc=c.estado==='activo'?'dg':c.estado==='revisar'?'dy':'dgr';
        const el=c.estado==='activo'?'Activo':c.estado==='revisar'?'Revisar':'Pausado';
        return(<div key={c.id} className="cc" onClick={()=>openClient(c)}>
          <div className="ch"><div className="cn">{c.nombre}</div><div className="stp"><span className={`sd ${dc}`}/>{el}</div></div>
          <div className="ct">{(c.canales||[]).map(ch=><span key={ch} className={`tg`}>{LC[ch]||ch}</span>)}{!c.canales?.length&&<span className="tg">Sin canales</span>}</div>
          <div className="cf">
            <div className="conn-badges">
              {c.meta_ad_account_id&&<span className="conn-badge" style={{background:'#E6F1FB',color:'#185FA5'}}>📢 Ads</span>}
              {c.fb_page_id&&<span className="conn-badge" style={{background:'#E6F1FB',color:'#185FA5'}}>📘 FB</span>}
              {c.ig_account_id&&<span className="conn-badge" style={{background:'#FBEAF0',color:'#993556'}}>📸 IG</span>}
              {!c.meta_ad_account_id&&!c.fb_page_id&&!c.ig_account_id&&<span style={{color:'var(--f)'}}>Sin conexiones</span>}
            </div>
            <span>›</span>
          </div>
        </div>);
      })}</div>
    </div>}

    {page==='client'&&current&&<div>
      <div className="dh">
        <button className="bb" onClick={()=>setPage('overview')}>←</button>
        <div>
          <div className="dn">{current.nombre}</div>
          <div className="ds">
            {[current.meta_ad_account_id&&'Meta Ads',current.fb_page_id&&'Facebook',current.ig_account_id&&'Instagram'].filter(Boolean).join(' · ')||'Sin conexiones'}
          </div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          {(metaLoading||orgLoading)&&<div className="di"/>}
          <button className="bn" onClick={openConfig}>⚙ Módulos</button>
          <button className="bn bp" onClick={()=>{const u=window.location.origin+'/'+current.slug;navigator.clipboard.writeText(u).then(()=>alert('Link copiado: '+u));}}>↗ Compartir</button>
        </div>
      </div>

      {activeTabs.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'var(--f)',fontSize:13}}>
        <div style={{fontSize:32,marginBottom:12}}>📊</div>
        No hay módulos activos o no hay conexiones configuradas.<br/>
        <button className="bn" style={{marginTop:12}} onClick={openConfig}>Configurar módulos</button>
      </div>}

      {activeTabs.length>0&&<>
        <div className="tabs">{activeTabs.map(tab=><div key={tab.key} className={`tab${activeTab===tab.key?' ac':''}`} onClick={()=>setActiveTab(tab.key)}>{tab.label}</div>)}</div>

        {activeTab==='resumen'&&<>{metaData?<>
          <div className="kpi-big">
            <div className="kpi-box"><div className="kpi-lbl">Alcance</div><div className="kpi-val">{fmt(t.reach)}</div><div className="kpi-sub">personas<Delta v={dl.reach}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Impresiones</div><div className="kpi-val">{fmt(t.impressions)}</div><div className="kpi-sub">total<Delta v={dl.impressions}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Clics</div><div className="kpi-val">{fmt(t.clicks)}</div><div className="kpi-sub">anuncios<Delta v={dl.clicks}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Gasto</div><div className="kpi-val">{fmtMoney(t.spend)}</div><div className="kpi-sub">total<Delta v={dl.spend}/></div></div>
          </div>
          <div className="kpi-row">
            <div className="kpi-box"><div className="kpi-lbl">Frecuencia</div><div className="kpi-val">{t.frequency?t.frequency.toFixed(2):'—'}</div></div>
            <div className="kpi-box"><div className="kpi-lbl">CPM</div><div className="kpi-val">{fmtMoney(t.cpm)}</div><div className="kpi-sub"><Delta v={dl.cpm}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">CPC</div><div className="kpi-val">{fmtMoney(t.cpc)}</div><div className="kpi-sub"><Delta v={dl.cpc}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">CTR</div><div className="kpi-val">{fmtPct(t.ctr)}</div><div className="kpi-sub"><Delta v={dl.ctr}/></div></div>
          </div>
          <div className="wi"><div className="wh"><div className="wt">Clics y Gasto diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Meta Ads"/></div></div>
        </>:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos para el período.</div>}</>}

        {activeTab==='rendimiento'&&<>{metaData?<>
          <div className="kpi-big">
            <div className="kpi-box"><div className="kpi-lbl">CTR</div><div className="kpi-val">{fmtPct(t.ctr)}</div><div className="kpi-sub"><Delta v={dl.ctr}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">CPM</div><div className="kpi-val">{fmtMoney(t.cpm)}</div><div className="kpi-sub"><Delta v={dl.cpm}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">CPC</div><div className="kpi-val">{fmtMoney(t.cpc)}</div><div className="kpi-sub"><Delta v={dl.cpc}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Frecuencia</div><div className="kpi-val">{t.frequency?t.frequency.toFixed(2):'—'}</div></div>
          </div>
          <div className="wi"><div className="wh"><div className="wt">CTR y CPM diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Rendimiento"/></div></div>
          <div style={{padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:11,color:'var(--f)'}}>Período anterior: CPM {fmtMoney(metaData.totalsPrev?.cpm)} · CPC {fmtMoney(metaData.totalsPrev?.cpc)} · CTR {fmtPct(metaData.totalsPrev?.ctr)}</div>
        </>:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos.</div>}</>}

        {activeTab==='resultados'&&<>{metaData?<>
          <div className="kpi-big">
            <div className="kpi-box"><div className="kpi-lbl">Mensajes</div><div className="kpi-val">{fmt(t.messages)||'0'}</div><div className="kpi-sub"><Delta v={dl.messages}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Leads</div><div className="kpi-val">{fmt(t.leads)||'0'}</div><div className="kpi-sub"><Delta v={dl.leads}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">Compras</div><div className="kpi-val">{fmt(t.purchases)||'0'}</div><div className="kpi-sub"><Delta v={dl.purchases}/></div></div>
            <div className="kpi-box"><div className="kpi-lbl">ROAS</div><div className="kpi-val">{t.roas?t.roas.toFixed(2)+'x':'—'}</div></div>
          </div>
          <div className="wi"><div className="wh"><div className="wt">Mensajes y Leads diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Resultados"/></div></div>
        </>:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos.</div>}</>}

        {activeTab==='campañas'&&<div className="wi">
          <div className="wh"><div className="wt">Campañas</div><span style={{fontSize:10,color:'var(--f)'}}>{camps.length} campañas</span></div>
          {camps.length===0?<div style={{textAlign:'center',padding:'1.5rem',color:'var(--f)',fontSize:12}}>Sin datos</div>:
          <div style={{overflowX:'auto'}}><table className="camp-table">
            <thead><tr><th>Campaña</th><th>Imp.</th><th>Clics</th><th>CTR</th><th>CPM</th><th>Gasto</th><th>Result.</th></tr></thead>
            <tbody>{camps.map((c,i)=>{const res=(c.actions||[]).reduce((s,a)=>s+parseInt(a.value||0),0);return(<tr key={i}>
              <td style={{fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.campaign_name}</td>
              <td>{fmt(parseInt(c.impressions||0))}</td><td>{fmt(parseInt(c.clicks||0))}</td>
              <td>{fmtPct(parseFloat(c.ctr||0))}</td><td>{fmtMoney(parseFloat(c.cpm||0))}</td>
              <td style={{fontWeight:500}}>{fmtMoney(parseFloat(c.spend||0))}</td>
              <td>{res>0?<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#E1F5EE',color:'#0F6E56',fontWeight:500}}>{res}</span>:'—'}</td>
            </tr>);})}
            </tbody>
          </table></div>}
        </div>}

        {activeTab==='facebook'&&<div>
          {orgLoading&&<div className="di" style={{margin:'2rem auto'}}/>}
          {!orgLoading&&orgFbData?<>
            <div className="kpi-big">
              <div className="kpi-box"><div className="kpi-lbl">Fans</div><div className="kpi-val">{fmt(orgFbData.page?.fan_count)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Alcance orgánico</div><div className="kpi-val">{fmt(orgFbData.totals?.page_reach)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Impresiones org.</div><div className="kpi-val">{fmt(orgFbData.totals?.page_impressions_organic)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Engagement</div><div className="kpi-val">{fmt(orgFbData.totals?.page_engaged_users)}</div></div>
            </div>
            <div className="kpi-row">
              <div className="kpi-box"><div className="kpi-lbl">Nuevos fans</div><div className="kpi-val">{fmt(orgFbData.totals?.page_fan_adds)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Fans perdidos</div><div className="kpi-val">{fmt(orgFbData.totals?.page_fan_removes)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Visitas página</div><div className="kpi-val">{fmt(orgFbData.totals?.page_views_total)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Post engagement</div><div className="kpi-val">{fmt(orgFbData.totals?.page_post_engagements)}</div></div>
            </div>
            {orgFbData.posts?.length>0&&<div className="wi">
              <div className="wh"><div className="wt">Posts recientes</div></div>
              <div style={{overflowX:'auto'}}><table className="camp-table">
                <thead><tr><th>Post</th><th>Imp.</th><th>Alcance org.</th><th>Engagement</th><th>Reacciones</th></tr></thead>
                <tbody>{orgFbData.posts.slice(0,10).map((p,i)=>{const ins=p.insights?.data||[];const gM=name=>{const m=ins.find(x=>x.name===name);return m?.values?.[0]?.value||0;};return(<tr key={i}><td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{p.message?.slice(0,60)||'(sin texto)'}</td><td>{fmt(gM('post_impressions'))}</td><td>{fmt(gM('post_impressions_organic'))}</td><td>{fmt(gM('post_engaged_users'))}</td><td>{fmt(gM('post_reactions_total'))}</td></tr>);})}</tbody>
              </table></div>
            </div>}
          </>:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos de Facebook orgánico.</div>}
        </div>}

        {activeTab==='instagram'&&<div>
          {orgLoading&&<div className="di" style={{margin:'2rem auto'}}/>}
          {!orgLoading&&orgIgData?<>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'8px 12px',background:'var(--bg)',borderRadius:10}}>
              <div><div style={{fontWeight:600}}>@{orgIgData.account?.username||orgIgData.account?.name}</div><div style={{fontSize:11,color:'var(--f)'}}>{fmt(orgIgData.totals?.followers_total)} seguidores</div></div>
            </div>
            <div className="kpi-big">
              <div className="kpi-box"><div className="kpi-lbl">Seguidores</div><div className="kpi-val">{fmt(orgIgData.totals?.followers_total)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Alcance</div><div className="kpi-val">{fmt(orgIgData.totals?.reach)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Impresiones</div><div className="kpi-val">{fmt(orgIgData.totals?.impressions)}</div></div>
              <div className="kpi-box"><div className="kpi-lbl">Visitas perfil</div><div className="kpi-val">{fmt(orgIgData.totals?.profile_views)}</div></div>
            </div>
            {orgIgData.posts?.length>0&&<div className="posts-grid">{orgIgData.posts.slice(0,9).map((p,i)=>{const ins=p.insights?.data||[];const gM=name=>{const m=ins.find(x=>x.name===name);return m?.values?.[0]?.value||0;};return(<div key={i} className="post-card">{(p.media_url||p.thumbnail_url)&&<img src={p.thumbnail_url||p.media_url} className="post-img" alt="post" onError={e=>{e.target.style.display='none';}}/>}<div className="post-body"><div style={{fontSize:11,color:'var(--f)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.caption?.slice(0,50)||'(sin caption)'}</div><div className="post-metric"><span>❤️ {fmt(gM('likes'))}</span><span>💬 {fmt(gM('comments'))}</span><span>👁 {fmt(gM('reach'))}</span></div></div></div>);})}</div>}
          </>:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos de Instagram.</div>}
        </div>}

        {activeTab==='mensajes'&&<div className="wi"><div className="wh"><div className="wt">Mensajes</div></div><div style={{textAlign:'center',padding:'1.5rem',color:'var(--f)',fontSize:12}}>Próximamente</div></div>}
      </>}
    </div>}
  </div>
</div>

{showConfig&&current&&<div className="mb" onClick={e=>e.target===e.currentTarget&&setShowConfig(false)}>
  <div className="mo mo-lg">
    <div className="mt">⚙ Módulos — {current.nombre}</div>
    {groups.map(group=><div key={group}>
      <div className="toggle-group">{group}</div>
      {ALL_MODULES.filter(m=>m.group===group).map(m=>(
        <div key={m.key} className="toggle-row">
          <div style={{fontSize:13}}>{m.icon} {m.label}</div>
          <div className={`toggle ${editMods[m.key]?'on':'off'}`} onClick={()=>setEditMods(p=>({...p,[m.key]:!p[m.key]}))}>
            <div className="toggle-knob"/>
          </div>
        </div>
      ))}
    </div>)}
    <div className="danger-zone">
      <div className="danger-title">Zona de peligro</div>
      <button className="bn bdanger" onClick={()=>{setShowConfig(false);setShowDeleteConfirm(true);}}>🗑 Eliminar cliente</button>
    </div>
    <div className="mf">
      <button className="bn" onClick={()=>setShowConfig(false)}>Cancelar</button>
      <button className="bn bp" onClick={saveModulos}>Guardar módulos</button>
    </div>
  </div>
</div>}

{showDeleteConfirm&&current&&<div className="mb">
  <div className="mo" style={{maxWidth:400}}>
    <div className="mt" style={{color:'#A32D2D'}}>⚠ Eliminar cliente</div>
    <p style={{fontSize:13,color:'var(--m)',marginBottom:16}}>¿Estás seguro que querés eliminar a <strong>{current.nombre}</strong>? Esta acción no se puede deshacer.</p>
    <div className="mf">
      <button className="bn" onClick={()=>setShowDeleteConfirm(false)}>Cancelar</button>
      <button className="bn bdanger" onClick={deleteCliente}>Sí, eliminar</button>
    </div>
  </div>
</div>}

{showModal&&<div className="mb" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
  <div className="mo">
    <div className="mt">Nuevo cliente</div>
    <div className="fg"><label className="fl">Nombre</label><input className="fi" value={newCliente.nombre} onChange={e=>setNewCliente(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Grand Bar"/></div>
    <div className="fg"><label className="fl">Slug</label><input className="fi" value={newCliente.slug} onChange={e=>setNewCliente(p=>({...p,slug:e.target.value}))} placeholder="ej: grand-bar"/></div>
    <div className="fg"><label className="fl">Estado</label><select className="fi" value={newCliente.estado} onChange={e=>setNewCliente(p=>({...p,estado:e.target.value}))}><option value="activo">Activo</option><option value="revisar">Revisar</option><option value="pausado">Pausado</option></select></div>
    <div className="fg"><label className="fl">Canales</label><div className="chg">{Object.entries(LC).map(([k,v])=><div key={k} className={`co${newCliente.canales.includes(k)?' sel':''}`} onClick={()=>toggleCanal(k)}>{v}</div>)}</div></div>
    <div className="mf"><button className="bn" onClick={()=>setShowModal(false)}>Cancelar</button><button className="bn bp" onClick={saveCliente}>Guardar</button></div>
  </div>
</div>}
</>);}
