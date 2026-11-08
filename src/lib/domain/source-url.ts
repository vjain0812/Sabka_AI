import ipaddr from 'ipaddr.js';

const restrictedReviews = ['reddit.com', 'trustpilot.com', 'g2.com'];
export function isPublicAddress(address: string) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === 'unicast';
  } catch {
    return false;
  }
}
export function safeSourceUrl(raw: string): string {
  const u = new URL(raw);
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    host.endsWith('.') ||
    !host.includes('.') ||
    /(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new Error('Only public HTTPS source URLs are allowed.');
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
  return u.toString();
}
export function isRestrictedReviewUrl(raw: string) {
  const host = new URL(raw).hostname.toLowerCase();
  return restrictedReviews.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
