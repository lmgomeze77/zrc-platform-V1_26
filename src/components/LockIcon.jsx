// Line-art padlock, same stroke style as the ML node glyph. Inherits the
// surrounding text color via currentColor.
export default function LockIcon({ size = 12, strokeWidth = 1.2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0, ...style }}>
      <rect x="3" y="7" width="10" height="7.5" rx="1" />
      <path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" />
      <circle cx="8" cy="10.4" r="0.9" />
      <path d="M8 11.3v1.4" />
    </svg>
  );
}
