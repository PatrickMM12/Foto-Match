import { apiRequest } from './queryClient';

// User APIs
export const getUserProfile = async () => {
  const res = await apiRequest('GET', '/api/users/me', undefined);
  return await res.json();
};

export const updateUserProfile = async (data: any) => {
  const res = await apiRequest('PATCH', '/api/users/me', data);
  return await res.json();
};

// Photographer APIs
export const getPhotographerProfile = async () => {
  const res = await apiRequest('GET', '/api/photographers/profile', undefined);
  return await res.json();
};

export const updatePhotographerProfile = async (data: any) => {
  const res = await apiRequest('PATCH', '/api/photographers/profile', data);
  return await res.json();
};

export const getPhotographerById = async (id: number) => {
  const res = await apiRequest('GET', `/api/users/${id}`, undefined);
  return await res.json();
};

// Services APIs
export const getServices = async () => {
  const res = await apiRequest('GET', '/api/services', undefined);
  return await res.json();
};

export const createService = async (data: any) => {
  const res = await apiRequest('POST', '/api/services', data);
  return await res.json();
};

export const updateService = async (id: number, data: any) => {
  const res = await apiRequest('PATCH', `/api/services/${id}`, data);
  return await res.json();
};

export const deleteService = async (id: number) => {
  await apiRequest('DELETE', `/api/services/${id}`, undefined);
  return true;
};

// Sessions APIs
export const getSessions = async () => {
  const res = await apiRequest('GET', '/api/sessions', undefined);
  return await res.json();
};

export const createSession = async (data: any) => {
  const res = await apiRequest('POST', '/api/sessions', data);
  return await res.json();
};

export const updateSession = async (id: number, data: any) => {
  const res = await apiRequest('PATCH', `/api/sessions/${id}`, data);
  return await res.json();
};

// Transactions APIs
export const getTransactions = async () => {
  const res = await apiRequest('GET', '/api/transactions', undefined);
  return await res.json();
};

export const createTransaction = async (data: any) => {
  const res = await apiRequest('POST', '/api/transactions', data);
  return await res.json();
};

export const updateTransaction = async (id: number, data: any) => {
  const res = await apiRequest('PATCH', `/api/transactions/${id}`, data);
  return await res.json();
};

export const deleteTransaction = async (id: number) => {
  await apiRequest('DELETE', `/api/transactions/${id}`, undefined);
  return true;
};

// Portfolio APIs
export const getPortfolioItems = async (userId: number) => {
  const res = await apiRequest('GET', `/api/portfolio/${userId}`, undefined);
  return await res.json();
};

export const createPortfolioItem = async (data: any) => {
  const res = await apiRequest('POST', '/api/portfolio', data);
  return await res.json();
};

export const updatePortfolioItem = async (id: number, data: any) => {
  const res = await apiRequest('PATCH', `/api/portfolio/${id}`, data);
  return await res.json();
};

export const deletePortfolioItem = async (id: number) => {
  await apiRequest('DELETE', `/api/portfolio/${id}`, undefined);
  return true;
};

// Reviews APIs
export const getPhotographerReviews = async (photographerId: number) => {
  const res = await apiRequest('GET', `/api/reviews/photographer/${photographerId}`, undefined);
  return await res.json();
};

export const createReview = async (data: any) => {
  const res = await apiRequest('POST', '/api/reviews', data);
  return await res.json();
};

// Search APIs
export const searchPhotographers = async (params: {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params.query) queryParams.append('query', params.query);
  if (params.lat) queryParams.append('lat', params.lat.toString());
  if (params.lng) queryParams.append('lng', params.lng.toString());
  if (params.radius) queryParams.append('radius', params.radius.toString());
  
  const res = await apiRequest('GET', `/api/search/photographers?${queryParams.toString()}`, undefined);
  return await res.json();
};
