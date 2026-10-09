# ESTADO · 16 sept 2026 (noche) — ronda final de Andrea: APLICADA

Los 11 puntos están hechos y probados sobre el `dist` compilado (Playwright, Chromium). Lo que queda es de la propietaria/Andrea, no de este repo.

**Medido (antes → después, alto de página):**
- Inicio 360 px: 11 533 → 7 852 (−32 %) · 390 px: 11 367 → 7 703 (−32 %) · 430 px: −32 % · 1280 px: 8 881 → 5 719 (−36 %).
- H1/H2/H3 en todas las páginas: 32/24/20 px móvil, 48/32/24 escritorio; cuerpo 16 px (antes 14). Botones 48 px en todas las páginas (antes 49–80). Sin desbordamiento horizontal en 360/390/430/1280/1440. Montserrat carga (`document.fonts.check`). Sin imágenes rotas.
- 61/61 pruebas funcionales: sin claves sin traducir en ES/EN, consola limpia, menú móvil, idioma, acordeones, carrusel (puntos de 28 px), enlaces a precios/plan/portal, FAQ con recarga y «atrás» (el fallo de conexión no se reproduce: la FAQ es estática), formulario de contacto (validación, error simulado, envío real controlado al buzón propio).

**Hecho por punto:** 1 escala en `index.css` (h1/h2/h3 + `.h1-ac/.h2-ac/.h3-ac/.lead-ac/.body-ac/.small-ac`), páginas sin tamaños inline. 2 Home en 7 bloques (hero simple, «dentro de la app»+«lo que desbloquea» fusionadas, horóscopo integrado en «descubrir», 3 pasos, un solo cierre), `.section-pad` 44/80 px, pie compacto; el ejemplo largo de patrón central pasó a /how-it-works. 3 `.btn-primary/.btn-outline` 48 px, foco dorado, disabled; «Enviar mensaje» al ancho del texto; La App y Sobre nosotros con el botón común; `.dot-btn` 28 px. 4 `SectionImage` con `variant` section 4:3 / banner 5:2 / square; la foto de Inicio va a dos columnas. 5 `--gold-ink #7A5F17` para etiquetas/enlaces (>5:1); `.link-ac` café. 6 operador en pie, cabecera de legales, Términos 1/6/7, Privacidad 1; `[ESTADO]` intacto (2); fechas 16 sept 2026; correo `contact@abundancecode.us` en todo el sitio, clicable; stripe.com/privacy enlace (`RichText`). 7 regla real unificada (ver tabla): acceso completo hasta fin del periodo, después carta y lectura base en solo lectura. 8 correo primero, Google alternativo, otra sesión, /activar-acceso: Inicio, Cómo funciona (bloque «¿Y si no puedo entrar?»), Precios, FAQ, /gracias; también en la app (`messages/*.json`, commit 1743f35). 9 FAQ en 4 grupos, 30 preguntas, con las 11 pedidas. 10 Sobre nosotros sin «nadie había combinado»; ejemplos rotulados «ilustrativos» con nombres ficticios; 888/78 %/ventana fuera; blog fuera del menú y del pie (ruta viva).

**Queda fuera de este repo:** compra real completa (Stripe en vivo; la propietaria la hace), Pixel/GA (Andrea), `[ESTADO]` y PDF legales (dueño), descriptor de Stripe y correo de soporte en Stripe (Andrea).

---

# ANEXO · 16 sept 2026 — hechos verificados para la ronda final de Andrea

Léelo ANTES de ejecutar las 11 instrucciones de Andrea. Varios puntos (6, 7, 8, 9, 10) dependen de estos hechos; sin ellos se inventaría o se contradiría lo que ya está en producción.

## Hechos que mandan sobre el texto

| Tema | Hecho verificado | Instrucción de Andrea afectada |
|---|---|---|
| **Correo de soporte** | `contact@abundancecode.us`. Buzón real en Hostinger, ya en `config.js` (`SUPPORT_EMAIL`). **No** `inversionesaoa7@gmail.com`, **no** `admin@aoaglobalservices.com` (ese es el de Stripe; Andrea lo cambiará allí). Es también el remitente de todos los correos automáticos. | 6, 9 |
| **Operador** | `AOA Global Services LLC`. Confirmado por Stripe (cuenta «AOA GLOBAL SERVICES») y por los PDF legales. Añadir «Abundance Code es operado por AOA Global Services LLC» en pie y documentos. | 6 |
| **`[ESTADO]`** | Sigue sin confirmar. El dueño dijo que lo legal lo gestiona él. **Dejar el marcador; no inventar.** | 6 |
| **Acceso a la app** | Dos métodos, ambos implementados y probados en producción: **(1) correo** — la persona escribe el correo con el que compró, recibe un enlace y entra; es el camino principal. **(2) Google** — alternativa. Los dos llevan a la misma cuenta (Supabase une identidades con el mismo correo). Si hay otra sesión abierta, la app pregunta a cuál vincular. Si no llega el correo: `abundancecode.us/activar-acceso` reenvía el enlace. **Google ya no es el único acceso: corregir en Inicio, Cómo funciona, Precios y FAQ.** | 8, 9 |
| **Qué se conserva al cancelar** | **Corregido el 16 sept tras leer la app** (`src/lib/access/nivel.ts`, `(app)/layout.tsx`): quien canceló o dejó de pagar entra en nivel `solo-lectura` — **conserva la carta natal y la lectura base**; la activación diaria y las consultas a la guía piden suscripción activa. Acceso completo mientras la suscripción esté activa o en gracia por impago y hasta el fin del periodo pagado. Eran la FAQ y los Términos («el acceso termina») los que estaban mal, no Inicio/Precios. Todo el sitio dice ahora la misma regla. | 7, 9 |
| **Precio** | $49 USD inicial con 30 días · después $14.99 USD/mes automático · cancelable antes de la renovación desde la cuenta (portal de Stripe). | 7, 9 |
| **Moneda** | Desde el 16 sept el checkout va **sin Adaptive Pricing** (`adaptive_pricing.enabled=false` al crear la sesión): siempre USD, sin selector AUD/USD; Andrea vio que frenaba la compra. La FAQ dice «siempre USD; convierte tu banco». | 9 |
| **Consultas** | **3 al día**, iguales para toda cuenta. Se renuevan a **medianoche en la zona horaria de la ciudad de nacimiento** (`portal.tz`, `guia/actions.ts` → `inicioDelDia`), no en UTC (corregido 16 sept). | 9 |
| **Cargo en el extracto** | Aparece a nombre de AOA Global Services (nombre de la cuenta de Stripe). Andrea puede fijar el descriptor en Stripe → Settings → Public details. | 9 |
| **Idiomas** | Web y app en español e inglés; el correo de acceso y el checkout de Stripe salen en el idioma de la compra. | 9 |
| **Reembolsos** | Política en `/refund`. Enlazar desde la FAQ. | 9 |
| **Testimonios** | Ya marcados como ejemplos ilustrativos. Mantener así. | 10 |
| **«888», «78%», «Ventana óptima 08:00–10:00»** | **No representan funciones reales**: no hay numerología, ni porcentajes, ni ventanas horarias. `PortalPage.jsx:84` (888), `Home.jsx:147` (78%), `es.js` `portal.mock.window`. Sustituir por ejemplos fieles (carta, patrón central, activación del día, guía con 3 consultas) o marcar como ilustrativos. | 10 |
| **Blog** | Hay 4 artículos **en borrador**, ninguno publicado. Andrea pide sacarlo del menú hasta que haya publicaciones (contradice su petición anterior de volver a ponerlo; **manda esta**). Quitar de `Navbar.jsx` y `Footer.jsx` sin borrar la ruta. | 10 |
| **Formulario de contacto** | **Ya conectado** (16 sept): `POST /api/contact` entrega al buzón de soporte. `Contact.jsx` ya tiene estados de envío, error y trampa antibots. **No lo toques salvo estilo.** Probado en producción. | 11 |
| **Fallo de conexión al volver a FAQ** | No reproducido; probablemente el navegador o un despliegue en curso. FAQ es estática; comprobar una vez y anotar. | 11 |

## Cómo se publica

`npm run build` → **subir `dist` ENTERO** a `public_html` de **abundancecode.us** (lo más simple: comprimir el contenido de `dist` en un zip, subirlo con el gestor de archivos de Hostinger y extraerlo encima; luego borrar los `assets/index-*` viejos). `.env.production` no se toca.

**Por qué entero y no solo `index.html` + `assets`:** el build genera `dist/<ruta>/index.html` (pricing, faq, app, about…) con el `<head>` de cada página para buscadores y previsualizaciones. Esas copias llevan escrito el nombre del bundle con hash. El 16 sept una subida parcial dejó esas carpetas apuntando a assets borrados y `/pricing`, `/faq`, `/app`… se abrían en blanco al entrar directo. Desde entonces el `.htaccess` sirve esas copias solo a robots (las personas reciben siempre el `index.html` raíz), pero si no se suben, los robots ven una página rota: **súbelas siempre**.

## Lo que NO es de este repo

- Recorrido de compra completo con cobro: Stripe está en modo real; sin claves de test no se puede probar sin cobrar. Dejarlo preparado para la propietaria.
- Acceso alternativo por correo: **ya funciona** (probado 16 sept). No hay bloqueo que registrar.

---

# Correcciones pendientes en la landing

Brief para quien trabaje en este repo. Sale del documento de correcciones de Abundance Code (sept 2026) tras hacer la parte de backend; aquí queda solo lo que vive en la landing. Cada punto lleva archivo y línea para no tener que buscar.

**Estado · 15 sept 2026 — TODO APLICADO.** No queda nada por hacer en este repo. Hecho y compilado: puntos 1 a 5 completos, promesas falsas retiradas (3 consultas/día, sin historial ni favoritos, sin numerología/árbol/ventanas), correo de soporte `inversionesaoa7@gmail.com` centralizado en `config.js`, páginas `/activate` y `/dashboard` del prototipo eliminadas, y 211 claves muertas del producto físico borradas por idioma (cero menciones a esfera/pulsera/Crystal Code). Pendiente solo del dueño: `[ESTADO]` en los términos y los PDF legales. Publicar = subir `dist/index.html` + `dist/assets/*` a `public_html` de abundancecode.us.

**Contexto que hace falta saber**

- El producto es **exclusivamente digital**. La esfera, la pulsera y "Crystal Code" ya no existen. Cualquier mención es un error.
- Precio real: **$49 USD** una vez, que incluye 30 días. Después **$14.99 USD/mes**, renovación automática. Los importes viven en `src/config.js` (`PRICE_INITIAL`, `PRICE_MONTHLY`, `INCLUDED_DAYS`, `CURRENCY`). **No cambies importes ni condiciones**: si un texto los contradice, se corrige el texto.
- El backend ya está corregido y desplegado: acepta `www.` en CORS y ya no manda a nadie al prototipo viejo tras pagar. El fallo de «Problema de conexión» del documento **era CORS con `www.abundancecode.us`**, no Stripe. Queda la segunda capa, que es de aquí (punto 1).
- Casi todo el texto está en `src/i18n/es.js` y `src/i18n/en.js`. Corrige **los dos idiomas** salvo que se diga lo contrario.

**Reglas del documento original, que siguen vigentes**

- Distingue un fallo observado de una función pendiente de verificar.
- No inventes datos. La jurisdicción de los términos la gestiona el dueño: no la toques.
- Donde haya que decidir algo comercial, no decidas: márcalo como **DECISIÓN** y sigue con lo demás.
- No publiques sin presentar los cambios.

---

## 1 · Pago — prioridad máxima

**1.1 Redirigir `www` al dominio sin `www`.** `www.abundancecode.us/pricing` sirve la web entera sin redirigir; hasta hoy el pago fallaba ahí siempre. El backend ya lo acepta, pero el `www` no debería existir como origen. En `public/.htaccess`, junto a la regla que fuerza HTTPS (línea 20), añade un 301 de `www.abundancecode.us` → `abundancecode.us` que conserve la ruta. Vite copia ese archivo a `dist/` en cada build.

**1.2 Mensaje de error neutro.** `es.js:939` (`pr.errNetwork`) y `es.js:970` (`rec.errNetwork`), más sus equivalentes en `en.js`. El texto pedido:

> No pudimos abrir el pago. Inténtalo de nuevo. Si continúa, escríbenos a support@abundancecode.us

El de `rec.errNetwork` es de la página de recuperar acceso; adapta el verbo ("No pudimos reenviar tu acceso…") pero misma forma: neutro, con el correo de soporte, sin culpar a la conexión del cliente.

**1.3 Titular del precio.** `es.js:915` (`pr.h1`) dice «Un pago. Todo incluido.» Sustituir por:

> Activa tu portal por $49 · 30 días de acceso completo incluidos

Usa `PRICE_INITIAL` e `INCLUDED_DAYS` de `config.js`, no números escritos a mano. Revisa también `es.js:948` (`pr.r3.t` «Todo incluido») y `es.js:101` (`premium.price.note`, clave muerta, ver punto 5).

**1.4 Renovación visible antes de pagar.** En `src/pages/Pricing.jsx`, cerca del precio y **antes del botón «Ir al pago»**, un texto legible (no letra pequeña, no solo en políticas):

> Después, renovación automática de $14.99/mes. Cancela cuando quieras.

Con `PRICE_MONTHLY` de `config.js`. Hoy esa frase solo aparece en la FAQ (`es.js:284`, `faq.cat6.2a`).

**1.5 Escribir la moneda.** Es USD y no aparece escrito en Pricing. Ponlo junto al precio («$49 USD»). Comprueba que FAQ (`faq.cat6.*`), Pricing y términos digan lo mismo.

## 2 · Legales

**2.1 `[ESTADO]` en los términos.** `es.js:555` (`terms.8p`) y su equivalente en `en.js`. **El dueño gestiona la parte legal por su cuenta.** Deja el marcador exactamente como está, no lo rellenes y no preguntes por él.

**2.2 Planes anuales que no existen.** `es.js:548-549` (`terms.5p`, `terms.5p.paid`) mencionan «(mensual o anual)». Solo hay plan mensual. Quita «o anual». Además `terms.5p` habla de «periodo de prueba gratuito sin tarjeta», que ya no es el modelo: la clave `.paid` es la vigente; confirma cuál renderiza `src/pages/legal/Terms.jsx` y elimina la otra.

**2.3 HTML vs PDF.** La landing enlaza páginas HTML (`src/pages/legal/*.jsx`). En `public/img/` hay tres PDF (`Privacy-Policy…`, `Refund-Cancellation-Policy…`, `Terms-and-Disclaimer…`) que usa **la app**, no la landing. Comprueba que el contenido coincide con el HTML — sobre todo precio, renovación y cancelación. Si difieren, la fuente de verdad es el HTML: regenera los PDF o pide que la app enlace a las páginas HTML. Márcalo como pendiente de verificar con la app si no puedes comprobarlo desde aquí.

**2.4 Blog fuera del menú.** Solo hay un post de prueba (título «post inicial», extracto «sadas»). Quita el enlace en `src/components/layout/Navbar.jsx:16` y `src/components/layout/Footer.jsx:54`. No borres la ruta ni la página: se reactiva cuando haya contenido aprobado.

## 3 · Textos

| Dónde | Qué | Cambio |
|---|---|---|
| `es.js:829` `tm.3.text` | «postponiendo» | «posponiendo» |
| `es.js:738` `h.unl.c3.a` | «Si es un buen momento para explorar…» | Léelo entero. Si afirma, «Sí, es un buen momento…»; si es condición, completa la frase. No lo dejes ambiguo. |
| `src/pages/legal/LegalPage.jsx:13` | «Last updated:» escrito a mano | Usa `t('legal.updated')`. Existe en `en.js:533`; añade la clave en `es.js` («Última actualización:»). |
| Footer y páginas legales | «Terms», «Privacy», «Contact» en la versión ES | Busca las claves de esos enlaces y tradúcelas. Revisa también los ejemplos en inglés de `/app` (`src/pages/PortalPage.jsx`). |
| `es.js:207` `about.s3.b` | «diagnóstico personal» | «interpretación personalizada» |
| `es.js:427` `hiw.subtitle` | «Ninguno tarda más de un minuto» | Quita la promesa de tiempo. Nadie la ha medido. |
| `es.js:703` `h.how.s1.desc.paid` | «Fecha, hora y lugar. Nada más» | El recorrido real pide correo y acceso. No omitas eso. |
| `es.js:266` `faq.cat4.1a.paid` y `es.js:935` `pr.emailNote` | «directo a tu portal», «sin pasos intermedios» | Al llegar a `/activar` la app pide iniciar sesión con Google. Describe el paso real. |
| `es.js:433-438` `hiw.s3`, `hiw.s3d`, `hiw.s5`, `hiw.s5d` | Los pasos 3 y 5 son los dos «guía diaria» | Sepáralos: **s3** = tu lectura personal (carta calculada y explicada, patrón central); **s5** = activación diaria. El cálculo de carta ya es el s2. |
| `es.js:202` `about.s2.p` | «La terapia ayuda… ninguna llega a la raíz» | Retira la comparación con terapia o susténtala. Es una afirmación de superioridad sin base. |
| `es.js:952` `pr.close.body.paid` | «Una sesión con un astrólogo cuesta entre $150 y $300» | Retira o sustenta con fuente. Lo mismo si aparece «los únicos que combinan astrología e IA» o similar. |
| `es.js:818-835` `tm.1.*`, `tm.2.*`, `tm.3.*` | Testimonios de Valentina R., Camila S., Lucía M. | No consta procedencia ni autorización. **Márcalos como ejemplos ilustrativos** (un rótulo visible en la sección, tipo «Ejemplos de lo que puedes descubrir», y sin presentar los nombres como clientas). Es lo que el documento exige cuando no está confirmado. Si el dueño confirma que son reales y autorizados, se quita el rótulo. |

Vocabulario transversal: en el lenguaje comercial usa principalmente **«portal privado»**, **«lecturas»** y **«guía personalizada»**. Sigue siendo una app, pero el mensaje va a la experiencia, no al software.

## 4 · Promesas que el producto no cumple — ya verificado

Comprobado directamente en el código de la app (`Desktop\App Australia`). **No hay nada que confirmar**: cambia los textos.

- **«Preguntas ilimitadas a tu código»** — `es.js:929` (`pr.inc5`). Falso. `CONSULTAS_GUIA_POR_DIA = 3` en `src/lib/lectura/schemas.ts`, y se aplica por portal a todo el mundo, sin distinguir plan ni cortesía. Cambia a **«3 consultas al día a tu guía personalizada»** (o la forma que mejor lea, pero con el número).
- **Historial y favoritos** — `es.js:930` (`pr.inc6`), `es.js:775` (`h.app.item6`), `es.js:255` (`faq.cat3.2a`). No existen: ninguna pantalla ni tabla en la app. Retira las tres menciones. Para `pr.inc6` sustituye por algo que sí exista (por ejemplo «Tu lectura base, siempre disponible en tu portal»).
- **Numerología, árbol geométrico imprimible, ventanas horarias** — `es.js:500` (`portal.inc1d`) y `/app` (`PortalPage.jsx`). No existen en la app. Retíralas. Lo que sí existe: carta natal calculada, lectura base, patrón central, ciclos y tránsitos del día, guía con 3 consultas diarias.
- **Qué queda tras los 30 días** — `es.js:286` (`faq.cat6.3a`) dice «tu cuenta queda inactiva pero tu historial guardado». No hay historial. La regla real: acceso mientras la suscripción esté activa o en gracia por impago; al cancelar, hasta el fin del periodo pagado; **después, ningún acceso**. Escribe eso.
- **Corregir datos y cancelar desde la cuenta** — los dos existen (16 sept): cancelar abre el portal de Stripe desde `/cuenta`; corregir datos está en «Mi cuenta → Corregir mis datos» (`cuenta/page.tsx`, `onboarding.editar`) y recalcula la carta guardando versiones anteriores.

## 5 · Limpieza: 126 claves del producto físico

En `es.js` y `en.js` hay **126 claves** de las familias `vehicle.*`, `prod.*`, `cc.*`, `bracelet.*`, `premium.*` — esfera de cristal, pulsera, caja negra, Crystal Code, «objeto físico premium». **Ninguna página las usa** (verificado con grep en `src/pages` y `src/components`), pero viajan en el bundle y son una mina para que «esfera» reaparezca por un copy-paste. Bórralas. Antes, confirma con grep que ninguna se referencia.

---

## Cómo se publica

```
npm run build
```

Sube a Hostinger → `public_html` de **`abundancecode.us`** (no el `.com`, que es una copia vieja):

1. Primero el contenido de `dist/assets/` dentro de `public_html/assets/`
2. Después `dist/index.html`, sobrescribiendo

El orden importa: si subes `index.html` antes, durante unos segundos apunta a archivos que no existen. `dist/.htaccess` se sube solo si lo cambiaste (punto 1.1). Luego `abundancecode.us` con Ctrl+F5.

`.env.production` apunta a `https://api.abundacecode.com` — con la errata, es el dominio real. **No lo corrijas.**

## Fuera de este repo

Lo siguiente está en el documento pero **no vive aquí**; que no se dé por hecho:

- **App** (`Desktop\App Australia`): el inventario ya está verificado (punto 4). Lo que queda ahí es qué ve exactamente alguien sin acceso, y a qué legales enlaza.
- **Compra completa de prueba**: Stripe está en modo real. Sin claves de test no se puede hacer sin cobrar de verdad. Es una decisión del dueño.
