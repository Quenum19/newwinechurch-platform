/** Fiche département — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Crown, Download, History, Loader2, Trash2, Users } from 'lucide-react'

import DepartmentMemberManager from '@/components/admin/DepartmentMemberManager.jsx'
import Modal from '@/components/ui/Modal.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import { departments } from '@/api/admin'

export default function DepartmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'departments', id],
    queryFn: () => departments.get(id),
    enabled: !!id,
    retry: 1,
  })

  const dept = data?.data
  // L'API embarque la liste des membres SANS wrapping {data, meta}
  // quand un Resource::collection est inclus dans une autre réponse JSON
  // (sérialisation JsonSerializable → tableau d'items direct).
  const members = Array.isArray(data?.members) ? data.members
                : Array.isArray(data?.members?.data) ? data.members.data
                : []

  const update = useMutation({
    mutationFn: (payload) => departments.update(id, payload),
    onSuccess: () => {
      toast.success('Département mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] })
    },
  })

  // Upload bannière séparé — envoyé en multipart à la même route update.
  const uploadBanner = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('banner_image', file)
      return departments.update(id, fd)
    },
    onSuccess: () => {
      toast.success('Bannière mise à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Upload impossible.'),
  })

  const destroy = useMutation({
    mutationFn: () => departments.delete(id),
    onSuccess: () => {
      toast.success('Département supprimé.')
      // Vide aussi le détail cache pour éviter un redirect bloqué sur 404.
      queryClient.removeQueries({ queryKey: ['admin', 'departments', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      navigate('/admin/departements')
    },
  })

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm({
    values: dept ? {
      // Préfère les versions brutes FR/EN du Resource pour l'édition.
      name: dept.name_fr ?? dept.name ?? '',
      name_en: dept.name_en ?? '',
      description: dept.description_fr ?? dept.description ?? '',
      description_en: dept.description_en ?? '',
      icon: dept.icon ?? '',
      color: dept.color ?? '#8B1A2F',
      status: dept.status ?? 'active',
      display_order: dept.display_order ?? 0,
    } : undefined,
  })

  const currentColor = watch('color')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }
  if (isError || !dept) {
    return (
      <div className="space-y-4">
        <BackButton to="/admin/departements" label="Retour à la liste" />
        <div className="adm-card p-8 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          Département introuvable.
        </div>
      </div>
    )
  }

  const color = dept.color_theme || dept.color || '#71717A'

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <BackButton to="/admin/departements" label="Retour à la liste" />

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="h-12 w-12 rounded-xl flex items-center justify-center text-base font-semibold shrink-0"
            style={{ backgroundColor: color + '22', color }}
          >
            {dept.name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate">{dept.name}</h1>
            <p className="text-sm flex items-center gap-3 mt-1" style={{ color: 'var(--adm-text-muted)' }}>
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {dept.member_count_cache ?? dept.members_count ?? 0} membres
              </span>
              <span>·</span>
              <span className={`adm-badge ${dept.status === 'active' ? 'adm-badge-success' : 'adm-badge-warning'}`}>
                {dept.status === 'active' ? 'Actif' : 'À pourvoir'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setHistoryOpen(true)}
            className="adm-btn adm-btn-secondary"
            title="Voir l'historique des gouverneurs"
          >
            <History size={14} /> Historique gouverneurs
          </button>
          <button
            onClick={() => navigate(`/admin/departements/${id}/template`)}
            className="adm-btn adm-btn-secondary"
          >
            Template rapport
          </button>
          <button
            onClick={() => { if (confirm('Supprimer ce département ?')) destroy.mutate() }}
            className="adm-btn adm-btn-secondary"
            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </header>

      <GovernorsHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        deptId={id}
        deptName={dept.name}
      />

      {/* Gestion gouverneur + équipe.
          Invalide la clé parent ['admin','departments'] pour rafraîchir AUSSI
          la liste des départements (le compteur de membres et le nom du
          gouverneur changent). Sinon retour à la liste = vue stale. */}
      <DepartmentMemberManager
        dept={dept}
        members={members}
        onChange={() => queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })}
      />

      {/* Bannière département */}
      <div className="adm-card p-4 sm:p-6">
        <h2 className="mb-2">Bannière</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--adm-text-muted)' }}>
          Image de fond du hero public de ce département.
          <strong> Si vide, la couleur thème est utilisée à la place.</strong> Paysage 16:9, max 8 Mo.
        </p>
        <div
          className="aspect-[21/9] rounded-lg overflow-hidden flex items-center justify-center border relative"
          style={{
            background: dept.banner_image_url ? 'transparent' : (currentColor || dept.color || '#71717A'),
            borderColor: 'var(--adm-border)',
          }}
        >
          {dept.banner_image_url ? (
            <img src={dept.banner_image_url} alt="Bannière" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/70 text-xs uppercase tracking-widest">
              Aucune bannière — couleur thème utilisée
            </span>
          )}
          {uploadBanner.isPending && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <label className="adm-btn adm-btn-secondary cursor-pointer">
            {dept.banner_image_url ? 'Remplacer la bannière' : 'Ajouter une bannière'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadBanner.mutate(file)
              }}
            />
          </label>
        </div>
      </div>

      {/* Édition */}
      <form
        onSubmit={handleSubmit((d) => update.mutate(d))}
        className="adm-card p-4 sm:p-6 space-y-4"
      >
        <h2>Informations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Nom (FR) *">
            <input {...register('name')} className="adm-input" required />
          </Field>
          <Field label="Name (EN)" helper="Traduction anglaise (facultatif — fallback FR si vide)">
            <input {...register('name_en')} placeholder="ex: Evangelism" className="adm-input" />
          </Field>
        </div>

        <Field label="Icône (Lucide)" helper="ex: shield, megaphone, music">
          <input {...register('icon')} placeholder="shield" className="adm-input" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Couleur thème">
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register('color')}
                className="h-9 w-12 rounded border cursor-pointer"
                style={{ borderColor: 'var(--adm-border)' }}
              />
              <code
                className="text-xs font-mono px-2 py-1 rounded flex-1"
                style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text)' }}
              >
                {currentColor}
              </code>
            </div>
          </Field>
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Actif</option>
              <option value="pending">À pourvoir</option>
            </select>
          </Field>
          <Field label="Ordre d'affichage">
            <input type="number" {...register('display_order')} className="adm-input" />
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Description (FR)">
            <textarea rows={3} {...register('description')} className="adm-textarea" />
          </Field>
          <Field label="Description (EN)" helper="Facultatif — fallback FR si vide">
            <textarea rows={3} {...register('description_en')} className="adm-textarea" />
          </Field>
        </div>

        <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button
            type="submit"
            disabled={!isDirty || update.isPending}
            className="adm-btn adm-btn-primary"
          >
            {update.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, helper, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>{label}</label>
      {children}
      {helper && <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{helper}</p>}
    </div>
  )
}

/**
 * Modal — Historique chronologique des gouverneurs d'un département.
 * Affiche tous les mandats (actifs + clos) avec dates et qui les a nommés.
 * Bouton "Exporter CSV" pour archive Excel.
 */
function GovernorsHistoryModal({ open, onClose, deptId, deptName }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['admin', 'departments', deptId, 'governors-history'],
    queryFn: () => departments.governorsHistory(deptId),
    enabled: open,
    staleTime: 30 * 1000,
  })

  const handleExport = async () => {
    try {
      await departments.exportGovernorsHistory(deptId, deptName)
      toast.success('Export CSV téléchargé.')
    } catch {
      toast.error('Erreur durant l\'export.')
    }
  }

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title="Historique des gouverneurs"
      description={`Mandats successifs sur ${deptName}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10" style={{ color: '#6B5F4E' }}>
          <Loader2 size={24} className="animate-spin mr-2" /> Chargement…
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10" style={{ color: '#6B5F4E' }}>
          <Crown size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm italic">Aucun mandat de gouverneur enregistré pour ce département.</p>
        </div>
      ) : (
        <ol className="relative space-y-4 pl-6 border-l-2" style={{ borderColor: '#E0D5BB' }}>
          {history.map((m) => {
            const fullName = m.user.full_name || [m.user.first_name, m.user.last_name].filter(Boolean).join(' ')
            return (
              <li key={m.id} className="relative">
                {/* Pastille de timeline */}
                <span
                  className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    background: m.is_active ? '#8B1A2F' : '#E0D5BB',
                    borderColor: m.is_active ? '#6E1424' : '#B79358',
                  }}
                >
                  {m.is_active && <Crown size={8} color="#fff" />}
                </span>
                <div
                  className="rounded-lg border p-3 sm:p-4"
                  style={{
                    background: m.is_active ? '#FAF6EE' : '#FFFFFF',
                    borderColor: m.is_active ? '#E8DFC9' : 'var(--adm-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.user.avatar ? (
                        <img src={m.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ background: 'var(--adm-accent)' }}>
                          {(m.user.first_name?.[0] || m.user.last_name?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-[15px]" style={{ color: '#1F1A14' }}>{fullName}</p>
                        {m.user.email && <p className="text-xs truncate" style={{ color: '#6B5F4E' }}>{m.user.email}</p>}
                      </div>
                    </div>
                    {m.is_active ? (
                      <span className="adm-badge adm-badge-success shrink-0">En cours</span>
                    ) : (
                      <span className="adm-badge adm-badge-neutral shrink-0">Clôturé</span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: '#3F362A' }}>
                    <div><span className="block uppercase text-[10px] tracking-wide" style={{ color: '#8C7E68' }}>Nommé le</span>{fmtDate(m.appointed_at)}</div>
                    <div><span className="block uppercase text-[10px] tracking-wide" style={{ color: '#8C7E68' }}>Fin du mandat</span>{m.is_active ? <span className="italic" style={{ color: '#8C7E68' }}>en cours</span> : fmtDate(m.ended_at)}</div>
                    {m.appointed_by && (
                      <div className="col-span-2"><span className="block uppercase text-[10px] tracking-wide" style={{ color: '#8C7E68' }}>Nommé par</span>{m.appointed_by}</div>
                    )}
                    {m.notes && (
                      <div className="col-span-2 pt-1 border-t" style={{ borderColor: '#E8DFC9' }}>
                        <span className="block uppercase text-[10px] tracking-wide mb-1" style={{ color: '#8C7E68' }}>Notes</span>
                        <p className="whitespace-pre-line">{m.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onClose}>
          Fermer
        </button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={handleExport}
          disabled={history.length === 0 || isLoading}
        >
          <Download size={14} /> Exporter en CSV
        </button>
      </Modal.Footer>
    </Modal>
  )
}
