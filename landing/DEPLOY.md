# Despliegue — Abundance Code

Dos piezas independientes:

| Pieza    | Dónde        | Qué es                                    |
|----------|--------------|-------------------------------------------|
| Backend  | Railway      | Express (Node). Stripe, Supabase, emails. |
| Frontend | Hostinger    | Sitio estático (`dist/`). Solo HTML/JS/CSS. |

El orden importa: **primero el backend**, porque el frontend necesita su URL
para compilarse.

---

## Antes de empezar

- [ ] Cuenta de Stripe **activada** (datos de empresa enviados y aprobados). Sin
      esto no existen las claves `sk_live_`, solo las de prueba.
- [ ] Proyecto de Supabase de producción con `supabase/schema.sql` y
      `supabase/subscriptions.sql` ya ejecutados en el SQL Editor.
- [ ] Dominio apuntando a Hostinger y con SSL activo.

---

# 1 · Backend en Railway

## 1.1 Subir el código

El backend hoy no es un repo propio, así que hay que darle uno.

```bash
cd c:/Users/user/Desktop/backend
git init
git add .
git commit -m "Backend Abundance Code"
gh repo create abundance-code-backend --private --source=. --push
```

> Si no tienes `gh`, crea el repo a mano en github.com y luego:
> `git remote add origin https://github.com/TU-USUARIO/abundance-code-backend.git`
> `git branch -M main && git push -u origin main`

El `.gitignore` ya excluye `.env` y `node_modules`. **Verifica antes de hacer
push que `.env` no aparece en `git status`** — ahí van las claves.

## 1.2 Crear el servicio

1. railway.app → **New Project** → **Deploy from GitHub repo**
2. Elige `abundance-code-backend`
3. Railway detecta Node y usa `npm start` (ya definido en `package.json`)
4. **Settings → Networking → Generate Domain**. Anota la URL, algo como
   `https://abundance-code-backend-production.up.railway.app`

De aquí en adelante esa URL se llama `RAILWAY_URL`.

## 1.3 Variables de entorno

Railway → tu servicio → pestaña **Variables** → **Raw Editor**, y pega esto
con tus valores reales:

```
NODE_ENV=production

SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

FRONTEND_URL=https://TU-DOMINIO.com
CORS_EXTRA_ORIGINS=https://www.TU-DOMINIO.com
APP_URL=https://RAILWAY_URL

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@TU-DOMINIO.com
SMTP_PASS=la_contraseña_del_buzón
EMAIL_FROM=noreply@TU-DOMINIO.com

PRICE_INITIAL_CENTS=4900
PRICE_MONTHLY_CENTS=1499
INCLUDED_DAYS=30

APP_PUBLIC_URL=https://astro-ai-decoder.lovable.app
APP_ACTIVATE_PATH=/activar
APP_SHARED_SECRET=genera_uno_largo
```

Detalles que cuestan tiempo si se pasan por alto:

- **`PORT` no se pone.** Railway la inyecta sola. Si la fuerzas a 5000, el
  healthcheck falla y el servicio se queda reiniciando.
- **`FRONTEND_URL` sin barra final** y con el protocolo exacto con el que los
  usuarios abren la web. Es la lista blanca de CORS: si no coincide, el
  checkout responde "Connection problem" y en los logs sale
  `[cors] Origen bloqueado`.
- **Si tu web funciona con y sin `www`**, la otra variante va en
  `CORS_EXTRA_ORIGINS`. En producción no hay comodines.
- **`APP_SHARED_SECRET`** — genéralo así y no lo reutilices de desarrollo:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
  Es el secreto servidor-a-servidor con el que la app de Lovable canjea
  accesos. Nunca debe llegar al navegador.
- **`SMTP_PASS`** es la contraseña del buzón de correo. Si usas Gmail, tiene
  que ser una *contraseña de aplicación*, no la de tu cuenta.
- Las `WC_*` (WooCommerce) puedes omitirlas: son de la tienda anterior.

`STRIPE_WEBHOOK_SECRET` todavía no lo tienes — se rellena en el paso siguiente.

## 1.4 Webhook de Stripe

1. Stripe Dashboard → **cambia el interruptor a modo Live** (arriba a la derecha)
2. **Developers → Webhooks → Add endpoint**
3. URL: `https://RAILWAY_URL/api/stripe/webhook`
4. Eventos a escuchar — exactamente estos cuatro:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Crear → copia el **Signing secret** (`whsec_...`)
6. Pégalo en Railway como `STRIPE_WEBHOOK_SECRET` y deja que redespliegue

Si este secreto está mal, el pago se cobra pero **el acceso nunca se guarda**:
el webhook devuelve 400 y el usuario paga sin recibir nada. Es el fallo más
caro de todo el despliegue.

## 1.5 Comprobar

```bash
curl https://RAILWAY_URL/api/health
# {"status":"ok","backend":"supabase"}
```

Si eso responde, el backend está vivo.

---

# 2 · Frontend en Hostinger

## 2.1 Apuntar al backend

En `c:/Users/user/Desktop/frontend`, crea el archivo `.env.production`
(copia de `.env.production.example`):

```
VITE_API_URL=https://RAILWAY_URL
VITE_APP_URL=https://astro-ai-decoder.lovable.app
VITE_APP_SIGNUP_PATH=/activar
```

`VITE_API_URL` va **sin `/api` y sin barra final** — el código ya añade `/api`.

> Vite incrusta estas variables dentro del JS en el momento de compilar. No se
> leen en el navegador. Si mañana cambias la URL del backend, hay que volver a
> compilar y volver a subir.

## 2.2 Compilar

```bash
cd c:/Users/user/Desktop/frontend
npm install
npm run build
```

Genera `dist/` (~530 kB de JS, 155 kB comprimido).

## 2.3 Subir

hPanel de Hostinger → **Archivos → Administrador de archivos** → entra en
`public_html`.

1. Borra lo que haya dentro (la web anterior)
2. Sube **el contenido de `dist/`**, no la carpeta `dist` en sí. Dentro de
   `public_html` tienen que quedar `index.html`, `assets/`, `img/` y `.htaccess`
   en la raíz
3. Lo más cómodo: comprime el contenido de `dist/` en un zip, súbelo y usa
   "Extraer" desde el administrador

**El `.htaccess` es clave.** Es un archivo oculto: si tu cliente FTP o el
administrador no lo muestra, activa "mostrar archivos ocultos" y confirma que
llegó. Sin él, la portada carga pero recargar `/pricing` o `/faq` devuelve 404,
porque Apache busca una carpeta con ese nombre. Ya está creado en
`public/.htaccess` y Vite lo copia a `dist/` en cada build.

## 2.4 SSL

hPanel → **Seguridad → SSL** → instalar y forzar HTTPS. El `.htaccess` ya
redirige http → https, pero el certificado tiene que existir.

---

# 3 · Comprobación final

1. `https://TU-DOMINIO.com` carga
2. Navega a `/pricing`, **recarga la página con F5** → sigue cargando (si da
   404, el `.htaccess` no llegó)
3. F12 → Network → mete un email en pricing y envía:
   - la petición sale hacia `RAILWAY_URL/api/stripe/create-subscription-session`
   - responde 200 y el navegador salta a `checkout.stripe.com`
   - si sale error de CORS → revisa `FRONTEND_URL` en Railway
4. Haz una compra real con tu tarjeta (49 USD; luego te la reembolsas desde
   Stripe). Después comprueba:
   - Stripe → Webhooks → el endpoint muestra `200`, no `400`
   - Supabase → tabla `subscriptions` → aparece la fila con `status = active`
   - te llega el correo de acceso
5. `/admin` → entra con tu usuario. Si dice que no eres admin, en Supabase SQL
   Editor: `update public.profiles set is_admin = true where email = 'tu@correo.com';`

---

# 4 · Redesplegar después

**Backend:** `git push` → Railway compila y despliega solo.

**Frontend:** `npm run build` y vuelve a subir `dist/` a `public_html`. No es
automático — Hostinger sirve archivos estáticos, no compila nada.

---

# Cosas a revisar aparte del despliegue

Ninguna impide subirlo, pero conviene saberlas:

- **`index.html`** tiene el dominio `https://abundancecode.us` escrito a mano en
  las etiquetas `og:url` y `og:image`. Si tu dominio real es otro, las
  previsualizaciones al compartir el enlace saldrán rotas.
- **Los precios están escritos en dos sitios**: `src/config.js` (lo que ve el
  usuario) y las variables `PRICE_*_CENTS` de Railway (lo que se cobra). Si
  cambias uno y no el otro, la web anuncia un precio y Stripe cobra otro.
- **`src/lib/supabase.js` es código muerto** — ningún componente lo importa. El
  frontend habla solo con el backend. Por eso no hacen falta variables
  `VITE_SUPABASE_*`.
- **Los tokens se guardan en `localStorage`** (`ac_token`, `ac_admin_token`).
  Funciona, pero un XSS los deja al descubierto. Cambiar a cookies `httpOnly`
  es trabajo del backend y no es urgente.
