import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table - base for both photographers and clients
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").unique(), // ID do usuário no Supabase Auth
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  userType: text("user_type").notNull().default("client"), // "photographer" or "client"
  phone: text("phone"),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Photographer-specific profile info
export const photographerProfiles = pgTable("photographer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  instagramUsername: text("instagram_username"),
  specialties: text("specialties").array(),
  yearsOfExperience: integer("years_of_experience"),
  equipmentDescription: text("equipment_description"),
  portfolioImages: text("portfolio_images").array(),
  availableTimes: jsonb("available_times"), // JSON object with day/time availability
});

// Service packages offered by photographers
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  duration: integer("duration").notNull(), // in minutes
  maxPhotos: integer("max_photos"),
  additionalPhotoPrice: integer("additional_photo_price"), // in cents
  active: boolean("active").notNull().default(true),
});

// Sessions/Bookings
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  photographerId: integer("photographer_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  location: text("location"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  status: text("status").notNull().default("pending"), // pending, confirmed, canceled, completed
  totalPrice: integer("total_price").notNull(), // in cents
  photosDelivered: integer("photos_delivered").default(0),
  photosIncluded: integer("photos_included").notNull(),
  additionalPhotos: integer("additional_photos").default(0),
  additionalPhotoPrice: integer("additional_photo_price"), // in cents
  paymentStatus: text("payment_status").default("pending"), // pending, partial, paid
  amountPaid: integer("amount_paid").default(0), // in cents
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => sessions.id),
  amount: integer("amount").notNull(), // in cents, negative for expenses
  description: text("description").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // income, expense
});

// Reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  photographerId: integer("photographer_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  qualityRating: integer("quality_rating").notNull(), // 1-5
  professionalismRating: integer("professionalism_rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Portfolio items (photos)
export const portfolioItems = pgTable("portfolio_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  category: text("category"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertPhotographerProfileSchema = createInsertSchema(photographerProfiles).omit({
  id: true
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true
}).extend({
  date: z.string().or(z.date()),
  additionalPhotos: z.number().optional().describe("Mapeado para additional_photos"),
  additionalPhotoPrice: z.number().optional().describe("Mapeado para additional_photo_price"),
  photosIncluded: z.number().optional().describe("Mapeado para photos_included"),
  photosDelivered: z.number().optional().describe("Mapeado para photos_delivered"),
  totalPrice: z.number().optional().describe("Mapeado para total_price"),
  paymentStatus: z.string().optional().describe("Mapeado para payment_status"),
  amountPaid: z.number().optional().describe("Mapeado para amount_paid"),
  locationLat: z.number().optional().describe("Mapeado para location_lat"),
  locationLng: z.number().optional().describe("Mapeado para location_lng")
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true
});

// Types

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect & { auth_id?: string }; // Adicionando auth_id ao tipo User

export type InsertPhotographerProfile = z.infer<typeof insertPhotographerProfileSchema>;
export type PhotographerProfile = typeof photographerProfiles.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;

// Register and Login schemas

export const userRegisterSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Type for user with full photographer profile
export type UserWithProfile = User & {
  photographerProfile?: PhotographerProfile;
};
