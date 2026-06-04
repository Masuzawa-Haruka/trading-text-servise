import { LocationAreaEntity } from '../location';

export interface ILocationRepository {
  findAllAreasWithSpots(): Promise<LocationAreaEntity[]>;
}
