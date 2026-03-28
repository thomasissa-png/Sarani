export function StylizedAvatar({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: `${color}20` }}
    >
      {/* Stylized silhouette */}
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 w-full h-full"
        style={{ color: `${color}40` }}
        aria-hidden="true"
      >
        <circle cx="32" cy="24" r="12" fill="currentColor" />
        <ellipse cx="32" cy="56" rx="20" ry="16" fill="currentColor" />
      </svg>
      {/* Initials overlay */}
      <span className="relative z-10 text-sm font-bold" style={{ color }}>
        {initials}
      </span>
    </div>
  );
}
