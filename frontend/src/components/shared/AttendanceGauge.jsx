/**
 * AttendanceGauge — demi-cercle SVG animé montrant un pourcentage de présence.
 * Couleur selon le taux : vert ≥75, jaune ≥50, rouge sinon.
 */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function AttendanceGauge({ value = 0, size = 140, label }) {
  const { t } = useTranslation()
  const resolvedLabel = label ?? t('common.attendance', 'Présence')
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (size - 16) / 2
  const circumference = Math.PI * radius
  const offset = circumference * (1 - v / 100)

  const color = v >= 75 ? '#34d399' : v >= 50 ? '#facc15' : '#f87171'

  return (
    <div className="flex flex-col items-center" aria-label={`${resolvedLabel} : ${v}%`}>
      <svg
        viewBox={`0 0 ${size} ${size / 2 + 16}`}
        width={size}
        height={size / 2 + 16}
        role="img"
      >
        <path
          d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <motion.path
          d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <text
          x="50%"
          y={size / 2 + 4}
          textAnchor="middle"
          className="fill-white font-semibold"
          style={{ fontSize: 22 }}
        >
          {v.toFixed(0)}%
        </text>
      </svg>
      <span className="text-xs text-white/50 -mt-2">{resolvedLabel}</span>
    </div>
  )
}
