export interface Branch {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters
  createdAt: Date;
}
