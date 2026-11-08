import Link from 'next/link';
import { ArrowRight, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'teal' | 'amber';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}
export function Note({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="note">
      <Info size={19} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={`button ${secondary ? 'button-secondary' : ''}`}>
      {children}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function EmptyState({
  title,
  children,
  href = '/onboarding',
  action = 'Tell us about your business',
}: {
  title: string;
  children: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <section className="card empty-state">
      <span className="icon-tile">
        <CircleCheck aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <ActionLink href={href}>{action}</ActionLink>
    </section>
  );
}
export function LoadingState() {
  return (
    <div className="card loading-state" role="status">
      <span className="loading-dot" />
      Opening your workspace…
    </div>
  );
}
