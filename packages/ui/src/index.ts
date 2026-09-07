/** Design tokens from landing/app specs — components arrive in O16. */
export const tokens = {
  canvas: '#F6F5F0',
  surface: '#FFFFFF',
  text: '#102E33',
  muted: '#52666A',
  action: '#087F75',
  eurc: '#4267C8',
  softHighlight: '#C9E8DD',
  border: '#D7DFDA',
  warning: '#8A5700',
  critical: '#B42318',
  sidebarWidthPx: 224,
  topBarHeightPx: 64,
} as const;

export type PairbandTokens = typeof tokens;
