/**
 * AdminReportsList — Liste GLOBALE des rapports département soumis.
 * Accessible au pasteur / admin / RH.
 *
 *  - Filtres : status, département
 *  - Téléchargement direct du PDF officiel (Lot 4)
 *  - Click row → détail (review, approuver/rejeter)
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Download, Eye, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

import DataTable from '@/components/admin/DataTable.jsx'
import { departmentReports, departments } from '@/api/admin'
import { useQuery } from '@tanstack/react-query'

const STATUS_BADGE = {
  draft:     { label: 'Brouillon',  cls: 'adm-badge-neutral' },
  submitted: { label: 'À examiner', cls: 'adm-badge-warning' },
  reviewed:  { label: 'Revu',       cls: 'adm-badge-info' },
  approved:  { label: 'Approuvé',   cls: 'adm-badge-success' },
  rejected:  { label: 'Rejeté',     cls: 'adm-badge-danger' },
}

const STATUS_ICON = {
  submitted: <Clock size={12} />,
  approved:  <CheckCircle2 size={12} />,
  rejected:  <AlertCircle size={12} />,
}

export default function AdminReportsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })

  // Liste des départements pour le filtre.
  const { data: deptList } = useQuery({
    queryKey: ['admin', 'departments-light'],
    queryFn: () => departments.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
  })
  const deptItems = deptList?.data ?? deptList ?? []

  const handleDownload = async (row, evt) => {
    evt.stopPropagation()
    if (!row.has_pdf) {
      toast.error('PDF non encore généré.')
      return
    }
    try {
      const name = `Rapport_${row.department?.name?.replace(/\s+/g, '_') || 'departement'}_${row.period_end}.pdf`
      await departmentReports.downloadPdf(row.id, name)
    } catch {
      toast.error('Erreur de téléchargement.')
    }
  }

  const columns = [
    {
      key: 'department', label: 'Département',
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="adm-icon-bg shrink-0">
            <FileText size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
              {r.department?.name ?? '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--adm-text-faint)' }}>
              {r.report_type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'governor', label: 'Gouverneur',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
          {r.governor?.full_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'period', label: 'Période',
      render: (r) => (
        <span className="text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {r.period_start} → {r.period_end}
        </span>
      ),
    },
    {
      key: 'submitted_at', label: 'Soumis le',
      render: (r) => (
        <span className="text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('fr-FR') : '—'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Statut',
      render: (r) => {
        const b = STATUS_BADGE[r.status] ?? STATUS_BADGE.draft
        return (
          <span className={`adm-badge ${b.cls} inline-flex items-center gap-1`}>
            {STATUS_ICON[r.status]}
            {b.label}
            {r.is_late && <span className="ml-1 text-[10px] opacity-70">⚠ en retard</span>}
          </span>
        )
      },
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => handleDownload(r, e)}
            disabled={!r.has_pdf}
            title={r.has_pdf ? 'Télécharger le PDF' : 'PDF non encore disponible'}
            className="adm-btn-icon"
            style={{ opacity: r.has_pdf ? 1 : 0.4 }}
          >
            <Download size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/rapports-departement/${r.id}`) }}
            className="adm-btn-icon"
            title="Voir le rapport"
          >
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Rapports département (hebdo)</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Rapports d'activité soumis par les gouverneurs (1 par département / semaine).
            Pour les rapports de cellule, voir <Link to="/admin/cellules" className="underline">Cellules → détail cellule</Link>.
          </p>
        </div>
      </header>

      <DataTable
        queryKey={['admin', 'department-reports']}
        queryFn={departmentReports.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        emptyMessage="Aucun rapport pour le moment."
        onRowClick={(r) => navigate(`/admin/rapports-departement/${r.id}`)}
        mobileTitle={(r) => r.department?.name ?? '—'}
        mobileSubtitle={(r) =>
          `${r.governor?.full_name ?? '—'} · ${r.period_start} → ${r.period_end}`
        }
        filtersSlot={
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.status ?? ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              className="adm-input"
            >
              <option value="">Tous statuts</option>
              <option value="submitted">À examiner</option>
              <option value="reviewed">Revus</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Rejetés</option>
            </select>
            <select
              value={filters.department_id ?? ''}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value || undefined, page: 1 })}
              className="adm-input"
            >
              <option value="">Tous départements</option>
              {deptItems.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  )
}
