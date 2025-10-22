import { z } from 'zod';

export const GetMapboxDocSourceSchema = z.object({});

export type GetMapboxDocSourceInput = z.infer<typeof GetMapboxDocSourceSchema>;
