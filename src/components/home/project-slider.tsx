"use client";

/**
 * Auto-scrolling horizontal slider of project images.
 * Matches V2 Webflow hero carousel behavior.
 * Uses CSS animation (no JS) — speed adjusts by breakpoint via globals.css.
 */

const PROJECTS = [
  { client: "Adidas", title: "World Athlete Championships", category: "Marketing Assets" },
  { client: "IKEA", title: "Cooking Sessions", category: "Marketing Assets" },
  { client: "Lego", title: "Le Grand Tournoi Des Champs", category: "Marketing Assets" },
  { client: "IKEA", title: "Billythèque", category: "Marketing Assets" },
  { client: "Sony", title: "2023 BRAVIA Launch", category: "Graphic Design" },
  { client: "TikTok", title: "Ramadan 2023", category: "Marketing Assets" },
  { client: "PICO", title: "Spring 2023 Promotion", category: "Marketing Assets" },
  { client: "Air Corsica", title: "Route Launches", category: "Videos" },
] as const;

function ProjectCard({ client, title, category }: typeof PROJECTS[number]) {
  return (
    <div className="group relative w-[320px] shrink-0 overflow-hidden rounded-2xl bg-surface-elevated sm:w-[400px]">
      {/* Placeholder for project image */}
      <div className="aspect-[4/3] w-full bg-neutral-300 transition-transform duration-300 group-hover:scale-105" />
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-flame">
          {client}
        </p>
        <p className="mt-1 text-sm font-bold text-brand-black">
          {title}
        </p>
        <p className="text-xs text-neutral-500">{category}</p>
      </div>
    </div>
  );
}

export function ProjectSlider() {
  return (
    <div className="overflow-hidden">
      <div className="animate-slideshow flex gap-6">
        {PROJECTS.map((p) => (
          <ProjectCard key={`${p.client}-${p.title}`} {...p} />
        ))}
        {/* Duplicate for seamless loop */}
        {PROJECTS.map((p) => (
          <ProjectCard key={`dup-${p.client}-${p.title}`} {...p} />
        ))}
      </div>
    </div>
  );
}
