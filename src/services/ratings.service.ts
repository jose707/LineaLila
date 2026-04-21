// src/services/ratings.service.ts
import api from './api.client';

export const ratingsService = {
  // Create a new rating
  submitRating: async (
    rideId: string,
    driverId: string,
    passengerId: string,
    rating: number,
    comment?: string,
    raterType: 'passenger' | 'driver' = 'passenger',
  ): Promise<any> => {
    try {
      const response = await api.post('/ratings', {
        rideId,
        driverId,
        passengerId,
        rating,
        comment: comment || null,
        raterType,
      });
      return response;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error submitting rating:', error);
      throw error;
    }
  },

  // Get ratings for a driver
  getDriverRatings: async (
    driverId: string,
    limit = 10,
    offset = 0,
  ): Promise<any> => {
    try {
      const response = await api.get(`/ratings/driver/${driverId}`, {
        params: { limit, offset },
      });
      return response;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error fetching ratings:', error);
      throw error;
    }
  },

  // Get driver's average rating
  getDriverAverageRating: async (driverId: string): Promise<any> => {
    try {
      const response = await api.get(`/ratings/driver/${driverId}/average`);
      return response;
    } catch (error: any) {
      console.error(
        '❌ [ratingsService] Error fetching average rating:',
        error,
      );
      throw error;
    }
  },

  // Get calculated rating for the authenticated user
  getMyRating: async (): Promise<{
    passengerRating: number;
    driverRating: number | null;
    driverId: string | null;
    passengerTrips: number;
    driverTrips: number;
  }> => {
    try {
      const response: any = await api.get('/ratings/me');
      return response;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error fetching my rating:', error);
      return {
        passengerRating: 5,
        driverRating: null,
        driverId: null,
        passengerTrips: 0,
        driverTrips: 0,
      };
    }
  },

  // Check if a ride already has a rating
  checkRatingExists: async (rideId: string): Promise<boolean> => {
    try {
      const response: any = await api.get(`/ratings/ride/${rideId}/exists`);
      return response.exists;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error checking rating:', error);
      return false;
    }
  },
};
