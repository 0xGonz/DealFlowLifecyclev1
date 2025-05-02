/**
 * Generate initials from a full name
 * @param fullName The full name to generate initials from
 * @returns The initials (up to 2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName) return "";
  
  // Split the name by spaces and filter out empty strings
  const nameParts = fullName.split(" ").filter(part => part.length > 0);
  
  if (nameParts.length === 0) return "";
  
  if (nameParts.length === 1) {
    // If there's only one part, take the first character
    return nameParts[0].charAt(0).toUpperCase();
  } else {
    // Take the first character of the first and last parts
    const firstInitial = nameParts[0].charAt(0).toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }
}
