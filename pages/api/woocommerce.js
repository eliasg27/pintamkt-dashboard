import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://tjpwiwtwapxspdtmvjbo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHdpd3R3YXB4c3BkdG12amJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDU5NjksImV4cCI6MjA5MzMyMTk2OX0.AtlQgeRcEPxjxg-epFkG-pd_BSttJEtbQE-cOy3LBxY'
);

export default async function handler(req, res) {
  const { slug, since, until } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  try {
    const { data: client } = await sb.from('clientes').select('id').eq('slug', slug).single();
    if (!client) return res.status(404).json({ error: 'client not found' });

    const { data: integration } = await sb
      .from('client_integrations')
      .select('credentials, config')
      .eq('client_id', client.id)
      .eq('integration_type', 'woocommerce')
      .eq('active', true)
      .single();

    if (!integration) return res.status(404).json({ error: 'no woocommerce integration' });

    const { credentials, config } = integration;
    const { consumer_key, consumer_secret } = credentials;
    const { site_url } = config;

    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}` };

    const dateFrom = since || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
    const dateTo = until || new Date().toISOString().slice(0,10);

    // Fetch orders, products and reports in parallel
    const [ordersRes, productsRes, reportsRes, customersRes] = await Promise.all([
      fetch(`${site_url}/wp-json/wc/v3/orders?per_page=100&after=${dateFrom}T00:00:00&before=${dateTo}T23:59:59&status=completed,processing`, { headers }),
      fetch(`${site_url}/wp-json/wc/v3/products?per_page=10&orderby=popularity&order=desc`, { headers }),
      fetch(`${site_url}/wp-json/wc/v3/reports/sales?date_min=${dateFrom}&date_max=${dateTo}`, { headers }),
      fetch(`${site_url}/wp-json/wc/v3/reports/customers/totals`, { headers }),
    ]);

    const [orders, products, reports, customers] = await Promise.all([
      ordersRes.json(), productsRes.json(), reportsRes.json(), customersRes.json()
    ]);

    if (orders.code) return res.status(400).json({ error: orders.message });

    // Calculate totals from orders
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Orders by day
    const byDay = {};
    orders.forEach(o => {
      const day = o.date_created?.slice(0, 10);
      if (!day) return;
      if (!byDay[day]) byDay[day] = { date: day, orders: 0, revenue: 0 };
      byDay[day].orders++;
      byDay[day].revenue += parseFloat(o.total || 0);
    });
    const daily = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    // Top products
    const productCount = {};
    orders.forEach(o => {
      (o.line_items || []).forEach(item => {
        if (!productCount[item.product_id]) productCount[item.product_id] = { name: item.name, qty: 0, revenue: 0 };
        productCount[item.product_id].qty += item.quantity;
        productCount[item.product_id].revenue += parseFloat(item.total || 0);
      });
    });
    const topProducts = Object.values(productCount).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    // Status breakdown
    const statusCount = {};
    orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

    const salesReport = Array.isArray(reports) ? reports[0] : null;

    // Prev period
    const daysDiff = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000*60*60*24)) || 30;
    const prevTo = new Date(dateFrom); prevTo.setDate(prevTo.getDate()-1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate()-daysDiff);
    const pF = prevFrom.toISOString().slice(0,10); const pT = prevTo.toISOString().slice(0,10);

    let prevRevenue = 0, prevOrders = 0;
    try {
      const prevOrdersRes = await fetch(`${site_url}/wp-json/wc/v3/orders?per_page=100&after=${pF}T00:00:00&before=${pT}T23:59:59&status=completed,processing`, { headers });
      const prevOrdersData = await prevOrdersRes.json();
      if (Array.isArray(prevOrdersData)) {
        prevOrders = prevOrdersData.length;
        prevRevenue = prevOrdersData.reduce((s,o) => s + parseFloat(o.total||0), 0);
      }
    } catch(e) {}

    const delta = (cur, prev) => prev > 0 ? Math.round(((cur-prev)/prev)*100) : null;
    const deltas = {
      revenue: delta(totalRevenue, prevRevenue),
      orders: delta(totalOrders, prevOrders),
    };

    res.json({
      totals: {
        revenue: totalRevenue,
        orders: totalOrders,
        avgOrderValue,
        totalTax: salesReport?.total_tax ? parseFloat(salesReport.total_tax) : 0,
        totalShipping: salesReport?.total_shipping ? parseFloat(salesReport.total_shipping) : 0,
      },
      daily,
      topProducts,
      statusCount,
      customers: Array.isArray(customers) ? customers : [],
      deltas,
    });
  } catch (e) {
    console.error('WooCommerce error:', e);
    res.status(500).json({ error: e.message });
  }
}
