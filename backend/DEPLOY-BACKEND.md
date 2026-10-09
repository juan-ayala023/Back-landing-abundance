# Despliegue del backend — Abundance Code

> Documento de traspaso. El frontend ya está en producción; falta el backend.
> Todo lo que hay aquí está verificado contra el código, no supuesto.

---

## 1 · De dónde venimos

**El frontend ya está subido y funcionando** en Hostinger, en `abundacecode.com`.

Se compiló con esta variable incrustada en el bundle:

```
VITE_API_URL=https://api.abundacecode.com
```

Eso significa que **el frontend ya está llamando a `api.abundacecode.com`**, un
subdominio que todavía no existe. Crearlo y apuntarlo a Railway es parte de
este trabajo (paso 5). Hasta entonces, en la web fallan: el checkout de
`/pricing`, `/blog`, `/activate`, `/dashboard` y `/admin`. El resto del sitio
funciona.

Se eligió un subdominio propio en vez de la URL `.up.railway.app` para no tener
que recompilar y volver a subir el frontend por FTP cada vez que cambie algo en
Railway.

### Decisiones ya tomadas

| Punto | Decisión |
|---|---|
| Dominio web | `abundacecode.com` (sin la "n", así está registrado y así aparece en `index.html`) |
| Dominio del API | `api.abundacecode.com` → CNAME a Railway |
| Stripe | Cuenta **activada**, se usan claves `sk_live_` |
| Supabase | Proyecto de producción **ya creado y con las tablas ejecutadas** |
| Despliegue | Repo privado en GitHub conectado a Railway (auto-deploy en cada push) |

### Estado del código del backend

Verificado en local:

- Arranca sin errores (`node server.js` → *"Server running on port …"*)
- **No tiene paso de compilación.** Railway solo hace `npm install` y `npm start`
- Requiere **Node ≥ 22**, fijado en `package.json` → `engines`. No es opcional:
  `@supabase/supabase-js` construye un `RealtimeClient` al crear el cliente, y su
  dependencia `realtime-js` exige un `WebSocket` global nativo, que Node no trae
  de serie hasta la 22. Con Node 20 el proceso muere nada más arrancar con
  *"Node.js 20 detected without native WebSocket support"*
- `.gitignore` creado: excluye `.env` y `node_modules`
- Escaneado: **no hay ninguna clave escrita en el código**, solo `.env.example`
  con placeholders
- `npm audit`: 6 vulnerabilidades (4 moderadas, 2 altas) en dependencias
  indirectas (`qs` vía `express`, `uuid`). No bloquean el despliegue

---

## 2 · Cómo funciona esto (leer antes de tocar Stripe)

```
Usuario en /pricing escribe su email
   ↓
POST /api/stripe/create-subscription-session
   ↓
El backend GENERA UN TOKEN DE ACCESO (antes de cobrar) y crea la sesión
   ↓
Stripe cobra $49 hoy + suscripción $14.99/mes con 30 días de trial
   ↓
Stripe redirige al usuario a la app de Lovable CON el token en la URL
   ↓  ...y en paralelo, por otro canal...
Stripe llama a POST /api/stripe/webhook
   ↓
El backend guarda la suscripción en Supabase + manda el correo de respaldo
```

El token se crea **antes** del pago para que el usuario aterrice directo en la
app sin depender del correo. Pero quien lo persiste en la base de datos es el
webhook.

> **Por qué esto importa:** si el webhook falla, el cobro se hace igual. El
> usuario llega a la app con un token que no está en la base de datos y se
> queda sin acceso. Pagó y no recibió nada, y en Stripe todo se ve correcto.
> Es el único fallo de este despliegue que cuesta dinero real.

El precio de $49 no es una prueba gratis: son 30 días ya pagados. En Stripe se
implementa como `trial_period_days: 30` solo para retrasar el primer cobro
mensual al día 31.

### Rutas que expone

| Ruta | Protección | Para qué |
|---|---|---|
| `GET  /api/health` | pública | Comprobar que está vivo |
| `POST /api/stripe/create-subscription-session` | pública | Abre el checkout |
| `POST /api/stripe/webhook` | firma de Stripe | Persiste la suscripción |
| `POST /api/stripe/portal` | pública | Portal de cliente (cancelar, facturas) |
| `POST /api/access/redeem` | `APP_SHARED_SECRET` | La app de Lovable canjea el token |
| `GET  /api/access/status` | `APP_SHARED_SECRET` | La app consulta si hay acceso |
| `POST /api/access/resend` | pública | Reenviar enlace perdido |
| `/api/users`, `/api/admin`, `/api/blog`, `/api/orders` | JWT de Supabase | Panel admin y blog |

---

## 3 · Crear el repo y subirlo a GitHub

GitHub CLI ya está autenticado como `juan-ayala023`.

**Cuidado con el directorio.** `C:\Users\user` es un repositorio de git mal
configurado que envuelve todo el Escritorio. Los comandos tienen que correr
dentro de `backend`, nunca fuera.

```bash
cd c:/Users/user/Desktop/backend
git init
git add -A
```

Antes de commitear, **verifica qué se va a subir**:

```bash
git status --short
```

Debe salir `.env.example` pero **NUNCA** un `.env`, y ni una sola línea con
`node_modules`. Si aparecen, el `.gitignore` no se aplicó: párate y arréglalo.

```bash
git commit -m "Backend Abundance Code — despliegue inicial"
gh repo create abundance-code-backend --private --source=. --push
```

---

## 4 · Crear el servicio en Railway

1. railway.app → **New Project** → **Deploy from GitHub repo**
2. Elegir `abundance-code-backend`
3. Railway detecta Node solo y usa `npm start` (ya definido en `package.json`)
4. **Settings → Networking → Generate Domain**

Anota la URL que te dé, del estilo
`abundance-code-backend-production.up.railway.app`. De aquí en adelante se
llama `RAILWAY_URL`.

El primer despliegue fallará o responderá con errores hasta que estén las
variables del paso siguiente. Es normal.

---

## 5 · Conectar el subdominio api.abundacecode.com

Este paso es el que hace que el frontend ya subido empiece a funcionar.

**En Railway:** Settings → Networking → **Custom Domain** → escribe
`api.abundacecode.com`. Railway te devuelve un destino CNAME.

**En Hostinger:** hPanel → **Dominios → Zona DNS** (o *DNS / Nameservers*) →
añadir registro:

| Campo | Valor |
|---|---|
| Tipo | `CNAME` |
| Nombre | `api` |
| Apunta a | lo que te dio Railway |
| TTL | por defecto |

En "Nombre" va solo `api`, no el dominio completo — Hostinger le añade el resto.

La propagación tarda entre minutos y un par de horas. Railway emite el
certificado SSL solo cuando detecta el DNS correcto; hasta entonces marca el
dominio como pendiente. Comprobar con:

```bash
curl https://api.abundacecode.com/api/health
```

---

## 6 · Variables de entorno en Railway

Railway → el servicio → pestaña **Variables** → **Raw Editor**:

```
NODE_ENV=production

SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

FRONTEND_URL=https://abundacecode.com
CORS_EXTRA_ORIGINS=https://www.abundacecode.com
APP_URL=https://api.abundacecode.com

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=contact@abundancecode.us
SMTP_PASS=la_contraseña_del_buzón
EMAIL_FROM=contact@abundancecode.us

PRICE_INITIAL_CENTS=4900
PRICE_MONTHLY_CENTS=1499
INCLUDED_DAYS=30

APP_PUBLIC_URL=https://app.abundancecode.us
APP_ACTIVATE_PATH=/activar
APP_SHARED_SECRET=<generar, ver abajo>
```

Las tres claves de Supabase salen de: Supabase → Project Settings → API.
La `service_role` es secreta y **solo** va aquí, jamás en el frontend.

Genera `APP_SHARED_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Es el secreto servidor-a-servidor con el que la app de Lovable llama a
`/api/access/redeem`. El mismo valor tiene que configurarse del lado de Lovable.

`STRIPE_WEBHOOK_SECRET` todavía no lo tienes — sale del paso 7.

Las variables `WC_*` (WooCommerce) se pueden omitir: son de la tienda anterior.

### Trampas de este paso

- **`PORT` no se pone.** Railway la inyecta sola. Si la fuerzas a 5000 el
  healthcheck falla y el servicio se queda reiniciando en bucle.
- **`FRONTEND_URL` sin barra final.** Es la lista blanca de CORS y compara texto
  exacto ([server.js:37-64](server.js#L37-L64)). Si no coincide, el checkout
  devuelve *"Connection problem"* y en los logs de Railway sale
  `[cors] Origen bloqueado`. En producción **no hay comodines**: la variante con
  `www` va sí o sí en `CORS_EXTRA_ORIGINS`.
- **`SMTP_PORT` tiene que ser 587, no 465.** El código fija `secure: false`
  ([src/services/emailService.js:8](src/services/emailService.js#L8)), que es
  STARTTLS. Con el 465 (SSL directo) la conexión se queda colgada y los correos
  no salen.
- Si `SMTP_USER` está vacío, el envío de correos se salta en silencio. Útil para
  probar, peligroso para producción: nadie recibiría su enlace de acceso.

---

## 7 · Webhook de Stripe

1. Stripe Dashboard → **cambiar el interruptor a modo Live** (arriba a la derecha)
2. **Developers → Webhooks → Add endpoint**
3. URL: `https://api.abundacecode.com/api/stripe/webhook`
4. Eventos, exactamente estos cuatro (los únicos que el código maneja,
   [src/controllers/stripeController.js:139-152](src/controllers/stripeController.js#L139-L152)):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Crear → copiar el **Signing secret** (`whsec_...`)
6. Pegarlo en Railway como `STRIPE_WEBHOOK_SECRET` y esperar el redespliegue

Que el interruptor esté en **Live** importa: el secreto del webhook de modo Test
no sirve para eventos de modo Live. Es la causa más común de webhooks en 400.

---

## 8 · Verificación

**El backend responde**

```bash
curl https://api.abundacecode.com/api/health
# {"status":"ok","backend":"supabase"}
```

**El frontend conecta**

Abre `https://abundacecode.com/pricing`, F12 → pestaña Network, mete un email y
envía:

- Sale una petición a `api.abundacecode.com/api/stripe/create-subscription-session`
- Responde 200 y el navegador salta a `checkout.stripe.com`
- Si sale error de CORS → revisar `FRONTEND_URL` en Railway

**Una compra de verdad** (49 USD reales; después te la reembolsas desde Stripe).
Es el único modo de validar el webhook. Después comprueba las cuatro cosas:

1. Stripe → Webhooks → el endpoint muestra **200**, no 400
2. Supabase → tabla `subscriptions` → hay una fila nueva con `status = active`
   y su `access_token`
3. Te llega el correo de acceso
4. El enlace de Stripe te lleva a la app de Lovable con `?token=…`

**El panel de admin**

`https://abundacecode.com/admin`. Si dice que no eres admin, en Supabase → SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'tu@correo.com';
```

---

## 9 · Después del despliegue

**Backend:** `git push` → Railway redespliega solo.

**Frontend:** `npm run build` en `c:/Users/user/Desktop/frontend` y volver a
subir el contenido de `dist/` a `public_html`. No es automático.

> Gracias al subdominio `api.abundacecode.com`, cambiar cosas en Railway **no**
> obliga a recompilar el frontend.

### Pendientes anotados, ninguno bloqueante

- **Los precios viven en dos sitios**: `frontend/src/config.js` (lo que ve el
  usuario) y `PRICE_*_CENTS` en Railway (lo que se cobra). Si cambias uno sin el
  otro, la web anuncia un precio y Stripe cobra otro. Hoy coinciden: 4900 / 1499.
- **15 imágenes muertas** en `frontend/public/img/` (36 MB: `logo.svg` y
  `symbol.svg` pesan 11 MB cada uno). No las referencia nadie; se excluyeron del
  zip que se subió, pero siguen en el repo y volverán a aparecer en el próximo
  build si no se borran.
- **`frontend/src/lib/supabase.js` es código muerto** — ningún componente lo
  importa. El frontend habla siempre con este backend.
- **Tokens en `localStorage`** (`ac_token`, `ac_admin_token`). Funciona, pero un
  XSS los expone. Migrar a cookies `httpOnly` es trabajo de este backend.
- **6 vulnerabilidades de `npm audit`** en dependencias indirectas.
- **Dos sistemas de auth conviven**: JWT propio de Supabase y el flujo de
  `access_token`. Y el panel de admin todavía gestiona productos y pedidos del
  ecommerce anterior.
