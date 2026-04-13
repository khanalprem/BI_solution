'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="var(--accent-red)" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-text-primary font-display text-lg font-semibold">
          Something went wrong
        </h2>
        <p className="text-text-secondary text-sm mt-2">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <button
          onClick={reset}
          className="mt-5 px-5 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
