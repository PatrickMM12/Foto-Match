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

// Photographer service areas
export const photographerServiceAreas = pgTable("photographer_service_areas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
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

export const insertSessionSchema = z.object({
  photographerId: z.number(),
  clientId: z.number(),
  serviceId: z.number().optional(),
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]),
  duration: z.number().min(1, "Duração deve ser pelo menos 1 minuto"),
  location: z.string().min(3, "Local deve ter pelo menos 3 caracteres"),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  status: z.enum(["pending", "confirmed", "completed", "canceled"]).default("pending"),
  totalPrice: z.coerce.number().min(0, "Preço total não pode ser negativo"),
  photosIncluded: z.number().min(0, "Número de fotos incluídas não pode ser negativo"),
  photosDelivered: z.number().min(0, "Número de fotos entregues não pode ser negativo").optional().default(0),
  additionalPhotos: z.number().min(0, "Número de fotos adicionais não pode ser negativo").optional().default(0),
  additionalPhotoPrice: z.coerce.number().min(0, "Preço de fotos adicionais não pode ser negativo").optional().default(0),
  paymentStatus: z.enum(["pending", "partial", "paid"]).optional().default("pending"),
  amountPaid: z.coerce.number().min(0, "Valor pago não pode ser negativo").optional().default(0),
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({
    id: true
  })
  .extend({
    date: z.union([z.string(), z.date()]),
  });

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true
});

export const insertPhotographerServiceAreaSchema = createInsertSchema(photographerServiceAreas).omit({
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

export type InsertPhotographerServiceArea = z.infer<typeof insertPhotographerServiceAreaSchema>;
export type PhotographerServiceArea = typeof photographerServiceAreas.$inferSelect;

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
