import Image from "next/image";

export default function ProjectNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Image
            src="/sarani-logo-white.png"
            alt="Sarani"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <a
            href="https://sarani.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            sarani.studio
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-white/10 mb-4">404</p>
          <h1 className="text-xl font-semibold mb-3">
            This project page is not available.
          </h1>
          <p className="text-sm text-white/50 mb-8">
            The link may be incorrect or the project is no longer accessible.
          </p>
          <a
            href="https://sarani.studio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-brand-flame)] text-white text-sm font-semibold hover:bg-[var(--color-brand-flame-light)] transition-colors"
          >
            Go to sarani.studio
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-white/30">
            Powered by{" "}
            <a
              href="https://sarani.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Sarani
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
