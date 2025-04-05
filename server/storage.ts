import {
  users, User, InsertUser,
  photographerProfiles, PhotographerProfile, InsertPhotographerProfile,
  services, Service, InsertService,
  sessions, Session, InsertSession,
  transactions, Transaction, InsertTransaction,
  reviews, Review, InsertReview,
  portfolioItems, PortfolioItem, InsertPortfolioItem,
  UserWithProfile
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getUserWithProfile(id: number): Promise<UserWithProfile | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private photographerProfiles: Map<number, PhotographerProfile>;
  private services: Map<number, Service>;
  private sessions: Map<number, Session>;
  private transactions: Map<number, Transaction>;
  private reviews: Map<number, Review>;
  private portfolioItems: Map<number, PortfolioItem>;
  currentId: {
    users: number;
    photographerProfiles: number;
    services: number;
    sessions: number;
    transactions: number;
    reviews: number;
    portfolioItems: number;
  };

  constructor() {
    this.users = new Map();
    this.photographerProfiles = new Map();
    this.services = new Map();
    this.sessions = new Map();
    this.transactions = new Map();
    this.reviews = new Map();
    this.portfolioItems = new Map();
    this.currentId = {
      users: 1,
      photographerProfiles: 1,
      services: 1,
      sessions: 1,
      transactions: 1,
      reviews: 1,
      portfolioItems: 1,
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

  // Search photographers
  async searchPhotographers(query: string, lat?: number, lng?: number, radius: number = 50): Promise<UserWithProfile[]> {
    // Get all users that are photographers
    const photographers = Array.from(this.users.values()).filter(
      (user) => user.userType === "photographer"
    );

    // Filter by query if provided
    let results = photographers;
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(
        (user) => 
          user.name.toLowerCase().includes(queryLower) ||
          (user.bio && user.bio.toLowerCase().includes(queryLower)) ||
          (user.location && user.location.toLowerCase().includes(queryLower))
      );
    }

    // Calculate distance if lat/lng provided
    if (lat && lng) {
      results = results.filter(user => {
        if (!user.latitude || !user.longitude) return false;
        
        // Rough distance calculation using Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = this.degToRad(user.latitude - lat);
        const dLng = this.degToRad(user.longitude - lng);
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.degToRad(lat)) * Math.cos(this.degToRad(user.latitude)) * 
          Math.sin(dLng/2) * Math.sin(dLng/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const distance = R * c;
        
        return distance <= radius;
      });
    }

    // Fetch photographer profiles for all results
    const resultsWithProfiles = await Promise.all(
      results.map(async (user) => {
        const profile = await this.getPhotographerProfile(user.id);
        return { ...user, photographerProfile: profile };
      })
    );

    return resultsWithProfiles;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const storage = new MemStorage();
