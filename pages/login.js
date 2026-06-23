import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { sb } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      sb.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data }) => {
          router.push(data?.role === 'admin' ? '/' : '/dashboard');
        });
    });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authErr } = await sb.auth.signInWithPassword({ email, password });

    if (authErr || !data?.user) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.');
      setLoading(false);
      return;
    }

    const { data: prof } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
    // Si no hay perfil todavía, mandamos al admin panel como fallback seguro
    router.push(prof?.role === 'client' ? '/dashboard' : '/');
  }

  return (
    <>
      <Head><title>Ingresar · Pintamkt</title></Head>
      <style dangerouslySetInnerHTML={{ __html: `
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0a0a0a;color:#fff}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bgMove{
          0%,100%{background-position:0% 0%,100% 100%,50% 50%}
          50%{background-position:15% 10%,85% 90%,50% 50%}
        }
        @keyframes borderGlow{
          0%{background-position:0% 50%}
          100%{background-position:300% 50%}
        }
        .login-page{
          position:fixed;inset:0;width:100%;height:100vh;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:1.5rem;overflow:hidden;isolation:isolate;
          background:
            radial-gradient(circle at 20% 30%,rgba(255,214,0,.18),transparent 35%),
            radial-gradient(circle at 80% 70%,rgba(255,214,0,.12),transparent 40%),
            linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 35%,#121212 65%,#0a0a0a 100%);
          background-size:135% 135%,145% 145%,100% 100%;
          background-repeat:no-repeat;
          animation:bgMove 15s ease infinite;
        }
        .login-card{position:relative;z-index:1;width:100%;max-width:400px;padding:2rem;border-radius:20px;background:rgba(255,255,255,.08);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);box-shadow:0 25px 80px rgba(0,0,0,.55);animation:fadeUp .5s .05s ease both}
        .login-card::before{content:'';position:absolute;inset:-1px;border-radius:20px;background:linear-gradient(130deg,transparent,rgba(255,214,0,.8),transparent);background-size:300% 300%;animation:borderGlow 5s linear infinite;z-index:-1}
        .login-input{width:100%;padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);color:#fff;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}
        .login-input:focus{border-color:#ffd600;box-shadow:0 0 0 3px rgba(255,214,0,.2)}
        .login-input::placeholder{color:#b0b0b0}
        .login-btn{width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#ffd600,#ffe866);color:#111;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .25s,box-shadow .25s,opacity .25s;letter-spacing:-.01em}
        .login-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,214,0,.4)}
        .login-btn:disabled{cursor:not-allowed;opacity:.58}
        @media (prefers-reduced-motion:reduce){.login-page,.login-card,.login-card::before{animation:none}}
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 30px #1a1a1a inset !important;
          -webkit-text-fill-color:#fff !important;
          caret-color:#fff;
        }
      ` }} />

      <div className="login-page">
        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '2.5rem', animation: 'fadeUp .5s ease' }}>
          <img
            src="/Logos/pinta-logo.png" alt="Pintamkt"
            style={{ height: 70, objectFit: 'contain' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFD600' }} />
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: '#fff' }}>pintamkt</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6, color: '#fff' }}>Bienvenido</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>
              Ingresá a tu panel de Pintamkt
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>
                Email
              </label>
              <input
                className="login-input"
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>
                Contraseña
              </label>
              <input
                className="login-input"
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(229,57,53,.1)', border: '1px solid rgba(229,57,53,.2)',
                color: '#ef9a9a', fontSize: 13, marginBottom: 14, lineHeight: 1.4
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="login-btn"
            >
              {loading
                ? <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.15)', borderTopColor: '#111110', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  Ingresando...
                </>
                : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ position: 'relative', zIndex: 1, marginTop: '1.75rem', fontSize: 11, color: '#b0b0b0', letterSpacing: '.02em' }}>
          Pintamkt · Panel de agencia
        </p>
      </div>
    </>
  );
}
