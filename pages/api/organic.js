export default async function handler(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
const token=process.env.META_ACCESS_TOKEN;
if(!token)return res.status(500).json({error:'META_ACCESS_TOKEN no configurado'});
const{page_id,ig_id,since,until}=req.query;
const s=since||ago(30);const u=until||today();
if(!page_id&&!ig_id){
  try{
    const r=await fetch('https://graph.facebook.com/v19.0/me/accounts?fields=name,id,instagram_business_account,fan_count,followers_count&access_token='+token);
    const d=await r.json();
    if(d.error)return res.status(400).json({error:d.error.message});
    return res.json(d);
  }catch(e){return res.status(500).json({error:e.message});}
}
if(page_id){
  try{
    const metrics='page_impressions,page_impressions_organic,page_reach,page_engaged_users,page_fan_adds,page_fan_removes,page_views_total,page_post_engagements';
    const[rI,rP,rF]=await Promise.all([
      fetch('https://graph.facebook.com/v19.0/'+page_id+'/insights?metric='+metrics+'&period=day&since='+s+'&until='+u+'&access_token='+token),
      fetch('https://graph.facebook.com/v19.0/'+page_id+'/posts?fields=id,message,created_time,insights.metric(post_impressions,post_impressions_organic,post_engaged_users,post_clicks,post_reactions_total)&since='+s+'&until='+u+'&limit=20&access_token='+token),
      fetch('https://graph.facebook.com/v19.0/'+page_id+'?fields=name,fan_count,followers_count,talking_about_count&access_token='+token)
    ]);
    const[dI,dP,dF]=await Promise.all([rI.json(),rP.json(),rF.json()]);
    if(dI.error)return res.status(400).json({error:dI.error.message});
    const totals={};
    (dI.data||[]).forEach(m=>{totals[m.name]=(m.values||[]).reduce((s,v)=>s+(v.value||0),0);});
    totals.fans_total=dF.fan_count||0;
    totals.followers_total=dF.followers_count||0;
    return res.json({type:'facebook',page:dF,totals,posts:dP.data||[],period:{since:s,until:u}});
  }catch(e){return res.status(500).json({error:e.message});}
}
if(ig_id){
  try{
    const igM='impressions,reach,profile_views,follower_count,accounts_engaged';
    const[rI,rP,rF]=await Promise.all([
      fetch('https://graph.facebook.com/v19.0/'+ig_id+'/insights?metric='+igM+'&period=day&since='+s+'&until='+u+'&access_token='+token),
      fetch('https://graph.facebook.com/v19.0/'+ig_id+'/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,insights.metric(impressions,reach,engagement,likes,comments,saved,shares)&since='+s+'&until='+u+'&limit=20&access_token='+token),
      fetch('https://graph.facebook.com/v19.0/'+ig_id+'?fields=name,username,followers_count,media_count&access_token='+token)
    ]);
    const[dI,dP,dF]=await Promise.all([rI.json(),rP.json(),rF.json()]);
    if(dI.error)return res.status(400).json({error:dI.error.message});
    const totals={};
    (dI.data||[]).forEach(m=>{totals[m.name]=(m.values||[]).reduce((s,v)=>s+(typeof v.value==='number'?v.value:0),0);});
    totals.followers_total=dF.followers_count||0;
    return res.json({type:'instagram',account:dF,totals,posts:dP.data||[],period:{since:s,until:u}});
  }catch(e){return res.status(500).json({error:e.message});}
}
return res.status(400).json({error:'Requiere page_id o ig_id'});
}
function ago(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
function today(){return new Date().toISOString().slice(0,10);}
