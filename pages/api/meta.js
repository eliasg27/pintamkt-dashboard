export default async function handler(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
const token=process.env.META_ACCESS_TOKEN;
if(!token)return res.status(500).json({error:'META_ACCESS_TOKEN no configurado'});
const{account_id,since,until}=req.query;
if(!account_id){
  try{
    const r=await fetch('https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency,account_status,amount_spent&access_token='+token);
    const d=await r.json();
    if(d.error)return res.status(400).json({error:d.error.message});
    return res.json(d);
  }catch(e){return res.status(500).json({error:e.message});}
}
const s=since||ago(30);
const u=until||today();
try{
  const url='https://graph.facebook.com/v19.0/'+account_id+'/insights?fields=impressions,clicks,spend,reach,cpm,cpc,actions&time_range={"since":"'+s+'","until":"'+u+'"}&time_increment=1&access_token='+token;
  const r=await fetch(url);
  const d=await r.json();
  if(d.error)return res.status(400).json({error:d.error.message});
  const rows=d.data||[];
  const totals=rows.reduce((acc,row)=>{
    acc.impressions=(acc.impressions||0)+parseInt(row.impressions||0);
    acc.clicks=(acc.clicks||0)+parseInt(row.clicks||0);
    acc.spend=(acc.spend||0)+parseFloat(row.spend||0);
    acc.reach=(acc.reach||0)+parseInt(row.reach||0);
    const msgs=(row.actions||[]).find(a=>a.action_type==='onsite_conversion.messaging_conversation_started_7d'||a.action_type==='onsite_conversion.messaging_first_reply');
    if(msgs)acc.messages=(acc.messages||0)+parseInt(msgs.value||0);
    return acc;
  },{});
  return res.json({daily:rows,totals,period:{since:s,until:u}});
}catch(e){return res.status(500).json({error:e.message});}
}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
function today(){return new Date().toISOString().slice(0,10);}
