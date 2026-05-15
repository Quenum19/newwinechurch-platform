/**
 * TiptapEditor — éditeur de texte riche pour les articles de blog NWC.
 *
 * Features :
 *   - Headings H2/H3, gras, italique, liens, listes
 *   - Upload d'images inline (envoie au backend → URL publique → insertion)
 *   - Sortie HTML sanitisée côté serveur (PostsController + HtmlSanitizer)
 *   - Toolbar contextuelle compacte
 *
 * Usage :
 *   <TiptapEditor value={html} onChange={(html) => setValue(html)} />
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect, useRef } from 'react'
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Image as ImageIcon, Quote, Heading2, Heading3, Undo, Redo, Code,
} from 'lucide-react'

import { posts } from '@/api/admin'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

export default function TiptapEditor({ value, onChange, placeholder = 'Écris ton article…' }) {
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg my-4 max-w-full' } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-gold-400 underline', rel: 'noopener noreferrer' },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[400px] focus:outline-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync external value change (utile lors du chargement initial async).
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (! editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL du lien (https://…)', previousUrl || '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (! file) return
    try {
      const result = await posts.uploadInlineImage(file)
      if (result?.url) {
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run()
        toast.success('Image insérée.')
      }
    } catch (err) {
      toast.error('Erreur upload image.')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="border border-white/10 rounded-lg bg-ink-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-ink-950">
        <ToolbarButton
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Titre 2"
        ><Heading2 size={16}/></ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Titre 3"
        ><Heading3 size={16}/></ToolbarButton>

        <Separator />

        <ToolbarButton
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Gras"
        ><Bold size={16}/></ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italique"
        ><Italic size={16}/></ToolbarButton>

        <Separator />

        <ToolbarButton
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Liste à puces"
        ><List size={16}/></ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Liste numérotée"
        ><ListOrdered size={16}/></ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citation"
        ><Quote size={16}/></ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Bloc de code"
        ><Code size={16}/></ToolbarButton>

        <Separator />

        <ToolbarButton
          isActive={editor.isActive('link')}
          onClick={setLink}
          title="Lien"
        ><LinkIcon size={16}/></ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insérer une image"
        ><ImageIcon size={16}/></ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
            <Undo size={16}/>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
            <Redo size={16}/>
          </ToolbarButton>
        </div>
      </div>

      {/* Zone d'édition */}
      <div className="bg-ink-900 text-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({ isActive, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded transition-colors',
        isActive ? 'bg-wine-700/40 text-gold-300' : 'text-white/60 hover:bg-white/5 hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

function Separator() {
  return <span className="h-5 w-px bg-white/10 mx-1" />
}
