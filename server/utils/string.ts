/**
 * Generate initials from a full name
 * 
 * @param fullName Full name to generate initials from
 * @returns Initials (2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName) return 'NA';
  
  const names = fullName.trim().split(' ');
  
  if (names.length === 1) {
    // If only one name, use first two characters of that name
    return names[0].slice(0, 2).toUpperCase();
  }
  
  // Use first character of first name and first character of last name
  const firstInitial = names[0][0] || '';
  const lastInitial = names[names.length - 1][0] || '';
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate a random color for user avatars
 * 
 * @returns Hex color code
 */
export function generateRandomColor(): string {
  // Array of professional, visually appealing colors
  const colors = [
    '#0E4DA4', // Dark Blue
    '#2D87BB', // Medium Blue
    '#5E35B1', // Purple
    '#00796B', // Teal
    '#388E3C', // Green
    '#689F38', // Light Green
    '#AFB42B', // Lime Green
    '#FBC02D', // Amber
    '#FFA000', // Orange
    '#F57C00', // Dark Orange
    '#E64A19', // Deep Orange
    '#D32F2F', // Red
    '#C2185B', // Pink
    '#7B1FA2', // Purple
    '#512DA8', // Deep Purple
    '#303F9F', // Indigo
    '#0288D1', // Light Blue
    '#0097A7', // Cyan
    '#00796B', // Teal
    '#388E3C', // Green
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
