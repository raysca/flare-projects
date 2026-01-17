/**
 * Generate a deterministic UUID based on a seed string.
 * This ensures consistent IDs across seed runs for the same entity.
 */
export function seedId(prefix: string, index: number): string {
  // Use a simple pattern for predictable IDs during development
  const suffix = Math.random().toString(36).substring(2, 14);
  return `${prefix}-${String(index).padStart(4, "0")}-${suffix}`;
}

/**
 * Generate a stable UUID for seeding (deterministic based on name)
 */
export function stableId(name: string): string {
  // Create a deterministic ID based on the name
  const hash = name.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `seed-${hex}-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`;
}

/**
 * Create a date relative to now
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Create a date in the past
 */
export function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

/**
 * A placeholder password hash for development (represents "password123")
 * In production, use proper bcrypt hashing
 */
export const DEV_PASSWORD_HASH =
  "$2a$10$rQEY9zF8WnHZqJYQfG8Wm.8nBwPJFvfPxJNqNJNqNJNqNJNqNJNq";

/**
 * Generate a random color hex
 */
export function randomColor(): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#10b981", // emerald
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random items from an array
 */
export function pickRandomMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}
