import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { userRegisterSchema, userLoginSchema, insertPhotographerProfileSchema, insertServiceSchema, insertSessionSchema, insertTransactionSchema, insertReviewSchema, insertPortfolioItemSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "foto-connect-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Set up passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Helper function to validate user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = userRegisterSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // If registering as a photographer, create empty profile
      if (validatedData.userType === "photographer") {
        await storage.createPhotographerProfile({
          userId: user.id,
          specialties: [],
          portfolioImages: [],
          availableTimes: {},
        });
      }

      // Login the user automatically after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login after registration" });
        }
        return res.status(201).json({ user: { ...user, password: undefined } });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      userLoginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({ user: { ...user, password: undefined } });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({ user: { ...user, password: undefined } });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // User routes
  app.get("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userWithProfile = await storage.getUserWithProfile(user.id);
      res.json({ ...userWithProfile, password: undefined });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  app.patch("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const updatedUser = await storage.updateUser(user.id, req.body);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Photographer profile routes
  app.get("/api/photographers/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const profile = await storage.getPhotographerProfile(user.id);
      if (!profile) {
        return res.status(404).json({ message: "Photographer profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching photographer profile:", error);
      res.status(500).json({ message: "Error fetching photographer profile" });
    }
  });

  app.patch("/api/photographers/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const validatedData = insertPhotographerProfileSchema.partial().parse(req.body);
      
      // Check if profile exists
      const existingProfile = await storage.getPhotographerProfile(user.id);
      if (!existingProfile) {
        // Create profile if it doesn't exist
        const newProfile = await storage.createPhotographerProfile({
          userId: user.id,
          ...validatedData,
          specialties: validatedData.specialties || [],
          portfolioImages: validatedData.portfolioImages || [],
          availableTimes: validatedData.availableTimes || {},
        });
        return res.json(newProfile);
      }
      
      // Update existing profile
      const updatedProfile = await storage.updatePhotographerProfile(user.id, validatedData);
      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating photographer profile:", error);
      res.status(500).json({ message: "Error updating photographer profile" });
    }
  });

  // Service routes
  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const services = await storage.getServices(user.id);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const validatedData = insertServiceSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Error creating service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const serviceId = parseInt(req.params.id);
      
      // Check if service exists and belongs to user
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      if (service.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to update this service" });
      }
      
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const updatedService = await storage.updateService(serviceId, validatedData);
      res.json(updatedService);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Error updating service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const serviceId = parseInt(req.params.id);
      
      // Check if service exists and belongs to user
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      if (service.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this service" });
      }
      
      await storage.deleteService(serviceId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Error deleting service" });
    }
  });

  // Session routes
  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userType = user.userType as 'photographer' | 'client';
      
      const sessions = await storage.getSessions(user.id, userType);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Error fetching sessions" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only clients can create session requests
      if (user.userType !== "client") {
        return res.status(403).json({ message: "Only clients can create session requests" });
      }
      
      const validatedData = insertSessionSchema.parse({
        ...req.body,
        clientId: user.id,
        status: "pending",
      });
      
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Error creating session" });
    }
  });

  app.patch("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const sessionId = parseInt(req.params.id);
      
      // Check if session exists
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check permissions
      if (session.photographerId !== user.id && session.clientId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to update this session" });
      }
      
      // Photographers can update status and delivery details
      // Clients can update only certain fields (like payment status)
      const validatedData = insertSessionSchema.partial().parse(req.body);
      
      // Apply restrictions based on user type
      let updateData = validatedData;
      if (user.userType === "client") {
        // Clients can only update limited fields
        const { paymentStatus, amountPaid } = validatedData;
        updateData = { paymentStatus, amountPaid };
      }
      
      const updatedSession = await storage.updateSession(sessionId, updateData);
      res.json(updatedSession);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Error updating session" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const transactions = await storage.getTransactions(user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Error creating transaction" });
    }
  });

  app.patch("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const transactionId = parseInt(req.params.id);
      
      // Check if transaction exists and belongs to user
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to update this transaction" });
      }
      
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const updatedTransaction = await storage.updateTransaction(transactionId, validatedData);
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Error updating transaction" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const transactionId = parseInt(req.params.id);
      
      // Check if transaction exists and belongs to user
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this transaction" });
      }
      
      await storage.deleteTransaction(transactionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Error deleting transaction" });
    }
  });

  // Review routes
  app.get("/api/reviews/photographer/:id", async (req, res) => {
    try {
      const photographerId = parseInt(req.params.id);
      const reviews = await storage.getReviews(photographerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "client") {
        return res.status(403).json({ message: "Only clients can create reviews" });
      }
      
      const validatedData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: user.id,
      });
      
      // Check if session exists and belongs to user
      const session = await storage.getSession(validatedData.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.clientId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to review this session" });
      }
      
      // Check if session is completed
      if (session.status !== "completed") {
        return res.status(400).json({ message: "Can only review completed sessions" });
      }
      
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Error creating review" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const portfolioItems = await storage.getPortfolioItems(userId);
      res.json(portfolioItems);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Error fetching portfolio" });
    }
  });

  app.post("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Only photographers can manage portfolio" });
      }
      
      const validatedData = insertPortfolioItemSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const portfolioItem = await storage.createPortfolioItem(validatedData);
      res.status(201).json(portfolioItem);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating portfolio item:", error);
      res.status(500).json({ message: "Error creating portfolio item" });
    }
  });

  app.patch("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const itemId = parseInt(req.params.id);
      
      // Check if item exists and belongs to user
      const item = await storage.getPortfolioItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Portfolio item not found" });
      }
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to update this item" });
      }
      
      const validatedData = insertPortfolioItemSchema.partial().parse(req.body);
      const updatedItem = await storage.updatePortfolioItem(itemId, validatedData);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating portfolio item:", error);
      res.status(500).json({ message: "Error updating portfolio item" });
    }
  });

  app.delete("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const itemId = parseInt(req.params.id);
      
      // Check if item exists and belongs to user
      const item = await storage.getPortfolioItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Portfolio item not found" });
      }
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this item" });
      }
      
      await storage.deletePortfolioItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting portfolio item:", error);
      res.status(500).json({ message: "Error deleting portfolio item" });
    }
  });

  // Search routes
  app.get("/api/search/photographers", async (req, res) => {
    try {
      const { query, lat, lng, radius } = req.query;
      
      const photographers = await storage.searchPhotographers(
        query as string,
        lat ? parseFloat(lat as string) : undefined,
        lng ? parseFloat(lng as string) : undefined,
        radius ? parseFloat(radius as string) : undefined
      );
      
      // Remove password from response
      const sanitizedPhotographers = photographers.map(photographer => ({
        ...photographer,
        password: undefined
      }));
      
      res.json(sanitizedPhotographers);
    } catch (error) {
      console.error("Error searching photographers:", error);
      res.status(500).json({ message: "Error searching photographers" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
