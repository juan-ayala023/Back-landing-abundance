# Abundance Code

Los tres proyectos que forman el producto, en un sitio.

Esto es **una copia reunida para tenerlo todo junto**, no el origen de los
despliegues. Cada parte se sigue desarrollando y desplegando desde su propio
repositorio, y es ahí donde hay que trabajar:

| Carpeta | Qué es | Repositorio de trabajo | Dónde vive |
|---|---|---|---|
| `landing/` | La web pública y el panel de administración | `Front-Abundance-` | Hostinger · abundancecode.us |
| `backend/` | API de pagos, accesos, blog y panel | `Abundance-Back` | Railway · api.abundacecode.com |
| `portal/` | El portal del cliente: carta, lecturas y guía | `abundance-code-app` | Railway · app.abundancecode.us |

Si editas aquí, ese cambio no llega a ninguna parte.

## Cómo encaja

Alguien llega a la **landing**, compra, y Stripe avisa al **backend**, que
guarda la suscripción y le manda por correo un enlace de acceso. Ese enlace
abre el **portal**, que le pide su fecha, hora y lugar de nacimiento, calcula
su carta y escribe sus lecturas.

Las dos bases de datos son distintas y no comparten nada: la del negocio
—compras, suscripciones, blog, intentos de compra— vive con el backend, y la
personal —cuentas, cartas, lecturas— vive con el portal. Cuando una necesita
algo de la otra se lo pregunta por HTTP con un secreto compartido.

## Lo que no está aquí

Los ficheros `.env` **no se incluyen**, y no es un descuido: llevan la clave de
servicio de Supabase, la de Stripe, la de OpenAI y la de Resend. Cada proyecto
trae su `.env.example` con los nombres de las variables que necesita; los
valores están en Railway y en Hostinger.

Tampoco van `node_modules` ni las carpetas de compilación: se regeneran con
`npm install` y `npm run build`.

## Para levantarlo en local

```bash
cd backend && npm install && npm run dev     # :5000
cd landing && npm install && npm run dev     # :5173
cd portal  && npm install && npm run dev     # :3000
```

Cada uno necesita su `.env` copiado del `.env.example` correspondiente y
relleno con los valores reales.
