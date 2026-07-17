/** Article blog (Tiptap) — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import { useState } from 'react'
import ImageUploader from '@/components/admin/ImageUploader.jsx'
import TiptapEditor from '@/components/admin/TiptapEditor.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import BilingualField from '@/components/admin/BilingualField.jsx'
import api from '@/api/axios'
import { posts } from '@/api/admin'

export default function PostForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: post, isLoading } = useQuery({
    queryKey: ['admin', 'posts', id],
    queryFn: () => posts.get(id),
    enabled: isEdit,
  })

  const { data: categoriesRes } = useQuery({
    queryKey: ['posts', 'categories'],
    queryFn: async () => (await api.get('/posts/categories')).data,
    staleTime: 5 * 60 * 1000,
  })
  const categories = categoriesRes ?? []

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    values: post ? {
      title: post.title ?? '',
      title_en: post.title_en ?? '',
      excerpt: post.excerpt ?? '',
      excerpt_en: post.excerpt_en ?? '',
      content: post.content ?? '',
      content_en: post.content_en ?? '',
      category_id: post.category?.id ?? '',
      status: post.status ?? 'draft',
      is_featured: post.is_featured ?? false,
    } : { status: 'draft', is_featured: false, content: '' },
  })

  const save = useMutation({
    mutationFn: (formData) => isEdit ? posts.update(id, formData) : posts.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Article enregistré.' : 'Article créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
      if (!isEdit && data?.id) navigate(`/admin/blog/${data.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const onSubmit = (data) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return
      if (k === 'cover_image') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image)
    save.mutate(fd)
  }

  if (isEdit && isLoading) {
    return <div className="adm-card h-96 animate-pulse" />
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      <BackButton to="/admin/blog" label="Retour aux articles" />

      <header>
        <h1>{isEdit ? (post?.title || 'Modifier l\'article') : 'Nouvel article'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <Controller
              control={control}
              name="title"
              rules={{ required: true }}
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="title_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Titre" required
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      errorFr={errors.title && 'Requis'}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="excerpt"
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="excerpt_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Extrait" type="textarea" rows={2}
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      helper="Résumé court pour les cartes du blog (1-2 phrases d'accroche)."
                      placeholder="Une phrase d'accroche…"
                      placeholderEn="A hook sentence…"
                    />
                  )}
                />
              )}
            />
            {/* Contenu Tiptap — 2 éditeurs séparés (FR + EN toggle) */}
            <PostContentBilingual control={control} errors={errors}/>
          </div>
        </div>

        <div className="space-y-4">
          <div className="adm-card p-4 sm:p-5 space-y-3">
            <h2>Publication</h2>
            <Field label="Statut">
              <select {...register('status')} className="adm-select">
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </Field>
            <Field label="Catégorie">
              <select {...register('category_id')} className="adm-select">
                <option value="">— Aucune —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_featured')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Mettre en avant
            </label>
          </div>

          <div className="adm-card p-4 sm:p-5">
            <Controller
              name="cover_image"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  label="Image de couverture"
                  currentUrl={post?.cover_image ? `/storage/${post.cover_image}` : null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2 sticky top-20">
            <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary justify-center">
              {save.isPending
                ? <><Loader2 size={14} className="animate-spin" /> …</>
                : (isEdit ? 'Enregistrer' : 'Créer l\'article')}
            </button>
            <Link to="/admin/blog" className="adm-btn adm-btn-ghost justify-center">Annuler</Link>
          </div>
        </div>
      </form>
    </div>
  )
}

/**
 * PostContentBilingual — 2 éditeurs Tiptap (FR + EN) avec toggle onglet.
 * Le FR est requis, l'EN optionnel avec fallback.
 */
function PostContentBilingual({ control, errors }) {
  const [tab, setTab] = useState(() => localStorage.getItem('nwc_bilingual_last_tab') || 'fr')
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
          Contenu <span className="text-red-500">*</span>
        </label>
        <div className="inline-flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="button" onClick={() => { setTab('fr'); localStorage.setItem('nwc_bilingual_last_tab', 'fr') }}
            className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition"
            style={{ background: tab === 'fr' ? 'var(--adm-accent)' : 'var(--adm-card)', color: tab === 'fr' ? '#fff' : 'var(--adm-text-muted)' }}>
            🇫🇷 FR
          </button>
          <button type="button" onClick={() => { setTab('en'); localStorage.setItem('nwc_bilingual_last_tab', 'en') }}
            className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition border-l"
            style={{ background: tab === 'en' ? 'var(--adm-accent)' : 'var(--adm-card)', color: tab === 'en' ? '#fff' : 'var(--adm-text-muted)', borderColor: 'var(--adm-border)' }}>
            🇬🇧 EN
          </button>
        </div>
      </div>
      {/* On monte les 2 éditeurs et bascule via display CSS pour préserver l'état. */}
      <div style={{ display: tab === 'fr' ? 'block' : 'none' }}>
        <Controller name="content" control={control}
          rules={{ required: true, minLength: { value: 20, message: 'Au moins 20 caractères' } }}
          render={({ field }) => (
            <TiptapEditor value={field.value} onChange={field.onChange} placeholder="Écris ton article…"/>
          )}/>
        {errors.content && (
          <p className="text-xs mt-1 text-red-600">{errors.content.message || 'Requis'}</p>
        )}
      </div>
      <div style={{ display: tab === 'en' ? 'block' : 'none' }}>
        <Controller name="content_en" control={control}
          render={({ field }) => (
            <TiptapEditor value={field.value || ''} onChange={field.onChange} placeholder="Write your article…"/>
          )}/>
      </div>
    </div>
  )
}

function Field({ label, required, error, helper, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--adm-danger)' }}>*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{helper}</p>
      )}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
    </div>
  )
}
