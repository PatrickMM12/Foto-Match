import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { userRegisterSchema, userLoginSchema, insertPhotographerProfileSchema, insertServiceSchema, insertSessionSchema, insertTransactionSchema, insertReviewSchema, insertPortfolioItemSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";

// Adicionar declaração para o usuário no objeto Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware para verificar autenticação com Supabase
  const isAuthenticated = async (req: Request, res: Response, next: Function) => {
    // Verificar se o token de autenticação está presente no cabeçalho
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar o token com o Supabase
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Buscar o usuário no banco de dados
      const user = await storage.getUserByEmail(data.user.email || '');
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Adicionar o usuário ao objeto de requisição
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: "Authentication error" });
    }
  };
  
  // Adicionar middleware para extrair token de autenticação
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data } = await supabase.auth.getUser(token);
        if (data.user) {
          const user = await storage.getUserByEmail(data.user.email || '');
          if (user) {
            req.user = user;
          }
        }
      } catch (error) {
        // Ignorar erros de autenticação aqui, o middleware isAuthenticated lidará com eles
      }
    }
    next();
  });


  // Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = userRegisterSchema.parse(req.body);
      
      console.log(`Tentando registrar usuário: ${validatedData.email}`);
      
      // Tentar criar usuário primeiro no storage, que verificará duplicação
      // e criará o usuário tanto no Auth quanto na tabela users
      try {
        // Remover o campo confirmPassword antes de criar o usuário
        const { confirmPassword, ...userData } = validatedData;
        
        // Criar usuário usando o storage que agora usa Supabase
        const user = await storage.createUser(userData);
        console.log(`Usuário criado com sucesso: ${user.email}`);

        // Se registrando como fotógrafo, criar perfil vazio
        if (validatedData.userType === "photographer") {
          await storage.createPhotographerProfile({
            userId: user.id,
            specialties: [],
            portfolioImages: [],
            availableTimes: {},
          });
          console.log(`Perfil de fotógrafo criado para: ${user.email}`);
        }

        // Obter token de autenticação do Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (authError) {
          console.error("Erro ao fazer login após registro:", authError);
          
          // Se o erro for email não confirmado, retornar sucesso mesmo assim
          if (authError.name === 'AuthApiError' && authError.message === 'Email not confirmed') {
            // Ainda é considerado sucesso, apenas sem token de sessão
            return res.status(201).json({ 
              user: { ...user, password: undefined },
              message: "Verification email has been sent. Please check your email to confirm your account."
            });
          }
          
          // Para outros erros, retornar sucesso mesmo assim, mas sem sessão
          return res.status(201).json({ 
            user: { ...user, password: undefined },
            message: "Account created but session could not be established. Please try logging in."
          });
        }

        return res.status(201).json({ 
          user: { ...user, password: undefined },
          session: authData.session
        });
      } catch (storageError: any) {
        console.error("Erro no armazenamento durante registro:", storageError);
        
        // Se o erro for relacionado ao email já em uso
        if (storageError.message && (
            storageError.message.includes("duplicate key") || 
            storageError.message.includes("email") || 
            storageError.message.includes("Email already in use") ||
            storageError.message.includes("User already registered"))) {
          return res.status(400).json({ message: "Email already in use" });
        }
        
        throw storageError; // Re-throw para ser capturado pelo catch externo
      }
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      
      // Verificar se é um erro de autenticação do Supabase
      if (error.status === 400 && error.message && error.message.includes("User already registered")) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration", details: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const validatedData = userLoginSchema.parse(req.body);
      
      console.log(`Tentando login para o email: ${validatedData.email}`);
      
      // Autenticar com Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        console.error("Erro de autenticação no Supabase:", error);
        
        // Se o erro for de email não confirmado, retornar mensagem específica
        if (error.message && error.message.includes("Email not confirmed")) {
          return res.status(401).json({ message: "Email not confirmed. Please check your inbox for the verification email." });
        }
        
        return res.status(401).json({ message: "Incorrect email or password" });
      }

      // Login no Supabase Auth bem-sucedido
      console.log(`Login bem-sucedido no Supabase Auth para: ${validatedData.email}`);
      
      // Buscar dados do usuário no banco
      const user = await storage.getUserByEmail(validatedData.email);
      
      // Se o usuário não existir na nossa tabela, mas existe no Auth do Supabase
      if (!user && data.user) {
        console.log(`Usuário autenticado no Supabase mas não encontrado na tabela users: ${validatedData.email}`);
        
        // Criar o usuário na tabela users usando os dados do Auth
        try {
          const newUser = await storage.createUser({
            email: data.user.email || validatedData.email,
            password: validatedData.password, // Não é realmente usado para autenticação
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            userType: data.user.user_metadata?.user_type || 'client',
          });
          
          console.log(`Usuário criado na tabela users: ${newUser.email}`);
          
          return res.json({ 
            user: { ...newUser, password: undefined },
            session: data.session
          });
        } catch (createError) {
          console.error("Erro ao criar usuário na tabela:", createError);
          // Prosseguir mesmo com erro, retornando apenas dados do Auth
          return res.json({ 
            user: { 
              email: data.user.email,
              name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
              userType: data.user.user_metadata?.user_type || 'client',
            },
            session: data.session
          });
        }
      }
      
      if (!user) {
        console.error(`Usuário não encontrado após autenticação: ${validatedData.email}`);
        return res.status(401).json({ message: "User not found" });
      }

      console.log(`Login completo para: ${user.email}`);
      return res.json({ 
        user: { ...user, password: undefined },
        session: data.session
      });
    } catch (error) {
      console.error("Erro inesperado durante login:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ message: "Logged out successfully" });
    }

    try {
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Error during logout" });
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Retornar null em vez de erro 401
      return res.json({ user: null });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar o token com o Supabase
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        // Retornar null em vez de erro 401
        return res.json({ user: null });
      }
      
      // Buscar o usuário no banco de dados
      const user = await storage.getUserByEmail(data.user.email || '');
      if (!user) {
        // Retornar null em vez de erro 401
        return res.json({ user: null });
      }
      
      return res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Session check error:', error);
      // Retornar null em vez de erro 401
      return res.json({ user: null });
    }
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
      console.log('Requisição para perfil de fotógrafo recebida. Usuário:', user?.id, user?.email, user?.userType);
      
      if (user.userType !== "photographer") {
        console.log('Acesso negado: usuário não é fotógrafo:', user.userType);
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const profile = await storage.getPhotographerProfile(user.id);
      console.log('Perfil de fotógrafo encontrado:', profile ? 'Sim' : 'Não');
      
      if (!profile) {
        console.log('Perfil de fotógrafo não encontrado para usuário:', user.id);
        return res.status(404).json({ message: "Photographer profile not found" });
      }
      
      console.log('Enviando dados do perfil:', profile);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching photographer profile:", error);
      res.status(500).json({ message: "Error fetching photographer profile" });
    }
  });

  app.patch("/api/photographers/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log('Requisição de atualização de perfil recebida. Usuário:', user?.id, user?.email, user?.userType);
      console.log('Dados recebidos:', req.body);
      
      if (user.userType !== "photographer") {
        console.log('Acesso negado: usuário não é fotógrafo:', user.userType);
        return res.status(403).json({ message: "Only photographers can access this endpoint" });
      }
      
      const validatedData = insertPhotographerProfileSchema.partial().parse(req.body);
      console.log('Dados validados:', validatedData);
      
      // Check if profile exists
      const existingProfile = await storage.getPhotographerProfile(user.id);
      console.log('Perfil existente encontrado:', existingProfile ? 'Sim' : 'Não');
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        console.log('Criando novo perfil para usuário:', user.id);
        const newProfile = await storage.createPhotographerProfile({
          userId: user.id,
          ...validatedData,
          specialties: validatedData.specialties || [],
          portfolioImages: validatedData.portfolioImages || [],
          availableTimes: validatedData.availableTimes || {},
        });
        console.log('Novo perfil criado:', newProfile);
        return res.json(newProfile);
      }
      
      // Update existing profile
      console.log('Atualizando perfil existente para usuário:', user.id);
      const updatedProfile = await storage.updatePhotographerProfile(user.id, validatedData);
      console.log('Perfil atualizado:', updatedProfile);
      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Erro de validação:', fromZodError(error).message);
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

  // Rota de teste para limpar completamente um usuário específico (apenas para ambiente de desenvolvimento)
  app.delete("/api/auth/test/cleanup-email", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not allowed in production" });
      }
      
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`Tentando limpar dados do usuário: ${email}`);
      
      // 1. Verificar se o usuário existe na API Auth do Supabase
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (!userError && userData) {
        // Encontrar o usuário pelo email
        const authUser = userData.users.find(u => u.email === email);
        
        if (authUser) {
          console.log(`Usuário encontrado no Auth do Supabase: ${authUser.id}`);
          
          // Remover o usuário da autenticação
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
            authUser.id
          );
          
          if (deleteAuthError) {
            console.error("Erro ao remover usuário da Auth:", deleteAuthError);
          } else {
            console.log(`Usuário removido do Auth do Supabase: ${email}`);
          }
        } else {
          console.log(`Usuário não encontrado no Auth do Supabase: ${email}`);
        }
      }
      
      // 2. Remover da tabela users do Supabase
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('email', email);
        
      if (dbError) {
        console.error("Erro ao remover usuário da tabela:", dbError);
      } else {
        console.log(`Usuário removido da tabela users: ${email}`);
      }
      
      res.json({ message: `Limpeza completa para ${email} concluída` });
    } catch (error) {
      console.error("Erro ao limpar usuário:", error);
      res.status(500).json({ message: "Error during cleanup" });
    }
  });

  // Rota para confirmar email manualmente (útil para desenvolvimento)
  app.post("/api/auth/confirm-email", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not allowed in production" });
      }
      
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Buscar usuário no Supabase Auth
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error("Erro ao listar usuários:", error);
        return res.status(500).json({ message: "Error listing users" });
      }
      
      // Encontrar o usuário pelo email
      const user = data.users.find(u => u.email === email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.email_confirmed_at) {
        return res.json({ message: "Email already confirmed" });
      }
      
      // Atualizar o usuário para confirmar o email
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      
      if (updateError) {
        console.error("Erro ao confirmar email:", updateError);
        return res.status(500).json({ message: "Error confirming email" });
      }
      
      return res.json({ message: "Email confirmed successfully" });
    } catch (error) {
      console.error("Error confirming email:", error);
      res.status(500).json({ message: "Server error during email confirmation" });
    }
  });

  // Rota para testar autenticação direta no Supabase Auth (apenas para diagnóstico)
  app.post("/api/auth/test-auth", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not allowed in production" });
      }
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      console.log(`Testando autenticação direta para: ${email}`);
      
      // Tentar autenticar diretamente com o Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Erro na autenticação direta:", error);
        return res.status(401).json({ 
          success: false, 
          message: "Authentication failed", 
          error: error.message 
        });
      }
      
      // Verificar se existe na tabela users
      const user = await storage.getUserByEmail(email);
      
      return res.json({
        success: true,
        auth: {
          id: data.user?.id,
          email: data.user?.email,
          metadata: data.user?.user_metadata,
          emailConfirmed: !!data.user?.email_confirmed_at,
        },
        dbUser: user ? { exists: true, id: user.id, userType: user.userType } : { exists: false }
      });
    } catch (error: any) {
      console.error("Erro ao testar autenticação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error testing authentication",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
