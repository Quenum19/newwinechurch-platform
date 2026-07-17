/**
 * Onglets de navigation du module Sermons.
 *
 * Affiché en haut des 3 pages racines (Sermons / Séries / Thèmes) pour
 * permettre un switch rapide en 1 clic, comme GitHub/Linear/Stripe.
 */
import { NavLink } from 'react-router-dom'
import { Mic, Layers, Tag } from 'lucide-react'

const TABS = [
  { to: '/admin/sermons',         label: 'Messages', icon: Mic,    end: true },
  { to: '/admin/sermons/series',  label: 'Séries',   icon: Layers, end: false },
  { to: '/admin/sermons/themes',  label: 'Thèmes',   icon: Tag,    end: false },
]

export default function SermonsTabs() {
  return (
    <div
      className="flex gap-1 border-b -mt-2"
      style={{ borderColor: 'var(--adm-border)' }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition whitespace-nowrap ${
              isActive
                ? 'border-current'
                : 'border-transparent hover:border-zinc-300'
            }`
          }
          style={({ isActive }) => ({
            color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
          })}
        >
          <t.icon size={14} />
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
