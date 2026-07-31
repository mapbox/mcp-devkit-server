// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const styleIdSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Invalid Mapbox style ID (only lowercase letters, numbers, and hyphens allowed)'
  )
  .describe('Mapbox style ID');
