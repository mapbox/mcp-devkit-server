// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const GetMapboxDocSourceSchema = z.object({});

export type GetMapboxDocSourceInput = z.infer<typeof GetMapboxDocSourceSchema>;
