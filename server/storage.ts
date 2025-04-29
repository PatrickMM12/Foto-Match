import {
  users, User, InsertUser,
  photographerProfiles, PhotographerProfile, InsertPhotographerProfile,
  services, Service, InsertService,
  sessions, Session, InsertSession,
  transactions, Transaction, InsertTransaction,
  reviews, Review, InsertReview,
  portfolioItems, PortfolioItem, InsertPortfolioItem,
  UserWithProfile,
  photographerServiceAreas, PhotographerServiceArea, InsertPhotographerServiceArea
} from "@shared/schema";

import { supabaseStorage } from './supabase-storage';

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getUserWithProfile(id: number): Promise<UserWithProfile | undefined>;
  getClientUsers(): Promise<User[]>;
  getAllPhotographers(): Promise<User[]>;
  
  // Photographer Profiles
  getPhotographerProfile(userId: number): Promise<PhotographerProfile | undefined>;
  createPhotographerProfile(profile: InsertPhotographerProfile): Promise<PhotographerProfile>;
  updatePhotographerProfile(userId: number, profile: Partial<InsertPhotographerProfile>): Promise<PhotographerProfile | undefined>;

  // Services
  getServices(userId: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Sessions
  getSessions(userId: number, userType: 'photographer' | 'client'): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  
  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Reviews
  getReviews(photographerId: number): Promise<Review[]>;
  getReviewsByClient(clientId: number): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Portfolio
  getPortfolioItems(userId: number): Promise<PortfolioItem[]>;
  getPortfolioItem(id: number): Promise<PortfolioItem | undefined>;
  createPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: number, item: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined>;
  deletePortfolioItem(id: number): Promise<boolean>;

  // Search
  searchPhotographers(query: string, lat?: number, lng?: number, radius?: number): Promise<UserWithProfile[]>;
  searchPhotographersByLocation(params: { city?: string, state?: string, country?: string, lat?: number, lng?: number, radius?: number, query?: string }): Promise<UserWithProfile[]>;

  // Photographer Service Areas
  getServiceAreas(userId: number): Promise<PhotographerServiceArea[]>;
  addServiceArea(area: InsertPhotographerServiceArea): Promise<PhotographerServiceArea>;
  deleteServiceArea(id: number, userId: number): Promise<boolean>;

  // Get distinct specialties
  getDistinctSpecialties(): Promise<string[]>;
}

// Exportar a implementação do Supabase como padrão
export const storage = supabaseStorage;

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private photographerProfiles: Map<number, PhotographerProfile>;
  private services: Map<number, Service>;
  private sessions: Map<number, Session>;
  private transactions: Map<number, Transaction>;
  private reviews: Map<number, Review>;
  private portfolioItems: Map<number, PortfolioItem>;
  private photographerServiceAreas: Map<number, PhotographerServiceArea>;
  currentId: {
    users: number;
    photographerProfiles: number;
    services: number;
    sessions: number;
    transactions: number;
    reviews: number;
    portfolioItems: number;
    photographerServiceAreas: number;
  };

  constructor() {
    this.users = new Map();
    this.photographerProfiles = new Map();
    this.services = new Map();
    this.sessions = new Map();
    this.transactions = new Map();
    this.reviews = new Map();
    this.portfolioItems = new Map();
    this.photographerServiceAreas = new Map();
    this.currentId = {
      users: 1,
      photographerProfiles: 1,
      services: 1,
      sessions: 1,
      transactions: 1,
      reviews: 1,
      portfolioItems: 1,
      photographerServiceAreas: 1,
    };
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserWithProfile(id: number): Promise<UserWithProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const photographerProfile = await this.getPhotographerProfile(id);
    return {
      ...user,
      photographerProfile,
    };
  }

  async getClientUsers(): Promise<User[]> {
    // Filtrar apenas usuários do tipo client
    return Array.from(this.users.values())
      .filter(user => user.userType === "client")
      .map(user => ({ ...user })); // Clone para evitar problemas de referência
  }

  async getAllPhotographers(): Promise<User[]> {
    // Filtrar apenas usuários do tipo photographer
    return Array.from(this.users.values())
      .filter(user => user.userType === "photographer")
      .map(user => ({ ...user })); // Clone para evitar problemas de referência
  }

  // Photographer Profiles
  async getPhotographerProfile(userId: number): Promise<PhotographerProfile | undefined> {
    return Array.from(this.photographerProfiles.values()).find(
      (profile) => profile.userId === userId,
    );
  }

  async createPhotographerProfile(profile: InsertPhotographerProfile): Promise<PhotographerProfile> {
    const id = this.currentId.photographerProfiles++;
    const photographerProfile: PhotographerProfile = { ...profile, id };
    this.photographerProfiles.set(id, photographerProfile);
    return photographerProfile;
  }

  async updatePhotographerProfile(userId: number, profileData: Partial<InsertPhotographerProfile>): Promise<PhotographerProfile | undefined> {
    const profile = await this.getPhotographerProfile(userId);
    if (!profile) return undefined;

    const updatedProfile = { ...profile, ...profileData };
    this.photographerProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  // Services
  async getServices(userId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.userId === userId,
    );
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.currentId.services++;
    const newService: Service = { ...service, id };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;

    const updatedService = { ...service, ...serviceData };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  // Sessions
  async getSessions(userId: number, userType: 'photographer' | 'client'): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => userType === 'photographer' 
        ? session.photographerId === userId 
        : session.clientId === userId,
    );
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.currentId.sessions++;
    const createdAt = new Date();
    const newSession: Session = { ...session, id, createdAt };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...sessionData };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId.transactions++;
    const newTransaction: Transaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Reviews
  async getReviews(photographerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.photographerId === photographerId,
    );
  }

  async getReviewsByClient(clientId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.reviewerId === clientId,
    );
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentId.reviews++;
    const createdAt = new Date();
    const newReview: Review = { ...review, id, createdAt };
    this.reviews.set(id, newReview);
    return newReview;
  }

  // Portfolio
  async getPortfolioItems(userId: number): Promise<PortfolioItem[]> {
    return Array.from(this.portfolioItems.values()).filter(
      (item) => item.userId === userId,
    );
  }

  async getPortfolioItem(id: number): Promise<PortfolioItem | undefined> {
    return this.portfolioItems.get(id);
  }

  async createPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem> {
    const id = this.currentId.portfolioItems++;
    const createdAt = new Date();
    const newItem: PortfolioItem = { ...item, id, createdAt };
    this.portfolioItems.set(id, newItem);
    return newItem;
  }

  async updatePortfolioItem(id: number, itemData: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined> {
    const item = this.portfolioItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...itemData };
    this.portfolioItems.set(id, updatedItem);
    return updatedItem;
  }

  async deletePortfolioItem(id: number): Promise<boolean> {
    return this.portfolioItems.delete(id);
  }

  // Search
  async searchPhotographers(query: string, lat?: number, lng?: number, radius: number = 50): Promise<UserWithProfile[]> {
    // NOTE: This MemStorage implementation might be basic or incomplete
    let filteredUsers = Array.from(this.users.values())
                           .filter(user => user.userType === 'photographer');

    if (query) {
        const lowerQuery = query.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(lowerQuery) || 
            user.bio?.toLowerCase().includes(lowerQuery)
            // Add search in specialties if needed (requires fetching profile)
      );
    }

    // Basic distance calculation (needs refinement for real-world use)
    if (lat !== undefined && lng !== undefined && radius > 0) {
        filteredUsers = filteredUsers.filter(user => {
            if (user.latitude && user.longitude) {
                const distance = this.calculateDistance(lat, lng, user.latitude, user.longitude);
        return distance <= radius;
            }
            return false;
      });
    }

    const resultsWithProfiles = await Promise.all(filteredUsers.map(async (user) => {
        const profile = await this.getPhotographerProfile(user.id);
        return { ...user, photographerProfile: profile };
    }));

    return resultsWithProfiles;
  }
  
  // Implementações obrigatórias pela interface IStorage, mas não funcionais em MemStorage
  async searchPhotographersByLocation(params: { city?: string, state?: string, country?: string, lat?: number, lng?: number, radius?: number, query?: string }): Promise<UserWithProfile[]> {
    throw new Error("searchPhotographersByLocation not implemented in MemStorage.");
  }

  async getServiceAreas(userId: number): Promise<PhotographerServiceArea[]> {
    throw new Error("getServiceAreas not implemented in MemStorage.");
  }

  async addServiceArea(area: InsertPhotographerServiceArea): Promise<PhotographerServiceArea> {
     throw new Error("addServiceArea not implemented in MemStorage.");
  }

  async deleteServiceArea(id: number, userId: number): Promise<boolean> {
      throw new Error("deleteServiceArea not implemented in MemStorage.");
  }

  // Helper for distance calculation (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Radius of the Earth in km
      const dLat = this.degToRad(lat2 - lat1);
      const dLon = this.degToRad(lon2 - lon1);
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in km
      return distance;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get distinct specialties
  async getDistinctSpecialties(): Promise<string[]> {
    throw new Error("getDistinctSpecialties not implemented in MemStorage.");
  }
}
