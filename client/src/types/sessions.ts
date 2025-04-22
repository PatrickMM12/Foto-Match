export interface Session {
  id: number;
  title: string;
  clientName?: string; // Nome do cliente (pode vir da API)
  photographerId: number;
  clientId: number;
  serviceId?: number; // Pode ser útil
  date: string; // ISO 8601 string date
  duration: number; // Em minutos
  location?: string;
  status: string; // ex: 'pending', 'confirmed', 'completed', 'canceled'
  paymentStatus: string; // ex: 'pending', 'partial', 'paid'
  totalPrice: number; // Em centavos
  amountPaid: number; // Em centavos
  photosIncluded?: number;
  photosDelivered?: number;
  additionalPhotos?: number;
  additionalPhotoPrice?: number; // Em centavos
  description?: string;
  createdAt?: string;
} 