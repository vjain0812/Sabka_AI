import logos from '@/lib/domain/logo-manifest.json';

/** Self-hosted product logo (identification only, no endorsement), with a monogram fallback. */
const palettes = [
  ['#111111', '#ffd200'],
  ['#e21833', '#ffffff'],
  ['#ffd200', '#111111'],
  ['#2b2b2b', '#ffffff'],
  ['#fff4bf', '#3d3200'],
];
const manifest = logos as Record<string, string>;
export function logoFor(website?: string | null) {
  if (!website) return null;
  try {
    return manifest[new URL(website).hostname.replace(/^www\./, '')] ?? null;
  } catch {
    return null;
  }
}
export function ToolMark({
  name,
  website,
  size = 'md',
}: {
  name: string;
  website?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims =
    size === 'sm'
      ? 'h-8 w-8 rounded-[10px] text-xs'
      : size === 'lg'
      ? 'h-14 w-14 rounded-[16px] text-xl'
      : 'h-11 w-11 rounded-[13px] text-base';
  const img = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7';
  const logo = logoFor(website);
  if (logo)
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center border border-[#ececec] bg-white shadow-[0_6px_16px_rgba(0,0,0,.08)] ${dims}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icons, no optimizer needed */}
        <img
          src={logo}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className={`${img} object-contain`}
        />
      </span>
    );
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const [bg, fg] = palettes[hash % palettes.length];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-bold tracking-[-0.04em] shadow-[0_6px_16px_rgba(0,0,0,.12)] ${dims}`}
      style={{ background: bg, color: fg }}
    >
      {name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2)}
    </span>
  );
}
