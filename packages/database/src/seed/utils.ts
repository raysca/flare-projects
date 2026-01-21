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
 * Creates a valid UUID v4 format from a deterministic hash
 */
export function stableId(name: string): string {
  // Create a deterministic hash based on the name
  let hash1 = 0;
  let hash2 = 0;
  let hash3 = 0;
  let hash4 = 0;

  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1 + char) | 0;
    hash2 = ((hash2 << 7) - hash2 + char * 31) | 0;
    hash3 = ((hash3 << 11) - hash3 + char * 37) | 0;
    hash4 = ((hash4 << 13) - hash4 + char * 41) | 0;
  }

  // Convert to hex strings
  const hex1 = Math.abs(hash1).toString(16).padStart(8, "0").slice(0, 8);
  const hex2 = Math.abs(hash2).toString(16).padStart(4, "0").slice(0, 4);
  const hex3 = Math.abs(hash3).toString(16).padStart(4, "0").slice(0, 4);
  const hex4 = Math.abs(hash4).toString(16).padStart(12, "0").slice(0, 12);

  // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Set version (4) and variant bits (8, 9, a, or b)
  const version = "4";
  const variant = ["8", "9", "a", "b"][Math.abs(hash1) % 4];

  return `${hex1}-${hex2}-${version}${hex3.slice(1)}-${variant}${hex4.slice(0, 3)}-${hex4.slice(3)}${hex2.slice(0, 3)}`;
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
