// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

import { BaseStylePropertiesSchema } from '../../schemas/style.js';

export const ListStylesOutputSchema = z.array(BaseStylePropertiesSchema);

export type ListStylesOutput = z.infer<typeof ListStylesOutputSchema>;
