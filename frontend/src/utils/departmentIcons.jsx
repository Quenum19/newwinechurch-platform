/**
 * Mapping kebab-case (BDD) → composant Lucide React.
 *
 * Liste d'icônes adaptées aux 39+ départements de NWC.
 * Chaque entrée est statiquement importée pour bénéficier du tree-shaking.
 *
 * Usage :
 *   <DepartmentIcon name="book-open" size={24} />
 */
import {
  Activity, Banknote, Baby, BookOpen, Book, Camera, Compass, CircleDashed,
  Crown, Film, Flame, GraduationCap, HandHeart, Heart, HeartHandshake, Home,
  HousePlus, Map, MessageCircle, Mic, Megaphone, Music, Package, Palette,
  PlusSquare, Scissors, Share2, Shield, Sofa, Sparkles, Speaker, Star,
  User, UserCircle, Users, Users2, Utensils, Video, Wifi,
} from 'lucide-react'

const REGISTRY = {
  'activity':         Activity,
  'banknote':         Banknote,
  'baby':             Baby,
  'book':             Book,
  'book-open':        BookOpen,
  'camera':           Camera,
  'compass':          Compass,
  'circle-dashed':    CircleDashed,
  'crown':            Crown,
  'film':             Film,
  'flame':            Flame,
  'graduation-cap':   GraduationCap,
  'hand-shake':       HandHeart,        // accueil — alternative à HandShake
  'heart':            Heart,
  'heart-handshake':  HeartHandshake,
  'home':             Home,
  'home-heart':       HousePlus,        // famille / cellules maison
  'map':              Map,
  'message-circle':   MessageCircle,
  'mic':              Mic,
  'megaphone':        Megaphone,
  'music':            Music,
  'package':          Package,
  'palette':          Palette,
  'plus-square':      PlusSquare,
  'scissors':         Scissors,
  'share':            Share2,
  'shield':           Shield,
  'sofa':             Sofa,
  'sparkles':         Sparkles,
  'speaker':          Speaker,
  'star':             Star,
  'user':             User,
  'user-circle':      UserCircle,
  'users':            Users,
  'users-2':          Users2,
  'utensils':         Utensils,
  'video':            Video,
  'wifi':             Wifi,
}

/** Récupère le composant icône — fallback Sparkles. */
export function getDepartmentIcon(name) {
  return REGISTRY[name] ?? Sparkles
}

/** Composant prêt-à-rendre. */
export default function DepartmentIcon({ name, ...rest }) {
  const Icon = getDepartmentIcon(name)
  return <Icon {...rest} />
}
