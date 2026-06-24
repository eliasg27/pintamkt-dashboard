export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN;
  const { account_id } = req.query;
  
  if (!token) return res.json({ error: 'TOKEN NO CONFIGURADO' });

  // Test 1: info del token (scopes, app, expiry)
  const [r1, rDebug, rAccounts] = await Promise.all([
    fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`),
    fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`),
    fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${token}`),
  ]);

  const [d1, dDebug, dAccounts] = await Promise.all([r1.json(), rDebug.json(), rAccounts.json()]);

  if (account_id) {
    const acctId = account_id.startsWith('act_') ? account_id : `act_${account_id}`;
    const r2 = await fetch(`https://graph.facebook.com/v21.0/${acctId}/insights?fields=impressions&access_token=${token}`);
    const d2 = await r2.json();
    return res.json({
      user: d1,
      token_debug: dDebug?.data || dDebug,
      ad_accounts: dAccounts?.data || dAccounts,
      account_test: { account_id_used: acctId, status: r2.status, response: d2 }
    });
  }

  return res.json({ 
    user: d1,
    token_debug: dDebug?.data || dDebug,
    ad_accounts: dAccounts?.data || dAccounts,
  });
}
