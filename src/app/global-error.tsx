"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#ffffff] text-[#111111] font-sans antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
            Something went wrong.
          </h1>
          <p className="mb-10 text-lg text-[#525252]">
            An unexpected error occurred. Our team has been notified.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-full bg-[#e35019] px-8 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-[#b03d1c]"
            >
              Try again
            </button>
            <a
              href="/"
              className="text-sm text-[#0bb3f0] transition-colors duration-150 hover:underline hover:underline-offset-4"
            >
              &larr; Back to homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
