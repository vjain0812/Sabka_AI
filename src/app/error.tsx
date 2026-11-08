'use client';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="card empty-state" role="alert">
      <h1>That didn’t load as expected.</h1>
      <p>Your tab’s saved brief has not been intentionally changed. Try again or return home.</p>
      <div className="button-row">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="button button-secondary" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
