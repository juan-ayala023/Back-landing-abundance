import { useLayoutEffect, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import Seo from './seo/Seo.jsx';
import { trackPageView } from './lib/analytics.js';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
};

function PageWrapper({ children }) {
  /* Al navegar, el navegador conserva el scroll de la página anterior: si
     venías del pie de Precios, la sección nueva se abría por abajo. Cada
     página vuelve arriba al montarse.

     useLayoutEffect y no useEffect: corre antes de pintar, así que la página
     nueva nunca llega a dibujarse en la posición vieja.

     Va en el wrapper y no en un ScrollToTop global escuchando el pathname
     porque AnimatePresence usa mode="wait": la página nueva se monta cuando
     la anterior ya terminó de salir, y el salto queda tapado por el fundido.
     Con el pathname saltaría antes, con la página vieja todavía en pantalla. */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import PortalPage from './pages/PortalPage.jsx';
import Pricing from './pages/Pricing.jsx';
import AccessRecovery from './pages/AccessRecovery.jsx';
import Gracias from './pages/Gracias.jsx';
import About from './pages/About.jsx';
import FAQ from './pages/FAQ.jsx';
import Contact from './pages/Contact.jsx';
import Admin from './pages/Admin.jsx';
import Blog from './pages/Blog.jsx';
import BlogPostPage from './pages/BlogPostPage.jsx';

import Privacy from './pages/legal/Privacy.jsx';
import Terms from './pages/legal/Terms.jsx';
import Cookies from './pages/legal/Cookies.jsx';
import Disclaimer from './pages/legal/Disclaimer.jsx';
import Refund from './pages/legal/Refund.jsx';

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  /* Cada cambio de ruta es una página vista. Con una SPA, Analytics solo
     vería la primera carga si no se le avisa desde aquí. */
  useEffect(() => { trackPageView(location.pathname + location.search); }, [location]);

  return (
    <LanguageProvider>
    <Seo />
    <div className="min-h-screen bg-[#F5F1ED]">
      {!isAdmin && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/how-it-works" element={<PageWrapper><HowItWorks /></PageWrapper>} />
          <Route path="/app" element={<PageWrapper><PortalPage /></PageWrapper>} />
          <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
          <Route path="/activar-acceso" element={<PageWrapper><AccessRecovery /></PageWrapper>} />
          {/* Vuelta desde Stripe: confirma, mide la compra y sigue a la app. */}
          <Route path="/gracias" element={<PageWrapper><Gracias /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
          <Route path="/faq" element={<PageWrapper><FAQ /></PageWrapper>} />
          <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/blog" element={<PageWrapper><Blog /></PageWrapper>} />
          <Route path="/blog/:slug" element={<PageWrapper><BlogPostPage /></PageWrapper>} />
          {/*
            El blog en inglés vive en su propia URL, y es lo único de la web que
            lo hace. El resto de páginas cambian de idioma con el botón y se
            quedan en la misma dirección, que para una web pequeña está bien. Un
            artículo no: existe para que Google lo encuentre, y Google necesita
            una URL por idioma para enseñar cada versión a quien busca en ella.
            Con una sola dirección indexaría una y tiraría la otra por duplicada.
          */}
          <Route path="/en/blog" element={<PageWrapper><Blog /></PageWrapper>} />
          <Route path="/en/blog/:slug" element={<PageWrapper><BlogPostPage /></PageWrapper>} />

          {/* Legal */}
          <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
          <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
          <Route path="/cookies" element={<PageWrapper><Cookies /></PageWrapper>} />
          <Route path="/disclaimer" element={<PageWrapper><Disclaimer /></PageWrapper>} />
          <Route path="/refund" element={<PageWrapper><Refund /></PageWrapper>} />

          {/* Rutas del sitio ecommerce anterior — se conservan como
              redirecciones para no perder enlaces ni posicionamiento. */}
          <Route path="/abundance-code-sphere" element={<Navigate to="/" replace />} />
          <Route path="/bracelet"              element={<Navigate to="/" replace />} />
          <Route path="/checkout"              element={<Navigate to="/pricing" replace />} />
          <Route path="/order-confirmation"    element={<Navigate to="/" replace />} />
          <Route path="/portal"                element={<Navigate to="/app" replace />} />
          <Route path="/shipping"              element={<Navigate to="/terms" replace />} />
          <Route path="/returns"               element={<Navigate to="/terms" replace />} />
          <Route path="/como-funciona"         element={<Navigate to="/how-it-works" replace />} />
          <Route path="/patron-central"        element={<Navigate to="/" replace />} />

          {/* "Tu Patrón Central" dejó de ser página propia: su contenido vive
              ahora en la home, dentro de "Qué desbloquea tu portal". */}
          <Route path="/core-pattern"          element={<Navigate to="/" replace />} />

          {/* Cualquier otra ruta vuelve al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {!isAdmin && <Footer />}
    </div>
    </LanguageProvider>
  );
}
