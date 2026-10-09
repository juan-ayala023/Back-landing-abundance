import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, Search, ChevronDown,
  Edit2, X, Check, LogOut, AlertCircle, RefreshCw, Gift, Eye, Sparkles, Upload, Globe,
} from 'lucide-react';
import RichEditor from '../components/admin/RichEditor.jsx';

// ─── helpers ────────────────────────────────────────────────────────────────
const API = (import.meta.env.VITE_API_URL || '') + '/api';

/* Cómo entra cada persona a la app. Los cuatro valores los calcula la propia
   app en /api/admin/usuarios: es la única que conoce la lista de cortesías,
   que vive en una variable de entorno suya y no en ninguna tabla. */
const ACCESS_STYLES = {
  comprado:     { label: 'Pagado',      cls: 'bg-green-50 text-green-700 border-green-200' },
  cortesia:     { label: 'Cortesía',  cls: 'bg-gold/10 text-gold border-gold/30' },
  inactivo:     { label: 'Vencido',    cls: 'bg-red-50 text-red-700 border-red-200' },
  'sin-compra': { label: 'Sin acceso', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
};

/* Los estados de una SUSCRIPCIÓN del portal, que no son los de un pedido de
 * tienda. Van aparte a propósito: `canceled` existe en los dos y significa cosas
 * distintas, y reutilizar la tabla de arriba habría dejado sin color los estados
 * propios de Stripe. Los que puede haber los fija la base:
 * check (status in ('active','past_due','canceled','incomplete')). */
const SUB_STATUS_COLORS = {
  active:     'bg-green-50 text-green-700 border-green-200',
  past_due:   'bg-orange-50 text-orange-700 border-orange-200',
  canceled:   'bg-red-50 text-red-700 border-red-200',
  incomplete: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const SUB_STATUSES = ['active', 'past_due', 'canceled', 'incomplete'];

/* Etiquetas para la pantalla. Los valores siguen siendo los de Stripe y la
   base: es lo que se filtra y lo que se guarda. Solo cambia lo que se lee. */
const PLAN_LABELS = { monthly: 'mensual' };

/* Categorías del blog. El valor es el que se guarda (y por el que filtra la
   web); la etiqueta es lo que se lee. */
const BLOG_CATEGORIES = [
  ['Astrology',  'Astrología'],
  ['Tarot',      'Tarot'],
  ['Numerology', 'Numerología'],
  ['Crystals',   'Cristales'],
  ['Abundance',  'Abundancia'],
  ['Mindset',    'Mentalidad'],
];
const CATEGORY_LABELS = Object.fromEntries(BLOG_CATEGORIES);

/* Rangos recomendados para los campos SEO. Fuera del rango no se bloquea
   nada: se avisa con color, y decide quien escribe. */
const SEO_TITLE_RANGE = [50, 60];
const SEO_DESC_RANGE  = [140, 160];

/* <input type="datetime-local"> trabaja en hora local y sin zona; la base
   guarda ISO en UTC. Estas dos convierten en los dos sentidos. */
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v) {
  return v ? new Date(v).toISOString() : null;
}
function esFutura(iso) {
  return !!iso && new Date(iso).getTime() > Date.now();
}

const SUB_STATUS_LABELS = {
  active:     'activa',
  past_due:   'con impago',
  canceled:   'cancelada',
  incomplete: 'incompleta',
};

function fmtMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

/* Días enteros desde una fecha. Para leer «lleva 45 días sin entrar». */
function diasDesde(d) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}
/* A partir de cuántos días sin entrar una persona con acceso se marca en
   ámbar: es la señal para revisar si sigue mereciendo la pena cobrarle. */
const DIAS_INACTIVO = 30;

function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function useAuthHeaders() {
  const token = localStorage.getItem('ac_admin_token');
  return useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
}

// ─── Login screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'No se pudo iniciar sesión'); setLoading(false); return; }
      if (!data.user?.isAdmin) { setError('Esta cuenta no tiene acceso de administrador.'); setLoading(false); return; }
      localStorage.setItem('ac_admin_token', data.token);
      onLogin(data.user);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <p className="text-center text-xs uppercase tracking-[0.3em] text-gold font-sans mb-6">Abundance Code · Administración</p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-[#111827] mb-6">Iniciar sesión</h1>
          {error && (
            <div className="flex items-center gap-2 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-sans">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Correo de administrador"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] placeholder-[#9CA3AF] text-sm font-sans focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20"
            />
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] placeholder-[#9CA3AF] text-sm font-sans focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20"
            />
            <button
              type="submit" disabled={loading}
              className="w-full btn-gold text-sm disabled:opacity-60"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
/* `alert` tiñe la tarjeta cuando el número es un problema y no un dato — hoy solo
 * lo usa «pagaron y nunca entraron». Por defecto va apagado, así que las tarjetas
 * que ya existían se pintan exactamente igual que antes. */
/* Contador de caracteres con el rango recomendado: verde dentro, ámbar fuera.
   Solo orienta; nunca impide guardar. */
function CharCounter({ value, range }) {
  const n = (value || '').length;
  const [min, max] = range;
  const ok = n >= min && n <= max;
  return (
    <span className={`text-xs font-sans tabular-nums ${n === 0 ? 'text-[#9CA3AF]' : ok ? 'text-green-700' : 'text-amber-700'}`}>
      {n} / {min}–{max}
    </span>
  );
}

/* Campo de imagen: se puede pegar una URL o subir un archivo. La subida va
   al backend (POST /api/admin/blog/imagen), que la guarda en Supabase Storage
   y devuelve la URL pública; aquí solo se rellena el campo. */
function ImageField({ value, onChange, placeholder, headers, previewClass = 'h-28 w-full', alt = 'Vista previa' }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const subir = async (file) => {
    if (!file) return;
    setError(''); setSubiendo(true);
    try {
      const res = await fetch(`${API}/admin/blog/imagen?nombre=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo subir la imagen.');
      onChange(data.url);
    } catch (e) {
      setError(e.message);
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex gap-2">
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden"
          onChange={e => subir(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={subiendo}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-sans font-medium border border-[#D4AF37] text-[#7A5F17] hover:bg-[#FBF6E7] disabled:opacity-60 disabled:cursor-wait">
          <Upload size={15} /> {subiendo ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </div>
      {error && <p className="text-xs font-sans mt-1.5" style={{ color: '#B0413E' }}>{error}</p>}
      {value && <img src={value} alt={alt} className={`mt-2 object-cover rounded-xl opacity-80 ${previewClass}`} />}
    </div>
  );
}

function StatCard({ icon, label, value, sub, alert = false }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${alert ? 'border-red-200' : 'border-[#E5E7EB]'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={alert ? 'text-red-500' : 'text-gold'}>{icon}</span>
        <p className="text-[#6B7280] text-xs uppercase tracking-widest font-sans">{label}</p>
      </div>
      <p className={`font-serif text-3xl ${alert ? 'text-red-600' : 'text-[#111827]'}`}>{value}</p>
      {sub && <p className={`text-xs font-sans mt-1 ${alert ? 'text-red-500' : 'text-[#9CA3AF]'}`}>{sub}</p>}
    </div>
  );
}

// ─── Main Admin panel ─────────────────────────────────────────────────────────
export default function Admin() {
  const [admin, setAdmin] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('ac_admin_token');
    if (!token) return;
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.isAdmin) setAdmin(data); else localStorage.removeItem('ac_admin_token'); })
      .catch(() => localStorage.removeItem('ac_admin_token'));
  }, []);

  if (!admin) return <LoginScreen onLogin={setAdmin} />;

  return <AdminDashboard admin={admin} onLogout={() => { localStorage.removeItem('ac_admin_token'); setAdmin(null); }} />;
}

function AdminDashboard({ admin, onLogout }) {
  const headers = useAuthHeaders();

  // Pestaña activa. Arranca en Payments: es el negocio real desde que la
  // tienda de producto físico dejó de venderse.
  const [tab, setTab] = useState('payments');

  // Blog
  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [blogForm, setBlogForm] = useState(null); // null | {} | {existing}
  const [blogError, setBlogError] = useState('');
  const [traduciendo, setTraduciendo] = useState(null); // id del post en curso

  // Subscriptions (portal payments)
  const [subs, setSubs] = useState([]);
  const [subStats, setSubStats] = useState(null);
  const [embudo, setEmbudo] = useState(null);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsPages, setSubsPages] = useState(1);
  const [subsPage, setSubsPage] = useState(1);
  const [subStatus, setSubStatus] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subSearchInput, setSubSearchInput] = useState('');
  const [loadingSubs, setLoadingSubs] = useState(false);

  /* Usuarios de la app.
     No salen de este backend y no pueden salir: la app corre sobre otro proyecto
     de Supabase, así que `/admin/users` de aquí solo conoce a los administradores
     —por eso esta pestaña salía vacía teniendo usuarios reales—. Se piden ya
     resueltos a `/admin/portal-users`, que se lo pregunta a ella. */
  const [portalUsers, setPortalUsers]     = useState([]);
  const [portalSummary, setPortalSummary] = useState(null);
  const [portalError, setPortalError]     = useState('');
  const [portalNotice, setPortalNotice]   = useState('');
  const [borrando, setBorrando]           = useState(null); // id del usuario en curso
  const [regenerando, setRegenerando]     = useState(null); // email en curso
  /* Quién tiene abierto el formulario de corrección, y qué se ha escrito. */
  const [corrigiendo, setCorrigiendo]     = useState(null); // { email, fecha, hora, horaDesconocida }
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  /* El buscador de ciudades: lo escrito, lo encontrado y lo elegido. */
  const [ciudadTexto, setCiudadTexto]     = useState('');
  const [ciudades, setCiudades]           = useState([]);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [userSearch, setUserSearch]       = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');

  /* La lista llega entera —la app la acota— y se filtra en el navegador. Con el
     volumen real son decenas de filas, y paginar contra un servicio que ya ha
     hecho el viaje de ida y vuelta añadiría espera sin ahorrar nada. */
  const fetchPortal = useCallback(async () => {
    setLoadingUsers(true);
    setPortalError('');
    try {
      const res  = await fetch(`${API}/admin/portal-users`, { headers });
      const data = await res.json();
      if (res.ok) {
        setPortalUsers(data.usuarios || []);
        setPortalSummary(data.resumen || null);
      } else {
        /* El motivo se enseña tal cual. «APP_SHARED_SECRET no coincide» ahorra
           una tarde de depuración, y callarlo dejaría una tabla vacía que se
           lee como «no hay usuarios» — justo el malentendido a evitar. */
        setPortalError(data.message || 'No se pudieron cargar los usuarios de la app');
        setPortalUsers([]);
        setPortalSummary(null);
      }
    } catch {
      setPortalError('No se pudo contactar con el servidor');
    }
    setLoadingUsers(false);
  }, [headers]);

  // Subscriptions helpers
  const fetchSubs = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const params = new URLSearchParams({ page: subsPage, limit: 20 });
      if (subStatus !== 'all') params.set('status', subStatus);
      if (subSearch) params.set('search', subSearch);
      const res = await fetch(`${API}/admin/subscriptions?${params}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setSubs(data.subscriptions || []);
        setSubsTotal(data.total || 0);
        setSubsPages(data.pages || 1);
      }
    } catch { /* ignore */ }
    setLoadingSubs(false);
  }, [subsPage, subStatus, subSearch, headers]);

  const fetchSubStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/subscriptions/stats`, { headers });
      const data = await res.json();
      if (res.ok) setSubStats(data);
    } catch { /* ignore */ }
  }, [headers]);

  /* Quién abrió la pantalla de pago y no llegó a comprar. Las suscripciones
     cuentan a quien pagó; esto cuenta a quien estuvo a punto. */
  const fetchEmbudo = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/funnel`, { headers });
      const data = await res.json();
      if (res.ok) setEmbudo(data);
    } catch { /* ignore */ }
  }, [headers]);

  // Products helpers
  // Blog helpers
  const fetchBlog = useCallback(async () => {
    setLoadingBlog(true);
    try {
      const res = await fetch(`${API}/admin/blog`, { headers });
      const data = await res.json();
      if (res.ok) setBlogPosts(data.posts || []);
    } catch { /* ignore */ }
    setLoadingBlog(false);
  }, [headers]);

  const saveBlogPost = async (form) => {
    setBlogError('');
    const isEdit = !!form._id;
    const url    = isEdit ? `${API}/admin/blog/${form._id}` : `${API}/admin/blog`;
    const method = isEdit ? 'PATCH' : 'POST';
    try {
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setBlogError(data.message || 'Error al guardar'); return; }
      fetchBlog();
      setBlogForm(null);
    } catch { setBlogError('Error de conexión'); }
  };

  /*
    Traducir una entrada al otro idioma.

    Tarda: es un artículo entero pasando por el modelo. Por eso el botón se
    queda ocupado y lo dice, en vez de parecer que no hizo nada.

    Lo que vuelve es un primer borrador bueno, no un texto publicado. Se guarda
    al lado del original y se puede corregir después desde el mismo editor —esa
    revisión es lo que separa una traducción automática de algo publicable.
  */
  const traducirPost = async (post) => {
    const destino = (post.idioma || 'es') === 'es' ? 'en' : 'es';
    const nombre  = destino === 'en' ? 'inglés' : 'español';

    const seguro = window.confirm(
      `¿Traducir «${post.title}» al ${nombre}?\n\nSe guardará al lado del original y podrás corregirla antes de que nadie la lea. Tarda un minuto.`
    );
    if (!seguro) return;

    setTraduciendo(post._id);
    setBlogError('');
    try {
      const res  = await fetch(`${API}/admin/blog/${post._id}/traducir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ idioma: destino }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setBlogError(data.message || 'No se pudo traducir');
      else fetchBlog();
    } catch {
      setBlogError('No se pudo contactar con el servidor');
    }
    setTraduciendo(null);
  };

  const deleteBlogPost = async (id) => {
    if (!confirm('Delete this post?')) return;
    await fetch(`${API}/admin/blog/${id}`, { method: 'DELETE', headers });
    fetchBlog();
  };

  useEffect(() => { fetchPortal(); }, [fetchPortal]);
  useEffect(() => { if (tab === 'blog')     fetchBlog();     }, [fetchBlog, tab]);
  useEffect(() => {
    if (tab !== 'payments') return;
    fetchSubs();
    fetchSubStats();
    fetchEmbudo();
  }, [fetchSubs, fetchSubStats, fetchEmbudo, tab]);

  const handleUserSearchSubmit = (e) => { e.preventDefault(); setUserSearch(userSearchInput); };

  /* Borra la cuenta en la app. Dos casos no se borran desde aquí y el botón
     ya lo impide: quien paga (hay que cancelar en Stripe, si no seguiría
     cobrando) y las cortesías que nunca entraron (no hay cuenta que borrar).
     Una cortesía con cuenta sí se borra, pero volverá a entrar mientras siga
     en la lista de Railway: se avisa al terminar. */
  /* Archiva la lectura de esa persona en la app para que se reescriba en su
     próxima visita. La app responde al instante; el trabajo ocurre cuando la
     persona entre. Sirve cuando cambia la voz con la que se redactan las
     lecturas: quien ya tenía una seguiría leyendo la vieja. */
  const regenerarLectura = async (user) => {
    const seguro = window.confirm(
      `¿Regenerar la lectura de ${user.email}?

Se archivará su lectura actual y se reescribirá en su próxima visita. ¿Continuar?`
    );
    if (!seguro) return;

    setRegenerando(user.email);
    setPortalError('');
    setPortalNotice('');
    try {
      const res  = await fetch(`${API}/admin/portal-users/regenerar-lectura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalError(data.message || 'No se pudo regenerar la lectura');
      } else {
        const que = (data.archivadas || []).join(', ') || 'lectura';
        setPortalNotice(`Archivado (${que}) para ${user.email}. Se reescribirá en su próxima visita.`);
      }
    } catch {
      setPortalError('No se pudo contactar con el servidor');
    }
    setRegenerando(null);
  };

  /*
    Corregir el nacimiento.

    No es un retoque: cambiar la fecha invalida la carta y todo lo escrito
    desde ella. Un año de diferencia mueve la Luna a otro signo. Por eso se
    pide confirmación diciendo exactamente qué se va a archivar, y por eso el
    formulario viene relleno con lo que hay — escribir la fecha de memoria es
    la forma más fácil de convertir una corrección en un error nuevo.
  */
  const abrirCorreccion = (user) => {
    const n = user.nacimiento;
    setPortalError('');
    setPortalNotice('');
    setCiudadTexto('');
    setCiudades([]);
    setCorrigiendo({
      email: user.email,
      /* Vacío mientras no se elija otra: sin tocarlo, se conserva la suya. */
      place: null,
      nombre: user.nombre,
      lugar: n?.lugar || '',
      fecha: n?.fecha || '',
      hora: n?.hora || '',
      horaDesconocida: !!n?.horaDesconocida,
    });
  };

  /*
    Buscar ciudades.

    Sin debounce a propósito: lo dispara el botón, no cada tecla. El panel lo
    usa una persona que ya sabe qué ciudad busca, y cada pulsación contra el
    proveedor sería gastar cuota para adivinar lo que está a punto de terminar
    de escribir.
  */
  const buscarCiudades = async () => {
    const q = ciudadTexto.trim();
    if (q.length < 2) return;
    setPortalError('');
    try {
      const res  = await fetch(`${API}/admin/portal-users/ciudades?q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalError(data.message || 'No se pudieron buscar ciudades');
        return;
      }
      setCiudades(data.places || []);
      if ((data.places || []).length === 0) setPortalError('Ninguna ciudad coincide');
    } catch {
      setPortalError('No se pudo contactar con el servidor');
    }
  };

  const guardarCorreccion = async () => {
    const c = corrigiendo;
    if (!c) return;

    const seguro = window.confirm(
      `¿Corregir el nacimiento de ${c.email}?${c.place ? `\n\nLugar: ${c.lugar} → ${c.place.city}, ${c.place.country}` : ''}

Su carta natal se recalculará, y su lectura base y su retrato se archivarán y se reescribirán. Lo archivado no se pierde: queda guardado y se puede releer.

¿Continuar?`
    );
    if (!seguro) return;

    setGuardandoCorreccion(true);
    setPortalError('');
    setPortalNotice('');
    try {
      const res = await fetch(`${API}/admin/portal-users/corregir-nacimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email: c.email,
          birthDate: c.fecha,
          birthTime: c.horaDesconocida ? null : c.hora,
          timeUnknown: c.horaDesconocida,
          place: c.place,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalError(data.message || 'No se pudo corregir el nacimiento');
      } else {
        const que = (data.archivadas || []).join(' y ') || 'nada';
        setPortalNotice(
          `Corregido ${c.email}: ${data.antes?.birthDate} → ${data.ahora?.birthDate}` +
          (c.place ? `, ${data.antes?.lugar} → ${data.ahora?.lugar}` : '') +
          `. Se archivó (${que}) y la carta se recalculará en su próxima visita.`
        );
        setCorrigiendo(null);
        fetchPortal();
      }
    } catch {
      setPortalError('No se pudo contactar con el servidor');
    }
    setGuardandoCorreccion(false);
  };

  const borrarUsuario = async (user) => {
    const seguro = window.confirm(
      `¿Eliminar la cuenta de ${user.email}?\n\nSe borra su cuenta en la app con su carta y sus lecturas. No se puede deshacer.`
    );
    if (!seguro) return;

    setBorrando(user.id);
    setPortalError('');
    setPortalNotice('');
    try {
      const res  = await fetch(
        `${API}/admin/portal-users/${encodeURIComponent(user.id)}?email=${encodeURIComponent(user.email)}`,
        { method: 'DELETE', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalError(data.message || 'No se pudo eliminar la cuenta');
      } else {
        setPortalNotice(
          data.cortesia
            ? `Cuenta de ${data.email} eliminada. Sigue en la lista de cortesía (ACCESOS_CORTESIA en Railway): si vuelve a entrar, tendrá acceso otra vez.`
            : `Cuenta de ${data.email} eliminada.`
        );
        fetchPortal();
      }
    } catch {
      setPortalError('No se pudo contactar con el servidor');
    }
    setBorrando(null);
  };

  /* Filtro del buscador, en cliente: la lista completa ya está en memoria y
     volver al servidor por cada término sería un viaje de ida y vuelta a la app
     para recortar un array de decenas de filas. */
  const visibleUsers = useMemo(() => {
    const termino = userSearch.trim().toLowerCase();
    if (!termino) return portalUsers;
    return portalUsers.filter(u =>
      (u.email || '').toLowerCase().includes(termino) ||
      (u.nombre || '').toLowerCase().includes(termino)
    );
  }, [portalUsers, userSearch]);

  const handleSubSearchSubmit = (e) => { e.preventDefault(); setSubSearch(subSearchInput); setSubsPage(1); };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Top bar */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-sans">Abundance Code · Administración</p>
          <div className="hidden sm:flex gap-1">
            {[['payments', 'Pagos'], ['users', 'Usuarios'], ['blog', 'Blog']].map(([t, etiqueta]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-sans font-medium capitalize transition-colors ${
                  tab === t ? 'bg-gold/15 text-gold' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[#6B7280] text-xs font-sans hidden sm:block">{admin.email}</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#111827] text-xs font-sans transition-colors"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Tab: Payments — suscripciones del portal */}
        {tab === 'payments' && (
          <div>
            {/*
              Resumen propio, separado del de arriba: aquel cuenta pedidos de
              tienda con envío, y esto son las suscripciones de 49 $ + 14,99 $/mes.
              Mezclarlos daría una cifra que no significa nada.
            */}
            {subStats && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                <StatCard
                  icon={<Users size={18} />}
                  label="Suscriptores"
                  value={subStats.total}
                  sub={`${subStats.active} activas · ${subStats.pastDue} con impago`}
                />
                {/*
                  La renovación, con su denominador.

                  Antes decía «0 han renovado al menos una vez» junto a cuatro
                  suscriptores al corriente, y se leía como un desastre cuando
                  lo único que pasaba es que la entrada incluye 30 días y a
                  nadie le había llegado todavía su primer cobro. Contado sobre
                  los que YA pasaron esa fecha, el número significa algo.
                */}
                <StatCard
                  icon={<TrendingUp size={18} />}
                  label="Renovaron"
                  value={
                    subStats.vencidas > 0
                      ? `${subStats.renovadas} de ${subStats.vencidas}`
                      : '—'
                  }
                  sub={
                    subStats.vencidas > 0
                      ? `${Math.round((subStats.renovadas / subStats.vencidas) * 100)}% de los que ya cumplieron el mes`
                      : 'Todavía nadie ha llegado a su primer cobro'
                  }
                />
                <StatCard
                  icon={<X size={18} />}
                  label="Bajas"
                  value={subStats.canceled}
                  sub={
                    /*
                      Primero las que todavía no se han ido: pidieron la baja y
                      conservan el acceso hasta que venza su periodo. Son las
                      únicas a las que aún se les puede escribir, así que es lo
                      que hay que leer antes que el acumulado.
                    */
                    subStats.seVan > 0
                      ? `${subStats.seVan} ${subStats.seVan === 1 ? 'pidió' : 'pidieron'} la baja y sigue${subStats.seVan === 1 ? '' : 'n'} con acceso`
                      : subStats.bajas30d > 0
                        ? `${subStats.bajas30d} en los últimos 30 días`
                        : subStats.canceled > 0
                          ? 'Ninguna en los últimos 30 días'
                          : `${subStats.incomplete} incompletas`
                  }
                  alert={subStats.bajas30d > 0 || subStats.seVan > 0}
                />
                {/*
                  El número que de verdad hay que mirar: pagaron y nunca canjearon
                  su enlace, así que han dado dinero y no han recibido nada. Se
                  pinta en rojo cuando no es cero porque no es una estadística,
                  es una lista de gente a la que hay que escribir.
                */}
                <StatCard
                  icon={<AlertCircle size={18} />}
                  label="Aún no han entrado"
                  value={subStats.unredeemed}
                  sub={subStats.unredeemed > 0 ? 'Pagaron y no han abierto su portal' : 'Todos han entrado'}
                  alert={subStats.unredeemed > 0}
                />
                {/*
                  Lo cobrado de verdad, no el precio de lista. Sale de lo que
                  Stripe fue cobrando factura a factura, así que un cupón del
                  100 % resta aquí igual que en la cuenta del banco.
                */}
                <StatCard
                  icon={<Sparkles size={18} />}
                  label="Ingresos"
                  value={`$${((subStats.cobradoCents || 0) / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  sub="Entradas y renovaciones, desde el principio"
                />
              </div>
            )}

            {/*
              El embudo de los últimos 30 días.

              Va aparte del resumen de arriba porque cuenta otra cosa: aquel son
              personas que pagaron, y esto son intentos. Un intento de hace menos
              de media hora no cuenta como abandonado —puede estar escribiendo su
              tarjeta— y quien abandonó y luego compró no aparece como perdido.
            */}
            {embudo && embudo.intentos > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<Sparkles size={18} />}
                  label="Llegaron al pago"
                  value={embudo.intentos}
                  sub={`Últimos ${embudo.dias} días`}
                />
                <StatCard
                  icon={<TrendingUp size={18} />}
                  label="Conversión"
                  value={embudo.conversion === null ? '—' : `${embudo.conversion}%`}
                  sub={`${embudo.compras} de ${embudo.intentos} completaron la compra`}
                />
                {/*
                  Esto no es una estadística: es una lista de correos a los que
                  se puede escribir. Por eso se pinta en ámbar cuando no es cero.
                */}
                <StatCard
                  icon={<AlertCircle size={18} />}
                  label="Pago sin terminar"
                  value={embudo.abandonados}
                  sub={embudo.abandonados > 0 ? 'Puedes escribirles: sus correos, abajo' : 'Nadie se quedó a medias'}
                  alert={embudo.abandonados > 0}
                />
                <StatCard
                  icon={<Users size={18} />}
                  label="Sin datos de nacimiento"
                  value={portalSummary ? Math.max(portalSummary.comprado - portalSummary.conPortal, 0) : '—'}
                  sub="Tienen acceso y aún no han dado su fecha"
                />
              </div>
            )}

            {/*
              Con qué idioma llega la gente.

              Lo pidió Andrea, y la respuesta decide en qué idioma se escribe lo
              siguiente. Se cuenta sobre los intentos —no sobre las compras—
              porque la pregunta es de dónde viene el tráfico; al lado va lo que
              compró cada idioma, que es donde se ve si uno atrae y no convierte.
            */}
            {embudo && embudo.intentos > 0 && (
              <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={15} className="text-[#9CA3AF]" />
                  <span className="text-sm font-medium">Con qué idioma llegan</span>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {[
                    ['es', 'Español'],
                    ['en', 'Inglés'],
                    ['sin-dato', 'Sin dato'],
                  ].map(([clave, etiqueta]) => {
                    const fila = embudo.idiomas?.[clave];
                    if (!fila) return null;
                    return (
                      <p key={clave} className="text-xs font-sans text-[#6B7280]">
                        <span className="text-[#111827] font-medium">{etiqueta}</span>
                        {' · '}{fila.intentos} {fila.intentos === 1 ? 'abrió' : 'abrieron'} el pago
                        {' · '}<span className="text-green-700">{fila.compras} {fila.compras === 1 ? 'compró' : 'compraron'}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* La lista de los que se quedaron a medias, con su correo. */}
            {embudo && embudo.perdidos.length > 0 && (
              <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600" />
                  <span className="text-sm font-medium">Llegaron al pago y no lo terminaron</span>
                  <span className="text-xs text-[#6B7280]">
                    · {embudo.perdidos.length} {embudo.perdidos.length === 1 ? 'persona' : 'personas'}
                  </span>
                </div>
                <ul className="divide-y divide-[#F3F4F6]">
                  {embudo.perdidos.map((p) => (
                    <li key={p.email} className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <a href={`mailto:${p.email}`} className="text-sm text-[#111827] underline underline-offset-2">
                          {p.email}
                        </a>
                        {p.name && <span className="ml-2 text-xs text-[#6B7280]">{p.name}</span>}
                      </div>
                      <div className="text-xs text-[#6B7280] tabular-nums">
                        {p.intentos > 1 && <span className="mr-3">{p.intentos} intentos</span>}
                        {new Date(p.ultimoIntento).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        {p.utmCampaign && <span className="ml-3">· {p.utmCampaign}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filters */}
            {/*
              Corregir el nacimiento.

              Aparece encima de la tabla y no dentro de la fila: el aviso de lo
              que va a pasar ocupa más que la fila entera, y esconderlo sería
              esconder justo lo que hay que leer antes de pulsar. La fecha viene
              puesta porque una corrección cambia un dígito, no la fecha entera.
            */}
            {corrigiendo && (
              <div className="rounded-2xl border border-[#D4AF37]/50 bg-[#FDFBF4] px-5 py-5 mb-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[#111827] font-sans text-sm font-medium">
                      Corregir el nacimiento de {corrigiendo.nombre || corrigiendo.email}
                    </p>
                    <p className="text-[#6B7280] text-xs font-sans mt-0.5">
                      {corrigiendo.email}{corrigiendo.lugar ? ` · ${corrigiendo.lugar}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setCorrigiendo(null)}
                    className="text-[#9CA3AF] hover:text-[#111827] shrink-0"
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-[#6B7280] text-xs font-sans">Fecha de nacimiento</span>
                    <input
                      type="date"
                      value={corrigiendo.fecha}
                      onChange={(e) => setCorrigiendo({ ...corrigiendo, fecha: e.target.value })}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-sans"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[#6B7280] text-xs font-sans">Hora</span>
                    <input
                      type="time"
                      value={corrigiendo.hora}
                      disabled={corrigiendo.horaDesconocida}
                      onChange={(e) => setCorrigiendo({ ...corrigiendo, hora: e.target.value })}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-sans disabled:opacity-40"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-sans text-[#374151] pb-2">
                    <input
                      type="checkbox"
                      checked={corrigiendo.horaDesconocida}
                      onChange={(e) =>
                        setCorrigiendo({
                          ...corrigiendo,
                          horaDesconocida: e.target.checked,
                          hora: e.target.checked ? '' : corrigiendo.hora,
                        })
                      }
                    />
                    No sabe su hora
                  </label>

                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <span className="text-[#6B7280] text-xs font-sans">
                      Ciudad {corrigiendo.place ? '' : '(déjala en blanco para no cambiarla)'}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ciudadTexto}
                        placeholder={corrigiendo.lugar || 'Buscar otra ciudad'}
                        onChange={(e) => setCiudadTexto(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCiudades(); } }}
                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-sans w-56"
                      />
                      <button
                        type="button"
                        onClick={buscarCiudades}
                        disabled={ciudadTexto.trim().length < 2}
                        className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm font-sans text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40"
                      >
                        Buscar
                      </button>
                    </div>
                    {corrigiendo.place && (
                      <p className="text-green-700 text-xs font-sans mt-1">
                        Nueva: {corrigiendo.place.city}, {corrigiendo.place.country} · {corrigiendo.place.tz}
                        {' '}
                        <button
                          type="button"
                          onClick={() => setCorrigiendo({ ...corrigiendo, place: null })}
                          className="underline hover:no-underline"
                        >
                          quitar
                        </button>
                      </p>
                    )}
                    {ciudades.length > 0 && !corrigiendo.place && (
                      <ul className="mt-1 rounded-xl border border-[#E5E7EB] bg-white max-h-44 overflow-y-auto">
                        {ciudades.map((p) => (
                          <li key={p.providerId}>
                            <button
                              type="button"
                              onClick={() => {
                                setCorrigiendo({ ...corrigiendo, place: p });
                                setCiudades([]);
                                setCiudadTexto('');
                              }}
                              className="w-full text-left px-3 py-2 text-sm font-sans hover:bg-[#F9FAFB]"
                            >
                              {p.city}{p.region ? `, ${p.region}` : ''}, {p.country}
                              <span className="text-[#9CA3AF] text-xs"> · {p.tz}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={guardarCorreccion}
                    disabled={guardandoCorreccion || !corrigiendo.fecha || (!corrigiendo.horaDesconocida && !corrigiendo.hora)}
                    className="ml-auto rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-sans text-white hover:bg-[#b8942c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {guardandoCorreccion ? 'Corrigiendo…' : 'Corregir y reescribir'}
                  </button>
                </div>

                <p className="text-[#6B7280] text-xs font-sans mt-4 leading-relaxed">
                  Al guardar se recalcula su carta natal y se archivan su lectura base y su
                  retrato, que se reescribirán en su próxima visita. Lo archivado no se borra:
                  queda guardado con la fecha que tenía, y se puede releer.
                  <br />
                  La ciudad solo cambia si eliges una de la lista; si la dejas en blanco, se
                  conserva la suya. La persona también puede corregir todo esto ella misma
                  desde Mi Cuenta, una vez al día.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <form onSubmit={handleSubSearchSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={subSearchInput} onChange={e => setSubSearchInput(e.target.value)}
                    placeholder="Buscar por correo o nombre…"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm font-sans focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-sans hover:border-[#D4AF37]/50 transition-colors">
                  Buscar
                </button>
              </form>

              <div className="relative">
                <select
                  value={subStatus}
                  onChange={e => { setSubStatus(e.target.value); setSubsPage(1); }}
                  className="appearance-none pl-4 pr-9 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all" className="bg-white">Todos los estados</option>
                  {SUB_STATUSES.map(s => <option key={s} value={s} className="bg-white">{SUB_STATUS_LABELS[s] || s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>

              <button
                onClick={() => { fetchSubs(); fetchSubStats(); }}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] transition-colors flex items-center gap-1.5 text-sm font-sans"
              >
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
              {/* La tabla se desplaza dentro de su caja: con siete columnas no
                  cabe en un portátil estrecho, y sin esto la página entera se
                  desbordaría hacia la derecha. */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-left text-[#6B7280] text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Pagos</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Acceso</th>
                      <th className="px-4 py-3 font-medium">Renueva</th>
                      <th className="px-4 py-3 font-medium">Desde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSubs && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-[#9CA3AF]">Cargando…</td></tr>
                    )}

                    {!loadingSubs && subs.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-[#9CA3AF]">Todavía no hay suscripciones</td></tr>
                    )}

                    {!loadingSubs && subs.map(s => (
                      <tr key={s.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3">
                          <p className="text-[#111827]">{s.name || '—'}</p>
                          <p className="text-[#6B7280] text-xs break-all">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#111827]">
                          {PLAN_LABELS[s.plan] || s.plan}
                          {typeof s.price === 'number' && (
                            <span className="text-[#6B7280] text-xs block">{fmtMoney(s.price)} inicial</span>
                          )}
                        </td>
                        {/*
                          Lo que distingue «compró» de «sigue pagando». Las
                          renovaciones son cuotas cobradas de verdad (Stripe las
                          confirma factura a factura), no meses transcurridos.
                        */}
                        <td className="px-4 py-3">
                          {s.renewalsCount > 0 ? (
                            <>
                              <p className="text-green-700 text-xs font-medium">
                                {s.renewalsCount} {s.renewalsCount === 1 ? 'renovación' : 'renovaciones'}
                              </p>
                              {s.lastRenewalAt && (
                                <p className="text-[#6B7280] text-xs">última {fmtDate(s.lastRenewalAt)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-[#9CA3AF] text-xs">Solo la compra inicial</p>
                          )}
                          <p className="text-[#111827] text-xs mt-1">Total {fmtMoney(s.totalPaid || s.price || 0)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-xs ${SUB_STATUS_COLORS[s.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {SUB_STATUS_LABELS[s.status] || s.status}
                          </span>
                        </td>
                        {/*
                          Pagó y entró, o pagó y sigue fuera. Es lo que convierte
                          esta tabla en algo accionable en vez de un listado.
                        */}
                        <td className="px-4 py-3">
                          {s.redeemedAt ? (
                            <span className="text-green-700 text-xs">Entró el {fmtDate(s.redeemedAt)}</span>
                          ) : (
                            <span className="text-orange-700 text-xs">
                              Nunca entró
                              {s.remindersSent > 0 && ` · ${s.remindersSent} reminder${s.remindersSent > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs">
                          {s.currentPeriodEnd ? fmtDate(s.currentPeriodEnd) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs">{fmtDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {subsPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-[#6B7280] text-xs font-sans">{subsTotal} suscripciones</p>
                <div className="flex gap-2">
                  <button
                    disabled={subsPage <= 1}
                    onClick={() => setSubsPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-sans text-[#6B7280] disabled:opacity-40 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 text-xs font-sans text-[#6B7280]">{subsPage} / {subsPages}</span>
                  <button
                    disabled={subsPage >= subsPages}
                    onClick={() => setSubsPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-sans text-[#6B7280] disabled:opacity-40 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Orders */}
        {tab === 'users' && (
          <div>
            {/*
              Estos son los usuarios de la app, no los de esta base de datos.
              El resumen separa quién PUEDE entrar (pagado o cortesía) de quién
              ha llegado a USAR el producto (`conPortal`, es decir, generó su
              carta natal). Son dos preguntas distintas y antes no se veía
              ninguna de las dos.
            */}
            {portalSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<Users size={18} />}
                  label="Registrados"
                  value={portalSummary.total}
                  sub={`${portalSummary.conPortal} con carta generada`}
                />
                <StatCard
                  icon={<TrendingUp size={18} />}
                  label="Acceso pagado"
                  value={portalSummary.comprado}
                  sub={portalSummary.inactivo > 0
                    ? `${portalSummary.inactivo} con el acceso vencido`
                    : 'Sin suscripciones vencidas'}
                />
                <StatCard
                  icon={<Gift size={18} />}
                  label="Cortesía"
                  value={portalSummary.cortesia}
                  sub="Lista ACCESOS_CORTESIA en Railway"
                />
                <StatCard
                  icon={<AlertCircle size={18} />}
                  label="Sin acceso"
                  value={portalSummary.sinCompra}
                  sub={portalSummary.sinCompra > 0 ? 'Tienen cuenta y aún no han comprado' : 'Todos tienen acceso'}
                />
              </div>
            )}

            {/*
              Un fallo al hablar con la app se dice en pantalla y con su motivo.
              Sin esto la tabla saldría vacía y se leería como «no hay usuarios»,
              que es precisamente la confusión que esta pestaña viene a resolver.
            */}
            {portalNotice && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 mb-5 flex items-start gap-3">
                <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-green-800 text-sm font-sans">{portalNotice}</p>
                <button onClick={() => setPortalNotice('')} className="ml-auto text-green-700 hover:text-green-900 shrink-0"><X size={14} /></button>
              </div>
            )}

            {portalError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 mb-5 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-700 text-sm font-sans">No se pudo leer la lista de usuarios de la app.</p>
                  <p className="text-red-500 text-xs font-sans mt-0.5">{portalError}</p>
                </div>
                <button
                  onClick={fetchPortal}
                  className="ml-auto flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-sans shrink-0"
                >
                  <RefreshCw size={13} /> Reintentar
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <form onSubmit={handleUserSearchSubmit} className="flex gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={userSearchInput} onChange={e => setUserSearchInput(e.target.value)}
                    placeholder="Buscar por correo o nombre…"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm font-sans focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-sans hover:border-[#D4AF37]/50 transition-colors">
                  Buscar
                </button>
              </form>
              <button
                onClick={fetchPortal}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-sans hover:border-[#D4AF37]/50 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} /> Actualizar
              </button>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden bg-white shadow-sm">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm font-sans">Cargando usuarios…</div>
              ) : visibleUsers.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm font-sans">
                  {portalError ? 'No se pudieron cargar los usuarios.' : userSearch ? 'Ningún usuario coincide con la búsqueda.' : 'Todavía no hay usuarios.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest">Usuario</th>
                        <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest">Acceso</th>
                        <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest hidden md:table-cell">Carta</th>
                        <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest hidden lg:table-cell">Fechas</th>
                        <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map((user, i) => {
                        const estilo = ACCESS_STYLES[user.acceso] || ACCESS_STYLES['sin-compra'];
                        return (
                          <tr key={user.email} className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <p className="text-[#111827] font-sans text-sm">{user.nombre || '—'}</p>
                                {/*
                                  En qué idioma compró. Sale de la sesión de
                                  Stripe, así que solo lo tienen las compras
                                  posteriores al 3 de octubre de 2026: en las
                                  anteriores no se pinta nada, que es la verdad.
                                  Una cortesía tampoco lo tiene — no hubo compra.
                                */}
                                {user.idioma && (
                                  <span
                                    title={user.idioma === 'en' ? 'Compró en inglés' : 'Compró en español'}
                                    className="inline-flex px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-sans tracking-wider text-[#6B7280]"
                                  >
                                    {user.idioma.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="text-[#6B7280] font-sans text-xs">{user.email}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-sans border ${estilo.cls}`}>
                                {estilo.label}
                              </span>
                              {/* El plan solo existe cuando hay una compra detrás. */}
                              {user.plan && (
                                <p className="text-[#9CA3AF] text-xs font-sans mt-1">{user.plan}</p>
                              )}
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              {user.tienePortal
                                ? <span className="text-green-600 text-xs font-sans">✓ Generada</span>
                                : <span className="text-[#9CA3AF] text-xs font-sans">Todavía no</span>}
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              {/*
                                Sin fecha = está en la lista de cortesía pero
                                nunca ha entrado. Merece decirse: es un acceso
                                concedido que nadie ha usado.
                              */}
                              {/* Cuenta y compra son fechas distintas: se puede crear la
                                  cuenta semanas antes de pagar (o pagar sin haber entrado). */}
                              {user.registradoEn
                                ? <p className="text-[#6B7280] text-xs font-sans">Cuenta: {fmtDate(user.registradoEn)}</p>
                                : <p className="text-[#D1D5DB] text-xs font-sans italic">Nunca ha entrado</p>}
                              {user.compradoEn && (
                                <p className="text-green-700 text-xs font-sans">Compra: {fmtDate(user.compradoEn)}</p>
                              )}
                              {/* La señal para una baja: alguien con acceso que no vuelve. */}
                              {user.ultimoAccesoEn && (() => {
                                const dias = diasDesde(user.ultimoAccesoEn);
                                const inactivo = dias >= DIAS_INACTIVO && user.acceso !== 'sin-compra';
                                return (
                                  <p className={`text-xs font-sans ${inactivo ? 'text-amber-700 font-medium' : 'text-[#6B7280]'}`}>
                                    Último acceso: {fmtDate(user.ultimoAccesoEn)}
                                    {dias >= 1 && ` · hace ${dias} ${dias === 1 ? 'día' : 'días'}`}
                                  </p>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => regenerarLectura(user)}
                                disabled={!user.tienePortal || regenerando === user.email}
                                title={user.tienePortal ? 'Regenerar lectura' : 'Sin datos de nacimiento: no hay lectura que regenerar'}
                                aria-label={`Regenerar lectura de ${user.email}`}
                                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-30 disabled:hover:text-[#9CA3AF] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                              >
                                <Sparkles size={16} />
                              </button>
                              <button
                                onClick={() => abrirCorreccion(user)}
                                disabled={!user.nacimiento}
                                title={user.nacimiento ? 'Corregir fecha u hora de nacimiento' : 'Todavía no ha dado sus datos de nacimiento'}
                                aria-label={`Corregir el nacimiento de ${user.email}`}
                                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-30 disabled:hover:text-[#9CA3AF] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              {(() => {
                                const motivo =
                                  !user.id                    ? 'No hay cuenta que eliminar: nunca ha entrado' :
                                  user.acceso === 'comprado'  ? 'Tiene una suscripción activa: cancélala en Stripe primero' :
                                  null;
                                return (
                                  <button
                                    onClick={() => borrarUsuario(user)}
                                    disabled={!!motivo || borrando === user.id}
                                    title={motivo || 'Eliminar cuenta'}
                                    aria-label={motivo || `Eliminar cuenta de ${user.email}`}
                                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-[#9CA3AF] disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {portalUsers.length > 0 && (
              <p className="text-[#9CA3AF] text-xs font-sans mt-4">
                {userSearch
                  ? `${visibleUsers.length} de ${portalUsers.length} usuarios`
                  : `${portalUsers.length} usuarios`}
              </p>
            )}
          </div>
        )}

        {/* Tab: Products */}
        {tab === 'blog' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[#111827] text-xl">Entradas del blog</h2>
              <button
                onClick={() => { setBlogForm({ title: '', slug: '', excerpt: '', content: '', imageUrl: '', imageAlt: '', author: 'Abundance Code', category: 'Astrology', isPublished: false, publishedAt: null, seoTitle: '', seoDescription: '', ogImageUrl: '', ogTitle: '', ogDescription: '' }); setBlogError(''); }}
                className="btn-gold text-xs px-5 py-2.5"
              >
                + Nueva entrada
              </button>
            </div>

            {/* Blog form */}
            {blogForm && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 mb-6 shadow-sm">
                {/* La X arriba: el formulario es largo y el botón Cancelar del
                    final queda fuera de pantalla. Cerrar tiene que estar a la vista. */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-serif text-[#111827] text-lg">{blogForm._id ? 'Editar entrada' : 'Nueva entrada'}</h3>
                  <button
                    onClick={() => setBlogForm(null)}
                    aria-label="Cerrar sin guardar"
                    title="Cerrar sin guardar"
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Título *</label>
                    <input value={blogForm.title} onChange={e => setBlogForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Título de la entrada" className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                  </div>
                  <div>
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Slug (URL)</label>
                    <input value={blogForm.slug} onChange={e => setBlogForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="se-genera-desde-el-titulo" className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                  </div>
                  <div>
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Categoría</label>
                    <select value={blogForm.category} onChange={e => setBlogForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37]">
                      {BLOG_CATEGORIES.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor} className="bg-white">{etiqueta}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Autor</label>
                    <input value={blogForm.author} onChange={e => setBlogForm(f => ({ ...f, author: e.target.value }))}
                      placeholder="Abundance Code" className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Imagen destacada <span className="text-[#9CA3AF]">— pega una URL o súbela desde tu equipo</span></label>
                  <ImageField value={blogForm.imageUrl} onChange={url => setBlogForm(f => ({ ...f, imageUrl: url }))}
                    placeholder="https://..." headers={headers} alt={blogForm.imageAlt || 'Vista previa'} />
                  <label className="block text-[#6B7280] text-xs font-sans mb-1.5 mt-3">Texto alternativo de la imagen</label>
                  <input value={blogForm.imageAlt || ''} onChange={e => setBlogForm(f => ({ ...f, imageAlt: e.target.value }))}
                    placeholder="Qué se ve en la imagen, en una frase. Lo leen los lectores de pantalla y Google." className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                </div>
                <div className="mb-4">
                  <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Extracto (descripción corta)</label>
                  <textarea value={blogForm.excerpt} onChange={e => setBlogForm(f => ({ ...f, excerpt: e.target.value }))}
                    rows={2} placeholder="Resumen breve que se muestra en la lista del blog…"
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF] resize-none" />
                </div>
                <div className="mb-4">
                  <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Contenido</label>
                  <RichEditor value={blogForm.content} onChange={html => setBlogForm(f => ({ ...f, content: html }))}
                    headers={headers} titulo={blogForm.title} />
                </div>
                {/* ── SEO ── */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 mb-4">
                  <p className="text-[#111827] text-xs font-sans font-semibold uppercase tracking-widest mb-3">SEO</p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[#6B7280] text-xs font-sans">Título SEO <span className="text-[#9CA3AF]">— etiqueta &lt;title&gt; del artículo</span></label>
                      <CharCounter value={blogForm.seoTitle} range={SEO_TITLE_RANGE} />
                    </div>
                    <input value={blogForm.seoTitle || ''} onChange={e => setBlogForm(f => ({ ...f, seoTitle: e.target.value }))}
                      placeholder={blogForm.title ? `Vacío = «${blogForm.title}»` : 'Vacío = se usa el título de la entrada'}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[#6B7280] text-xs font-sans">Meta descripción</label>
                      <CharCounter value={blogForm.seoDescription} range={SEO_DESC_RANGE} />
                    </div>
                    <textarea value={blogForm.seoDescription || ''} onChange={e => setBlogForm(f => ({ ...f, seoDescription: e.target.value }))}
                      rows={2} placeholder="Vacío = se usa el extracto"
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF] resize-none" />
                  </div>
                </div>

                {/* ── Open Graph (redes) ── */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 mb-4">
                  <p className="text-[#111827] text-xs font-sans font-semibold uppercase tracking-widest mb-1">Redes sociales (Open Graph)</p>
                  <p className="text-[#9CA3AF] text-xs font-sans mb-3">Lo que se ve al compartir el enlace en WhatsApp, Instagram, Facebook o X. Vacío = se usa lo de arriba.</p>
                  <div className="mb-3">
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Imagen social <span className="text-[#9CA3AF]">— ideal 1200 × 630 px</span></label>
                    <ImageField value={blogForm.ogImageUrl} onChange={url => setBlogForm(f => ({ ...f, ogImageUrl: url }))}
                      placeholder="Vacío = se usa la imagen destacada" headers={headers}
                      previewClass="w-full max-w-sm aspect-[1200/630]" alt="Imagen social" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Título para redes</label>
                      <input value={blogForm.ogTitle || ''} onChange={e => setBlogForm(f => ({ ...f, ogTitle: e.target.value }))}
                        placeholder={`Vacío = «${blogForm.seoTitle || blogForm.title || 'título SEO'}»`}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                    </div>
                    <div>
                      <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Descripción para redes</label>
                      <input value={blogForm.ogDescription || ''} onChange={e => setBlogForm(f => ({ ...f, ogDescription: e.target.value }))}
                        placeholder="Vacío = meta descripción, o el extracto"
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37] placeholder-[#9CA3AF]" />
                    </div>
                  </div>
                </div>

                {/* ── Publicación ── */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 mb-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none md:pb-3">
                    <input type="checkbox" checked={blogForm.isPublished} onChange={e => setBlogForm(f => ({ ...f, isPublished: e.target.checked, publishedAt: f.publishedAt || (e.target.checked ? new Date().toISOString() : null) }))}
                      className="w-4 h-4 accent-[#D4AF37]" />
                    <span className="text-[#374151] text-sm font-sans">Publicada</span>
                  </label>
                  <div className="flex-1">
                    <label className="block text-[#6B7280] text-xs font-sans mb-1.5">Fecha de publicación</label>
                    <input type="datetime-local" value={isoToLocalInput(blogForm.publishedAt)}
                      onChange={e => setBlogForm(f => ({ ...f, publishedAt: localInputToIso(e.target.value) }))}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm font-sans focus:outline-none focus:border-[#D4AF37]" />
                    <p className="text-xs font-sans mt-1.5 text-[#9CA3AF]">
                      {blogForm.isPublished && esFutura(blogForm.publishedAt)
                        ? <span className="text-amber-700">Programada: se hará visible en la web en ese momento, sin hacer nada más.</span>
                        : blogForm.isPublished
                          ? 'Visible en la web. Una fecha futura la programa.'
                          : 'Borrador: no se ve en la web. Puedes verla con el ojo de la lista.'}
                    </p>
                  </div>
                </div>
                {blogError && <p className="text-red-400 text-sm font-sans mb-4">{blogError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setBlogForm(null)}
                    className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm font-sans hover:border-[#D4AF37]/40 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => saveBlogPost(blogForm)}
                    className="flex-1 btn-gold text-sm">
                    {blogForm._id ? 'Guardar cambios' : 'Crear entrada'}
                  </button>
                </div>
              </div>
            )}

            {/* Blog list */}
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden bg-white shadow-sm">
              {loadingBlog ? (
                <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm font-sans">Cargando entradas…</div>
              ) : blogPosts.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm font-sans">Todavía no hay entradas. Crea la primera.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest">Título</th>
                      <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest hidden md:table-cell">Categoría</th>
                      <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest">Estado</th>
                      <th className="text-left px-5 py-3 text-[#9CA3AF] font-sans text-xs uppercase tracking-widest hidden lg:table-cell">Fecha</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {blogPosts.map((post, i) => (
                      <tr key={post._id} className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                        <td className="px-5 py-4">
                          <p className="text-[#111827] font-sans text-sm font-medium">{post.title}</p>
                          <p className="text-[#9CA3AF] text-xs font-mono">/blog/{post.slug}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-[#6B7280] text-xs font-sans">{CATEGORY_LABELS[post.category] || post.category}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-sans border ${
                            post.isPublished
                              ? (esFutura(post.publishedAt) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200')
                              : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}>
                            {post.isPublished ? (esFutura(post.publishedAt) ? 'Programada' : 'Publicada') : 'Borrador'}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-[#6B7280] text-xs font-sans">
                            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {/* Abre la entrada tal y como la ve el público. Un borrador
                                se carga con la sesión de admin (ver BlogPostPage). */}
                            {traduciendo === post._id && (
                              <span className="text-xs font-sans text-[#D4AF37]">Traduciendo…</span>
                            )}
                            <a
                              href={`/blog/${post.slug}${post.isPublished ? '' : `?preview=${post._id}`}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={post.isPublished ? 'Ver en la web' : 'Vista previa del borrador'}
                              className="p-2 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                            >
                              <Eye size={13} />
                            </a>
                            <button onClick={async () => {
                              const res  = await fetch(`${API}/admin/blog/${post._id}`, { headers });
                              const data = await res.json();
                              setBlogForm(data);
                              setBlogError('');
                            }} title="Editar" className="p-2 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            {/*
                              Traducir. El globo se enciende cuando la entrada
                              ya existe en los dos idiomas: así se ve de un
                              vistazo qué falta por traducir sin abrir nada.
                            */}
                            <button
                              onClick={() => traducirPost(post)}
                              disabled={traduciendo === post._id}
                              title={
                                (post.idiomas || []).length > 1
                                  ? 'Ya está en los dos idiomas · volver a traducir'
                                  : `Traducir al ${(post.idioma || 'es') === 'es' ? 'inglés' : 'español'}`
                              }
                              className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                                (post.idiomas || []).length > 1
                                  ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                                  : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
                              }`}
                            >
                              <Globe size={13} />
                            </button>
                            <button onClick={() => deleteBlogPost(post._id)} title="Eliminar"
                              className="p-2 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:text-red-500 hover:bg-red-50 transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
