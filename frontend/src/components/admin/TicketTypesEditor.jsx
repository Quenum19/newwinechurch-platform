/**
 * Phase 2 — Éditeur des types de tickets (admin EventForm).
 *
 * Liste + modal create/edit. Disponible uniquement en édition (event_id requis).
 * Chaque type a : name, description, price_fcfa, capacity, max_per_order, is_active.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Edit2, Trash2, Ticket, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { events as eventsApi } from '@/api/admin'
import Modal from '@/components/ui/Modal.jsx'

export default function TicketTypesEditor({ eventId }) {
  const qc = useQueryClient()
  const [editingType, setEditingType] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['admin', 'events', eventId, 'ticket-types'],
    queryFn: async () => (await eventsApi.ticketTypesList(eventId))?.data ?? [],
    enabled: !!eventId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => eventsApi.ticketTypeDelete(eventId, id),
    onSuccess: () => {
      toast.success('Type supprimé.')
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'ticket-types'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Suppression refusée.'),
  })

  const openCreate = () => { setEditingType(null); setModalOpen(true) }
  const openEdit = (t)  => { setEditingType(t); setModalOpen(true) }

  return (
    <div className="border-t border-public-ink/10 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
          Types de tickets (Phase 2 paiement)
        </p>
        <button type="button" onClick={openCreate}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-mono px-3 py-1.5 bg-public-flame text-white hover:bg-public-ink transition">
          <Plus size={12}/> Ajouter
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>Chargement…</p>
      ) : types.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--adm-text-muted)' }}>
          Aucun type défini → l'event reste en mode "ticket gratuit unique" (Phase 1).
        </p>
      ) : (
        <div className="space-y-2">
          {types.map((t) => (
            <div key={t.id}
                 className="flex items-center justify-between gap-2 p-3 border-2 border-public-ink/10 hover:border-public-flame/30 transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {t.color_hex && (
                    <span className="w-3 h-3 rounded-full" style={{ background: t.color_hex }}/>
                  )}
                  <p className="font-medium text-sm">{t.name}</p>
                  {!t.is_active && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 text-zinc-700 font-mono uppercase tracking-wider">
                      Désactivé
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-muted)' }}>
                  <strong className="text-public-flame">
                    {t.price_fcfa > 0 ? `${new Intl.NumberFormat('fr-FR').format(t.price_fcfa)} FCFA` : 'Gratuit'}
                  </strong>
                  {' · '}
                  {t.sold}/{t.capacity ?? '∞'} vendus
                  {t.max_per_order && ` · max ${t.max_per_order}/cmde`}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => openEdit(t)}
                        className="p-1.5 hover:bg-public-flame/10 hover:text-public-flame transition">
                  <Edit2 size={14}/>
                </button>
                <button type="button" onClick={() => {
                  if (!confirm(`Supprimer le type "${t.name}" ?`)) return
                  deleteMutation.mutate(t.id)
                }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eventId={eventId}
        type={editingType}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────── */

function TicketTypeModal({ open, onClose, eventId, type }) {
  const qc = useQueryClient()
  const isEdit = !!type
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    values: type ? {
      name: type.name,
      description: type.description ?? '',
      price_fcfa: type.price_fcfa,
      capacity: type.capacity ?? '',
      max_per_order: type.max_per_order ?? '',
      color_hex: type.color_hex ?? '#C9A961',
      is_active: type.is_active,
      sort_order: type.sort_order,
    } : { price_fcfa: 0, is_active: true, color_hex: '#C9A961' },
  })

  const save = useMutation({
    mutationFn: (data) => isEdit
      ? eventsApi.ticketTypeUpdate(eventId, type.id, data)
      : eventsApi.ticketTypeCreate(eventId, data),
    onSuccess: () => {
      toast.success(isEdit ? 'Type mis à jour.' : 'Type créé.')
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'ticket-types'] })
      onClose()
      reset()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const onSubmit = (data) => {
    save.mutate({
      ...data,
      price_fcfa: parseInt(data.price_fcfa) || 0,
      capacity: data.capacity ? parseInt(data.capacity) : null,
      max_per_order: data.max_per_order ? parseInt(data.max_per_order) : null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Modifier "${type?.name}"` : 'Nouveau type de ticket'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Nom *</label>
          <input {...register('name', { required: true })} placeholder="ex: Standard, VIP, Étudiant"
                 className="adm-input"/>
          {errors.name && <p className="text-xs text-red-600 mt-1">Nom requis</p>}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Description</label>
          <textarea {...register('description')} rows="2" placeholder="Ce qui est inclus dans ce type…"
                    className="adm-input"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Prix (FCFA) *</label>
            <input type="number" min="0" {...register('price_fcfa', { required: true })} className="adm-input"/>
            <p className="text-[10px] text-public-ink/50 mt-1">0 = gratuit (cohabite avec types payants)</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Capacité</label>
            <input type="number" min="1" {...register('capacity')} placeholder="∞"
                   className="adm-input"/>
            <p className="text-[10px] text-public-ink/50 mt-1">Vide = partage capacité globale</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Max/commande</label>
            <input type="number" min="1" max="20" {...register('max_per_order')} placeholder="∞" className="adm-input"/>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Couleur</label>
            <input type="color" {...register('color_hex')} className="h-10 w-full"/>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="h-4 w-4"/>
          Type actif (vendable)
        </label>

        <div className="flex justify-end gap-2 pt-4 border-t border-public-ink/10">
          <button type="button" onClick={onClose}
                  className="px-4 py-2 text-xs uppercase tracking-wider font-mono border-2 border-public-ink/15">
            Annuler
          </button>
          <button type="submit" disabled={save.isPending}
                  className="px-4 py-2 text-xs uppercase tracking-wider font-mono bg-public-flame text-white disabled:opacity-50 inline-flex items-center gap-2">
            {save.isPending && <Loader2 size={12} className="animate-spin"/>}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
