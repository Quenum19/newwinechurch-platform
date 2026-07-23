/**
 * EventEnrolementsPage — Vue admin des enrôlements d'un événement.
 *
 *  Générique : s'affiche pour n'importe quel event (bal, concert, retraite…).
 *  Lit les leads captés via le QR "Suis-nous" paramétré ?event={id}.
 *
 *  Actions :
 *   - Filtrage (statut, type de souhait, recherche)
 *   - Changement de statut (dropdown inline)
 *   - Édition des notes admin
 *   - Suppression
 *   - Export Excel + PDF (styling identique aux autres exports du projet)
 */
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, FileSpreadsheet, Loader2, Search,
  HeartHandshake, Trash2, MessageSquarePlus, Mountain,
} from 'lucide-react'
import api from '@/api/axios'
import Modal from '@/components/ui/Modal'

const STATUS_LABELS = {
  nouveau:  'Nouveau',
  contacte: 'Contacté',
  converti: 'Converti',
  ecarte:   'Écarté',
}

const STATUS_STYLES = {
  nouveau:  { bg: '#FFF7E0', color: '#8A6D1F', border: '#C9A961' },
  contacte: { bg: '#E0EBFF', color: '#1E40AF', border: '#2563EB' },
  converti: { bg: '#DFF5E4', color: '#14532D', border: '#15803D' },
  ecarte:   { bg: '#F3F4F6', color: '#4B5563', border: '#9CA3AF' },
}

export default function EventEnrolementsPage() {
  const { id: eventId } = useParams()
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [notesTarget, setNotesTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['event-enrolements', eventId, filterStatus, filterType, search],
    queryFn: () => api.get(`/admin/events/${eventId}/enrolements`, {
      params: { status: filterStatus || undefined, type: filterType || undefined, q: search || undefined },
    }).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/admin/events/${eventId}/enrolements/${id}/status`, { enrollment_status: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-enrolements', eventId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/events/${eventId}/enrolements/${id}`),
    onSuccess: () => {
      toast.success('Enrôlement supprimé.')
      qc.invalidateQueries({ queryKey: ['event-enrolements', eventId] })
    },
  })

  const stats = data?.stats
  const rows = data?.enrolements?.data ?? []

  const downloadExcel = () => {
    window.open(`${api.defaults.baseURL}/admin/events/${eventId}/enrolements/export/excel`, '_blank')
  }
  const downloadPdf = () => {
    window.open(`${api.defaults.baseURL}/admin/events/${eventId}/enrolements/export/pdf`, '_blank')
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <Link
          to={`/admin/evenements/${eventId}`}
          className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={13}/> Retour à l'événement
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>
          <HeartHandshake size={22} className="inline mr-2 text-[color:var(--adm-accent)]"/>
          Enrôlements
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Leads captés via le QR « Suis-nous » de cet événement — {data?.event?.title ?? '…'}
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} accent="var(--adm-accent)"/>
          <StatCard label="Nouveaux" value={stats.nouveau} accent="#C9A961"/>
          <StatCard label="Contactés" value={stats.contacte} accent="#2563EB"/>
          <StatCard label="Convertis" value={stats.converti} accent="#15803D"/>
        </div>
      )}

      {/* Actions & filtres */}
      <section className="adm-card p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone, lieu…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-[var(--adm-border)] bg-white text-sm focus:outline-none focus:border-[color:var(--adm-accent)]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-md border border-[var(--adm-border)] bg-white text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-md border border-[var(--adm-border)] bg-white text-sm"
        >
          <option value="">Toutes cibles</option>
          <option value="department">Département</option>
          <option value="mountain">Montagne</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={downloadExcel}
            className="px-3 py-2 rounded-md bg-[#15803D] text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#0f5f2c]"
          >
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button
            onClick={downloadPdf}
            className="px-3 py-2 rounded-md bg-[#8B1A2F] text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#6b1523]"
          >
            <Download size={14}/> PDF
          </button>
        </div>
      </section>

      {/* Liste */}
      {isLoading ? (
        <div className="adm-card p-12 text-center text-zinc-500">
          <Loader2 size={32} className="mx-auto animate-spin opacity-40"/>
        </div>
      ) : rows.length === 0 ? (
        <div className="adm-card p-12 text-center text-zinc-500">
          <HeartHandshake size={40} className="mx-auto mb-3 opacity-30"/>
          Aucun enrôlement pour cet événement.
        </div>
      ) : (
        <div className="adm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EFE2] text-[#5C4A3D] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 text-left">Contact</th>
                  <th className="px-3 py-3 text-left">Lieu</th>
                  <th className="px-3 py-3 text-left">Département</th>
                  <th className="px-3 py-3 text-left">Montagne</th>
                  <th className="px-3 py-3 text-left">Statut</th>
                  <th className="px-3 py-3 text-left">Notes</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--adm-border)]">
                {rows.map((r) => (
                  <EnrolementRow
                    key={r.id}
                    row={r}
                    onStatusChange={(s) => statusMutation.mutate({ id: r.id, status: s })}
                    onNotesEdit={() => setNotesTarget(r)}
                    onDelete={() => {
                      if (confirm(`Supprimer l'enrôlement de ${r.first_name} ${r.name} ?`)) {
                        deleteMutation.mutate(r.id)
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NotesModal
        target={notesTarget}
        onClose={() => setNotesTarget(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['event-enrolements', eventId] })}
        eventId={eventId}
      />
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="adm-card p-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>{value ?? 0}</div>
    </div>
  )
}

function EnrolementRow({ row, onStatusChange, onNotesEdit, onDelete }) {
  const style = STATUS_STYLES[row.enrollment_status] || STATUS_STYLES.nouveau

  return (
    <tr className="hover:bg-[#FAF6EE]/50">
      <td className="px-3 py-3">
        <div className="font-semibold">{row.first_name} {row.name}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          📞 {row.phone}
          {row.whatsapp && <> · <span className="text-[#25D366]">WA {row.whatsapp}</span></>}
        </div>
      </td>
      <td className="px-3 py-3 text-zinc-600">{row.city || '—'}</td>
      <td className="px-3 py-3">
        {row.department ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: row.department.color || '#8B1A2F' }}
            />
            <HeartHandshake size={12} className="text-[#8B1A2F]"/>
            {row.department.name}
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        {row.mountain_label ? (
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B1A2F]">
            <Mountain size={12}/>
            {row.mountain_label}
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <select
          value={row.enrollment_status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1 rounded text-xs font-semibold border-2 cursor-pointer"
          style={{
            background: style.bg,
            color: style.color,
            borderColor: style.border,
          }}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 max-w-xs">
        {row.admin_notes ? (
          <div className="text-xs text-zinc-600 italic line-clamp-2">{row.admin_notes}</div>
        ) : (
          <span className="text-xs text-zinc-400 italic">Aucune note</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1 justify-end">
          <button
            onClick={onNotesEdit}
            className="p-1.5 rounded hover:bg-[#FAF6EE] text-zinc-600 hover:text-[color:var(--adm-accent)]"
            title="Éditer les notes"
          >
            <MessageSquarePlus size={14}/>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-zinc-500 hover:text-red-600"
            title="Supprimer"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      </td>
    </tr>
  )
}

function NotesModal({ target, onClose, onSaved, eventId }) {
  const [notes, setNotes] = useState('')

  // Reset quand target change
  useEffect(() => {
    if (target) setNotes(target.admin_notes || '')
  }, [target?.id])

  const save = async () => {
    try {
      await api.patch(`/admin/events/${eventId}/enrolements/${target.id}/notes`, { admin_notes: notes })
      toast.success('Note enregistrée.')
      onSaved()
      onClose()
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    }
  }

  if (!target) return null

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      size="lg"
      title={`Notes — ${target.first_name} ${target.name}`}
      description={`${target.phone} · ${target.city || '—'}`}
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Résumé de l'appel, disponibilité, remarques…"
        className="w-full p-3 rounded-lg border-2 border-[#E5DBC3] bg-white text-[#0A0A0A] focus:outline-none focus:border-[#8B1A2F] transition"
        autoFocus
      />
      <Modal.Footer>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg text-[#5C4A3D] hover:bg-[#EFE7D4] font-medium"
        >
          Annuler
        </button>
        <button
          onClick={save}
          className="px-6 py-2.5 rounded-lg bg-[#8B1A2F] text-white font-semibold hover:bg-[#6b1523]"
        >
          Enregistrer
        </button>
      </Modal.Footer>
    </Modal>
  )
}
