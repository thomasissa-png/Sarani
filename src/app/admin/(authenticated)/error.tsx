"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-bold text-brand-black mb-2">
        Something went wrong
      </h2>
      <p className="text-neutral-500 text-sm mb-6 max-w-md">
        {error.message === "DATABASE_URL environment variable is required"
          ? "Database connection is not configured. Please set DATABASE_URL in your environment variables."
          : "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
