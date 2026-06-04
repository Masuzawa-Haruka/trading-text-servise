import { LocationArea, LocationSpot } from '@prisma/client';
import { LocationAreaEntity, LocationSpotEntity } from '../../domain/location';
import { ILocationRepository } from '../../domain/repositories/ILocationRepository';
import { prisma } from '../../lib/prisma';

type LocationAreaWithSpots = LocationArea & { spots: LocationSpot[] };

export class LocationRepository implements ILocationRepository {
  async findAllAreasWithSpots(): Promise<LocationAreaEntity[]> {
    const areas = await prisma.locationArea.findMany({
      include: {
        spots: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [
        { campus: 'asc' },
        { name: 'asc' },
      ],
    });

    return areas.map((area) => this.toAreaEntity(area));
  }

  private toAreaEntity(area: LocationAreaWithSpots): LocationAreaEntity {
    return {
      id: area.id,
      campus: area.campus,
      name: area.name,
      spots: area.spots.map((spot) => this.toSpotEntity(spot)),
      created_at: area.created_at,
      updated_at: area.updated_at,
    };
  }

  private toSpotEntity(spot: LocationSpot): LocationSpotEntity {
    return {
      id: spot.id,
      area_id: spot.area_id,
      name: spot.name,
      reference_image_url: spot.reference_image_url,
      created_at: spot.created_at,
      updated_at: spot.updated_at,
    };
  }
}
