import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ClientDashboard from '../components/ClientDashboard';
import { useAuth } from '../context/AuthContext';
import { sb } from '../lib/supabase';

const DEFAULT_MODS = { meta_resumen: true, meta_rendimiento: true, meta_resultados: true, meta_campanas: true, facebook_organico: false, instagram_organico: false, mensajes: false, google_ads: false, ga4: false, woocommerce: false, bot: false };
const LOGO_MAP = { bermudez: 'bermudez', cubos: 'cubos', cristiano: 'cristiano', gandolfo: 'gandolfo', 'grand bar': 'grandbar', grand: 'grandbar', vitta: 'lavitta', luly: 'luly', pinta: 'pinta', samaco: 'samaco' };

function getLogoSlug(client) {
  const name = (client.nombre || '').toLowerCase();
  for (const [match, logo] of Object.entries(LOGO_MAP)) {
    if (name.includes(match)) return logo;
  }
  return client.slug || null;
}

const ALL_CHANNELS = [
  { key: 'meta',        label: 'Meta Ads',         icon: 'icono_meta_ads.png',   conn: (c, m) => !!c.meta_ad_account_id },
  { key: 'instagram',   label: 'Instagram',         icon: 'icono_instagram.svg',  conn: (c, m) => !!(m.instagram_organico && c.ig_account_id) },
  { key: 'facebook',    label: 'Facebook',          icon: 'icono_facebook.svg',   conn: (c, m) => !!(m.facebook_organico && c.fb_page_id) },
  { key: 'ga4',         label: 'Google Analytics',  icon: 'google_analitycs.svg', conn: (c, m) => !!m.ga4 },
  { key: 'googleads',   label: 'Google Ads',        icon: 'icono_google_ads.svg', conn: (c, m) => !!m.google_ads },
  { key: 'woocommerce', label: 'Ecommerce',         icon: 'ecommerce.svg',        conn: (c, m) => !!m.woocommerce },
  { key: 'linkedin',    label: 'LinkedIn',          icon: 'linkedin.png',         conn: () => false },
  { key: 'bot',         label: 'Bot',               icon: 'bot.svg',              conn: (c, m) => !!m.bot },
];

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return fmtDate(d); }

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#F8F7F4;--s:#fff;--b:rgba(0,0,0,.08);--bm:rgba(0,0,0,.13);--t:#1A1A18;--m:#6B6A65;--f:#8A8983;--a:#EBE300;--ad:#C8BC00}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#111110;color:var(--t);font-size:14px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .dash-sb-nav::-webkit-scrollbar{display:none}
  .dash-ni{display:flex;align-items:center;gap:9px;padding:7px 1rem;font-size:13px;color:rgba(255,255,255,.55);cursor:pointer;border-right:2px solid transparent;transition:background .12s,color .12s}
  .dash-ni:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.85)}
  .dash-ni.ac{background:rgba(255,255,255,.08);color:#fff;font-weight:500;border-right-color:#EBE300}
  .dash-user:hover{background:rgba(255,255,255,.04)}
  .settings-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:13px;outline:none;transition:border-color .15s;font-family:inherit}
  .settings-input:focus{border-color:rgba(235,227,0,.5)}
`;

export default function DashboardPage() {
  const router = useRouter();
  const { session, profile, loading: authLoading, signOut, updateProfile } = useAuth();

  const [client, setClient] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeCh, setActiveCh] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setDateTo(fmtDate(new Date()));
    setDateFrom(ago(30));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.push('/login'); return; }
    if (profile?.role === 'admin') { router.push('/'); return; }
    if (!profile || !profile.client_id) { router.push('/login'); return; }
    if (profile.nombre) setEditNombre(profile.nombre);
  }, [authLoading, session, profile]);

  useEffect(() => {
    if (!profile?.client_id) return;
    sb.from('clientes').select('*').eq('id', profile.client_id).single()
      .then(({ data }) => { if (data) setClient(data); });
  }, [profile]);

  async function saveName() {
    if (!editNombre.trim()) return;
    setSavingName(true);
    await updateProfile({ nombre: editNombre.trim() });
    setSavingName(false);
    setShowSettings(false);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  if (authLoading || !session || !client) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111110' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(235,227,0,.18)', borderTopColor: '#EBE300', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`*{margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}body{background:#111110}`}</style>
    </div>
  );

  const mods = { ...DEFAULT_MODS, ...(client.modulos || {}) };
  const connectedChannels = ALL_CHANNELS.filter(ch => ch.conn(client, mods));
  const displayName = profile?.nombre || session?.user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <Head><title>{client.nombre} · Pintamkt</title></Head>
      <style>{CSS}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#111110' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 220, minWidth: 220, background: '#111110', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>

          {/* Logo */}
          <div style={{ padding: '.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            <img src="/Logos/pinta-logo.png" alt="Pinta" style={{ height: 48, objectFit: 'contain', objectPosition: 'left' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <span style={{ display: 'none', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EBE300', display: 'inline-block' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>pintamkt</span>
            </span>
          </div>

          {/* Nav */}
          <div className="dash-sb-nav" style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '.5rem 0' }}>
            <div style={{ padding: '10px 1rem 4px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EBE300', letterSpacing: '.04em', opacity: .7, textTransform: 'uppercase' }}>Mi Dashboard</span>
            </div>
            <div style={{ height: .5, background: 'rgba(255,255,255,.07)', margin: '4px 12px' }} />

            {/* Resumen */}
            <div className={`dash-ni${activeCh === null ? ' ac' : ''}`} onClick={() => setActiveCh(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".85" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".85" />
              </svg>
              <span>Resumen</span>
            </div>

            {connectedChannels.length > 0 && <>
              <div style={{ height: .5, background: 'rgba(255,255,255,.07)', margin: '6px 12px' }} />
              <div style={{ padding: '4px 1rem', fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase' }}>
                Canales
              </div>
              {connectedChannels.map(ch => (
                <div
                  key={ch.key}
                  className={`dash-ni${activeCh === ch.key ? ' ac' : ''}`}
                  onClick={() => setActiveCh(activeCh === ch.key ? null : ch.key)}
                >
                  <img src={`/Logos/Logos_redes_sociales/${ch.icon}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                  <span>{ch.label}</span>
                </div>
              ))}
            </>}

            <div style={{ height: .5, background: 'rgba(255,255,255,.07)', margin: '6px 12px' }} />
            <div
              className="dash-ni"
              onClick={() => { setEditNombre(profile?.nombre || ''); setShowSettings(true); }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span>Configuración</span>
            </div>
          </div>

          {/* User */}
          <div
            className="dash-user"
            onClick={() => { setEditNombre(profile?.nombre || ''); setShowSettings(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '.7rem 1rem', borderTop: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', transition: 'background .12s', flexShrink: 0 }}
          >
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EBE300', color: '#111110', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.32)' }}>{client.nombre}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: 'rgba(255,255,255,.22)' }}>
              <circle cx="7" cy="4" r="1.2" fill="currentColor" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              <circle cx="7" cy="10" r="1.2" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

          {/* Header */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '.5px solid var(--b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--s)', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', border: '.5px solid var(--b)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={`/Logos/Logos_clientes/${getLogoSlug(client)}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--t)', background: 'var(--bg)' }}>
                  {client.nombre.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>{client.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--f)', marginTop: 2 }}>Período: {dateFrom} → {dateTo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo}
                style={{ padding: '7px 12px', borderRadius: 8, border: '.5px solid var(--bm)', background: 'var(--bg)', color: 'var(--t)', fontSize: 12 }} />
              <span style={{ fontSize: 12, color: 'var(--f)' }}>→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} max={fmtDate(new Date())}
                style={{ padding: '7px 12px', borderRadius: 8, border: '.5px solid var(--bm)', background: 'var(--bg)', color: 'var(--t)', fontSize: 12 }} />
              {[['7d', 7], ['30d', 30], ['90d', 90]].map(([l, n]) => (
                <button key={l}
                  onClick={() => { setDateTo(fmtDate(new Date())); setDateFrom(ago(n)); }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '.5px solid var(--bm)', background: 'var(--bg)', color: 'var(--t)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {dateFrom && <ClientDashboard client={client} dateFrom={dateFrom} dateTo={dateTo} activeCh={activeCh} onActiveCh={setActiveCh} />}
        </div>
      </div>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div style={{ background: '#1a1a18', borderRadius: 16, padding: '1.5rem', width: 380, maxWidth: '100%', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Configuración</span>
              <button onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>
                Nombre para mostrar
              </label>
              <input
                className="settings-input"
                value={editNombre}
                onChange={e => setEditNombre(e.target.value)}
                placeholder={displayName}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <button onClick={() => setShowSettings(false)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveName} disabled={savingName}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: savingName ? 'rgba(235,227,0,.4)' : '#EBE300', color: '#111110', fontSize: 13, fontWeight: 700, cursor: savingName ? 'not-allowed' : 'pointer' }}>
                {savingName ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,.07)' }}>
              <button onClick={handleSignOut}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid rgba(229,57,53,.25)', background: 'rgba(229,57,53,.07)', color: '#ef9a9a', fontSize: 13, cursor: 'pointer' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
