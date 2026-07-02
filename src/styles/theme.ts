export const colors = {
  // Backgrounds
  background: '#1a1a2e',
  header: '#162436',     
  surface: '#1A2E42',    
  surfaceAlt: '#1E3448',
  border: 'rgba(255,255,255,0.08)',
  // Brand
  primary: '#fdfdfd',
  primaryDark: '#5f2f2f',
  primaryTint: 'rgba(0, 255, 213, 0.13)',
  // Text
  text: '#F5F7FA',
  textSecondary: '#8A96A3',
  // Status
  alert: '#FC5C5C',      
  warning: '#F6AD55',   
  success: '#00C9A7',    
  successAlt: '#48BB78', 
};

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
