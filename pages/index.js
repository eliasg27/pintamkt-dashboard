import{useEffect,useState,useRef}from'react';import{createClient}from'@supabase/supabase-js';import Head from'next/head';
const SUPABASE_URL='https://nlouwkcytkmyjexperyt.supabase.co';
const SUPABASE_KEY='sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY);

const META_ACCOUNTS={'grand-bar':'act_4152259048398395','la-vene':'act_127677109213204','samaco':'act_1153422045104277','pinta-mkt':'act_193502403381136','ipoint':'act_1366068537323661','dr-burela':'act_916281750024729','bermudez-moya':'act_335381199272442','cubos-de-chacras':'act_557798890125953','luly-lupe':'act_925977716485358','gandolfo':'act_121743560347797'};

const FB_PAGES={'grand-bar':'1161529683700328','luly-lupe':'899148866606170','cubos-de-chacras':'588794477655674','gandolfo':'209132348942245','dr-burela':'123108927556257','samaco':'1525936594297047','bermudez-moya':'2270673449865573','la-vitta':'100583718276511'};

const IG_ACCOUNTS={'gandolfo':'17841439626709103','samaco':'17841412999937350','bermudez-moya':'17841410658734825','la-vitta':'17841431810785224'};

const LC={meta:'Meta Ads',google_ads:'Google Ads',ga4:'GA4',mensajes:'Mensajes',wordpress:'WordPress',search_console:'Search Console'};
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
const[newCliente,setNewCliente]=useState({nombre:'',estado:'activo',canales:[],slug:''});
const[activeTab,setActiveTab]=useState('resumen');
const[orgTab,setOrgTab]=useState('facebook');
const chartRef=useRef(null);
const chartInst=useRef(null);

useEffect(()=>{load();},[]);
useEffect(()=>{
  if(!current)return;
  if(current.canales?.includes('meta'))loadMetaData();
  loadOrganic();
},[current,dateFrom,dateTo]);
useEffect(()=>{if(metaData?.daily&&chartRef.current)renderChart();},[metaData,activeTab]);

async function load(){const{data}=await sb.from('clientes').select('*').order('nombre');setClientes(data||[]);}

async function loadMetaData(){
  const id=META_ACCOUNTS[current.slug];if(!id){setMetaData(null);return;}
  setMetaLoading(true);setMetaData(null);
  try{const r=await fetch('/api/meta?account_id='+id+'&since='+dateFrom+'&until='+dateTo);const d=await r.json();if(!d.error)setMetaData(d);}catch(e){}
  setMetaLoading(false);
}

async function loadOrganic(){
  setOrgFbData(null);setOrgIgData(null);setOrgLoading(true);
  const fbId=FB_PAGES[current.slug];
  const igId=IG_ACCOUNTS[current.slug];
  try{
    const calls=[];
    if(fbId)calls.push(fetch('/api/organic?page_id='+fbId+'&since='+dateFrom+'&until='+dateTo).then(r=>r.json()));
    else calls.push(Promise.resolve(null));
    if(igId)calls.push(fetch('/api/organic?ig_id='+igId+'&since='+dateFrom+'&until='+dateTo).then(r=>r.json()));
    else calls.push(Promise.resolve(null));
    const[fb,ig]=await Promise.all(calls);
    if(fb&&!fb.error)setOrgFbData(fb);
    if(ig&&!ig.error)setOrgIgData(ig);
  }catch(e){}
  setOrgLoading(false);
}

function renderChart(){
  const s=document.getElementById('cjs');
  if(!s){const el=document.createElement('script');el.id='cjs';el.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';el.onload=buildChart;document.head.appendChild(el);}
  else if(window.Chart)buildChart();
  else s.addEventListener('load',buildChart);
}
function buildChart(){
  if(!chartRef.current||!metaData?.daily)return;
  if(chartInst.current)chartInst.current.destroy();
  const dark=window.matchMedia('(prefers-color-scheme:dark)').matches;
  const grid=dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
  const rows=metaData.daily;const labels=rows.map(d=>d.date_start?.slice(5));
  let datasets=[];
  if(activeTab==='resumen'||activeTab==='alcance'){
    datasets=[{label:'Clics',data:rows.map(d=>parseInt(d.clicks||0)),backgroundColor:'#1D9E75',borderRadius:3,yAxisID:'y'},{label:'Gasto',data:rows.map(d=>parseFloat(d.spend||0)),backgroundColor:'#9FE1CB',borderRadius:3,yAxisID:'y2'}];
  }else if(activeTab==='rendimiento'){
    datasets=[{label:'CTR %',data:rows.map(d=>parseFloat(d.ctr||0)),borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,0.1)',fill:true,tension:0.3,type:'line',yAxisID:'y'},{label:'CPM',data:rows.map(d=>parseFloat(d.cpm||0)),backgroundColor:'#B5D4F4',borderRadius:3,yAxisID:'y2'}];
  }else if(activeTab==='resultados'){
    const getA=(row,type)=>{const a=(row.actions||[]).find(x=>x.action_type===type);return a?parseInt(a.value||0):0;};
    datasets=[{label:'Mensajes',data:rows.map(d=>getA(d,'onsite_conversion.messaging_conversation_started_7d')+getA(d,'onsite_conversion.messaging_first_reply')),backgroundColor:'#993556',borderRadius:3},{label:'Leads',data:rows.map(d=>getA(d,'lead')),backgroundColor:'#534AB7',borderRadius:3}];
  }
  chartInst.current=new window.Chart(chartRef.current,{type:'bar',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{font:{size:10},boxWidth:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{grid:{color:grid},ticks:{font:{size:9}}},y2:{position:'right',grid:{display:false},ticks:{font:{size:9}}}}}});
}

async function saveCliente(){
  if(!newCliente.nombre.trim())return;
  const slug=newCliente.slug||newCliente.nombre.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-');
  await sb.from('clientes').insert({...newCliente,slug});
  setShowModal(false);setNewCliente({nombre:'',estado:'activo',canales:[],slug:''});load();
}
function toggleCanal(c){setNewCliente(p=>({...p,canales:p.canales.includes(c)?p.canales.filter(x=>x!==c):[...p.canales,c]}));}
function openClient(c){setCurrent(c);setPage('client');setMetaData(null);setOrgFbData(null);setOrgIgData(null);setActiveTab('resumen');}

const t=metaData?.totals||{};const d=metaData?.deltas||{};const camps=metaData?.campaigns||[];
const activos=clientes.filter(c=>c.estado==='activo').length;
const revisar=clientes.filter(c=>c.estado==='revisar').length;
const pausados=clientes.filter(c=>c.estado==='pausado').length;
const hasFb=current&&FB_PAGES[current.slug];
const hasIg=current&&IG_ACCOUNTS[current.slug];
const hasMeta=current&&META_ACCOUNTS[current.slug];
const tabs=['resumen','rendimiento','resultados','campañas'];
if(hasFb)tabs.push('facebook');
if(hasIg)tabs.push('instagram');

return(<>
<Head><title>Pintamkt</title></Head>
<style>{`*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#f8f7f4;--s:#fff;--b:rgba(0,0,0,.09);--bm:rgba(0,0,0,.15);--t:#1a1a18;--m:#6b6a65;--f:#9c9a92;--a:#1D9E75;--ad:#0F6E56}@media(prefers-color-scheme:dark){:root{--bg:#111110;--s:#1c1c1a;--b:rgba(255,255,255,.08);--bm:rgba(255,255,255,.15);--t:#e8e6e0;--m:#9c9a92;--f:#6b6a65}}body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--t);font-size:14px}.tb{position:sticky;top:0;z-index:100;background:var(--s);border-bottom:.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:52px;gap:10px}.lo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}.ld{width:8px;height:8px;border-radius:50%;background:var(--a)}.lay{display:flex;height:calc(100vh - 52px)}.sb{width:220px;min-width:220px;border-right:.5px solid var(--b);padding:1rem 0;overflow-y:auto}.ss{padding:8px 1rem 4px;font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--f);text-transform:uppercase}.ni{display:flex;align-items:center;gap:9px;padding:7px 1rem;font-size:13px;color:var(--m);cursor:pointer;border-right:2px solid transparent}.ni:hover{background:var(--bg)}.ni.ac{background:var(--bg);font-weight:500;border-right-color:var(--a)}.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.dv{height:.5px;background:var(--b);margin:8px 1rem}.mn{flex:1;overflow-y:auto;padding:1.5rem}.pt{font-size:18px;font-weight:600;margin-bottom:4px}.ps{font-size:12px;color:var(--f);margin-bottom:1.25rem}.kg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1.25rem}.kc{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:1rem 1.1rem}.kl{font-size:11px;color:var(--f);margin-bottom:6px}.kv{font-size:24px;font-weight:600}.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cc{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;cursor:pointer;transition:border-color .15s}.cc:hover{border-color:var(--bm)}.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.cn{font-size:14px;font-weight:600}.sp2{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--f)}.sd{width:6px;height:6px;border-radius:50%}.dg{background:#1D9E75}.dy{background:#EF9F27}.dgr{background:#888}.ct{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.tg{font-size:10px;padding:2px 8px;border-radius:20px;border:.5px solid var(--bm);color:var(--m);background:var(--bg)}.tmeta{background:#E6F1FB;color:#185FA5}.tgoogle_ads,.tga4{background:#EAF3DE;color:#3B6D11}.tmensajes{background:#FBEAF0;color:#993556}.twordpress{background:#EEEDFE;color:#534AB7}.cf{border-top:.5px solid var(--b);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:var(--f)}.bn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;border:.5px solid var(--bm);background:var(--s);color:var(--t);cursor:pointer}.bn:hover{background:var(--bg)}.bp{background:var(--a);border-color:var(--a);color:#fff}.bp:hover{background:var(--ad)}.dh{display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:.5px solid var(--b)}.dn{font-size:18px;font-weight:600}.ds{font-size:12px;color:var(--f)}.bb{background:none;border:.5px solid var(--bm);cursor:pointer;color:var(--m);font-size:16px;padding:5px 10px;border-radius:8px}.di{width:18px;height:18px;border:2px solid var(--bm);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.date-inp{font-size:12px;padding:5px 10px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t)}.date-btn{font-size:11px;padding:5px 10px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--m);cursor:pointer}.tabs{display:flex;gap:0;margin-bottom:1rem;border-bottom:.5px solid var(--b)}.tab{font-size:12px;padding:7px 16px;cursor:pointer;color:var(--m);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}.tab.ac{color:var(--a);border-bottom-color:var(--a);font-weight:500}.kpi-big{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.kpi-box{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:.9rem 1rem}.kpi-lbl{font-size:10px;color:var(--f);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}.kpi-val{font-size:22px;font-weight:600;letter-spacing:-.02em}.kpi-sub{font-size:10px;color:var(--f);margin-top:3px;display:flex;align-items:center;gap:4px}.cw{position:relative;width:100%;height:180px;margin-bottom:.5rem}.wi{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;margin-bottom:10px}.wh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.wt{font-size:11px;font-weight:600;color:var(--f);letter-spacing:.04em;text-transform:uppercase}.camp-table{width:100%;border-collapse:collapse;font-size:12px}.camp-table th{text-align:left;padding:6px 10px;font-size:10px;font-weight:600;color:var(--f);border-bottom:.5px solid var(--b);text-transform:uppercase;letter-spacing:.04em}.camp-table td{padding:8px 10px;border-bottom:.5px solid var(--b)}.camp-table tr:last-child td{border-bottom:none}.camp-table tr:hover td{background:var(--bg)}.posts-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.post-card{background:var(--s);border:.5px solid var(--b);border-radius:10px;overflow:hidden}.post-img{width:100%;height:100px;object-fit:cover;background:var(--bg)}.post-body{padding:8px}.post-metric{display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--f)}.post-val{font-weight:600;color:var(--t)}.org-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1rem}.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center}.mo{background:var(--s);border-radius:14px;padding:1.5rem;width:480px;max-width:95vw}.mt{font-size:16px;font-weight:600;margin-bottom:1rem}.fg{margin-bottom:14px}.fl{font-size:11px;font-weight:600;color:var(--f);display:block;margin-bottom:6px;text-transform:uppercase}.fi{width:100%;padding:8px 12px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t);font-size:13px}.chg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.co{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;border:.5px solid var(--bm);cursor:pointer;font-size:12px;background:var(--bg)}.co.sel{border-color:var(--a);background:#E1F5EE;color:#0F6E56}.mf{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem}`}</style>

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
    <div className="ss">Conectar</div>
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
          <div className="ch"><div className="cn">{c.nombre}</div><div className="sp2"><span className={`sd ${dc}`}/>{el}</div></div>
          <div className="ct">{(c.canales||[]).map(ch=><span key={ch} className={`tg t${ch}`}>{LC[ch]||ch}</span>)}{!c.canales?.length&&<span className="tg">Sin canales</span>}</div>
          <div className="cf">
            <span style={{display:'flex',gap:8}}>
              {META_ACCOUNTS[c.slug]&&<span>📢 Ads</span>}
              {FB_PAGES[c.slug]&&<span>📘 FB</span>}
              {IG_ACCOUNTS[c.slug]&&<span>📸 IG</span>}
            </span>
            <span>›</span>
          </div>
        </div>);
      })}</div>
    </div>}

    {page==='client'&&current&&<div>
      <div className="dh">
        <button className="bb" onClick={()=>setPage('overview')}>←</button>
        <div><div className="dn">{current.nombre}</div><div className="ds">{(current.canales||[]).map(c=>LC[c]||c).join(' · ')||'Sin canales'}</div></div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          {(metaLoading||orgLoading)&&<div className="di"/>}
          <button className="bn bp" onClick={()=>{const u=window.location.origin+'?c='+current.slug;navigator.clipboard.writeText(u).then(()=>alert('Link copiado'));}}>↗ Compartir</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab=>(
          <div key={tab} className={`tab${activeTab===tab?' ac':''}`} onClick={()=>setActiveTab(tab)}>
            {tab==='facebook'?'📘 Facebook':tab==='instagram'?'📸 Instagram':tab.charAt(0).toUpperCase()+tab.slice(1)}
          </div>
        ))}
      </div>

      {/* TABS DE META ADS */}
      {['resumen','rendimiento','resultados','campañas'].includes(activeTab)&&<>
        {!hasMeta&&<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin cuenta de Meta Ads mapeada.</div>}
        {hasMeta&&metaData&&<>
          {activeTab==='resumen'&&<>
            <div className="kpi-big">
              <div className="kpi-box"><div className="kpi-lbl">Alcance</div><div className="kpi-val">{fmt(t.reach)}</div><div className="kpi-sub"><span>personas</span><Delta v={d.reach}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Impresiones</div><div className="kpi-val">{fmt(t.impressions)}</div><div className="kpi-sub"><span>total</span><Delta v={d.impressions}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Clics</div><div className="kpi-val">{fmt(t.clicks)}</div><div className="kpi-sub"><span>en anuncios</span><Delta v={d.clicks}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Gasto</div><div className="kpi-val">{fmtMoney(t.spend)}</div><div className="kpi-sub"><span>total</span><Delta v={d.spend}/></div></div>
            </div>
            <div className="kpi-row">
              <div className="kpi-box"><div className="kpi-lbl">Frecuencia</div><div className="kpi-val">{t.frequency?t.frequency.toFixed(2):'—'}</div><div className="kpi-sub">veces/persona</div></div>
              <div className="kpi-box"><div className="kpi-lbl">CPM</div><div className="kpi-val">{fmtMoney(t.cpm)}</div><div className="kpi-sub"><span>por mil</span><Delta v={d.cpm}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">CPC</div><div className="kpi-val">{fmtMoney(t.cpc)}</div><div className="kpi-sub"><span>por clic</span><Delta v={d.cpc}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">CTR</div><div className="kpi-val">{fmtPct(t.ctr)}</div><div className="kpi-sub"><span>click rate</span><Delta v={d.ctr}/></div></div>
            </div>
            <div className="wi"><div className="wh"><div className="wt">Clics y Gasto diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Meta Ads"/></div></div>
          </>}
          {activeTab==='rendimiento'&&<>
            <div className="kpi-big">
              <div className="kpi-box"><div className="kpi-lbl">CTR</div><div className="kpi-val">{fmtPct(t.ctr)}</div><div className="kpi-sub"><Delta v={d.ctr}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">CPM</div><div className="kpi-val">{fmtMoney(t.cpm)}</div><div className="kpi-sub"><Delta v={d.cpm}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">CPC</div><div className="kpi-val">{fmtMoney(t.cpc)}</div><div className="kpi-sub"><Delta v={d.cpc}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Frecuencia</div><div className="kpi-val">{t.frequency?t.frequency.toFixed(2):'—'}</div><div className="kpi-sub">veces/persona</div></div>
            </div>
            <div className="wi"><div className="wh"><div className="wt">CTR y CPM diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Rendimiento"/></div></div>
            <div style={{padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:11,color:'var(--f)'}}>Período anterior: CPM {fmtMoney(metaData.totalsPrev?.cpm)} · CPC {fmtMoney(metaData.totalsPrev?.cpc)} · CTR {fmtPct(metaData.totalsPrev?.ctr)}</div>
          </>}
          {activeTab==='resultados'&&<>
            <div className="kpi-big">
              <div className="kpi-box"><div className="kpi-lbl">Mensajes</div><div className="kpi-val">{fmt(t.messages)||'0'}</div><div className="kpi-sub"><Delta v={d.messages}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Leads</div><div className="kpi-val">{fmt(t.leads)||'0'}</div><div className="kpi-sub"><Delta v={d.leads}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">Compras</div><div className="kpi-val">{fmt(t.purchases)||'0'}</div><div className="kpi-sub"><Delta v={d.purchases}/></div></div>
              <div className="kpi-box"><div className="kpi-lbl">ROAS</div><div className="kpi-val">{t.roas?t.roas.toFixed(2)+'x':'—'}</div><div className="kpi-sub">retorno</div></div>
            </div>
            <div className="wi"><div className="wh"><div className="wt">Mensajes y Leads diario</div></div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Resultados"/></div></div>
          </>}
          {activeTab==='campañas'&&<div className="wi">
            <div className="wh"><div className="wt">Campañas</div><span style={{fontSize:10,color:'var(--f)'}}>{camps.length} campañas</span></div>
            {camps.length===0?<div style={{textAlign:'center',padding:'1.5rem',color:'var(--f)',fontSize:12}}>Sin datos</div>:
            <div style={{overflowX:'auto'}}><table className="camp-table">
              <thead><tr><th>Campaña</th><th>Imp.</th><th>Clics</th><th>CTR</th><th>CPM</th><th>CPC</th><th>Gasto</th><th>Result.</th></tr></thead>
              <tbody>{camps.map((c,i)=>{
                const res=(c.actions||[]).reduce((s,a)=>s+parseInt(a.value||0),0);
                return(<tr key={i}>
                  <td style={{fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.campaign_name}</td>
                  <td>{fmt(parseInt(c.impressions||0))}</td>
                  <td>{fmt(parseInt(c.clicks||0))}</td>
                  <td>{fmtPct(parseFloat(c.ctr||0))}</td>
                  <td>{fmtMoney(parseFloat(c.cpm||0))}</td>
                  <td>{fmtMoney(parseFloat(c.cpc||0))}</td>
                  <td style={{fontWeight:500}}>{fmtMoney(parseFloat(c.spend||0))}</td>
                  <td>{res>0?<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#E1F5EE',color:'#0F6E56',fontWeight:500}}>{res}</span>:'—'}</td>
                </tr>);
              })}</tbody>
            </table></div>}
          </div>}
        </>}
        {hasMeta&&!metaData&&!metaLoading&&<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos para el período.</div>}
      </>}

      {/* TAB FACEBOOK ORGÁNICO */}
      {activeTab==='facebook'&&<div>
        {orgLoading&&<div style={{textAlign:'center',padding:'2rem'}}><div className="di" style={{margin:'0 auto'}}/></div>}
        {!orgLoading&&!orgFbData&&<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos de Facebook orgánico.</div>}
        {orgFbData&&<>
          <div className="org-kpis">
            <div className="kpi-box"><div className="kpi-lbl">Fans totales</div><div className="kpi-val">{fmt(orgFbData.totals?.fans_total||orgFbData.page?.fan_count)}</div><div className="kpi-sub">seguidores</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Alcance orgánico</div><div className="kpi-val">{fmt(orgFbData.totals?.page_reach)}</div><div className="kpi-sub">período</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Impresiones</div><div className="kpi-val">{fmt(orgFbData.totals?.page_impressions_organic)}</div><div className="kpi-sub">orgánicas</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Engagement</div><div className="kpi-val">{fmt(orgFbData.totals?.page_engaged_users)}</div><div className="kpi-sub">usuarios</div></div>
          </div>
          <div className="kpi-row">
            <div className="kpi-box"><div className="kpi-lbl">Nuevos fans</div><div className="kpi-val">{fmt(orgFbData.totals?.page_fan_adds)}</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Fans perdidos</div><div className="kpi-val">{fmt(orgFbData.totals?.page_fan_removes)}</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Visitas página</div><div className="kpi-val">{fmt(orgFbData.totals?.page_views_total)}</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Post engagement</div><div className="kpi-val">{fmt(orgFbData.totals?.page_post_engagements)}</div></div>
          </div>
          {orgFbData.posts?.length>0&&<div className="wi">
            <div className="wh"><div className="wt">Posts recientes</div><span style={{fontSize:10,color:'var(--f)'}}>{orgFbData.posts.length} posts</span></div>
            <div style={{overflowX:'auto'}}><table className="camp-table">
              <thead><tr><th>Post</th><th>Imp.</th><th>Alcance org.</th><th>Engagement</th><th>Reacciones</th></tr></thead>
              <tbody>{orgFbData.posts.slice(0,10).map((p,i)=>{
                const ins=p.insights?.data||[];
                const getM=name=>{const m=ins.find(x=>x.name===name);return m?.values?.[0]?.value||0;};
                return(<tr key={i}>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{p.message?.slice(0,60)||'(sin texto)'}</td>
                  <td>{fmt(getM('post_impressions'))}</td>
                  <td>{fmt(getM('post_impressions_organic'))}</td>
                  <td>{fmt(getM('post_engaged_users'))}</td>
                  <td>{fmt(getM('post_reactions_total'))}</td>
                </tr>);
              })}</tbody>
            </table></div>
          </div>}
        </>}
      </div>}

      {/* TAB INSTAGRAM ORGÁNICO */}
      {activeTab==='instagram'&&<div>
        {orgLoading&&<div style={{textAlign:'center',padding:'2rem'}}><div className="di" style={{margin:'0 auto'}}/></div>}
        {!orgLoading&&!orgIgData&&<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>Sin datos de Instagram orgánico.</div>}
        {orgIgData&&<>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'8px 12px',background:'var(--bg)',borderRadius:10}}>
            <div><div style={{fontWeight:600}}>@{orgIgData.account?.username||orgIgData.account?.name}</div><div style={{fontSize:11,color:'var(--f)'}}>{fmt(orgIgData.totals?.followers_total)} seguidores</div></div>
          </div>
          <div className="org-kpis">
            <div className="kpi-box"><div className="kpi-lbl">Seguidores</div><div className="kpi-val">{fmt(orgIgData.totals?.followers_total)}</div><div className="kpi-sub">total</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Alcance</div><div className="kpi-val">{fmt(orgIgData.totals?.reach)}</div><div className="kpi-sub">período</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Impresiones</div><div className="kpi-val">{fmt(orgIgData.totals?.impressions)}</div><div className="kpi-sub">total</div></div>
            <div className="kpi-box"><div className="kpi-lbl">Visitas perfil</div><div className="kpi-val">{fmt(orgIgData.totals?.profile_views)}</div><div className="kpi-sub">período</div></div>
          </div>
          {orgIgData.posts?.length>0&&<>
            <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:'var(--f)'}}>POSTS RECIENTES</div>
            <div className="posts-grid">{orgIgData.posts.slice(0,9).map((p,i)=>{
              const ins=p.insights?.data||[];
              const getM=name=>{const m=ins.find(x=>x.name===name);return m?.values?.[0]?.value||0;};
              const likes=getM('likes');const comments=getM('comments');const reach=getM('reach');
              return(<div key={i} className="post-card">
                {(p.media_url||p.thumbnail_url)&&<img src={p.thumbnail_url||p.media_url} className="post-img" alt="post" onError={e=>{e.target.style.display='none';}}/>}
                <div className="post-body">
                  <div style={{fontSize:11,color:'var(--f)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.caption?.slice(0,50)||'(sin caption)'}</div>
                  <div className="post-metric"><span>❤️ {fmt(likes)}</span><span>💬 {fmt(comments)}</span><span>👁 {fmt(reach)}</span></div>
                </div>
              </div>);
            })}</div>
          </>}
        </>}
      </div>}

      {current.canales?.filter(c=>c!=='meta').map(canal=><div key={canal} className="wi">
        <div className="wh"><div className="wt">{LC[canal]||canal}</div></div>
        <div style={{textAlign:'center',padding:'1.5rem',color:'var(--f)',fontSize:12}}>Próximamente</div>
      </div>)}
    </div>}
  </div>
</div>

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
