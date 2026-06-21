// Central design tokens for the Smart Parking MMU app.
// Mirrors the navy / electric-teal visual language from the approved UI mockup.
// Import `colors` for backward compatibility with existing screens, or the
// richer `theme` object for the new tokens (radii, spacing, typography).

export const colors = {
  // Backgrounds
  background: '#0D1B2A', // deep navy (was #1a1a2e)
  header: '#162436',     // navyMid
  surface: '#1A2E42',    // card
  surfaceAlt: '#1E3448', // navyLt — inputs, chips
  border: 'rgba(255,255,255,0.08)',

  // Brand
  primary: '#00C9A7',    // electric teal (was #4fc3f7)
  primaryDark: '#00A88B',
  primaryTint: 'rgba(0,201,167,0.13)',

  // Text
  text: '#F5F7FA',
  textSecondary: '#8A96A3',

  // Status
  alert: '#FC5C5C',      // red
  warning: '#F6AD55',    // amber
  success: '#00C9A7',    // reuse teal for "available" to match mockup
  successAlt: '#48BB78', // alt green where red/teal/green trio is needed
};

// Role accent colors — used for badges and the live-status banner on Home
export const roleColors: Record<
  string,
  { bg: string; accent: string; label: string }
> = {
  Student: { bg: '#1A3A5C', accent: '#60A5FA', label: '#93C5FD' },
  Staff:   { bg: '#1A3D2E', accent: '#34D399', label: '#6EE7B7' },
  Visitor: { bg: '#3D2A1A', accent: '#FBBF24', label: '#FDE68A' },
  Admin:   { bg: '#2D1A3D', accent: '#A78BFA', label: '#C4B5FD' },
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const theme = { colors, roleColors, radii, spacing, shadow };
