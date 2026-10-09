import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Heading1, Heading2, Heading3, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Quote, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, FileText, Undo2, Redo2, Pencil, Eye, Download,
} from 'lucide-react';

/* =========================================================
   RichEditor — editor visual del blog.

   Antes el contenido se escribía como HTML a mano en un <textarea>. Andrea
   pidió un editor con barra de herramientas: títulos, negrita, cursiva,
   subrayado, listas, cita, línea, alineación, enlace, imagen, PDF y
   deshacer/rehacer, con pestañas Escribir / Vista previa y descarga en PDF.

   TipTap guarda y devuelve HTML, así que el campo `content` de la entrada
   sigue siendo el mismo y las entradas antiguas se abren tal cual. Las
   imágenes y los PDF se suben al backend (Supabase Storage) y se insertan
   por su URL pública. La vista previa usa las mismas clases (.prose-blog)
   que la página pública del artículo.
   ========================================================= */

const API = (import.meta.env.VITE_API_URL || '') + '/api';

async function subirArchivo(file, headers) {
  const res = await fetch(`${API}/admin/blog/archivo?nombre=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'No se pudo subir el archivo.');
  return data.url;
}

function Btn({ onClick, active = false, disabled = false, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}   /* no roba el foco al editor */
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed
        ${active ? 'bg-[#3D2817] text-[#F5F1ED]' : 'text-[#374151] hover:bg-[#F3F4F6]'}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-6 bg-[#E5E7EB] mx-1" aria-hidden="true" />;
}

/* Vista previa y «Descargar PDF» comparten esta hoja: es lo que el artículo
   se ve en la web, en blanco y negro sobre papel. */
const PRINT_CSS = `
  body { font-family: Montserrat, Helvetica, Arial, sans-serif; color: #3D2817; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.8; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1rem; }
  .prose-blog h1 { font-size: 1.75rem; } .prose-blog h2 { font-size: 1.4rem; margin: 1.6em 0 .6em; } .prose-blog h3 { font-size: 1.15rem; margin: 1.4em 0 .5em; }
  .prose-blog p { margin: 0 0 1em; } .prose-blog ul, .prose-blog ol { padding-left: 1.5em; margin: 0 0 1em; } .prose-blog li { margin-bottom: .35em; }
  .prose-blog blockquote { border-left: 3px solid #D4AF37; margin: 1.2em 0; padding: .2em 0 .2em 1em; color: #5B3E2A; font-style: italic; }
  .prose-blog hr { border: 0; border-top: 1px solid #E8DCC8; margin: 2em 0; }
  .prose-blog img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.2em 0; }
  .prose-blog a { color: #7A5F17; text-decoration: underline; }
  @page { margin: 18mm; }
`;

function descargarPdf(titulo, html) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo || 'Artículo'}</title><style>${PRINT_CSS}</style></head>
    <body><h1>${titulo || ''}</h1><div class="prose-blog">${html}</div></body></html>`);
  w.document.close();
  w.focus();
  // Espera a que carguen las imágenes antes de abrir el diálogo de impresión.
  setTimeout(() => w.print(), 600);
}

export default function RichEditor({ value, onChange, headers, titulo = '' }) {
  const [tab, setTab] = useState('write');
  const [ayuda, setAyuda] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const imgRef = useRef(null);
  const pdfRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Empieza a escribir el artículo…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose-blog tiptap-area focus:outline-none min-h-[420px] px-5 py-4' },
    },
  });

  /* Al abrir otra entrada, el editor recibe su HTML. Se compara para no
     reescribir (y mover el cursor) en cada pulsación. */
  useEffect(() => {
    if (!editor) return;
    const actual = editor.getHTML();
    const nuevo = value || '';
    if (nuevo !== actual && !(nuevo === '' && actual === '<p></p>')) {
      editor.commands.setContent(nuevo, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const insertarImagen = async (file) => {
    if (!file) return;
    setError(''); setOcupado('imagen');
    try {
      const url = await subirArchivo(file, headers);
      editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[a-z0-9]+$/i, '') }).run();
    } catch (e) { setError(e.message); }
    setOcupado('');
    if (imgRef.current) imgRef.current.value = '';
  };

  const insertarPdf = async (file) => {
    if (!file) return;
    setError(''); setOcupado('pdf');
    try {
      const url = await subirArchivo(file, headers);
      const texto = editor.state.selection.empty ? file.name : null;
      const chain = editor.chain().focus();
      if (texto) chain.insertContent(`<a href="${url}" target="_blank" rel="noopener">${texto}</a> `);
      else chain.setLink({ href: url, target: '_blank' });
      chain.run();
    } catch (e) { setError(e.message); }
    setOcupado('');
    if (pdfRef.current) pdfRef.current.value = '';
  };

  const ponerEnlace = () => {
    const previo = editor.getAttributes('link').href || '';
    const url = window.prompt('Dirección del enlace (déjala vacía para quitarlo):', previo);
    if (url === null) return;
    if (url.trim() === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const al = (a) => editor.isActive({ textAlign: a });

  return (
    <div>
      {/* Ayuda plegable */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] mb-3">
        <button type="button" onClick={() => setAyuda(a => !a)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-sans text-[#111827]">
          <span className="inline-flex items-center gap-2"><FileText size={15} className="text-[#6B7280]" /> Cómo añadir imágenes, PDF y citas</span>
          <span className="text-xs text-[#9CA3AF]">{ayuda ? 'Ocultar' : 'Ver'}</span>
        </button>
        {ayuda && (
          <ul className="px-5 pb-4 text-xs font-sans text-[#6B7280] space-y-1.5 list-disc pl-9">
            <li><b>Imagen:</b> pon el cursor donde quieras la foto y pulsa el icono de imagen; elige el archivo (JPG, PNG, WebP, hasta 8 MB) y se inserta sola.</li>
            <li><b>PDF:</b> selecciona el texto que hará de enlace (o no selecciones nada y se usará el nombre del archivo) y pulsa el icono de documento; el PDF se sube y queda enlazado.</li>
            <li><b>Cita:</b> escribe el texto, déjalo seleccionado y pulsa las comillas. Para salir de la cita, pulsa Enter dos veces.</li>
            <li><b>Enlace:</b> selecciona el texto y pulsa el icono de cadena; para quitarlo, vuelve a pulsarlo y deja la dirección vacía.</li>
            <li><b>Títulos:</b> H1 para el título principal dentro del texto (normalmente no hace falta: el título de la entrada ya lo pone la web), H2 para secciones, H3 para subsecciones.</li>
          </ul>
        )}
      </div>

      {/* Pestañas + descargar */}
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex gap-1">
          <button type="button" onClick={() => setTab('write')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-sans font-medium ${tab === 'write' ? 'bg-[#3D2817] text-[#F5F1ED]' : 'text-[#374151] hover:bg-[#F3F4F6]'}`}>
            <Pencil size={14} /> Escribir
          </button>
          <button type="button" onClick={() => setTab('preview')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-sans font-medium ${tab === 'preview' ? 'bg-[#3D2817] text-[#F5F1ED]' : 'text-[#374151] hover:bg-[#F3F4F6]'}`}>
            <Eye size={14} /> Vista previa
          </button>
        </div>
        <button type="button" onClick={() => descargarPdf(titulo, editor.getHTML())}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-sans text-[#374151] hover:bg-[#F3F4F6]">
          <Download size={14} /> Descargar PDF
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        {tab === 'write' ? (
          <>
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#E5E7EB] bg-[#FAFAFA]">
              <Btn title="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></Btn>
              <Btn title="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></Btn>
              <Btn title="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={17} /></Btn>
              <Sep />
              <Btn title="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Btn>
              <Btn title="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Btn>
              <Btn title="Subrayado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
              <Sep />
              <Btn title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></Btn>
              <Btn title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></Btn>
              <Btn title="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></Btn>
              <Btn title="Línea separadora" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></Btn>
              <Sep />
              <Btn title="Alinear a la izquierda" active={al('left')} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></Btn>
              <Btn title="Centrar" active={al('center')} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></Btn>
              <Btn title="Alinear a la derecha" active={al('right')} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></Btn>
              <Btn title="Justificar" active={al('justify')} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={16} /></Btn>
              <Sep />
              <Btn title="Enlace" active={editor.isActive('link')} onClick={ponerEnlace}><LinkIcon size={16} /></Btn>
              <Btn title="Insertar imagen" disabled={!!ocupado} onClick={() => imgRef.current?.click()}><ImageIcon size={16} /></Btn>
              <Btn title="Adjuntar PDF" disabled={!!ocupado} onClick={() => pdfRef.current?.click()}><FileText size={16} /></Btn>
              <Sep />
              <Btn title="Deshacer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></Btn>
              <Btn title="Rehacer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></Btn>
              {ocupado && <span className="ml-2 text-xs font-sans text-[#7A5F17]">{ocupado === 'imagen' ? 'Subiendo imagen…' : 'Subiendo PDF…'}</span>}
            </div>
            <EditorContent editor={editor} />
          </>
        ) : (
          <div className="prose-blog px-5 py-4 min-h-[420px]" dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
        )}
      </div>

      {error && <p className="text-xs font-sans mt-1.5" style={{ color: '#B0413E' }}>{error}</p>}

      <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={e => insertarImagen(e.target.files?.[0])} />
      <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={e => insertarPdf(e.target.files?.[0])} />
    </div>
  );
}
