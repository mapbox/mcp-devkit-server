import { BaseTool } from '../BaseTool.js';
import {
  CoordinateConversionSchema,
  CoordinateConversionInput
} from './CoordinateConversionTool.schema.js';

export class CoordinateConversionTool extends BaseTool<
  typeof CoordinateConversionSchema
> {
  readonly name = 'coordinate_conversion_tool';
  readonly description =
    'Converts coordinates between WGS84 (longitude/latitude) and EPSG:3857 (Web Mercator) coordinate systems';

  constructor() {
    super({ inputSchema: CoordinateConversionSchema });
  }

  protected async execute(
    input: CoordinateConversionInput
  ): Promise<{ type: 'text'; text: string }> {
    const { coordinates, from, to } = input;

    if (from === to) {
      return {
        type: 'text',
        text: JSON.stringify(
          {
            input: coordinates,
            output: coordinates,
            from,
            to,
            message: 'No conversion needed - source and target are the same'
          },
          null,
          2
        )
      };
    }

    let result: [number, number];

    if (from === 'wgs84' && to === 'epsg3857') {
      result = this.wgs84ToEpsg3857(coordinates[0], coordinates[1]);
    } else if (from === 'epsg3857' && to === 'wgs84') {
      result = this.epsg3857ToWgs84(coordinates[0], coordinates[1]);
    } else {
      throw new Error(`Unsupported conversion: ${from} to ${to}`);
    }

    return {
      type: 'text',
      text: JSON.stringify(
        {
          input: coordinates,
          output: result,
          from,
          to
        },
        null,
        2
      )
    };
  }

  /**
   * Convert WGS84 (longitude, latitude) to EPSG:3857 (Web Mercator)
   */
  private wgs84ToEpsg3857(
    longitude: number,
    latitude: number
  ): [number, number] {
    // Validate input bounds
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
    if (latitude < -85.0511 || latitude > 85.0511) {
      throw new Error(
        'Latitude must be between -85.0511 and 85.0511 degrees (Web Mercator limits)'
      );
    }

    const EARTH_RADIUS = 6378137; // Earth's radius in meters (WGS84)

    // Convert longitude to Web Mercator X
    const x = ((longitude * Math.PI) / 180) * EARTH_RADIUS;

    // Convert latitude to Web Mercator Y
    const latRad = (latitude * Math.PI) / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * EARTH_RADIUS;

    return [x, y];
  }

  /**
   * Convert EPSG:3857 (Web Mercator) to WGS84 (longitude, latitude)
   */
  private epsg3857ToWgs84(x: number, y: number): [number, number] {
    const EARTH_RADIUS = 6378137; // Earth's radius in meters (WGS84)

    // Validate input bounds
    const maxExtent = Math.PI * EARTH_RADIUS;
    if (x < -maxExtent || x > maxExtent) {
      throw new Error(
        `X coordinate ${x} is outside valid Web Mercator range [-${maxExtent}, ${maxExtent}]`
      );
    }
    if (y < -maxExtent || y > maxExtent) {
      throw new Error(
        `Y coordinate ${y} is outside valid Web Mercator range [-${maxExtent}, ${maxExtent}]`
      );
    }

    // Convert Web Mercator X to longitude
    const longitude = ((x / EARTH_RADIUS) * 180) / Math.PI;

    // Convert Web Mercator Y to latitude
    const latitude =
      ((2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180) /
      Math.PI;

    return [longitude, latitude];
  }
}
