/**
 * BilingualField — champ de saisie bilingue FR/EN avec onglets.
 *
 * Compose 2 inputs (ou textareas / rich editors) sous un seul header avec
 * tabs "🇫🇷 Français" / "🇬🇧 English". Le champ FR est obligatoire (marqué *),
 * l'EN optionnel avec message "Fallback vers FR si vide".
 *
 * Usage :
 *   <BilingualField
 *     label="Titre de l'événement"
 *     required
 *     type="input"          // 'input' | 'textarea' | 'rich' (Tiptap)
 *     valueFr={form.title}
 *     valueEn={form.title_en}
 *     onChangeFr={(v) => setForm({...form, title: v})}
 *     onChangeEn={(v) => setForm({...form, title_en: v})}
 *     placeholder="Ex : Nuit de louange"
 *     rows={4}              // pour textarea
 *     errorFr={errors.title}
 *     errorEn={errors.title_en}
 *   />
 *
 * Persiste le dernier onglet actif dans localStorage → si l'admin travaille
 * en anglais sur une session, tous les BilingualField ouvrent EN par défaut.
 */
import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

const LS_KEY = 'nwc_bilingual_last_tab'

export default function BilingualField({
  label,
  required = false,
  type = 'input',
  valueFr = '',
  valueEn = '',
  onChangeFr,
  onChangeEn,
  placeholder = '',
  placeholderEn,
  rows = 3,
  errorFr,
  errorEn,
  helper,
  className = '',
}) {
  const [tab, setTab] = useState(() => localStorage.getItem(LS_KEY) || 'fr')
  useEffect(() => { localStorage.setItem(LS_KEY, tab) }, [tab])

  const isEn = tab === 'en'
  const currentValue = isEn ? valueEn : valueFr
  const currentOnChange = isEn ? onChangeEn : onChangeFr
  const currentError = isEn ? errorEn : errorFr
  const currentPlaceholder = isEn
    ? (placeholderEn || placeholder || `EN — ${label}`)
    : placeholder

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Onglets FR / EN */}
        <div className="inline-flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--adm-border)' }}>
          <button
            type="button"
            onClick={() => setTab('fr')}
            className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition"
            style={{
              background: tab === 'fr' ? 'var(--adm-accent)' : 'var(--adm-card)',
              color: tab === 'fr' ? '#fff' : 'var(--adm-text-muted)',
            }}
          >
            🇫🇷 FR {valueFr ? '' : '·'}
          </button>
          <button
            type="button"
            onClick={() => setTab('en')}
            className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition border-l"
            style={{
              background: tab === 'en' ? 'var(--adm-accent)' : 'var(--adm-card)',
              color: tab === 'en' ? '#fff' : 'var(--adm-text-muted)',
              borderColor: 'var(--adm-border)',
            }}
          >
            🇬🇧 EN {valueEn ? '' : '·'}
          </button>
        </div>
      </div>

      {type === 'textarea' ? (
        <textarea
          value={currentValue}
          onChange={(e) => currentOnChange?.(e.target.value)}
          placeholder={currentPlaceholder}
          rows={rows}
          className="adm-input w-full"
        />
      ) : (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => currentOnChange?.(e.target.value)}
          placeholder={currentPlaceholder}
          className="adm-input w-full"
        />
      )}

      {/* Message aide */}
      <div className="mt-1 flex items-center justify-between text-xs">
        <span style={{ color: 'var(--adm-text-muted)' }}>
          {helper}
        </span>
        {isEn && ! valueEn && (
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: 'var(--adm-text-faint)' }}
          >
            <Info size={11}/> Vide → fallback vers version française
          </span>
        )}
      </div>

      {currentError && (
        <p className="mt-1 text-xs text-red-600">{currentError}</p>
      )}
    </div>
  )
}
