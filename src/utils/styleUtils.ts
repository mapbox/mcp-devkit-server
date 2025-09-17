/**
 * Filters out expanded Mapbox styles from imports to reduce response size.
 * This preserves the reference to the style (e.g., mapbox://styles/mapbox/standard)
 * but removes the expanded style data that causes token overflow.
 */
export function filterExpandedMapboxStyles<T>(style: T): T {
  // Create a shallow copy
  const filtered = { ...style } as T & {
    imports?: Array<{ url: string; data?: unknown }>;
  };

  // Filter out the expanded data from Mapbox style imports
  if (filtered.imports && Array.isArray(filtered.imports)) {
    filtered.imports = filtered.imports.map((importItem) => {
      // Keep the import reference but remove expanded data for Mapbox styles
      if (
        importItem.url &&
        importItem.url.startsWith('mapbox://styles/mapbox/')
      ) {
        // Return only the reference, not the expanded data
        return {
          id: (importItem as Record<string, unknown>).id,
          url: importItem.url
        };
      }
      return importItem;
    });
  }

  return filtered as T;
}
