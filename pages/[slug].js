import{useEffect,useState,useRef}from'react';import{useRouter}from'next/router';import{createClient}from'@supabase/supabase-js';import Head from'next/head';
const sb=createClient('https://nlouwkcytkmyjexperyt.supabase.co','sb_publishable_hIaWxoZnopBtZuaO-hy3eQ_4WAVgHDW');
const META={'grand-bar':'act_4152259048398395','la-vene':'act_127677109213204','samaco':'act_1153422045104277','pinta-mkt':'act_193502403381136','ipoint':'act_1366068537323661','dr-burela':'act_916281750024729','bermudez-moya':'act_335381199272442','cubos-de-chacras':'act_557798890125953','luly-lupe':'act_925977716485358','gandolfo':'act_121743560347797'};
const FB={'grand-bar':'1161529683700328','luly-lupe':'899148866606170','cubos-de-chacras':'588794477655674','gandolfo':'209132348942245','dr-burela':'123108927556257','samaco':'1525936594297047','bermudez-moya':'2270673449865573'};
const IG={'gandolfo':'17841439626709103','samaco':'17841412999937350','bermudez-moya':'17841410658734825'};
const DMODS={meta_resumen:true,meta_rendimiento:true,meta_resultados:true,meta_campanas:true,facebook_organico:false,instagram_organico:false};
function fmt(n){if(!n&&n!==0)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return Math.round(n).toString();}
function fm(n){return n?'$'+fmt(n):'—';}
function fp(n){return n?n.toFixed(2)+'%':'—';}
function fd(d){return d.toISOString().slice(0,10);}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return fd(d);}
function hoy(){return fd(new Date());}
function Dlt({v}){if(v==null)return null;return<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:v>=0?'#E1F5EE':'#FBEAEA',color:v>=0?'#0F6E56':'#A32D2D',marginLeft:6}}>{v>=0?'↑':'↓'}{Math.abs(v)}%</span>;}
function KPI({label,val,sub,delta}){return<div style={{background:'#fff',border:'.5px solid rgba(0,0,0,.09)',borderRadius:12,padding:'1rem 1.1rem'}}><div style={{fontSize:10,color:'#9c9a92',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600}}>{label}</div><div style={{fontSize:24,fontWeight:700,letterSpacing:'-.02em'}}>{val}</div><div style={{fontSize:11,color:'#9c9a92',marginTop:4,display:'flex',alignItems:'center',gap:4}}>{sub}<Dlt v={delta}/></div></div>;}

export default function ClientePage(){
const{slug}=useRouter().query;
const[c,setC]=useState(null);
const[loading,setLoading]=useState(true);
const[df,setDf]=useState(ago(30));
const[dt,setDt]=useState(hoy());
const[md,setMd]=useState(null);
const[fb,setFb]=useState(null);
const[ig,setIg]=useState(null);
const[tab,setTab]=useState('resumen');
const ref=useRef(null);const ci=useRef(null);

useEffect(()=>{if(slug)sb.from('clientes').select('*').eq('slug',slug).single().then(({data})=>{setC(data);setLoading(false);});},[slug]);
useEffect(()=>{
  if(!c)return;
  const m={...DMODS,...(c.modulos||{})};
  if(m.meta_resumen||m.meta_rendimiento)fetch('/api/meta?account_id='+META[slug]+'&since='+df+'&until='+dt).then(r=>r.json()).then(d=>{if(!d.error)setMd(d);});
  if(m.facebook_organico&&FB[slug])fetch('/api/organic?page_id='+FB[slug]+'&since='+df+'&until='+dt).then(r=>r.json()).then(d=>{if(!d.error)setFb(d);});
  if(m.instagram_organico&&IG[slug])fetch('/api/organic?ig_id='+IG[slug]+'&since='+df+'&until='+dt).then(r=>r.json()).then(d=>{if(!d.error)setIg(d);});
},[c,df,dt]);
useEffect(()=>{
  if(!md?.daily||!ref.current)return;
  const s=document.getElementById('cjs');
  const build=()=>{
    if(!window.Chart||!ref.current)return;
    if(ci.current)ci.current.destroy();
    const rows=md.daily;const lbs=rows.map(d=>d.date_start?.slice(5));
    const ds=tab==='rendimiento'?[{label:'CTR%',data:rows.map(d=>parseFloat(d.ctr||0)),borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,0.1)',fill:true,tension:0.3,type:'line',yAxisID:'y'},{label:'CPM',data:rows.map(d=>parseFloat(d.cpm||0)),backgroundColor:'#B5D4F4',borderRadius:3,yAxisID:'y2'}]:[{label:'Clics',data:rows.map(d=>parseInt(d.clicks||0)),backgroundColor:'#1D9E75',borderRadius:3,yAxisID:'y'},{label:'Gasto',data:rows.map(d=>parseFloat(d.spend||0)),backgroundColor:'#9FE1CB',borderRadius:3,yAxisID:'y2'}];
    ci.current=new window.Chart(ref.current,{type:'bar',data:{labels:lbs,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{font:{size:10},boxWidth:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{ticks:{font:{size:9}}},y2:{position:'right',grid:{display:false},ticks:{font:{size:9}}}}}});
  };
  if(!s){const el=document.createElement('script');el.id='cjs';el.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';el.onload=build;document.head.appendChild(el);}
  else if(window.Chart)build();else s.addEventListener('load',build);
},[md,tab]);

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#9c9a92',fontFamily:'-apple-system,sans-serif',fontSize:13}}>Cargando...</div>;
if(!c)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#9c9a92',fontFamily:'-apple-system,sans-serif',fontSize:13}}>Cliente no encontrado.</div>;

const m={...DMODS,...(c.modulos||{})};
const t=md?.totals||{};const dl=md?.deltas||{};const camps=md?.campaigns||[];
const tabs=[];
if(m.meta_resumen)tabs.push({k:'resumen',l:'Resumen'});
if(m.meta_rendimiento)tabs.push({k:'rendimiento',l:'Rendimiento'});
if(m.meta_resultados)tabs.push({k:'resultados',l:'Resultados'});
if(m.meta_campanas)tabs.push({k:'campanas',l:'Campañas'});
if(m.facebook_organico)tabs.push({k:'facebook',l:'📘 Facebook'});
if(m.instagram_organico)tabs.push({k:'instagram',l:'📸 Instagram'});

const g4={display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:'1rem'};
const card={background:'#fff',border:'.5px solid rgba(0,0,0,.09)',borderRadius:12,padding:'1.2rem',marginBottom:'1rem'};

return<>
<Head><title>{c.nombre} — Reporte pintamkt</title></Head>
<style>{`*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f8f7f4;color:#1a1a18;font-size:14px}@media print{.np{display:none!important}body{background:#fff}}`}</style>
<div style={{background:'#fff',borderBottom:'.5px solid rgba(0,0,0,.09)',padding:'0 2rem',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
  <div style={{display:'flex',alignItems:'center',gap:12}}>
    <div style={{fontWeight:600,color:'#1D9E75',fontSize:13}}>● pintamkt</div>
    <div style={{width:1,height:18,background:'rgba(0,0,0,.09)'}}/>
    <div style={{fontWeight:600,fontSize:15}}>{c.nombre}</div>
    <div style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'#f8f7f4',border:'.5px solid rgba(0,0,0,.09)',color:'#6b6a65'}}>{df} → {dt}</div>
  </div>
  <div style={{display:'flex',alignItems:'center',gap:8}} className="np">
    <input type="date" value={df} onChange={e=>setDf(e.target.value)} style={{fontSize:12,padding:'4px 8px',borderRadius:8,border:'.5px solid rgba(0,0,0,.15)',background:'#f8f7f4',color:'#1a1a18'}}/>
    <span style={{fontSize:12,color:'#9c9a92'}}>→</span>
    <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={{fontSize:12,padding:'4px 8px',borderRadius:8,border:'.5px solid rgba(0,0,0,.15)',background:'#f8f7f4',color:'#1a1a18'}}/>
    {[7,30,90].map(n=><button key={n} onClick={()=>{setDf(ago(n));setDt(hoy());}} style={{fontSize:11,padding:'5px 10px',borderRadius:8,border:'.5px solid rgba(0,0,0,.15)',background:'#f8f7f4',cursor:'pointer'}}>{n}d</button>)}
    <button onClick={()=>window.print()} style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'none',background:'#1D9E75',color:'#fff',cursor:'pointer',fontWeight:500}}>⬇ PDF</button>
  </div>
</div>

<div style={{maxWidth:1100,margin:'0 auto',padding:'2rem'}}>
  <div style={{background:'linear-gradient(135deg,#0F6E56,#1D9E75)',borderRadius:16,padding:'1.5rem 2rem',color:'#fff',marginBottom:'1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <div><div style={{fontSize:26,fontWeight:700,letterSpacing:'-.02em'}}>{c.nombre}</div><div style={{fontSize:12,opacity:.8,marginTop:4}}>Período: {df} → {dt}</div></div>
    <div style={{textAlign:'right'}}><div style={{fontSize:11,padding:'4px 12px',borderRadius:20,background:'rgba(255,255,255,.2)'}}>{tabs.length} módulos activos</div><div style={{fontSize:11,opacity:.7,marginTop:6}}>Reporte pintamkt</div></div>
  </div>

  <div style={{display:'flex',gap:0,borderBottom:'.5px solid rgba(0,0,0,.09)',marginBottom:'1.5rem',overflowX:'auto'}} className="np">
    {tabs.map(tb=><div key={tb.k} onClick={()=>setTab(tb.k)} style={{fontSize:13,padding:'8px 20px',cursor:'pointer',color:tab===tb.k?'#1D9E75':'#6b6a65',borderBottom:tab===tb.k?'2px solid #1D9E75':'2px solid transparent',marginBottom:-1,whiteSpace:'nowrap',fontWeight:tab===tb.k?600:400}}>{tb.l}</div>)}
  </div>

  {tab==='resumen'&&md&&<>
    <div style={g4}>
      <KPI label="Alcance" val={fmt(t.reach)} sub="personas" delta={dl.reach}/>
      <KPI label="Impresiones" val={fmt(t.impressions)} sub="total" delta={dl.impressions}/>
      <KPI label="Clics" val={fmt(t.clicks)} sub="en anuncios" delta={dl.clicks}/>
      <KPI label="Gasto" val={fm(t.spend)} sub="total" delta={dl.spend}/>
    </div>
    <div style={g4}>
      <KPI label="CPM" val={fm(t.cpm)} sub="por mil imp." delta={dl.cpm}/>
      <KPI label="CPC" val={fm(t.cpc)} sub="por clic" delta={dl.cpc}/>
      <KPI label="CTR" val={fp(t.ctr)} sub="click rate" delta={dl.ctr}/>
      <KPI label="Frecuencia" val={t.frequency?t.frequency.toFixed(2):'—'} sub="veces/persona"/>
    </div>
    <div style={card}><div style={{fontSize:11,fontWeight:600,color:'#9c9a92',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>Clics y Gasto diario</div><div style={{position:'relative',height:200}}><canvas ref={ref} role="img" aria-label="Meta Ads diario"/></div></div>
  </>}

  {tab==='rendimiento'&&md&&<>
    <div style={g4}>
      <KPI label="CTR" val={fp(t.ctr)} sub="click-through rate" delta={dl.ctr}/>
      <KPI label="CPM" val={fm(t.cpm)} sub="costo por mil" delta={dl.cpm}/>
      <KPI label="CPC" val={fm(t.cpc)} sub="costo por clic" delta={dl.cpc}/>
      <KPI label="Frecuencia" val={t.frequency?t.frequency.toFixed(2):'—'} sub="veces/persona"/>
    </div>
    <div style={card}><div style={{fontSize:11,fontWeight:600,color:'#9c9a92',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>CTR y CPM diario</div><div style={{position:'relative',height:200}}><canvas ref={ref} role="img" aria-label="Rendimiento"/></div></div>
    <div style={{padding:'10px 14px',background:'#f8f7f4',borderRadius:10,fontSize:12,color:'#9c9a92'}}>Período anterior: CPM {fm(md.totalsPrev?.cpm)} · CPC {fm(md.totalsPrev?.cpc)} · CTR {fp(md.totalsPrev?.ctr)}</div>
  </>}

  {tab==='resultados'&&md&&<div style={g4}>
    <KPI label="Mensajes" val={fmt(t.messages)||'0'} sub="conversaciones" delta={dl.messages}/>
    <KPI label="Leads" val={fmt(t.leads)||'0'} sub="formularios" delta={dl.leads}/>
    <KPI label="Compras" val={fmt(t.purchases)||'0'} sub="transacciones" delta={dl.purchases}/>
    <KPI label="ROAS" val={t.roas?t.roas.toFixed(2)+'x':'—'} sub="retorno en ads"/>
  </div>}

  {tab==='campanas'&&<div style={card}>
    <div style={{fontSize:11,fontWeight:600,color:'#9c9a92',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>Campañas · {camps.length} activas</div>
    {camps.length===0?<div style={{textAlign:'center',padding:'2rem',color:'#9c9a92',fontSize:13}}>Sin campañas.</div>:
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead><tr>{['Campaña','Imp.','Clics','CTR','CPM','Gasto','Result.'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:10,fontWeight:600,color:'#9c9a92',borderBottom:'.5px solid rgba(0,0,0,.09)',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
      <tbody>{camps.map((camp,i)=>{
        const res=(camp.actions||[]).reduce((s,a)=>s+parseInt(a.value||0),0);
        return<tr key={i}><td style={{padding:'10px 12px',fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderBottom:'.5px solid rgba(0,0,0,.09)'}}>{camp.campaign_name}</td>{[fmt(parseInt(camp.impressions||0)),fmt(parseInt(camp.clicks||0)),fp(parseFloat(camp.ctr||0)),fm(parseFloat(camp.cpm||0))].map((v,j)=><td key={j} style={{padding:'10px 12px',borderBottom:'.5px solid rgba(0,0,0,.09)'}}>{v}</td>)}<td style={{padding:'10px 12px',fontWeight:600,borderBottom:'.5px solid rgba(0,0,0,.09)'}}>{fm(parseFloat(camp.spend||0))}</td><td style={{padding:'10px 12px',borderBottom:'.5px solid rgba(0,0,0,.09)'}}>{res>0?<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'#E1F5EE',color:'#0F6E56',fontWeight:600}}>{res}</span>:'—'}</td></tr>;
      })}</tbody>
    </table></div>}
  </div>}

  {tab==='facebook'&&<>
    {fb?<><div style={g4}>
      <KPI label="Fans" val={fmt(fb.pag[slug].jse?.fan_count)} sub="total"/>
      <KPI label="Alcance org." val={fmt(fb.totals?.page_reach)} sub="período"/>
      <KPI label="Impresiones" val={fmt(fb.totals?.page_impressions_organic)} sub="orgánicas"/>
      <KPI label="Engagement" val={fmt(fb.totals?.page_engaged_users)} sub="usuarios"/>
    </div><div style={g4}>
      <KPI label="Nuevos fans" val={fmt(fb.totals?.page_fan_adds)} sub="ganados"/>
      <KPI label="Fans perdidos" val={fmt(fb.totals?.page_fan_removes)} sub="bajas"/>
      <KPI label="Visitas" val={fmt(fb.totals?.page_views_total)} sub="a la página"/>
      <KPI label="Post engagement" val={fmt(fb.totals?.page_post_engagements)} sub="interacciones"/>
    </div></>:<div style={{textAlign:'center',padding:'3rem',color:'#9c9a92',fontSize:13}}>Sin datos de Facebook orgánico.</div>}
  </>}

  {tab==='instagram'&&<>
    {ig?<><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,padding:'12px 16px',background:'#fff',borderRadius:12,border:'.5px solid rgba(0,0,0,.09)'}}>
      <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20}}>📸</div>
      <div><div style={{fontWeight:600,fontSize:15}}>@{ig.account?.username||ig.account?.name}</div><div style={{fontSize:12,color:'#9c9a92'}}>{fmt(ig.totals?.followers_total)} seguidores</div></div>
    </div>
    <div style={g4}>
      <KPI label="Seguidores" val={fmt(ig.totals?.followers_total)} sub="total"/>
      <KPI label="Alcance" val={fmt(ig.totals?.reach)} sub="período"/>
      <KPI label="Impresiones" val={fmt(ig.totals?.impressions)} sub="total"/>
      <KPI label="Visitas perfil" val={fmt(ig.totals?.profile_views)} sub="período"/>
    </div>
    {ig.posts?.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>{ig.posts.slice(0,9).map((p,i)=>{
      const ins=p.insights?.data||[];const gm=name=>{const m=ins.find(x=>x.name===name);return m?.values?.[0]?.value||0;};
      return<div key={i} style={{background:'#fff',border:'.5px solid rgba(0,0,0,.09)',borderRadius:10,overflow:'hidden'}}>
        {(p.media_url||p.thumbnail_url)&&<img src={p.thumbnail_url||p.media_url} style={{width:'100%',height:110,objectFit:'cover',background:'#f8f7f4'}} alt="post" onError={e=>{e.target.style.display='none';}}/>}
        <div style={{padding:10}}><div style={{fontSize:11,color:'#9c9a92',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.caption?.slice(0,50)||'(sin caption)'}</div><div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginTop:6,color:'#9c9a92'}}><span>❤️ {fmt(gm('likes'))}</span><span>💬 {fmt(gm('comments'))}</span><span>👁 {fmt(gm('reach'))}</span></div></div>
      </div>;
    })}</div>}
    </>:<div style={{textAlign:'center',padding:'3rem',color:'#9c9a92',fontSize:13}}>Sin datos de Instagram.</div>}
  </>}

  <div style={{textAlign:'center',padding:'2rem',fontSize:11,color:'#9c9a92',borderTop:'.5px solid rgba(0,0,0,.09)',marginTop:'2rem'}}>Reporte generado por <strong>pintamkt</strong> · {new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</div>
</div>
</>;
}
