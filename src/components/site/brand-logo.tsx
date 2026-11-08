/**
 * SABKA AI logo. Transparent PNGs in /public/brand so the mark sits directly on the page.
 * `dark` variants recolour the logo's black and navy parts to off-white for dark backgrounds
 * (red and yellow are unchanged), so the same logo reads on the header, footer and light pages.
 */
export function BrandLogo({
  tone = 'dark',
  height = 52,
  variant = 'lockup',
}: {
  /** The background the logo sits on. */
  tone?: 'dark' | 'light';
  height?: number;
  variant?: 'lockup' | 'mark' | 'full';
}) {
  const ratio = variant === 'mark' ? 256 / 356 : 612 / 356;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static brand asset
    <img
      src={`/brand/${variant}-${tone}.png`}
      alt="SABKA AI"
      height={height}
      width={Math.round(height * ratio)}
      style={{ height, width: 'auto' }}
      className="block select-none"
      draggable={false}
    />
  );
}
