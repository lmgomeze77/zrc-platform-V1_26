// Shared ZRC palette as CSS custom properties (see theme.css). Values are
// `var(...)` strings so they work in inline styles and switch with the
// active theme. For translucent variants use `alpha(C.gold, 0.3)`, never
// hex-suffix concatenation (`${C.gold}44`), which breaks on var().
export const C = {
  bg: "var(--zrc-bg)", surface: "var(--zrc-surface)", surface2: "var(--zrc-surface2)", surface3: "var(--zrc-surface3)",
  border: "var(--zrc-border)", borderHover: "var(--zrc-border-hover)",
  text: "var(--zrc-text)", textSec: "var(--zrc-text-sec)", textMuted: "var(--zrc-text-muted)",
  gold: "var(--zrc-gold)", goldHover: "var(--zrc-gold-hover)", goldDim: "var(--zrc-gold-dim)", goldBorder: "var(--zrc-gold-border)",
  onGold: "var(--zrc-on-gold)",
  red: "var(--zrc-red)", green: "var(--zrc-green)", blue: "var(--zrc-blue)", amber: "var(--zrc-amber)", violet: "var(--zrc-violet)",
};

export const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

const THEME_KEY = "zrc-theme";
export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}
export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
}
