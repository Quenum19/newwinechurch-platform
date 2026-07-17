/**
 * Phase 5 — Formulaire série + gestion des occurrences (admin).
 *
 *  /admin/series/nouveau     → create
 *  /admin/series/{id}        → edit + bloc occurrences (génération + ajout manuel)
 */
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Calendar, Trash2, Layers, ExternalLink, Ticket,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import BilingualField from '@/components/admin/BilingualField.jsx'
import { events as eventsApi } from '@/api/admin'

const DAYS_WEEK = [
  { value: 1, label: 'Lundi' }, { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' }, { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' }, { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

export default function SeriesForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: series, isLoading } = useQuery({
    queryKey: ['admin', 'series', id],
    queryFn: () => eventsApi.seriesGet(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    values: series ? {
      title: series.title,
      title_en: series.title_en ?? '',
      description: series.description ?? '',
      description_en: series.description_en ?? '',
      recurrence_type: series.recurrence_type ?? 'none',
      recurrence_day: series.recurrence_day ?? '',
      default_start_time: series.default_start_time?.slice(0, 5) ?? '',
      default_duration_minutes: series.default_duration_minutes ?? 120,
      default_location: series.default_location ?? '',
      default_address: series.default_address ?? '',
      is_published: series.is_published ?? true,
    } : { recurrence_type: 'none', default_duration_minutes: 120, is_published: true },
  })

  const recurrence = watch('recurrence_type')

  const save = useMutation({
    mutationFn: (formData) => isEdit
      ? eventsApi.seriesUpdate(id, formData)
      : eventsApi.seriesCreate(formData),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Série mise à jour.' : 'Série créée.')
      qc.invalidateQueries({ queryKey: ['admin', 'series'] })
      if (!isEdit && res?.data?.id) navigate(`/admin/series/${res.data.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat()[0] : (err?.response?.data?.message || 'Erreur.'))
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

  if (isEdit && isLoading) return <div className="adm-card h-96 animate-pulse"/>

  return (
    <div className="space-y-5">
      <BackButton to="/admin/series" label="Retour aux séries"/>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>{isEdit ? `Modifier "${series?.title}"` : 'Nouvelle série'}</h2>

            <Controller
              control={control}
              name="title"
              rules={{ required: 'Titre requis' }}
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="title_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Titre" required
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      errorFr={errors.title?.message || (errors.title && 'Requis')}
                      placeholder="ex: Cycle Discipulat"
                      placeholderEn="e.g., Discipleship Cycle"
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="description_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Description" type="textarea" rows={3}
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      placeholder="Description visible sur la page publique de la série"
                    />
                  )}
                />
              )}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Lieu par défaut">
                <input {...register('default_location')} placeholder="Salle de formation NWC" className="adm-input"/>
              </Field>
              <Field label="Adresse">
                <input {...register('default_address')} placeholder="Cocody, Abidjan" className="adm-input"/>
              </Field>
            </div>
          </div>

          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>Récurrence</h2>

            <Field label="Type de récurrence">
              <select {...register('recurrence_type')} className="adm-input">
                <option value="none">Aucune (ajout manuel des dates)</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </Field>

            {recurrence === 'weekly' && (
              <Field label="Jour de la semaine *">
                <select {...register('recurrence_day', { required: 'Choisis un jour' })} className="adm-input">
                  <option value="">— Sélectionne —</option>
                  {DAYS_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
            )}

            {recurrence === 'monthly' && (
              <Field label="Jour du mois (1-28) *">
                <input type="number" min="1" max="28"
                       {...register('recurrence_day', { required: 'Jour requis', min: 1, max: 28 })}
                       placeholder="ex: 15" className="adm-input"/>
              </Field>
            )}

            {recurrence !== 'none' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Heure de début">
                  <input type="time" {...register('default_start_time')} className="adm-input"/>
                </Field>
                <Field label="Durée (minutes)">
                  <input type="number" min="15" max="720"
                         {...register('default_duration_minutes', { valueAsNumber: true })} className="adm-input"/>
                </Field>
              </div>
            )}
          </div>

          {/* Occurrences (seulement en édition) */}
          {isEdit && <OccurrencesPanel series={series}/>}
        </div>

        <div className="space-y-4">
          <div className="adm-card p-4 sm:p-5">
            <h3 className="text-sm font-medium mb-3">Visibilité</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('is_published')} className="h-4 w-4"/>
              Série publiée
            </label>
          </div>

          <div className="adm-card p-4 sm:p-5">
            <Controller name="cover_image" control={control}
              render={({ field }) => (
                <ImageUploader label="Image de couverture"
                               currentUrl={series?.cover_image ?? null}
                               onChange={field.onChange}/>
              )}/>
          </div>

          <button type="submit" disabled={save.isPending}
                  className="w-full px-4 py-3 bg-public-flame text-white font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {save.isPending && <Loader2 size={14} className="animate-spin"/>}
            {isEdit ? 'Enregistrer' : 'Créer la série'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider font-mono mb-1" style={{ color: 'var(--adm-text-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */

function OccurrencesPanel({ series }) {
  const qc = useQueryClient()
  const [startDate, setStartDate] = useState('')
  const [count, setCount] = useState(4)
  const [manualDate, setManualDate] = useState('')

  const occurrences = series?.events ?? []
  const hasRule = series?.recurrence_type && series?.recurrence_type !== 'none'

  const generate = useMutation({
    mutationFn: () => eventsApi.seriesGenerate(series.id, { start_date: startDate, count }),
    onSuccess: (r) => {
      toast.success(r.message || 'Générées.')
      qc.invalidateQueries({ queryKey: ['admin', 'series', String(series.id)] })
      setStartDate('')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  const addOne = useMutation({
    mutationFn: () => eventsApi.seriesAddOccurrence(series.id, manualDate),
    onSuccess: () => {
      toast.success('Date ajoutée.')
      qc.invalidateQueries({ queryKey: ['admin', 'series', String(series.id)] })
      setManualDate('')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  return (
    <div className="adm-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Layers size={18} className="text-public-flame"/>
        <h2>Occurrences ({occurrences.length})</h2>
      </div>

      {/* Génération auto */}
      {hasRule && (
        <div className="border border-dashed border-public-ink/20 p-4 bg-public-bone/30 space-y-3">
          <p className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--adm-text-muted)' }}>
            Générer des occurrences ({series.recurrence_type === 'weekly' ? 'hebdomadaire' : 'mensuel'})
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--adm-text-muted)' }}>1ère date</label>
              <input type="date" value={startDate}
                     onChange={(e) => setStartDate(e.target.value)} className="adm-input"/>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--adm-text-muted)' }}>Nombre</label>
              <input type="number" min="1" max="52" value={count}
                     onChange={(e) => setCount(parseInt(e.target.value) || 1)} className="adm-input"/>
            </div>
          </div>
          <button type="button" onClick={() => generate.mutate()}
                  disabled={!startDate || generate.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-public-ink text-white font-mono uppercase text-xs tracking-widest hover:bg-public-flame transition disabled:opacity-50">
            {generate.isPending && <Loader2 size={14} className="animate-spin"/>}
            Générer {count} occurrence{count > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Ajout manuel */}
      <div className="border border-dashed border-public-ink/20 p-4 bg-public-bone/30 space-y-3">
        <p className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--adm-text-muted)' }}>
          Ajouter une date manuellement
        </p>
        <div className="flex gap-2">
          <input type="datetime-local" value={manualDate}
                 onChange={(e) => setManualDate(e.target.value)} className="adm-input flex-1"/>
          <button type="button" onClick={() => addOne.mutate()}
                  disabled={!manualDate || addOne.isPending}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-public-flame text-white font-mono uppercase text-xs tracking-widest disabled:opacity-50">
            {addOne.isPending ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            Ajouter
          </button>
        </div>
      </div>

      {/* Liste */}
      {occurrences.length === 0 ? (
        <p className="text-sm italic text-center py-6" style={{ color: 'var(--adm-text-muted)' }}>
          Aucune occurrence — génère ou ajoute la 1ère date.
        </p>
      ) : (
        <div className="space-y-2">
          {occurrences.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 p-3 border-2 border-public-ink/10 hover:border-public-flame/30 transition">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{e.title}</p>
                <p className="text-xs mt-0.5 inline-flex items-center gap-2" style={{ color: 'var(--adm-text-muted)' }}>
                  <Calendar size={11}/>
                  {e.starts_at ? format(new Date(e.starts_at), "EEEE d MMM yyyy 'à' HH:mm", { locale: fr }) : '—'}
                  {e.ticketing_enabled && (
                    <span className="inline-flex items-center gap-0.5 text-public-flame">
                      · <Ticket size={11}/> {e.tickets_count ?? 0} inscrits
                    </span>
                  )}
                </p>
              </div>
              <Link to={`/admin/evenements/${e.id}`}
                    className="p-1.5 hover:bg-public-flame/10 hover:text-public-flame transition">
                <ExternalLink size={14}/>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
