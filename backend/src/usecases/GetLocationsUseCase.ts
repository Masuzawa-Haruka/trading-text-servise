import { LocationAreaEntity } from '../domain/location';
import { ILocationRepository } from '../domain/repositories/ILocationRepository';

export class GetLocationsUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(): Promise<LocationAreaEntity[]> {
    return await this.locationRepository.findAllAreasWithSpots();
  }
}
