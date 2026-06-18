export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN;
  const { account_id } = req.query;
  
  if (!token) {
    return res.json({ error: 'TOKEN NO CONFIGURADO' });
  }

  // Test 1: verificar token
  const r1 = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`);
  const d1 = await r1.json();
  
  if (account_id) {
    // Test 2: intentar acceder al account_id
    const acctId = account_id.startsWith('act_') ? account_id : `act_${account_id}`;
    const r2 = await fetch(
      `https://graph.facebook.com/v21.0/${acctId}/insights?fields=name&access_token=${token}`
    );
    const d2 = await r2.json();
    
    return res.json({
      token_valid: r1.status === 200,
      user: d1,
      account_test: {
        account_id_sent: account_id,
        account_id_used: acctId,
        status: r2.status,
        response: d2
      }
    });
  }

  return res.json({ 
    token_valid: r1.status === 200,
    user: d1
  });
}
