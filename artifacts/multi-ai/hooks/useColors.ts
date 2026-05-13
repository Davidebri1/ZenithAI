import colors from "@/constants/colors";

/**
 * Returns the premium dark design tokens — always dark regardless of system setting.
 * MultiAI is a dark-first product.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
