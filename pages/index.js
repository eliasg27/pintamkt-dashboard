import{useEffect,useState,useRef}from'react';import{createClient}from'@supabase/supabase-js';import Head from'next/head';
const SUPABASE_URL='https://nlouwkcytkmyjexperyt.supabase.co';
const SUPABASE_KEY='sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const LC={meta:'Meta Ads',google_ads:'Google Ads',ga4:'GA4',mensajes:'Mensajes',wordpress:'WordPress',search_console:'Search Console'};
function fmt(n){if(!n&&n!==0)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return Math.round(n).toString();}
export default function Dashboard(){
const[clientes,setClientes]=useState([]);
const[current,setCurrent]=useState(null);
const[page,setPage]=useState('overview');
const[days,setDays]=useState(30);
const[metaAccounts,setMetaAccounts]=useState([]);
const[metaData,setMetaData]=useState(null);
const[metaLoading,setMetaLoading]=useState(false);
const[showModal,setShowModal]=useState(false);
const[newCliente,setNewCliente]=useState({nombre:'',estado:'activo',canales:[]});
const[selAccount,setSelAccount]=useState(null);
const chartRef=useRef(null);
const chartInst=useRef(null);
useEffect(()=>{load();loadMeta();},[]);
useEffect(()=>{if(current?.canales?.includes('meta')&&selAccount)loadMetaData(selAccount,days);},[current,days,selAccount]);
useEffect(()=>{if(metaData&&chartRef.current)renderChart();},[metaData]);
async function load(){const{data}=await sb.from('clientes').select('*').order('nombre');setClientes(data||[]);}
async function loadMeta(){try{const r=await fetch('/api/meta');const d=await r.json();if(d.data){setMetaAccounts(d.data);if(d.data[0])setSelAccount(d.data[0].id);}}catch(e){}}
async function loadMetaData(id,n){setMetaLoading(true);setMetaData(null);try{const r=await fetch('/api/meta?account_id='+id+'&since='+ago(n)+'&until='+now());const d=await r.json();if(!d.error)setMetaData(d);}catch(e){}setMetaLoading(false);}
function renderChart(){if(!metaData?.daily?.length)return;const s=document.getElementById('cjs');if(!s){const el=document.createElement('script');el.id='cjs';el.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';el.onload=buildChart;document.head.appendChild(el);}else if(window.Chart)buildChart();}
function buildChart(){if(!chartRef.current)return;if(chartInst.current)chartInst.current.destroy();chartInst.current=new window.Chart(chartRef.current,{type:'bar',data:{labels:metaData.daily.map(d=>d.date_start?.slice(5)),datasets:[{data:metaData.daily.map(d=>parseInt(d.clicks||0)),backgroundColor:'#1D9E75',borderRadius:3,yAxisID:'y'},{data:metaData.daily.map(d=>parseFloat(d.spend||0)),backgroundColor:'#9FE1CB',borderRadius:3,yAxisID:'y2'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{},y2:{position:'right',grid:{display:false}}}}});}
async function saveCliente(){if(!newCliente.nombre.trim())return;const slug=newCliente.nombre.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-');await sb.from('clientes').insert({...newCliente,slug});setShowModal(false);setNewCliente({nombre:'',estado:'activo',canales:[]});load();}
function toggleCanal(c){setNewCliente(p=>({...p,canales:p.canales.includes(c)?p.canales.filter(x=>x!==c):[...p.canales,c]}));}
function openClient(c){setCurrent(c);setPage('client');setMetaData(null);if(c.canales?.includes('meta')&&selAccount)loadMetaData(selAccount,days);}
const activos=clientes.filter(c=>c.estado==='activo').length;
const revisar=clientes.filter(c=>c.estado==='revisar').length;
const pausados=clientes.filter(c=>c.estado==='pausado').length;
return(<>
<Head><title>Pintamkt</title></Head>
<style>{`*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#f8f7f4;--s:#fff;--b:rgba(0,0,0,.09);--bm:rgba(0,0,0,.15);--t:#1a1a18;--m:#6b6a65;--f:#9c9a92;--a:#1D9E75;--ad:#0F6E56}body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--t);font-size:14px}.tb{position:sticky;top:0;z-index:100;background:var(--s);border-bottom:.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;height:52px}.lo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}.ld{width:8px;height:8px;border-radius:50%;background:var(--a)}.lay{display:flex;height:calc(100vh - 52px)}.sb{width:210px;border-right:.5px solid var(--b);padding:1rem 0;overflow-y:auto}.ss{padding:8px 1rem 4px;font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--f);text-transform:uppercase}.ni{display:flex;align-items:center;gap:9px;padding:7px 1rem;font-size:13px;color:var(--m);cursor:pointer;border-right:2px solid transparent}.ni:hover{background:var(--bg)}.ni.ac{background:var(--bg);font-weight:500;border-right-color:var(--a)}.dt{width:7px;height:7px;border-radius:50%;flex-shrink:0}.dv{height:.5px;background:var(--b);margin:8px 1rem}.mn{flex:1;overflow-y:auto;padding:1.5rem}.pt{font-size:18px;font-weight:600;margin-bottom:4px}.ps{font-size:12px;color:var(--f);margin-bottom:1.25rem}.kg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:1.25rem}.kc{background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:1rem 1.1rem}.kl{font-size:11px;color:var(--f);margin-bottom:6px}.kv{font-size:24px;font-weight:600}.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cc{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem;cursor:pointer}.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.cn{font-size:14px;font-weight:600}.sp{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--f)}.sd{width:6px;height:6px;border-radius:50%}.dg{background:#1D9E75}.dy{background:#EF9F27}.dgr{background:#888}.ct{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.tg{font-size:10px;padding:2px 8px;border-radius:20px;border:.5px solid var(--bm);color:var(--m);background:var(--bg)}.tm{background:#E6F1FB;color:#185FA5}.tg_a,.tga{background:#EAF3DE;color:#3B6D11}.tme{background:#FBEAF0;color:#993556}.twp{background:#EEEDFE;color:#534AB7}.cf{border-top:.5px solid var(--b);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:var(--f)}.bn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;border:.5px solid var(--bm);background:var(--s);color:var(--t);cursor:pointer}.bp{background:var(--a);border-color:var(--a);color:#fff}.dh{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:.5px solid var(--b)}.dn{font-size:18px;font-weight:600}.ds{font-size:12px;color:var(--f)}.bb{background:none;border:.5px solid var(--bm);cursor:pointer;color:var(--m);font-size:16px;padding:5px 10px;border-radius:8px}.wg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wi{background:var(--s);border:.5px solid var(--b);border-radius:14px;padding:1rem 1.1rem}.wf{grid-column:1/-1}.wh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.wt{font-size:11px;font-weight:600;color:var(--f);letter-spacing:.04em;text-transform:uppercase}.wk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.wl{font-size:10px;color:var(--f)}.wv{font-size:20px;font-weight:600;margin-top:2px}.cw{position:relative;width:100%;height:140px}.sp2{width:18px;height:18px;border:2px solid var(--bm);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center}.mo{background:var(--s);border-radius:14px;padding:1.5rem;width:460px;max-width:95vw}.mt{font-size:16px;font-weight:600;margin-bottom:1rem}.fg{margin-bottom:14px}.fl{font-size:11px;font-weight:600;color:var(--f);display:block;margin-bottom:6px;text-transform:uppercase}.fi{width:100%;padding:8px 12px;border-radius:8px;border:.5px solid var(--bm);background:var(--bg);color:var(--t);font-size:13px}.chg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.co{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;border:.5px solid var(--bm);cursor:pointer;font-size:12px;background:var(--bg)}.co.sel{border-color:var(--a);background:#E1F5EE;color:#0F6E56}.mf{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem}`}</style>
<div className="tb"><div className="lo"><div className="ld"/>pintamkt</div><div style={{display:'flex',alignItems:'center',gap:10}}><select style={{fontSize:12,padding:'5px 10px',borderRadius:8,border:'.5px solid rgba(0,0,0,.15)',background:'var(--bg)',color:'var(--t)'}} value={days} onChange={e=>setDays(+e.target.value)}><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option></select><div style={{width:30,height:30,borderRadius:'50%',background:'var(--a)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>EA</div></div></div>
<div className="lay">
<div className="sb">
<div className="ss">Agencia</div>
<div className={`ni${page==='overview'?' ac':''}`} onClick={()=>setPage('overview')}>▪ Panel general</div>
<div className="dv"/>
<div className="ss">Clientes</div>
{clientes.map(c=><div key={c.id} className={`ni${current?.id===c.id&&page==='client'?' ac':''}`} onClick={()=>openClient(c)}><span className="dt" style={{background:c.color||'#888'}}/>{c.nombre}</div>)}
<div className="dv"/>
<div className="ss">Conectar</div>
<div className="ni" onClick={()=>setShowModal(true)}>+ Nuevo cliente</div>
{metaAccounts.length>0&&<div className="ni" style={{color:'#1D9E75',fontWeight:500}}>✓ Meta ({metaAccounts.length})</div>}
</div>
<div className="mn">
{page==='overview'&&<div>
<div className="pt">Panel general</div>
<div className="ps">{clientes.length} clientes</div>
<div className="kg">
<div className="kc"><div className="kl">Activos</div><div className="kv">{activos}</div></div>
<div className="kc"><div className="kl">En revisión</div><div className="kv">{revisar}</div></div>
<div className="kc"><div className="kl">Pausados</div><div className="kv">{pausados}</div></div>
<div className="kc"><div className="kl">Total</div><div className="kv">{clientes.length}</div></div>
</div>
<div className="cg">{clientes.map(c=>{
const dc=c.estado==='activo'?'dg':c.estado==='revisar'?'dy':'dgr';
const el=c.estado==='activo'?'Activo':c.estado==='revisar'?'Revisar':'Pausado';
return(<div key={c.id} className="cc" onClick={()=>openClient(c)}>
<div className="ch"><div className="cn">{c.nombre}</div><div className="sp"><span className={`sd ${dc}`}/>{el}</div></div>
<div className="ct">{(c.canales||[]).map(ch=><span key={ch} className={`tg t${ch.replace('_','')}`}>{LC[ch]||ch}</span>)}{!c.canales?.length&&<span className="tg">Sin canales</span>}</div>
<div className="cf"><span>Ver métricas</span><span>›</span></div>
</div>);
})}</div>
</div>}
{page==='client'&&current&&<div>
<div className="dh">
<button className="bb" onClick={()=>setPage('overview')}>←</button>
<div><div className="dn">{current.nombre}</div><div className="ds">{(current.canales||[]).map(c=>LC[c]||c).join(' · ')}</div></div>
<div style={{marginLeft:'auto'}}><button className="bn bp" onClick={()=>navigator.clipboard.writeText(window.location.href)}>↗ Compartir</button></div>
</div>
<div className="wg">
{current.canales?.includes('meta')&&<div className="wi wf">
<div className="wh"><div className="wt">Meta Ads — datos reales</div>{metaLoading&&<div className="sp2"/>}</div>
{metaData?<><div className="wk">
<div><div className="wl">Alcance</div><div className="wv">{fmt(metaData.totals?.reach)}</div></div>
<div><div className="wl">Impresiones</div><div className="wv">{fmt(metaData.totals?.impressions)}</div></div>
<div><div className="wl">Clics</div><div className="wv">{fmt(metaData.totals?.clicks)}</div></div>
<div><div className="wl">Gasto</div><div className="wv">${metaData.totals?.spend?.toFixed(0)||'0'}</div></div>
</div><div className="cw"><canvas ref={chartRef} role="img" aria-label="Meta"/></div></>
:<div style={{textAlign:'center',padding:'2rem',color:'var(--f)',fontSize:13}}>{metaLoading?'Cargando...':metaAccounts.length===0?'Token no configurado':'Sin datos'}</div>}
</div>}
{current.canales?.filter(c=>c!=='meta').map(canal=><div key={canal} className="wi"><div className="wh"><div className="wt">{LC[canal]||canal}</div></div><div style={{textAlign:'center',padding:'1.5rem',color:'var(--f)',fontSize:12}}>Próximamente</div></div>)}
</div>
</div>}
</div>
</div>
{showModal&&<div className="mb" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
<div className="mo">
<div className="mt">Nuevo cliente</div>
<div className="fg"><label className="fl">Nombre</label><input className="fi" value={newCliente.nombre} onChange={e=>setNewCliente(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Grand Bar"/></div>
<div className="fg"><label className="fl">Estado</label><select className="fi" value={newCliente.estado} onChange={e=>setNewCliente(p=>({...p,estado:e.target.value}))}><option value="activo">Activo</option><option value="revisar">Revisar</option><option value="pausado">Pausado</option></select></div>
<div className="fg"><label className="fl">Canales</label><div className="chg">{Object.entries(LC).map(([k,v])=><div key={k} className={`co${newCliente.canales.includes(k)?' sel':''}`} onClick={()=>toggleCanal(k)}>{v}</div>)}</div></div>
<div className="mf"><button className="bn" onClick={()=>setShowModal(false)}>Cancelar</button><button className="bn bp" onClick={saveCliente}>Guardar</button></div>
</div>
</div>}
</>);}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
function now(){return new Date().toISOString().slice(0,10);}
