/**
 * DataTable — Refonte 2026 (admin-v2 scope).
 *
 *  - Desktop : vraie table responsive (`<table>`) avec hover row + tri colonne
 *  - Mobile  : auto-bascule en liste de cards (lecture verticale)
 *  - Recherche debounced 400ms, pagination serveur
 *  - Slot filtres + actions à droite
 *  - Skeleton loading propre
 *
 *  Usage :
 *     <DataTable
 *        queryKey={['admin','members', filters]}
 *        queryFn={({queryKey}) => members.list(queryKey[2])}
 *        columns={[{key:'name', label:'Nom', sortable:true, render:(row)=>...}]}
 *        mobileTitle={(row) => row.full_name}
 *        mobileSubtitle={(row) => row.email}
 *        filters={filters}
 *        onFiltersChange={setFilters}
 *     />
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export default function DataTable({
  queryKey,
  queryFn,
  columns,
  filters = {},
  onFiltersChange,
  searchPlaceholder = 'Rechercher…',
  emptyMessage = 'Aucun résultat.',
  rowKey = 'id',
  onRowClick,
  filtersSlot,
  rightActions,
  /** Render mobile : titre principal de la card (string) */
  mobileTitle,
  /** Render mobile : sous-titre */
  mobileSubtitle,
  /** Si fourni : remplace le rendu mobile par défaut */
  mobileRow,
}) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchInput || '') !== (filters.search || '')) {
        onFiltersChange({ ...filters, search: searchInput || undefined, page: 1 })
      }
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const params = useMemo(() => {
    const p = { ...filters }
    Object.keys(p).forEach((k) => {
      if (p[k] === '' || p[k] === null || p[k] === undefined) delete p[k]
    })
    return p
  }, [filters])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    keepPreviousData: true,
  })

  const rows = data?.data ?? []
  const meta = data?.meta ?? data?.links ?? null

  const setSort = (key) => {
    if (filters.sort === key) {
      onFiltersChange({ ...filters, direction: filters.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onFiltersChange({ ...filters, sort: key, direction: 'desc' })
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Barre filtres + actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--adm-text-faint)' }}
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm adm-input"
            style={{ background: '#fff' }}
          />
        </div>
        {filtersSlot}
        <div className="ml-auto flex items-center gap-2">
          {isFetching && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--adm-text-faint)' }} />}
          {rightActions}
        </div>
      </div>

      {/* === Desktop : table === */}
      <div className="hidden md:block adm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>
                    {col.sortable ? (
                      <button
                        onClick={() => setSort(col.key)}
                        className="inline-flex items-center gap-1 hover:underline transition"
                        style={{ color: 'var(--adm-text-muted)' }}
                      >
                        {col.label}
                        {filters.sort === col.key && (
                          filters.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columnsCount={columns.length} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-12"
                    style={{ color: 'var(--adm-text-muted)' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row[rowKey]}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.cellClassName}>
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Mobile : liste de cards === */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-card p-4 animate-pulse h-[72px]" />
          ))
        ) : rows.length === 0 ? (
          <div
            className="adm-card p-8 text-center text-sm"
            style={{ color: 'var(--adm-text-muted)' }}
          >
            {emptyMessage}
          </div>
        ) : (
          rows.map((row) => (
            <button
              key={row[rowKey]}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'adm-card w-full text-left p-3 transition',
                onRowClick && 'hover:shadow-sm'
              )}
            >
              {mobileRow ? (
                mobileRow(row)
              ) : (
                <DefaultMobileRow
                  row={row}
                  title={mobileTitle?.(row)}
                  subtitle={mobileSubtitle?.(row)}
                  columns={columns}
                />
              )}
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta?.last_page > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-3">
          <div style={{ color: 'var(--adm-text-muted)' }}>
            {meta.from}–{meta.to} sur {meta.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.current_page <= 1}
              onClick={() => onFiltersChange({ ...filters, page: meta.current_page - 1 })}
              className="adm-btn adm-btn-secondary py-1.5 px-2 sm:px-3 text-xs disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Précédent</span>
            </button>
            <span className="px-2" style={{ color: 'var(--adm-text)' }}>
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              disabled={meta.current_page >= meta.last_page}
              onClick={() => onFiltersChange({ ...filters, page: meta.current_page + 1 })}
              className="adm-btn adm-btn-secondary py-1.5 px-2 sm:px-3 text-xs disabled:opacity-40"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Rendu mobile par défaut : titre + sous-titre + 2-3 colonnes en pile */
function DefaultMobileRow({ row, title, subtitle, columns }) {
  // Affiche les 2-3 premières colonnes en liste verticale.
  const meaningfulCols = columns.filter((c) => c.key !== rowKeyHint(c)).slice(0, 3)
  return (
    <div className="space-y-1">
      {title && (
        <div className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          {subtitle}
        </div>
      )}
      {!title && !subtitle && meaningfulCols.length > 0 && (
        <div className="space-y-1">
          {meaningfulCols.map((c) => (
            <div key={c.key} className="text-xs flex justify-between gap-2">
              <span style={{ color: 'var(--adm-text-faint)' }}>{c.label}</span>
              <span className="truncate" style={{ color: 'var(--adm-text)' }}>
                {c.render ? c.render(row) : row[c.key] ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function rowKeyHint(col) {
  return col.key === 'id' ? 'id' : ''
}

function SkeletonRows({ columnsCount }) {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: columnsCount }).map((_, j) => (
        <td key={j}>
          <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        </td>
      ))}
    </tr>
  ))
}
