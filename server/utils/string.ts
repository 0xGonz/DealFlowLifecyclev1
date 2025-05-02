/**
 * Generate initials from a full name
 * @param fullName The full name to generate initials from
 * @returns The initials (usually 2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName) return "XX";
  
  const names = fullName.trim().split(' ');
  
  if (names.length === 1) {
    // For single names, take the first two characters
    return (names[0].substring(0, 2) || "X").toUpperCase();
  }
  
  // For multiple names, take the first character of the first and last names
  const firstInitial = names[0][0] || "X";
  const lastInitial = names[names.length - 1][0] || "X";
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate a random color for user avatars
 * @returns A hex color string
 */
export function generateRandomColor(): string {
  // Define a list of nice, professional colors that work well as backgrounds
  const colors = [
    "#0E4DA4", // Primary blue
    "#2563EB", // Royal blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F43F5E", // Rose
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
    "#0EA5E9", // Light blue
    "#6366F1", // Indigo
    "#3B82F6", // Blue
    "#8B5CF6", // Violet
    "#A855F7", // Purple
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
