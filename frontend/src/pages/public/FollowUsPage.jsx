/**
 * FollowUsPage — Landing "Suivez-nous" pour le QR verso des supports de table.
 */
import { useState, useEffect } from 'react'
import { Camera, Share2, Video, Music, MessageCircle, Globe, ArrowRight, HeartHandshake } from 'lucide-react'
import axios from 'axios'
import BalEnrollmentModal from './BalEnrollmentModal'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const PLATFORMS = [
  { key: 'social_instagram', label: 'Instagram',  icon: Camera,        color: '#E1306C' },
  { key: 'social_facebook',  label: 'Facebook',   icon: Share2,        color: '#1877F2' },
  { key: 'social_tiktok',    label: 'TikTok',     icon: Music,         color: '#FF0050' },
  { key: 'social_youtube',   label: 'YouTube',    icon: Video,         color: '#FF0000' },
  { key: 'social_whatsapp',  label: 'WhatsApp',   icon: MessageCircle, color: '#25D366' },
  { key: 'website_url',      label: 'Notre site', icon: Globe,         color: '#C9A961' },
]

export default function FollowUsPage() {
  const [links, setLinks] = useState({})
  const [enrollmentOpen, setEnrollmentOpen] = useState(false)

  useEffect(() => {
    axios.get(`${baseURL}/public/nwc/social-links`)
      .then((r) => setLinks(r.data.links ?? {}))
      .catch(() => {})
  }, [])

  const available = PLATFORMS.filter((p) => links[p.key])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1a0f14 60%, #0A0A0A 100%)',
      color: '#F5E6C8',
      padding: '3rem 1.5rem',
      fontFamily: '"Playfair Display", serif',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap"/>

      <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
        <img
          src="/logos/logo_newwine.png"
          alt="NWC"
          style={{ width: '96px', height: '96px', objectFit: 'contain', margin: '0 auto 1.5rem' }}
        />
        <p style={{
          fontSize: '0.85rem',
          color: '#C9A961',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          New Wine Church
        </p>
        <h1 style={{
          fontSize: '2.6rem',
          fontWeight: 700,
          margin: '0.5rem 0 0.5rem',
          fontStyle: 'italic',
          textShadow: '0 0 40px rgba(201, 169, 97, 0.4)',
        }}>
          Suivez-nous
        </h1>
        <p style={{
          color: '#F5E6C8',
          opacity: 0.7,
          fontSize: '1rem',
          marginBottom: '2.5rem',
        }}>
          Restons en contact — retrouve-nous sur tes réseaux préférés
        </p>

        {available.length === 0 ? (
          <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Liens à configurer dans l'admin.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {available.map((p) => (
              <a
                key={p.key}
                href={links[p.key]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.2rem 1.4rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(201,169,97,0.3)',
                  borderRadius: '12px',
                  color: '#F5E6C8',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                }}
              >
                <p.icon size={26} color={p.color} style={{ flexShrink: 0 }}/>
                <span style={{ flex: 1, textAlign: 'left' }}>{p.label}</span>
                <ArrowRight size={18} color="#C9A961"/>
              </a>
            ))}
          </div>
        )}

        {/* Séparateur */}
        <div style={{
          margin: '2.5rem 0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          opacity: 0.5,
        }}>
          <span style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.3)' }}/>
          <span style={{ fontSize: '0.7rem', color: '#C9A961', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            &#9733;
          </span>
          <span style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.3)' }}/>
        </div>

        {/* CTA "Rejoindre la NWC" — imposant, encadré or, pour convertir les leads du bal */}
        <button
          onClick={() => setEnrollmentOpen(true)}
          style={{
            width: '100%',
            padding: '1.4rem 1.4rem',
            background: 'linear-gradient(135deg, #8B1A2F 0%, #6b1523 100%)',
            border: '2px solid #C9A961',
            borderRadius: '14px',
            color: '#F5E6C8',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(139,26,47,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <HeartHandshake size={32} color="#C9A961" style={{ flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.7rem',
                color: '#C9A961',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}>
                Une invitation
              </div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#F5E6C8',
                fontFamily: '"Playfair Display", serif',
                fontStyle: 'italic',
              }}>
                Rejoindre la New Wine Church
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#F5E6C8',
                opacity: 0.8,
                marginTop: '0.3rem',
              }}>
                Découvrir l'église ou rejoindre un département
              </div>
            </div>
            <ArrowRight size={22} color="#C9A961"/>
          </div>
        </button>
      </div>

      <BalEnrollmentModal open={enrollmentOpen} onClose={() => setEnrollmentOpen(false)}/>
    </div>
  )
}
