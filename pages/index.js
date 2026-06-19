import{useEffect,useState,useRef}from'react';import{createClient}from'@supabase/supabase-js';import Head from'next/head';import ClientDashboard from'../components/ClientDashboard';
const SUPABASE_URL='https://tjpwiwtwapxspdtmvjbo.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHdpd3R3YXB4c3BkdG12amJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDU5NjksImV4cCI6MjA5MzMyMTk2OX0.AtlQgeRcEPxjxg-epFkG-pd_BSttJEtbQE-cOy3LBxY';
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
  {key:'woocommerce',label:'WooCommerce',group:'Web',icon:'🛒'},
];
const LC={meta:'Meta Ads',google_ads:'Google Ads',ga4:'GA4',mensajes:'Mensajes',wordpress:'WordPress',search_console:'Search Console'};
const LOGO_MAP={'bermudez':'bermudez','cubos':'cubos','cristiano':'cristiano','gandolfo':'gandolfo','grand bar':'grandbar','grand':'grandbar','vitta':'lavitta','luly':'luly','pinta':'pinta','samaco':'samaco'};
function getLogoSlug(c){const n=(c.nombre||'').toLowerCase();for(const[k,v]of Object.entries(LOGO_MAP)){if(n.includes(k))return v;}return c.slug||null;}
const DEFAULT_MODS={meta_resumen:true,meta_rendimiento:true,meta_resultados:true,meta_campanas:true,facebook_organico:false,instagram_organico:false,mensajes:false,google_ads:false,ga4:false,wordpress:false};
function fmt(n,dec=0){if(!n&&n!==0)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return typeof n==='number'?n.toFixed(dec):String(Math.round(n));}
function fmtMoney(n){if(!n&&n!==0)return'—';return'$'+fmt(n,0);}
function fmtPct(n){if(!n&&n!==0)return'—';return n.toFixed(2)+'%';}
function fmtDate(d){return d.toISOString().slice(0,10);}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return fmtDate(d);}
function today(){return fmtDate(new Date());}
function Delta({v}){if(v===null||v===undefined)return null;const up=v>=0;return<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:up?'#E1F5EE':'#FBEAEA',color:up?'#0F6E56':'#A32D2D',marginLeft:6}}>{up?'↑':'↓'}{Math.abs(v)}%</span>;}

export default function Dashboard(){
const[darkMode,setDarkMode]=useState(false);
const[clientes,setClientes]=useState([]);
const[current,setCurrent]=useState(null);
const[page,setPage]=useState('overview');
const[dateFrom,setDateFrom]=useState('');
const[dateTo,setDateTo]=useState('');
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
const[search,setSearch]=useState('');
const[filterEstado,setFilterEstado]=useState('todos');
const[sortBy,setSortBy]=useState('nombre');
const[viewMode,setViewMode]=useState('grid');
const[pagina,setPagina]=useState(1);
const[activePeriod,setActivePeriod]=useState('30d');
const POR_PAG=6;
const chartRef=useRef(null);
const chartInst=useRef(null);

useEffect(()=>{try{setDarkMode(localStorage.getItem('pintamkt_dark')==='1');}catch{};setDateFrom(ago(30));setDateTo(today());},[]);
useEffect(()=>{load();},[]);
useEffect(()=>{
  if(!current||!dateFrom||!dateTo)return;
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
  const grid=darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
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
  setShowConfig(false);
}
function openConfig(){setEditMods({...DEFAULT_MODS,...(current.modulos||{})});setShowConfig(true);}
function openClient(c){setCurrent(c);setPage('client');}
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

return(<><Head><title>Pintamkt</title></Head>
<style>{`*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#f8f7f4;--s:#fff;--b:rgba(0,0,0,.09);--bm:rgba(0,0,0,.15);--t:#1a1a18;--m:#6b6a65;--f:#9c9a92;--a:#EBE300;--ad:#0F6E56}.dark{--bg:#111110;--s:#1c1c1a;--b:rgba(255,255,255,.08);--bm:rgba(255,255,255,.15);--t:#e8e6e0;--m:#9c9a92;--f:#6b6a65}body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--t);font-size:14px}.tb{position:sticky;top:0;z-index:100;background:var(--s);border-bottom:.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:52px;gap:10px}.lo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}.ld{width:8px;height:8px;border-radius:50%;background:var(--a)}.lay{display:flex;height:100vh}.sb{width:220px;min-width:220px;background:#111110;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}.ss{padding:8px 1rem 4px;font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--f);text-transform:uppercase}.ni{display:flex;align-items:center;gap:9px;padding:7px 1rem;font-size:13px;color:var(--m);cursor:pointer;border-right:2px solid transparent}.ni:hover{background:var(--bg)}.ni.ac{background:var(--bg);font-weight:500;border-right-color:var(--a)}.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.dv{height:.5px;background:var(--b);margin:8px 1rem}.mn{flex:1;overflow-y:auto;padding:0}.pt{font-size:18px;font-weight:600;margin-bottom:4px}.ps{font-size:12px;color:var(--f);margin-bottom:1.25rem}.kg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1.25rem}.kc{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:1rem 1.1rem}.kl{font-size:11px;color:var(--f);margin-bottom:6px}.kv{font-size:24px;font-weight:600}.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cc{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;cursor:pointer;transition:border-color .15s}.cc:hover{border-color:var(--bm)}.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.cn{font-size:14px;font-weight:600}.stp{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--f)}.sd{width:6px;height:6px;border-radius:50%}.dg{background:#1D9E75}.dy{background:#EF9F27}.dgr{background:#888}.ct{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.tg{font-size:10px;padding:2px 8px;border-radius:20px;border:.5px solid var(--bm);color:var(--m);background:var(--bg)}.cf{border-top:.5px solid var(--b);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:var(--f)}.bn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;border:.5px solid var(--bm);background:var(--s);color:var(--t);cursor:pointer}.bn:hover{background:var(--bg)}.bp{background:var(--a);border-color:var(--a);color:#111110}.bp:hover{background:#C8BC00}.bdanger{background:#FBEAEA;border-color:#F4C0C0;color:#A32D2D}.dh{display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:.5px solid var(--b)}.dn{font-size:18px;font-weight:600}.ds{font-size:12px;color:var(--f)}.bb{background:none;border:.5px solid var(--bm);cursor:pointer;color:var(--m);font-size:16px;padding:5px 10px;border-radius:8px}.di{width:18px;height:18px;border:2px solid var(--bm);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.date-inp{font-size:12px;padding:7px 12px;border-radius:8px;border:.5px solid var(--bm);background:var(--s);color:var(--t)}.date-btn{font-size:11px;padding:5px 10px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--m);cursor:pointer}.tabs{display:flex;gap:0;margin-bottom:1rem;border-bottom:.5px solid var(--b);overflow-x:auto}.tab{font-size:12px;padding:7px 16px;cursor:pointer;color:var(--m);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;flex-shrink:0}.tab.ac{color:var(--a);border-bottom-color:var(--a);font-weight:500}.kpi-big{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-box{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:.9rem 1rem}.kpi-lbl{font-size:10px;color:var(--f);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}.kpi-val{font-size:22px;font-weight:600;letter-spacing:-.02em}.kpi-sub{font-size:10px;color:var(--f);margin-top:3px;display:flex;align-items:center;gap:4px}.cw{position:relative;width:100%;height:180px;margin-bottom:.5rem}.wi{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;margin-bottom:10px}.wh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.wt{font-size:11px;font-weight:600;color:var(--f);letter-spacing:.04em;text-transform:uppercase}.camp-table{width:100%;border-collapse:collapse;font-size:12px}.camp-table th{text-align:left;padding:6px 10px;font-size:10px;font-weight:600;color:var(--f);border-bottom:.5px solid var(--b);text-transform:uppercase}.camp-table td{padding:8px 10px;border-bottom:.5px solid var(--b)}.camp-table tr:last-child td{border-bottom:none}.camp-table tr:hover td{background:var(--bg)}.posts-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.post-card{background:var(--s);border:.5px solid var(--b);border-radius:10px;overflow:hidden}.post-img{width:100%;height:100px;object-fit:cover;background:var(--bg)}.post-body{padding:8px}.post-metric{display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--f)}.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid var(--b)}.toggle-row:last-child{border-bottom:none}.toggle-group{font-size:10px;color:var(--f);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:12px}.toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;flex-shrink:0}.toggle.on{background:var(--a)}.toggle.off{background:var(--bm)}.toggle-knob{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s}.toggle.on .toggle-knob{left:18px}.toggle.off .toggle-knob{left:2px}.mod-count{font-size:10px;padding:2px 8px;border-radius:20px;background:#E1F5EE;color:#0F6E56;margin-left:8px}.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center}.mo{background:var(--s);border-radius:14px;padding:1.5rem;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto}.mo-lg{width:560px}.mt{font-size:16px;font-weight:600;margin-bottom:1rem}.fg{margin-bottom:14px}.fl{font-size:11px;font-weight:600;color:var(--f);display:block;margin-bottom:6px;text-transform:uppercase}.fi{width:100%;padding:8px 12px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t);font-size:13px}.chg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.co{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;border:.5px solid var(--bm);cursor:pointer;font-size:12px;background:var(--bg)}.co.sel{border-color:var(--a);background:#E1F5EE;color:#0F6E56}.mf{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem}.danger-zone{margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #F4C0C0}.danger-title{font-size:11px;font-weight:600;color:#A32D2D;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}.conn-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.conn-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500}.sb-hd{padding:.875rem 1rem;display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}.sb-logo-text{font-size:16px;font-weight:700;color:#fff;letter-spacing:-.02em}.sb .ss{color:rgba(255,255,255,.32)}.sb .ni{color:rgba(255,255,255,.6)}.sb .ni:hover{background:rgba(255,255,255,.05)}.sb .ni.ac{background:rgba(255,255,255,.08);color:#fff;font-weight:500;border-right-color:#1D9E75}.sb .dv{background:rgba(255,255,255,.07);margin:6px 1rem}.sb-nav{flex:1;overflow-y:auto;padding:.5rem 0;scrollbar-width:none}.sb-nav::-webkit-scrollbar{display:none}.sb-promo{margin:.75rem;background:#1c1b17;border:1px solid rgba(255,210,0,.15);border-radius:12px;padding:.85rem .75rem;display:flex;gap:8px;align-items:center;flex-shrink:0;position:relative;overflow:hidden}.sb-promo-body{flex:1}.sb-promo-title{font-size:12px;font-weight:700;color:#FFD600;margin-bottom:3px}.sb-promo-text{font-size:10px;color:rgba(255,255,255,.4);line-height:1.4}.sb-promo-bee{font-size:28px;flex-shrink:0;line-height:1}.sb-user{display:flex;align-items:center;gap:8px;padding:.7rem 1rem;border-top:1px solid rgba(255,255,255,.07);cursor:pointer;flex-shrink:0}.sb-user:hover{background:rgba(255,255,255,.04)}.sb-av{width:30px;height:30px;border-radius:50%;background:#EBE300;color:#111110;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0}.sb-un{flex:1}.sb-un-name{font-size:12px;font-weight:500;color:rgba(255,255,255,.85)}.sb-un-role{font-size:10px;color:rgba(255,255,255,.35)}.sb-arr{font-size:14px;color:rgba(255,255,255,.25)}.sb-top{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:6px 8px 2px;border-radius:10px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.6);font-weight:500}.sb-top:hover{background:rgba(255,255,255,.08)}.sb-top.ac{background:rgba(255,255,255,.1);color:#fff}.mn-hd{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:.5px solid var(--b);flex-shrink:0;gap:16px;background:var(--s)}.mn-title{font-size:22px;font-weight:700;letter-spacing:-.02em}.mn-sub{font-size:12px;color:var(--f);margin-top:2px}.mn-scroll{flex:1;overflow-y:auto;padding:1.5rem}.mn-chip{display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--b);color:var(--m);letter-spacing:.04em;text-transform:uppercase;flex-shrink:0;white-space:nowrap}.ch-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;border-radius:6px;border:.5px solid var(--b);color:var(--m);background:var(--bg)}.ch-tag svg{width:12px;height:12px;flex-shrink:0}`}</style>

<div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--bg)',color:'var(--t)'}}>


<div className="lay">
  <div className="sb">
    <div className="sb-hd">
      <img src="/Logos/pinta-logo.png" alt="Pinta" style={{height:56,objectFit:'contain',objectPosition:'left'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} />
      <span style={{display:'none',alignItems:'center',gap:8}}><span style={{fontSize:22,lineHeight:1}}>🐝</span><span className="sb-logo-text">pinta</span></span>
    </div>
    <div className="sb-nav">
      <div style={{padding:'10px 1rem 4px'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#EBE300',letterSpacing:'.04em',opacity:.7,textTransform:'uppercase'}}>Centro de Control</span>
      </div>
      <div className="dv" style={{margin:'4px 12px'}}/>
      <div className="ss">Agencia</div>
      <div className={`ni${page==='overview'?' ac':''}`} onClick={()=>setPage('overview')}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/></svg>
        <span style={{color:'#EBE300'}}>Panel general</span>
      </div>
      <div className="dv"/>
      <div className="ss">Clientes</div>
      {clientes.map(c=><div key={c.id} className={`ni${current?.id===c.id&&page==='client'?' ac':''}`} onClick={()=>openClient(c)}>
        <span className="dot" style={{background:c.estado==='activo'?'#1D9E75':c.estado==='revisar'?'#EF9F27':'#A32D2D'}}/>{c.nombre}
      </div>)}
      <div className="dv"/>
      <div className="ss">Agencia</div>
      <div className="ni" onClick={()=>setShowModal(true)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        Nuevo cliente
      </div>
    </div>
    <div className="sb-promo">
      <div className="sb-promo-body">
        <div className="sb-promo-title">¡A volar!</div>
        <div className="sb-promo-text">Tu equipo está<br/>haciendo un gran trabajo.</div>
      </div>
      <img src="/Logos/abeja_numero_uno.svg" alt="" style={{position:'absolute',bottom:-25,right:-25,width:110,height:110,objectFit:'contain'}} />
    </div>
    <div className="sb-user">
      <div className="sb-av">EA</div>
      <div className="sb-un">
        <div className="sb-un-name" style={{color:'white'}}>Equipo Pinta</div>
        <div className="sb-un-role">Administrador</div>
      </div>
      <span className="sb-arr">›</span>
    </div>
  </div>

  <div className="mn">
    {page==='overview'&&<div style={{padding:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:'1.5rem'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="mn-title">Centro de Control</span>
            <img src="/Logos/abeja_corona.png" alt="" style={{height:40,objectFit:'contain'}} />
          </div>
          <div className="mn-sub">{clientes.length} clientes monitoreados</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="date" className="date-inp" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} max={dateTo}/>
          <span style={{fontSize:12,color:'var(--f)'}}>→</span>
          <input type="date" className="date-inp" value={dateTo} onChange={e=>setDateTo(e.target.value)} min={dateFrom} max={today()}/>
          <button className="bn" style={{background:'#fff',padding:'7px 14px'}}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v7M3.5 6l3 3 3-3M2 11.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Exportar
          </button>
          <button className="bn bp" onClick={()=>setShowModal(true)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Nuevo Cliente
          </button>
        </div>
      </div>
      <div className="kg">
        {[
          {label:'CLIENTES ACTIVOS',value:activos,num:'+1',text:'este mes',up:true,color:'#1D9E75',bg:'#E1F5EE',spark:[3,4,4,5,5,6,6,7,7,activos],icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" opacity=".5"/><path d="M17 17c0-2.5-1.5-4.5-3.5-5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".5"/></svg>},
          {label:'CRECIENDO',value:activos,num:'+22%',text:'vs mes anterior',up:true,color:'#1D9E75',bg:'#E1F5EE',spark:[5,6,5,7,6,8,7,9,8,activos],icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 14l4-4 3 3 4-5 3-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6h3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {label:'REQUIEREN ATENCIÓN',value:revisar,num:'-2',text:'vs mes anterior',up:false,color:'#EF9F27',bg:'#FEF3E2',spark:[4,3,5,4,6,5,4,3,revisar+1,revisar],icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="15" r=".8" fill="currentColor"/></svg>},
          {label:'INVERSIÓN ADMINISTRADA',value:'$8.3M',num:'+16%',text:'vs mes anterior',up:true,color:'#ffffff',bg:'#1a1a18',sparkColor:'#1a1a18',spark:[6,7,6,8,7,9,8,10,9,10],icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/><circle cx="14.5" cy="13" r="1" fill="currentColor"/></svg>},
        ].map(({label,value,num,text,up,color,bg,spark,sparkColor,icon})=>(
          <div key={label} className="kc" style={{display:'flex',flexDirection:'row',alignItems:'center',gap:14}}>
            <span style={{width:42,height:42,borderRadius:'50%',background:bg,display:'flex',alignItems:'center',justifyContent:'center',color,flexShrink:0}}>{icon}</span>
            <div style={{display:'flex',flexDirection:'column',gap:8,flex:1}}>
              <span style={{fontSize:10,fontWeight:600,color:'var(--f)',letterSpacing:'.05em'}}>{label}</span>
              <div style={{fontSize:26,fontWeight:700,letterSpacing:'-.02em',lineHeight:1}}>{value}</div>
              <div style={{fontSize:11,display:'flex',alignItems:'center',gap:4}}>
                <span style={{color:up?'#1D9E75':'#A32D2D',fontWeight:700}}>{up?'↑':'↓'} {num}</span>
                <span style={{color:'var(--f)'}}>{text}</span>
              </div>
              <svg viewBox={`0 0 ${spark.length-1} 10`} preserveAspectRatio="none" style={{height:18,width:'60%',opacity:.5,marginTop:2}}>
                <polyline points={spark.map((v,i)=>`${i},${10-Math.round((v/Math.max(...spark))*9)}`).join(' ')} fill="none" stroke={sparkColor||color} strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
        {/* Columna izquierda: filtros + clientes */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',gap:8}}>
            <div style={{width:220,position:'relative'}}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--f)',pointerEvents:'none'}}><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/><path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{width:'100%',padding:'7px 12px 7px 30px',borderRadius:8,border:'.5px solid var(--bm)',background:'#fff',color:'var(--t)',fontWeight:600,fontSize:12}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:24}}>
              <select value={filterEstado} onChange={e=>{setFilterEstado(e.target.value);setPagina(1);}} style={{padding:'8px 16px',borderRadius:8,border:'.5px solid var(--bm)',background:'#fff',color:'var(--t)',fontSize:12,cursor:'pointer',fontWeight:600,textAlign:'left'}}>
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="revisar">En revisión</option>
                <option value="pausado">Pausados</option>
              </select>
              <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPagina(1);}} style={{padding:'9px 20px',borderRadius:8,border:'.5px solid var(--bm)',background:'#fff',color:'var(--t)',fontSize:12,cursor:'pointer',fontWeight:600,textAlign:'left'}}>
                <option value="nombre">Ordenar por: Nombre</option>
                <option value="estado">Ordenar por: Estado</option>
                <option value="canales">Ordenar por: Canales</option>
              </select>
              <div style={{display:'flex',border:'.5px solid var(--bm)',borderRadius:8,overflow:'hidden'}}>
                <button onClick={()=>setViewMode('grid')} style={{padding:'8px 14px',background:viewMode==='grid'?'var(--t)':'#fff',color:viewMode==='grid'?'#fff':'var(--m)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85"/></svg>
                  Grid
                </button>
                <button onClick={()=>setViewMode('list')} style={{padding:'8px 14px',background:viewMode==='list'?'var(--t)':'#fff',color:viewMode==='list'?'#fff':'var(--m)',border:'none',borderLeft:'.5px solid var(--bm)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Lista
                </button>
              </div>
            </div>
          </div>
          {(()=>{
            let lista=[...clientes];
            if(search)lista=lista.filter(c=>c.nombre.toLowerCase().includes(search.toLowerCase()));
            if(filterEstado!=='todos')lista=lista.filter(c=>c.estado===filterEstado);
            if(sortBy==='estado')lista.sort((a,b)=>a.estado.localeCompare(b.estado));
            else if(sortBy==='canales')lista.sort((a,b)=>(b.canales?.length||0)-(a.canales?.length||0));
            else lista.sort((a,b)=>a.nombre.localeCompare(b.nombre));
            const total=lista.length;
            const totalPags=Math.ceil(total/POR_PAG)||1;
            const paginaActual=Math.min(pagina,totalPags);
            const listaPag=lista.slice((paginaActual-1)*POR_PAG,paginaActual*POR_PAG);
            return(
              <div>
              <div className={viewMode==='grid'?'cg':''} style={viewMode==='list'?{display:'flex',flexDirection:'column',gap:6}:{}}>
                {listaPag.map(c=>{
                  const sc=c.estado==='activo'?'#1D9E75':c.estado==='revisar'?'#EF9F27':'#A32D2D';
                  const sbg=c.estado==='activo'?'#E1F5EE':c.estado==='revisar'?'#FEF3E2':'#FBEAEA';
                  const seed=c.nombre.length%10;
                  const health=c.estado==='activo'?82+seed:c.estado==='revisar'?60+seed:30+seed;
                  const hc=health>=80?'#1D9E75':health>=60?'#EF9F27':'#A32D2D';
                  const stats=c.estado==='activo'
                    ?[{l:'Alcance',v:`${110+seed*4}K`,n:`+${12+seed}%`,up:true},{l:'Leads',v:`${30+seed*3}`,n:`+${15+seed}%`,up:true},{l:'Inversión',v:`$${280+seed*10}K`,n:`+${10+seed}%`,up:true}]
                    :c.estado==='revisar'
                    ?[{l:'Alcance',v:`${60+seed*3}K`,n:`-${5+seed}%`,up:false},{l:'Leads',v:`${15+seed}`,n:`+${3+seed}%`,up:true},{l:'Inversión',v:`$${80+seed*8}K`,n:`-${8+seed}%`,up:false}]
                    :[{l:'Alcance',v:`${10+seed}K`,n:`-${20+seed}%`,up:false},{l:'Leads',v:`${2+seed}`,n:`-${15+seed}%`,up:false},{l:'Inversión',v:`$${10+seed}K`,n:`-${25+seed}%`,up:false}];
                  const msg=c.estado==='activo'?'Excelente rendimiento general':c.estado==='revisar'?'Requiere atención en algunas métricas':'Campaña pausada, rendimiento bajo';
                  return(
                    <div key={c.id} className="cc" style={{padding:'1rem 1rem 1rem 1.1rem',borderLeft:`3px solid ${sc}`,cursor:'pointer'}} onClick={()=>openClient(c)}>
                      {/* Header */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:30,height:30,borderRadius:8,background:'var(--s)',border:'.5px solid var(--b)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <img src={`/Logos/Logos_clientes/${getLogoSlug(c)}.png`} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}}/>
                            <span style={{display:'none',width:8,height:8,borderRadius:'50%',background:sc}}/>
                          </div>
                          <span style={{fontSize:14,fontWeight:600}}>{c.nombre}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:'var(--f)',cursor:'pointer'}}><path d="M7 1l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.3l-3.2 1.7.6-3.6L1.8 4.8l3.6-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:'var(--f)',cursor:'pointer'}}><circle cx="7" cy="3" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="11" r="1" fill="currentColor"/></svg>
                        </div>
                      </div>
                      {/* Health */}
                      <div style={{fontSize:11,color:hc,fontWeight:600,marginBottom:10}}>Salud: {health}/100</div>
                      {/* Channel icons */}
                      <div style={{display:'flex',gap:6,marginBottom:10}}>
                        {c.meta_ad_account_id&&<span style={{width:22,height:22,borderRadius:'50%',background:'var(--s)',border:'.5px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><img src="/Logos/Logos_redes_sociales/icono_meta_ads.png" alt="" style={{width:14,height:14,objectFit:'contain'}}/></span>}
                        {c.ig_account_id&&<span style={{width:22,height:22,borderRadius:'50%',background:'var(--s)',border:'.5px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><img src="/Logos/Logos_redes_sociales/icono_instagram.svg" alt="" style={{width:14,height:14,objectFit:'contain'}}/></span>}
                        {c.fb_page_id&&<span style={{width:22,height:22,borderRadius:'50%',background:'var(--s)',border:'.5px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><img src="/Logos/Logos_redes_sociales/icono_facebook.svg" alt="" style={{width:14,height:14,objectFit:'contain'}}/></span>}
                        {!c.meta_ad_account_id&&!c.ig_account_id&&!c.fb_page_id&&<span style={{fontSize:10,color:'var(--f)'}}>Sin conexiones</span>}
                      </div>
                      {/* Stats */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                        {stats.map(({l,v,n,up})=>(
                          <div key={l}>
                            <div style={{fontSize:10,color:'var(--f)',marginBottom:2}}>{l}</div>
                            <div style={{fontSize:17,fontWeight:700,letterSpacing:'-.02em',lineHeight:1}}>{v}</div>
                            <div style={{fontSize:10,color:up?'#1D9E75':'#A32D2D',fontWeight:600,marginTop:2}}>{up?'↑':'↓'} {n}</div>
                          </div>
                        ))}
                      </div>
                      {/* Status message */}
                      <div style={{background:sbg,borderRadius:7,padding:'9px 12px',display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                        <span style={{fontSize:10,color:sc,fontWeight:500}}>{msg}</span>
                      </div>
                      {/* Footer actions */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'.5px solid var(--b)',paddingTop:8,gap:4}}>
                        {[
                          {icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx=".8" fill="currentColor" opacity=".7"/><rect x="7" y="1" width="4" height="4" rx=".8" fill="currentColor" opacity=".7"/><rect x="1" y="7" width="4" height="4" rx=".8" fill="currentColor" opacity=".7"/><rect x="7" y="7" width="4" height="4" rx=".8" fill="currentColor" opacity=".7"/></svg>,label:'Ver Dashboard'},
                          {icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1h8a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.1"/><path d="M3 4h6M3 6h4M3 8h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,label:'Reporte'},
                          {icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="9.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="9.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="2.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4 6.7l4 2.2M4 5.3l4-2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,label:'Compartir'},
                        ].map(({icon,label})=>(
                          <button key={label} onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,fontWeight:500,color:'var(--m)',background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:4}}>
                            {icon}{label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {total===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>No se encontraron clientes</div>}
              </div>
              {totalPags>1&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'1rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaActual===1} style={{width:28,height:28,borderRadius:6,border:'.5px solid var(--bm)',background:'var(--s)',cursor:paginaActual===1?'default':'pointer',color:paginaActual===1?'var(--f)':'var(--t)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>‹</button>
                  {Array.from({length:totalPags},(_,i)=>i+1).map(n=>(
                    <button key={n} onClick={()=>setPagina(n)} style={{width:28,height:28,borderRadius:6,border:'.5px solid var(--bm)',background:paginaActual===n?'var(--t)':'var(--s)',color:paginaActual===n?'#fff':'var(--t)',cursor:'pointer',fontSize:12,fontWeight:paginaActual===n?700:400,display:'flex',alignItems:'center',justifyContent:'center'}}>{n}</button>
                  ))}
                  <button onClick={()=>setPagina(p=>Math.min(totalPags,p+1))} disabled={paginaActual===totalPags} style={{width:28,height:28,borderRadius:6,border:'.5px solid var(--bm)',background:'var(--s)',cursor:paginaActual===totalPags?'default':'pointer',color:paginaActual===totalPags?'var(--f)':'var(--t)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>›</button>
                </div>
                <span style={{fontSize:11,color:'var(--f)'}}>Mostrando {(paginaActual-1)*POR_PAG+1} a {Math.min(paginaActual*POR_PAG,total)} de {total} clientes</span>
              </div>}
              </div>
            );
          })()}
        </div>

        {/* Columna derecha: insights + ayuda */}
        <div style={{width:260,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>

          {/* Card: Insights del día */}
          <div style={{background:'var(--s)',border:'.5px solid var(--b)',borderRadius:14,padding:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
              <span style={{fontSize:13,fontWeight:700,letterSpacing:'-.01em'}}>Insights del día</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:'var(--f)'}}><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </div>
            {[
              {nombre:'La Vitta',      metric:'+431 seguidores nuevos', msg:'Excelente crecimiento en la última semana.',  type:'up'},
              {nombre:'Bermudez Moya', metric:'ROAS +18%',              msg:'Tus campañas están generando más resultados.',type:'up'},
              {nombre:'Grand Bar',     metric:'CTR -8%',                msg:'El CTR está por debajo del objetivo. Revisar creatividad.',type:'warn'},
              {nombre:'Pinta MKT',     metric:'Interacciones -35%',     msg:'Menos interacciones que la semana anterior.', type:'down'},
            ].map(({nombre,metric,msg,type})=>{
              const ic=type==='up'
                ?<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#E1F5EE"/><path d="M5 10l3-4 3 4" stroke="#1D9E75" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                :type==='down'
                ?<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#FBEAEA"/><path d="M5 6l3 4 3-4" stroke="#A32D2D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                :<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#FEF3E2"/><path d="M8 5v4M8 10.5v.5" stroke="#EF9F27" strokeWidth="1.4" strokeLinecap="round"/></svg>;
              return(
                <div key={nombre} style={{display:'flex',gap:8,padding:'8px 10px',borderRadius:8,background:'#f9f9f7',border:'.5px solid #ececea',marginBottom:6}}>
                  <div style={{flexShrink:0,marginTop:1}}>{ic}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{nombre}</div>
                    <div style={{fontSize:11,fontWeight:700,color:type==='up'?'#1D9E75':type==='down'?'#A32D2D':'#EF9F27',marginBottom:2}}>{metric}</div>
                    <div style={{fontSize:10,color:'var(--f)',lineHeight:1.4}}>{msg}</div>
                  </div>
                </div>
              );
            })}
            <button style={{width:'100%',marginTop:'.5rem',padding:'9px',borderRadius:8,border:'none',background:'#FFF8C5',color:'#7A6200',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              Ver todos los insights <span style={{fontSize:14}}>›</span>
            </button>
          </div>

          {/* Card: ¿Necesitás ayuda? */}
          <div style={{background:'#111110',borderRadius:14,padding:'1.1rem',display:'flex',alignItems:'center',gap:12,overflow:'hidden',position:'relative'}}>
            <div style={{flex:1,zIndex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:4}}>¿Necesitás ayuda?</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.45)',lineHeight:1.5,marginBottom:'1rem'}}>Nuestro equipo está para acompañarte.</div>
              <button style={{padding:'7px 14px',borderRadius:8,background:'#EBE300',border:'none',color:'#111110',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                Contactar equipo <span style={{fontSize:13}}>›</span>
              </button>
            </div>
            <img src="/Logos/paneles_de_abeja.png" alt="" style={{width:80,height:80,objectFit:'contain',flexShrink:0,opacity:.9}}/>
          </div>

        </div>
      </div>
    </div>}

    {page==='client'&&current&&<div style={{padding:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:'1.5rem'}}>

        {/* Izquierda: logo + back + título + canales */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* Logo cliente */}
          <div style={{width:52,height:52,borderRadius:12,background:'#fff',border:'.5px solid var(--b)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <img
              src={`/Logos/Logos_clientes/${getLogoSlug(current)}.png`}
              alt={current.nombre}
              style={{width:'100%',height:'100%',objectFit:'contain'}}
              onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
            />
            <span style={{display:'none',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'var(--t)',background:'var(--bg)'}}>
              {current.nombre.slice(0,2).toUpperCase()}
            </span>
          </div>
          <button className="bb" onClick={()=>setPage('overview')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:18,fontWeight:700}}>{current.nombre}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#EBE300"/><path d="M5 8l2 2 4-4" stroke="#111110" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>
              {current.meta_ad_account_id&&<span className="ch-tag">
                <img src="/Logos/Logos_redes_sociales/icono_meta_ads.png" alt="" style={{width:12,height:12,objectFit:'contain'}}/>
                Meta Ads
              </span>}
              {current.fb_page_id&&<span className="ch-tag">
                <img src="/Logos/Logos_redes_sociales/icono_facebook.svg" alt="" style={{width:12,height:12,objectFit:'contain'}}/>
                Facebook
              </span>}
              {current.ig_account_id&&<span className="ch-tag">
                <img src="/Logos/Logos_redes_sociales/icono_instagram.svg" alt="" style={{width:12,height:12,objectFit:'contain'}}/>
                Instagram
              </span>}
            </div>
          </div>
        </div>

        {/* Derecha: controles en 2 filas */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8,flexShrink:0}}>
          {/* Fila 1: fechas + periodos + luna */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--t)'}}>Desde</span>
            <input type="date" className="date-inp" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} max={dateTo} style={{fontWeight:600}}/>
            <span style={{fontSize:12,color:'var(--f)'}}>→</span>
            <input type="date" className="date-inp" value={dateTo} onChange={e=>setDateTo(e.target.value)} min={dateFrom} max={today()} style={{fontWeight:600}}/>
            {/* Card unificada 7d 30d 90d */}
            <div style={{display:'flex',background:'var(--s)',border:'.5px solid var(--bm)',borderRadius:8,overflow:'hidden'}}>
              {[{l:'7d',d:7},{l:'30d',d:30},{l:'90d',d:90}].map(({l,d},i)=>(
                <button key={l} onClick={()=>{setDateFrom(ago(d));setDateTo(today());setActivePeriod(l);}}
                  style={{padding:'7px 12px',border:'none',borderLeft:i>0?'.5px solid var(--bm)':'none',background:activePeriod===l?'rgba(235,227,0,.18)':'var(--s)',color:'var(--t)',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>
            {/* Luna fondo negro */}
            <button onClick={()=>{const next=!darkMode;setDarkMode(next);try{localStorage.setItem('pintamkt_dark',next?'1':'0');}catch{}}}
              style={{width:34,height:34,borderRadius:8,background:'#111110',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {darkMode
                ?<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="#fff" strokeWidth="1.3"/><path d="M7 1v1M7 12v1M1 7h1M12 7h1M3 3l.7.7M10.3 10.3l.7.7M10.3 3.7L11 3M3 10.3l.7.7" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>
                :<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 8.5A5 5 0 015.5 2.5a5.5 5.5 0 106 6z" fill="#fff"/></svg>
              }
            </button>
          </div>
          {/* Fila 2: Módulos + Compartir */}
          <div style={{display:'flex',gap:8}}>
            <button className="bn" onClick={openConfig} style={{fontWeight:700}}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="4" height="4" rx=".8" fill="currentColor"/><rect x="8" y="1" width="4" height="4" rx=".8" fill="currentColor"/><rect x="1" y="8" width="4" height="4" rx=".8" fill="currentColor"/><rect x="8" y="8" width="4" height="4" rx=".8" fill="currentColor"/></svg>
              Módulos
            </button>
            <button style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:8,background:'#EBE300',border:'none',color:'#111110',cursor:'pointer'}}
              onClick={()=>{const u=window.location.origin+'/'+current.slug;navigator.clipboard.writeText(u).then(()=>alert('Link copiado: '+u));}}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2h3v3M11 2L5.5 7.5M6 4H3c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h5c.55 0 1-.45 1-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Compartir
            </button>
          </div>
        </div>

      </div>
      <ClientDashboard client={current} dateFrom={dateFrom} dateTo={dateTo} />
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
</div>}  </div>
</>);}

// force rebuild Fri Jun 12 21:38:00 UTC 2026
