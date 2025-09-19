/**
 * Filters out expanded Mapbox styles from imports to reduce response size.
 * This preserves the reference to the style (e.g., mapbox://styles/mapbox/standard)
 * and any configuration settings, but removes the expanded style data that causes token overflow.
 *
 * Preserved properties:
 * - id: The import identifier
 * - url: The Mapbox style URL reference
 * - config: Standard style configuration (colors, visibility, themes, etc.)
 */
export function filterExpandedMapboxStyles<T>(style: T): T {
  // Create a shallow copy
  const filtered = { ...style } as T & {
    imports?: Array<{
      id?: unknown;
      url: string;
      data?: unknown;
      config?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
  };

  // Filter out the expanded data from Mapbox style imports
  if (filtered.imports && Array.isArray(filtered.imports)) {
    filtered.imports = filtered.imports.map((importItem) => {
      // Keep the import reference but remove expanded data for Mapbox styles
      if (
        importItem.url &&
        importItem.url.startsWith('mapbox://styles/mapbox/')
      ) {
        // Preserve the essential properties including config for Standard style customization
        const result: {
          id?: unknown;
          url: string;
          config?: Record<string, unknown>;
          [key: string]: unknown;
        } = {
          id: importItem.id,
          url: importItem.url
        };

        // IMPORTANT: Preserve the config property which contains Standard style configuration
        // This includes visibility settings, color overrides, themes, etc.
        if (importItem.config) {
          result.config = importItem.config;
        }

        return result;
      }
      return importItem;
    });
  }

  return filtered as T;
}
