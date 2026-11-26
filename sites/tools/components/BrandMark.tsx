/** Wenworks AI mark: three rising bars on a base line, square-cornered like the
 *  rest of the site. Used in the Curator sidebar. Keep in sync with app/icon.svg. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="brand-mark">
      <rect width="32" height="32" fill="currentColor" />
      <g className="brand-mark-bars">
        <rect x="6" y="20" width="5" height="6" />
        <rect x="13.5" y="13" width="5" height="13" />
        <rect x="21" y="7" width="5" height="19" />
        <rect x="6" y="26.5" width="20" height="1.5" />
      </g>
    </svg>
  );
}
