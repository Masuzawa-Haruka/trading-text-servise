import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { GetLocationsUseCase } from '../../usecases/GetLocationsUseCase';

export class LocationController {
  constructor(private readonly getLocationsUseCase: GetLocationsUseCase) {}

  getLocations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '認証が必要です' });
        return;
      }

      const locations = await this.getLocationsUseCase.execute();
      res.status(200).json(locations);
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
