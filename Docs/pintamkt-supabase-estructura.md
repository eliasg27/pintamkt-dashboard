# PintaMKT Dashboard – Estructura de Supabase

**Proyecto:** `tjpwiwtwapxspdtmvjbo`
**URL:** `https://tjpwiwtwapxspdtmvjbo.supabase.co`

---

## Tablas principales

### `clientes`
Tabla central. Cada fila es un cliente de la agencia. Los IDs de las cuentas conectadas (Meta, Facebook, Instagram) viven acá. Cuando se agrega un cliente nuevo, no hace falta tocar código — se inserta una fila acá.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | int8 (auto) | PK |
| `slug` | text | URL del dashboard del cliente (ej. `grand-bar`) |
| `nombre` | text | Nombre visible |
| `meta_ad_account_id` | text | ID de cuenta publicitaria de Meta, **con prefijo `act_`** (ej. `act_4152259048398395`) |
| `fb_page_id` | text | ID de la página de Facebook |
| `ig_account_id` | text | ID de la cuenta de Instagram Business |
| `modulos` | jsonb | Toggles de qué módulos se ven en el dashboard del cliente |
| `estado` | text | `activo` / `pausado` / `revisar` |
| `logo_url`, `color`, `canales` | — | Campos auxiliares |
| `created_at`, `updated_at` | timestamptz | |

**Ejemplo de `modulos`:**
```json
{
  "meta_resumen": true,
  "meta_rendimiento": true,
  "meta_campanas": true,
  "meta_resultados": true,
  "facebook_organico": true,
  "instagram_organico": true,
  "ga4": true,
  "woocommerce": true,
  "google_ads": false,
  "wordpress": false,
  "mensajes": false,
  "bot": true
}
```

---

### `client_integrations`
Integraciones por cliente que necesitan credenciales propias (GA4, WooCommerce, etc.). Una fila por cliente + integración.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `client_id` | bigint | FK → `clientes.id` |
| `integration_type` | text | `ga4`, `woocommerce`, etc. |
| `credentials` | jsonb | Tokens, secrets, refresh tokens |
| `config` | jsonb | property_id, site_url, etc. |
| `active` | boolean | Para desactivar sin borrar |

**Ejemplo GA4:**
```json
credentials: { "type": "oauth2", "client_id": "...", "client_secret": "...", "refresh_token": "..." }
config: { "property_id": "510065617" }
```

**Ejemplo WooCommerce:**
```json
credentials: { "consumer_key": "ck_...", "consumer_secret": "cs_..." }
config: { "site_url": "https://samacoonline.com.ar" }
```

> Meta NO usa esta tabla — los IDs viven directo en `clientes` y el token global está en una env var de Vercel (`META_ACCESS_TOKEN`).

---

### `client_manual_data`
Datos que se cargan a mano cada mes (típicamente WhatsApp Bot — métricas que no se obtienen por API).

| Columna | Tipo |
|---|---|
| `id` | int8 |
| `client_id` | bigint → `clientes.id` |
| `month` | text (formato `YYYY-MM`) |
| `data` | jsonb |

---

### `metricas`
Snapshots históricos opcionales. No es la fuente principal — la mayoría de los datos se traen en tiempo real desde las APIs.

### `mensajes`
Registro de mensajes / interacciones (WhatsApp, etc.).

### `usuarios`
Usuarios del panel interno (login de la agencia).

---

## Cómo se consumen los datos

El dashboard **no guarda** las métricas de Meta/GA4/WooCommerce en Supabase. Las pide a las APIs en tiempo real desde endpoints en `/pages/api/`:

| Endpoint | Lee de Supabase | Llama API |
|---|---|---|
| `/api/meta` | `clientes.meta_ad_account_id` | Meta Graph API v21.0 (token global en env var) |
| `/api/organic` | `clientes.fb_page_id` / `ig_account_id` | Meta Graph API |
| `/api/ga4` | `client_integrations` (type=ga4) | Google Analytics Data API v1 |
| `/api/woocommerce` | `client_integrations` (type=woocommerce) | WooCommerce REST API |

Por eso si se agrega un cliente nuevo:
1. INSERT en `clientes` con los IDs
2. Si tiene GA4 o WooCommerce, INSERT en `client_integrations`
3. Listo — el dashboard funciona sin redeploy

---

## Convenciones importantes

1. **`meta_ad_account_id` SIEMPRE va con prefijo `act_`** (`act_4152259048398395`, no `4152259048398395`)
2. **RLS está deshabilitado** en `clientes`, `client_integrations`, `client_manual_data`, `metricas`, `mensajes`, `usuarios` — la auth se maneja en la capa de aplicación
3. **Conexión desde Next.js** usa la `anon/publishable key`, no la service role (excepto endpoints server-side)

---

## Variables de entorno (Vercel)

- `META_ACCESS_TOKEN` — System User token de `claude-real` (System User ID `122105955579301555`). Con permisos `ads_management`, `ads_read`, `pages_read_engagement`, `pages_show_list`, `business_management`, `instagram_basic`.

---

## Diagrama rápido

```
clientes (1) ──< (N) client_integrations
   │
   ├──< (N) client_manual_data
   ├──< (N) metricas
   └──< (N) mensajes

usuarios (independiente — auth de la agencia)
```
