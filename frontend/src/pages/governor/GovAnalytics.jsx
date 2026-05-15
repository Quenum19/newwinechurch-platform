/**
 * GovAnalytics — graphiques évolution membres, présence, rapports, top cellules.
 */
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, RadialBarChart, RadialBar, Legend,
} from 'recharts'
import { useGovernorAnalytics } from '@/api/governor'
import { SkeletonCard } from '@/components/shared/Skeleton'

const TICK = { fill: 'rgba(255,255,255,0.5)', fontSize: 11 }
const GRID = 'rgba(255,255,255,0.08)'
const TOOLTIP = {
  background: '#0f0a0c', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#fff',
}

export default function GovAnalytics() {
  const { data, isLoading } = useGovernorAnalytics()

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonCard /> <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Données générées le {new Date(data.generated_at).toLocaleString('fr-FR')}</p>
      </header>

      <ChartCard title="Évolution des membres (12 mois)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.members_by_month ?? []}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="count" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Taux de présence par cellule (4 sem)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.cells_attendance_rates ?? []} layout="vertical">
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={TICK} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="attendance_rate" fill="#8B1A2F" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rapports soumis / approuvés par mois">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.reports_by_month ?? []}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#fff' }} />
              <Bar dataKey="submitted" fill="#C9A84C" radius={[6, 6, 0, 0]} name="Soumis" />
              <Bar dataKey="approved"  fill="#34d399" radius={[6, 6, 0, 0]} name="Approuvés" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top 3 cellules les plus actives (3 derniers mois)">
        {(data.top_cells ?? []).length === 0 ? (
          <p className="text-sm text-white/50">Aucune donnée disponible.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.top_cells.map((c, i) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{c.name}</p>
                  <p className="text-xs text-white/50">{c.zone}</p>
                </div>
                <span className="text-sm font-semibold text-gold-300">
                  {c.recent_reports_count} rapport{c.recent_reports_count > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl bg-ink-900 border border-white/5 p-5">
      <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
