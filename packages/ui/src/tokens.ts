/** Design tokens from landing.md / app-ui.md — authoritative visual system. */
export const tokens = {
  canvas: "#F6F5F0",
  surface: "#FFFFFF",
  text: "#102E33",
  muted: "#52666A",
  action: "#087F75",
  eurc: "#4267C8",
  softHighlight: "#C9E8DD",
  border: "#D7DFDA",
  warning: "#8A5700",
  critical: "#B42318",
  sidebarWidthPx: 224,
  topBarHeightPx: 64,
  radiusField: 12,
  radiusCard: 20,
  radiusBadge: 999,
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    8: 64,
    9: 96,
  },
  fonts: {
    heading: '"Manrope", "Segoe UI", sans-serif',
    body: '"Inter", "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
} as const;

export type PairbandTokens = typeof tokens;

export function tokensAsCssVariables(t: PairbandTokens = tokens): Record<string, string> {
  return {
    "--pb-canvas": t.canvas,
    "--pb-surface": t.surface,
    "--pb-text": t.text,
    "--pb-muted": t.muted,
    "--pb-action": t.action,
    "--pb-eurc": t.eurc,
    "--pb-soft": t.softHighlight,
    "--pb-border": t.border,
    "--pb-warning": t.warning,
    "--pb-critical": t.critical,
    "--pb-sidebar": `${t.sidebarWidthPx}px`,
    "--pb-topbar": `${t.topBarHeightPx}px`,
    "--font-display": t.fonts.heading,
    "--font-body": t.fonts.body,
    "--font-mono": t.fonts.mono,
  };
}
