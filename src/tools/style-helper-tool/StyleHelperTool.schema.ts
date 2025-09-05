import { z } from 'zod';

export const StyleHelperToolSchema = z.object({
  step: z
    .enum(['start', 'features', 'colors', 'generate'])
    .optional()
    .describe('Current step in the wizard'),
  name: z.string().optional().describe('Name for the style'),
  // Feature toggles
  show_pois: z.boolean().optional().describe('Show POI labels'),
  show_road_labels: z.boolean().optional().describe('Show road labels'),
  show_place_labels: z.boolean().optional().describe('Show city/town labels'),
  show_transit: z.boolean().optional().describe('Show transit features'),
  show_buildings: z.boolean().optional().describe('Show buildings'),
  show_parks: z.boolean().optional().describe('Show parks and green spaces'),
  // Colors
  road_color: z.string().optional().describe('Road color (hex)'),
  water_color: z.string().optional().describe('Water color (hex)'),
  building_color: z.string().optional().describe('Building color (hex)'),
  land_color: z.string().optional().describe('Land/background color (hex)'),
  park_color: z.string().optional().describe('Park color (hex)'),
  label_color: z.string().optional().describe('Label text color (hex)')
});

export type StyleHelperToolInput = z.infer<typeof StyleHelperToolSchema>;
