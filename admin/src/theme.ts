import { createTheme } from '@mantine/core';

// Wenworks AI: black, white and grey with one orange accent; square corners; no shadows or gradients.
const SANS = '"IBM Plex Sans", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif';

export const theme = createTheme({
  primaryColor: 'ink',
  primaryShade: 9,
  colors: {
    ink: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717'],
    accent: ['#fff4ed', '#ffe6d5', '#fdcaa9', '#fba574', '#f7763d', '#ec5b13', '#dd4a0b', '#b7380b', '#922e11', '#762811'],
  },
  fontFamily: SANS,
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  headings: { fontFamily: SANS, fontWeight: '600' },
  radius: { xs: '0', sm: '0', md: '0', lg: '0', xl: '0' },
  defaultRadius: 'xs',
  shadows: { xs: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none' },
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { size: 'sm' } },
    Paper: { defaultProps: { withBorder: true, p: 'lg' } },
    Badge: { defaultProps: { radius: 'xs', variant: 'light' } },
    Table: { defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } },
    Modal: { defaultProps: { centered: true } },
  },
});
