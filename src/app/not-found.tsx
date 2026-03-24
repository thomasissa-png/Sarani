import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * 404 page — copy source: docs/copy/brand-voice.md Section 4.8
 * No humor. No "Oops!" — enterprise brand tone.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="mb-4 text-4xl font-bold text-brand-white sm:text-5xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="mb-10 text-lg text-neutral-400">
        But we do. 35 experts ready to work on your next project.
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Button variant="primary" href="/contact">
          Start a project
        </Button>
        <Link
          href="/"
          className="text-sm text-brand-cerulean transition-colors duration-150 hover:underline hover:underline-offset-4"
        >
          &larr; Back to homepage
        </Link>
      </div>
    </div>
  );
}
