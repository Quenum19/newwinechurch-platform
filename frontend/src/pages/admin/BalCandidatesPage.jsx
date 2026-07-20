/**
 * BalCandidatesPage — CRUD candidats Roi & Reine.
 */
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Crown, Plus, Pencil, Trash2, Upload, Loader2, ArrowLeft } from 'lucide-react'
import api from '@/api/axios'

export default function BalCandidatesPage() {
  const { eventId } = useParams()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // { mode: 'create'|'edit', role, candidate }

  const { data, isLoading } = useQuery({
    queryKey: ['bal', 'candidates', eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/bal/candidates`).then((r) => r.data.candidates),
  })

  const deleteMutation = useMutation({
    mutationFn: (cid) => api.delete(`/admin/events/${eventId}/bal/candidates/${cid}`),
    onSuccess: () => {
      toast.success('Candidat supprimé.')
      qc.invalidateQueries({ queryKey: ['bal', 'candidates', eventId] })
    },
  })

  const candidates = data ?? []
  const rois = candidates.filter((c) => c.role === 'roi')
  const reines = candidates.filter((c) => c.role === 'reine')

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <Link to={`/admin/bal/${eventId}/regie`} className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13}/> Retour régie
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>
          <Crown size={22} className="inline mr-2 text-[color:var(--adm-accent)]"/>
          Candidats Roi & Reine
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Ajoute les candidats avec photo. Ils apparaîtront dans le vote et à l'écran.</p>
      </div>

      {isLoading ? (
        <div className="adm-card p-16 text-center text-zinc-500">
          <Loader2 size={24} className="animate-spin inline"/>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          <CandidateSection
            title="Rois"
            list={rois}
            role="roi"
            onAdd={() => setModal({ mode: 'create', role: 'roi' })}
            onEdit={(c) => setModal({ mode: 'edit', role: 'roi', candidate: c })}
            onDelete={(c) => confirm(`Supprimer ${c.first_name} ${c.last_name} ?`) && deleteMutation.mutate(c.id)}
          />
          <CandidateSection
            title="Reines"
            list={reines}
            role="reine"
            onAdd={() => setModal({ mode: 'create', role: 'reine' })}
            onEdit={(c) => setModal({ mode: 'edit', role: 'reine', candidate: c })}
            onDelete={(c) => confirm(`Supprimer ${c.first_name} ${c.last_name} ?`) && deleteMutation.mutate(c.id)}
          />
        </div>
      )}

      {modal && (
        <CandidateModal
          eventId={eventId}
          {...modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            qc.invalidateQueries({ queryKey: ['bal', 'candidates', eventId] })
          }}
        />
      )}
    </div>
  )
}

function CandidateSection({ title, list, role, onAdd, onEdit, onDelete }) {
  return (
    <section className="adm-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{title} ({list.length})</h2>
        <button onClick={onAdd} className="adm-btn adm-btn-primary">
          <Plus size={13}/> Ajouter
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-zinc-500 italic text-center py-8">Aucun candidat pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-2 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt={c.first_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[color:var(--adm-accent)]"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold">
                  {c.first_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.first_name} {c.last_name}</p>
                {!c.is_active && <p className="text-[10px] text-red-600 font-mono uppercase tracking-widest">Inactif</p>}
              </div>
              <button onClick={() => onEdit(c)} className="p-2 text-zinc-500 hover:text-[color:var(--adm-accent)]">
                <Pencil size={14}/>
              </button>
              <button onClick={() => onDelete(c)} className="p-2 text-zinc-500 hover:text-red-600">
                <Trash2 size={14}/>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CandidateModal({ eventId, mode, role, candidate, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(candidate?.first_name ?? '')
  const [lastName, setLastName]   = useState(candidate?.last_name ?? '')
  const [photo, setPhoto]         = useState(null)
  const [preview, setPreview]     = useState(candidate?.photo_url ?? null)
  const [busy, setBusy]           = useState(false)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('role', role)
      fd.append('first_name', firstName)
      fd.append('last_name', lastName)
      if (photo) fd.append('photo', photo)

      const url = mode === 'create'
        ? `/admin/events/${eventId}/bal/candidates`
        : `/admin/events/${eventId}/bal/candidates/${candidate.id}`

      await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(mode === 'create' ? 'Candidat ajouté.' : 'Candidat modifié.')
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] rounded-lg max-w-md w-full p-5 shadow-xl">
        <h3 className="text-lg font-bold mb-3">
          {mode === 'create' ? `Ajouter un candidat ${role === 'roi' ? 'Roi' : 'Reine'}` : `Modifier ${candidate?.first_name}`}
        </h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Prénom</label>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="adm-input w-full"/>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Nom</label>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="adm-input w-full"/>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Photo (max 30 Mo)</label>
            {preview && (
              <img src={preview} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-[color:var(--adm-accent)] mb-2"/>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="text-sm"/>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="adm-btn adm-btn-ghost flex-1">Annuler</button>
            <button type="submit" disabled={busy} className="adm-btn adm-btn-primary flex-1">
              {busy ? <Loader2 size={14} className="animate-spin"/> : (mode === 'create' ? 'Ajouter' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
