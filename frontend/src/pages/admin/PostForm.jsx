/** Article blog (Tiptap) — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import TiptapEditor from '@/components/admin/TiptapEditor.jsx'
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
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
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
      <Link
        to="/admin/blog"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour aux articles
      </Link>

      <header>
        <h1>{isEdit ? (post?.title || 'Modifier l\'article') : 'Nouvel article'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <Field label="Titre" required error={errors.title && 'Requis'}>
              <input {...register('title', { required: true })} className="adm-input" />
            </Field>
            <Field
              label="Extrait"
              helper="Résumé court pour les cartes du blog (1-2 phrases d'accroche)."
            >
              <textarea
                rows={2}
                {...register('excerpt')}
                placeholder="Une phrase d'accroche…"
                className="adm-textarea"
              />
            </Field>
            <Field
              label="Contenu"
              required
              error={errors.content && (errors.content.message || 'Requis')}
            >
              <Controller
                name="content"
                control={control}
                rules={{ required: true, minLength: { value: 20, message: 'Au moins 20 caractères' } }}
                render={({ field }) => (
                  <TiptapEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Écris ton article…"
                  />
                )}
              />
            </Field>
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
