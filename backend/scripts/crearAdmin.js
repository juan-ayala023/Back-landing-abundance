import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

/* =========================================================
   DAR ACCESO AL PANEL ADMIN — Abundance Code

   El panel (/admin) entra con correo + CONTRASEÑA, no con
   Google. Un usuario creado con Google no tiene contraseña,
   así que el login le responde "Invalid credentials" escriba
   lo que escriba. Este script arregla justo eso.

   Cómo usarlo:
     cd backend
     node scripts/crearAdmin.js inversionesaoa7@gmail.com "LaClaveQueQuieras"

   Qué hace, en orden:
     1. Busca el correo en Authentication.
        - Si NO existe  → lo crea, con contraseña y confirmado.
        - Si YA existe  → le pone esa contraseña (aunque haya
          entrado siempre por Google) y lo deja confirmado.
     2. Marca is_admin = true en public.profiles.
     3. Prueba el login contra el backend desplegado, que es el
        camino real del panel. Sin esa comprobación diría "listo"
        y la dueña seguiría sin poder entrar.

   Es idempotente: se puede repetir para cambiar la clave.
   ========================================================= */

const email = (process.argv[2] || '').trim().toLowerCase();
const password = process.argv[3];

const URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error('\n❌ ' + msg + '\n');
  process.exit(1);
}

console.log('\n=== Acceso al panel admin — Abundance Code ===\n');

if (!email || !password) {
  fail('Uso: node scripts/crearAdmin.js <correo> "<contraseña>"');
}
if (!URL || !SERVICE_ROLE) {
  fail('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en backend/.env');
}
if (password.length < 8) {
  fail('La contraseña debe tener al menos 8 caracteres (lo exige Supabase).');
}

// El proyecto al que se va a escribir, en claro. Hay dos Supabase en juego
// —el de la landing y el de la app de cartas— y equivocarse de proyecto es
// el fallo más fácil de cometer aquí: se pondría la clave en la base que no es.
const proyecto = URL.replace('https://', '').split('.')[0];
console.log(`Proyecto Supabase : ${proyecto}`);
console.log(`Correo            : ${email}\n`);

const sb = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------------------------------------------------------
   1. Buscar el usuario. La API de admin no filtra por correo,
      así que hay que recorrer las páginas.
   --------------------------------------------------------- */
async function buscarPorCorreo(correo) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) fail('No se pudo listar usuarios: ' + error.message);

    const encontrado = data.users.find((u) => (u.email || '').toLowerCase() === correo);
    if (encontrado) return encontrado;
    if (data.users.length < 200) return null;
  }
  return null;
}

const existente = await buscarPorCorreo(email);
let usuario;

if (existente) {
  const proveedores = (existente.app_metadata?.providers || []).join(', ') || 'ninguno';
  console.log(`→ Ya existe (proveedores: ${proveedores}). Le pongo la contraseña.`);

  const { data, error } = await sb.auth.admin.updateUserById(existente.id, {
    password,
    email_confirm: true,
  });
  if (error) fail('No se pudo actualizar la contraseña: ' + error.message);
  usuario = data.user;
} else {
  console.log('→ No existe. Lo creo con contraseña y ya confirmado.');

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) fail('No se pudo crear el usuario: ' + error.message);
  usuario = data.user;
}

console.log(`   UID: ${usuario.id}\n`);

/* ---------------------------------------------------------
   2. El permiso. La fila de profiles la crea el trigger
      on_auth_user_created, pero si el usuario es viejo o el
      trigger no estaba, puede faltar: se inserta a mano.
   --------------------------------------------------------- */
const { data: perfil } = await sb
  .from('profiles')
  .select('id, is_admin')
  .eq('id', usuario.id)
  .maybeSingle();

if (!perfil) {
  console.log('→ No tenía fila en profiles. La creo.');
  const { error } = await sb
    .from('profiles')
    .insert({ id: usuario.id, email, is_admin: true });
  if (error) fail('No se pudo crear el perfil: ' + error.message);
} else if (!perfil.is_admin) {
  console.log('→ Tenía perfil sin permiso de admin. Se lo doy.');
  const { error } = await sb.from('profiles').update({ is_admin: true }).eq('id', usuario.id);
  if (error) fail('No se pudo marcar como admin: ' + error.message);
} else {
  console.log('→ Ya era admin.');
}

/* ---------------------------------------------------------
   3. Probar el login CONTRA EL PANEL DE VERDAD.

      No basta con que el usuario exista. El panel entra por el
      backend desplegado, y ahí caben dos fallos que desde aquí
      no se ven:

        - que el backend apunte a OTRO proyecto de Supabase, con
          lo que la contraseña se habría puesto en la base que no
          es;
        - que le falte SUPABASE_ANON_KEY, porque el login usa el
          cliente anónimo (src/lib/supabase.js) y sin esa clave
          responde "Invalid credentials" a todo el mundo, aunque
          el usuario y la contraseña sean correctos.

      Los dos dan el mismo error en pantalla, así que se prueba
      el camino entero en vez de adivinar.
   --------------------------------------------------------- */
const API = process.env.API_URL || 'https://api.abundacecode.com';

console.log(`\nProbando el login real contra ${API} ...`);

let respuesta;
try {
  respuesta = await fetch(`${API}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
} catch (err) {
  fail('No se pudo hablar con el backend: ' + err.message);
}

const cuerpo = await respuesta.json().catch(() => ({}));

if (!respuesta.ok || !cuerpo.token) {
  console.error(`\n❌ El usuario está creado, pero el panel sigue sin dejar entrar.`);
  console.error(`   Respuesta: ${respuesta.status} ${JSON.stringify(cuerpo)}\n`);
  console.error('   Son dos causas posibles, y se distinguen así:');
  console.error(`   1. El backend usa otro proyecto de Supabase, no ${proyecto}.`);
  console.error('      Mira SUPABASE_URL en las variables del servicio desplegado');
  console.error('      y vuelve a lanzar esto con esa URL y su service_role.');
  console.error('   2. Al backend le falta SUPABASE_ANON_KEY. Sin ella el login');
  console.error('      falla para todo el mundo. Sale de Supabase → Settings → API.\n');
  process.exit(1);
}

if (!cuerpo.user?.isAdmin) {
  fail('Entra, pero el backend no lo ve como admin. Revisa is_admin en profiles.');
}

console.log('\n✅ Comprobado de punta a punta: entra y es admin.\n');
console.log('Ya puede entrar en el panel con:');
console.log(`   Correo     : ${email}`);
console.log('   Contraseña : la que acabas de poner\n');
