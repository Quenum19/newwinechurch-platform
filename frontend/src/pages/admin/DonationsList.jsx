/**
 * Liste des dons — Refonte 2026 (admin-v2 native).
 *
 * Workflow Mobile Money : pending → confirmed (envoi reçu) ou rejected.
 * KPIs en haut (pending, total année, top méthode).
 * Mobile : DataTable bascule en cards verticales avec actions accessibles.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, AlertCircle, Download, Wallet, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import { donations } from '@/api/admin'

const METHOD_LABELS = {
  orange_money: 'Orange Money',
  wave: 'Wave',
  mtn_momo: 'MTN MoMo',
  card: 'Carte',
  cash: 'Cash',
  other: 'Autre',
}

const STATUS_META = {
  pending:   { label: 'En attente', cls: 'adm-badge-warning' },
  completed: { label: 'Confirmé',   cls: 'adm-badge-success' },
  failed:    { label: 'Rejeté',     cls: 'adm-badge-danger' },
}

const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR')

export default function DonationsList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 25 })

  const { data: stats } = useQuery({
    queryKey: ['admin', 'donations', 'stats'],
    queryFn: donations.stats,
    staleTime: 30_000,
  })

  const confirmMutation = useMutation({
    mutationFn: (id) => donations.confirm(id),
    onSuccess: () => {
      toast.success('Don confirmé. Reçu envoyé au donateur.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] })
    },
    onError: () => toast.error('Erreur lors de la confirmation.'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => donations.reject(id, reason),
    onSuccess: () => {
      toast.success('Don rejeté.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] })
    },
  })

  const handleReject = (d) => {
    const reason = prompt('Motif du rejet (optionnel) :')
    if (reason !== null) rejectMutation.mutate({ id: d.id, reason })
  }

  const columns = [
    {
      key: 'created_at', label: 'Date', sortable: true,
      render: (d) => (
        <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {format(new Date(d.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
        </span>
      ),
    },
    {
      key: 'donor', label: 'Donateur',
      render: (d) => (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
            {d.user?.full_name || d.donor_name
              || <span className="italic" style={{ color: 'var(--adm-text-faint)' }}>Anonyme</span>}
          </div>
          {d.donor_phone && (
            <div className="text-xs tabular-nums truncate" style={{ color: 'var(--adm-text-muted)' }}>
              {d.donor_phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount', label: 'Montant', sortable: true,
      render: (d) => (
        <div className="text-right tabular-nums whitespace-nowrap">
          <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>{fmtFCFA(d.amount)}</span>
          <span className="text-xs ml-1" style={{ color: 'var(--adm-text-faint)' }}>{d.currency}</span>
        </div>
      ),
      cellClassName: 'text-right',
    },
    {
      key: 'method', label: 'Méthode',
      render: (d) => (
        <span className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
          {METHOD_LABELS[d.method] || d.method}
        </span>
      ),
    },
    {
      key: 'reference', label: 'Référence',
      render: (d) => d.reference ? (
        <code
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text)' }}
        >
          {d.reference}
        </code>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'type', label: 'Type',
      render: (d) => <span className="capitalize text-xs" style={{ color: 'var(--adm-text-muted)' }}>{d.type}</span>,
    },
    {
      key: 'status', label: 'Statut',
      render: (d) => {
        const s = STATUS_META[d.status] ?? STATUS_META.pending
        return <span className={`adm-badge ${s.cls}`}>{s.label}</span>
      },
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right whitespace-nowrap',
      render: (d) => d.status === 'pending' ? (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => confirmMutation.mutate(d.id)}
            className="p-1.5 rounded hover:bg-green-50 transition"
            style={{ color: 'var(--adm-success)' }}
            aria-label="Confirmer"
            title="Confirmer"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            onClick={() => handleReject(d)}
            className="p-1.5 rounded hover:bg-red-50 transition"
            style={{ color: 'var(--adm-danger)' }}
            aria-label="Rejeter"
            title="Rejeter"
          >
            <XCircle size={16} />
          </button>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dons (Mobile Money)</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Confirmez les dons après vérification de la référence dans votre app Mobile Money.
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              await donations.export(filters)
              toast.success('Export téléchargé.')
            } catch { toast.error('Export impossible.') }
          }}
          className="adm-btn adm-btn-secondary"
        >
          <Download size={14} /> Excel
        </button>
      </header>

      {/* === KPIs Stats === */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={AlertCircle}
            label="À traiter"
            value={stats.pending_count ?? 0}
            subtitle="dons en attente"
            tone={(stats.pending_count ?? 0) > 0 ? 'warning' : 'default'}
          />
          <StatCard
            icon={TrendingUp}
            label="Total année"
            value={`${fmtFCFA(stats.total_completed_year)}`}
            suffix="FCFA"
            subtitle="dons confirmés"
          />
          <StatCard
            icon={Wallet}
            label="Top méthode"
            value={stats.by_method?.[0]?.method ? METHOD_LABELS[stats.by_method[0].method] : '—'}
            subtitle={
              stats.by_method?.[0]
                ? `${fmtFCFA(stats.by_method[0].total)} FCFA`
                : 'aucun don confirmé'
            }
          />
        </div>
      )}

      <DataTable
        queryKey={['admin', 'donations']}
        queryFn={donations.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Référence, donateur…"
        emptyMessage="Aucun don pour ces critères."
        mobileRow={(d) => <DonationMobileRow d={d} onConfirm={() => confirmMutation.mutate(d.id)} onReject={() => handleReject(d)} />}
        filtersSlot={
          <>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous statuts</option>
              <option value="pending">En attente</option>
              <option value="completed">Confirmés</option>
              <option value="failed">Rejetés</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.method || ''}
              onChange={(e) => setFilters({ ...filters, method: e.target.value || undefined, page: 1 })}
            >
              <option value="">Toutes méthodes</option>
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
              <option value="mtn_momo">MTN MoMo</option>
              <option value="cash">Cash</option>
            </select>
          </>
        }
      />
    </div>
  )
}

/** Card stat header en haut du listing. */
function StatCard({ icon: Icon, label, value, suffix, subtitle, tone = 'default' }) {
  return (
    <div
      className="adm-card p-4"
      style={tone === 'warning'
        ? { borderColor: 'var(--adm-warning)', background: '#FFFBEB' }
        : undefined}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          style={{ color: tone === 'warning' ? 'var(--adm-warning)' : 'var(--adm-text-faint)' }}
        />
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: tone === 'warning' ? 'var(--adm-warning)' : 'var(--adm-text-faint)' }}
        >
          {label}
        </span>
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight truncate"
           style={{ color: 'var(--adm-text)' }}>
        {value}
        {suffix && <span className="text-xs ml-1" style={{ color: 'var(--adm-text-faint)' }}>{suffix}</span>}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{subtitle}</div>
      )}
    </div>
  )
}

/** Card mobile par don : tout l'essentiel + actions accessibles */
function DonationMobileRow({ d, onConfirm, onReject }) {
  const s = STATUS_META[d.status] ?? STATUS_META.pending
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
            {d.user?.full_name || d.donor_name
              || <span className="italic" style={{ color: 'var(--adm-text-faint)' }}>Anonyme</span>}
          </div>
          <div className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
            {format(new Date(d.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--adm-text)' }}>
            {fmtFCFA(d.amount)}
            <span className="text-xs ml-1" style={{ color: 'var(--adm-text-faint)' }}>{d.currency}</span>
          </div>
          <span className={`adm-badge ${s.cls} mt-1`}>{s.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs gap-2" style={{ color: 'var(--adm-text-muted)' }}>
        <span>{METHOD_LABELS[d.method] || d.method} · <span className="capitalize">{d.type}</span></span>
        {d.reference && (
          <code
            className="text-[10px] font-mono px-1.5 py-0.5 rounded truncate max-w-[50%]"
            style={{ background: 'var(--adm-card-hover)' }}
          >
            {d.reference}
          </code>
        )}
      </div>
      {d.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--adm-border)' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onConfirm}
            className="adm-btn adm-btn-secondary flex-1 justify-center text-xs"
            style={{ color: 'var(--adm-success)', borderColor: '#BBF7D0' }}
          >
            <CheckCircle2 size={14} /> Confirmer
          </button>
          <button
            onClick={onReject}
            className="adm-btn adm-btn-secondary flex-1 justify-center text-xs"
            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
          >
            <XCircle size={14} /> Rejeter
          </button>
        </div>
      )}
    </div>
  )
}
