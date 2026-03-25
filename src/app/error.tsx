"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="mb-4 text-4xl font-bold text-brand-black sm:text-5xl">
        Something went wrong.
      </h1>
      <p className="mb-10 text-lg text-neutral-600">
        An unexpected error occurred. Our team has been notified.
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="text-sm text-brand-cerulean-dark transition-colors duration-150 hover:underline hover:underline-offset-4"
        >
          &larr; Back to homepage
        </Link>
      </div>
    </div>
  );
}
