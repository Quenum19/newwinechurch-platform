/**
 * Bouton réinitialisation des filtres — admin.
 *
 * Affiché UNIQUEMENT quand au moins un filtre est DIFFÉRENT de l'état par
 * défaut. Si une page démarre avec status='pending' (vue par défaut), ce
 * n'est PAS considéré comme un filtre actif tant que l'utilisateur ne change
 * rien.
 *
 * Usage simple (état initial = page+per_page seuls) :
 *   <ResetFiltersButton
 *     filters={filters}
 *     onReset={() => setFilters({ page: 1, per_page: 20 })}
 *   />
 *
 * Usage avec defaults (vue par défaut = certains filtres pré-appliqués) :
 *   <ResetFiltersButton
 *     filters={filters}
 *     defaults={{ status: 'pending' }}
 *     onReset={() => setFilters({ page: 1, per_page: 20, status: 'pending' })}
 *   />
 */
import { X } from 'lucide-react'

const NEUTRAL_KEYS = new Set(['page', 'per_page', 'sort', 'direction'])

export default function ResetFiltersButton({
  filters,
  defaults = {},
  onReset,
  neutralKeys = [],
  className = '',
}) {
  const neutral = new Set([...NEUTRAL_KEYS, ...neutralKeys])

  const isEmpty = (v) => (
    v === undefined || v === null || v === '' || v === false
    || (Array.isArray(v) && v.length === 0)
  )

  const activeCount = Object.entries(filters || {}).filter(([k, v]) => {
    if (neutral.has(k)) return false
    // Si une valeur par défaut est définie : actif uniquement si elle diffère.
    if (Object.prototype.hasOwnProperty.call(defaults, k)) {
      return String(v ?? '') !== String(defaults[k] ?? '')
    }
    return ! isEmpty(v)
  }).length

  if (activeCount === 0) return null

  return (
    <button
      type="button"
      onClick={onReset}
      className={`adm-btn adm-btn-secondary text-xs h-9 inline-flex items-center gap-1.5 ${className}`}
      style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
      title="Effacer tous les filtres actifs"
    >
      <X size={13} />
      Réinitialiser{activeCount > 1 && ` (${activeCount})`}
    </button>
  )
}
