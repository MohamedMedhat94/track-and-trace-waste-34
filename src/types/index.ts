export interface Company {
  id: string;
  name: string;
  phone: string;
  fax?: string;
  address: string;
  taxId: string;
  commercialRegistration: string;
  licenseNo: string;
  unionMembershipNo?: string;
  registeredActivity: string;
  facilityRegistrationNumber: string;
  environmentalApproval?: string; // For transporters
  operatingLicense?: string; // For transporters
  type: 'generator' | 'transporter' | 'recycler';
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  transporterCompanyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteType {
  id: string;
  name: string;
  description?: string;
  category: string;
  hazardLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface Shipment {
  id: string;
  generatorCompanyId: string;
  transporterCompanyId: string;
  recyclerCompanyId: string;
  driverId: string;
  wasteTypeId: string;
  quantity: number;
  unit: string;
  description?: string;
  
  // Timestamps
  createdAt: Date;
  departureTime?: Date;
  arrivalTime?: Date;
  sortingStartTime?: Date;
  sortingEndTime?: Date;
  recyclingStartTime?: Date;
  recyclingEndTime?: Date;
  completedAt?: Date;
  
  // Status and stages
  status: 'created' | 'in_transit' | 'delivered' | 'sorting' | 'recycling' | 'completed';
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  
  // Reports
  disposalReport?: string;
  recyclingReport?: string;
  finalReport?: string;
  
  updatedAt: Date;
}

export interface ShipmentStage {
  id: string;
  shipmentId: string;
  stage: 'departure' | 'arrival' | 'sorting_start' | 'sorting_end' | 'recycling_start' | 'recycling_end' | 'completed';
  timestamp: Date;
  userId: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}