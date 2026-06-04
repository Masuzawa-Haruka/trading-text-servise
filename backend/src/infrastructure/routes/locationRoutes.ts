import { Router } from 'express';
import { LocationController } from '../../interfaces/controllers/LocationController';
import { authenticateToken } from '../../middleware/auth';
import { GetLocationsUseCase } from '../../usecases/GetLocationsUseCase';
import { LocationRepository } from '../repositories/LocationRepository';

const router = Router();

const locationRepository = new LocationRepository();
const locationController = new LocationController(
  new GetLocationsUseCase(locationRepository),
);

router.get('/', authenticateToken, locationController.getLocations);

export default router;
