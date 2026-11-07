/**
 * One icon set for the whole site (Lucide, ISC licence — https://lucide.dev).
 * Used by <Icon /> at build time and by the game script for dynamic UI
 * (toasts, weather). Only the icons listed here end up in the bundle.
 */
import {
  ArrowUp,
  BookOpen,
  Bird,
  Check,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Feather,
  Gem,
  Keyboard,
  Leaf,
  Map,
  Music,
  Moon,
  Nut,
  Palette,
  Play,
  Rainbow,
  Scroll,
  Settings,
  Shield,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  Sunrise,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  WandSparkles,
  Wind,
  X,
} from 'lucide-static';

export const ICONS = {
  acorn: Nut,
  arrowUp: ArrowUp,
  bird: Bird,
  book: BookOpen,
  check: Check,
  clear: CloudSun,
  compass: Compass,
  feather: Feather,
  gem: Gem,
  keyboard: Keyboard,
  leaf: Leaf,
  map: Map,
  music: Music,
  mist: CloudFog,
  moon: Moon,
  palette: Palette,
  play: Play,
  rain: CloudRain,
  rainbow: Rainbow,
  scroll: Scroll,
  settings: Settings,
  shield: Shield,
  snow: Snowflake,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  storm: CloudLightning,
  sunrise: Sunrise,
  swords: Swords,
  trophy: Trophy,
  volume: Volume2,
  volumeOff: VolumeX,
  wand: WandSparkles,
  wind: Wind,
  x: X,
} as const;

export type IconName = keyof typeof ICONS;

/** SVG markup for an icon, sized to 1em and coloured by currentColor. */
export function icon(name: IconName, className = ''): string {
  return ICONS[name]
    .replace(/\s(class|width|height)="[^"]*"/g, '')
    .replace('<svg', `<svg class="icon ${className}" aria-hidden="true" focusable="false"`);
}
