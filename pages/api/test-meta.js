export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN;
  
  if (!token) {
    return res.json({ error: 'TOKEN NO CONFIGURADO', token: 'undefined' });
  }

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${token}`
    );
    const d = await r.json();
    return res.json({ 
      status: r.status, 
      response: d,
      token_first_20: token.substring(0, 20) + '...'
    });
  } catch (e) {
    return res.json({ error: e.message });
  }
}
