/**
 * ID generation utility
 */

/**
 * Generate a unique ID string
 * Uses random base-36 string for short, readable IDs
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
