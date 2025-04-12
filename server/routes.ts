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
        console.error("Detalhes do erro:", JSON.stringify(error, null, 2));
        
        // Mensagens de erro mais específicas
        if (error.message) {
          // Verificar diferentes tipos de erro
          if (error.message.includes("Email not confirmed") || 
              error.message.includes("not confirmed") ||
              error.message.toLowerCase().includes("email confirmation")) {
            console.log(`Identificado erro de email não confirmado para: ${validatedData.email}`);
            return res.status(401).json({ 
              message: "Email not confirmed. Please check your inbox for the verification email.",
              errorCode: "EMAIL_NOT_CONFIRMED",
              email: validatedData.email
            });
          } else if (error.message.includes("Invalid login credentials") ||
                    error.message.includes("Incorrect email or password")) {
            console.log(`Credenciais inválidas para: ${validatedData.email}`);
            return res.status(401).json({ 
              message: "Incorrect email or password", 
              errorCode: "INVALID_CREDENTIALS"
            });
          } else if (error.message.includes("User not found") ||
                    error.message.includes("user not found")) {
            console.log(`Usuário não encontrado: ${validatedData.email}`);
            return res.status(401).json({ 
              message: "User not found", 
              errorCode: "USER_NOT_FOUND"
            });
          }
        }
        
        // Para garantir que outros erros também sejam capturados
        console.log(`Erro genérico de autenticação para: ${validatedData.email}`);
        return res.status(401).json({ 
          message: error.message || "Authentication failed", 
          errorCode: "AUTH_FAILED",
          details: error
        });
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

  // Rota para confirmação manual de email (apenas para desenvolvimento/testes)
  app.post("/api/auth/confirm-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        console.log("Tentativa de confirmação de email sem fornecer o email");
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`Confirmando manualmente o email: ${email}`);
      
      // Verificar se o usuário existe no banco de dados primeiro
      const dbUser = await storage.getUserByEmail(email);
      
      if (!dbUser) {
        console.log(`Usuário não encontrado no banco de dados: ${email}`);
        return res.status(404).json({ message: "User not found in database" });
      }
      
      console.log(`Usuário encontrado no banco de dados: ${email}, ID: ${dbUser.id}`);
      
      // Buscar usuário no Auth do Supabase
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error("Erro ao listar usuários no Supabase:", userError);
        return res.status(500).json({ message: "Error checking user in Auth system" });
      }
      
      const supabaseUser = userData.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
      
      if (!supabaseUser) {
        console.error(`Usuário não encontrado no Supabase Auth: ${email}`);
        return res.status(404).json({ message: "User not found in authentication system" });
      }
      
      console.log(`Usuário encontrado no Supabase Auth: ${email}, ID: ${supabaseUser.id}`);
      
      // Verificar se o email já está confirmado
      if (supabaseUser.email_confirmed_at) {
        console.log(`Email já está confirmado: ${email}, confirmado em: ${supabaseUser.email_confirmed_at}`);
        return res.status(200).json({ message: "Email already confirmed" });
      }
      
      // Atualizar o status do email para confirmado
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        supabaseUser.id,
        { email_confirm: true }
      );
      
      if (updateError) {
        console.error("Erro ao confirmar email:", updateError);
        return res.status(500).json({ message: "Failed to confirm email", error: updateError.message });
      }
      
      console.log(`Email confirmado com sucesso: ${email}`);
      return res.status(200).json({ message: "Email confirmed successfully" });
    } catch (error: any) {
      console.error("Erro na confirmação manual de email:", error);
      res.status(500).json({ 
        message: "Server error during email confirmation", 
        details: error.message 
      });
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

  // Buscar todos os clientes (para fotógrafos criarem sessões)
  app.get("/api/users/clients", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verificar se o usuário é fotógrafo
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Apenas fotógrafos podem acessar essa rota" });
      }
      
      // Buscar todos os usuários do tipo client
      const clients = await storage.getClientUsers();
      
      // Remover dados sensíveis como senha
      const safeClients = clients.map(client => ({
        ...client,
        password: undefined
      }));
      
      return res.json(safeClients);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // Criar novo cliente (para fotógrafos registrarem clientes)
  app.post("/api/users/clients", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verificar se o usuário é fotógrafo
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Apenas fotógrafos podem criar clientes" });
      }
      
      // Verificar dados necessários
      const { name, email, phone } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Nome e e-mail são obrigatórios" });
      }
      
      // Verificar se já existe usuário com este e-mail
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Já existe um usuário com este e-mail" });
      }
      
      // Gerar uma senha temporária
      const temporaryPassword = Math.random().toString(36).slice(-8);
      
      // Criar novo usuário do tipo cliente
      const newClient = await storage.createUser({
        name,
        email,
        password: temporaryPassword,
        userType: "client",
        phone: phone || ""
      });
      
      // Remover a senha antes de retornar
      const { password, ...clientWithoutPassword } = newClient;
      
      return res.status(201).json(clientWithoutPassword);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      return res.status(500).json({ message: "Erro ao criar cliente" });
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
      console.log('Requisição para perfil de fotógrafo recebida. Usuário:', user?.id);
      
      // Verificar se o usuário é fotógrafo
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Apenas fotógrafos podem acessar essa rota" });
      }
      
      // Buscar perfil do fotógrafo
      const profile = await storage.getPhotographerProfile(user.id);
      
      console.log('Perfil de fotógrafo encontrado:', profile ? 'Sim' : 'Não');
      
      if (!profile) {
        console.log('Perfil de fotógrafo não encontrado para usuário:', user.id);
        return res.status(404).json({ message: "Perfil de fotógrafo não encontrado" });
      }
      
      // Não logar todo o objeto profile para evitar log excessivo
      console.log('Enviando dados do perfil. ID:', profile.id);
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error("Erro ao buscar perfil de fotógrafo:", error);
      return res.status(500).json({ message: "Erro ao buscar perfil de fotógrafo" });
    }
  });

  app.patch("/api/photographers/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log('Requisição de atualização de perfil recebida. Usuário:', user?.id);
      
      // Verificar se o usuário é fotógrafo
      if (user.userType !== "photographer") {
        return res.status(403).json({ message: "Apenas fotógrafos podem atualizar o perfil" });
      }
      
      try {
        // Validar dados do perfil
        const validatedData = insertPhotographerProfileSchema.partial().parse(req.body);
        
        // Verificar se o perfil já existe
        const existingProfile = await storage.getPhotographerProfile(user.id);
        
        console.log('Perfil existente encontrado:', existingProfile ? 'Sim' : 'Não');
        
        let updatedOrNewProfile;
        
        if (!existingProfile) {
          console.log('Criando novo perfil para usuário:', user.id);
          
          const newProfile = await storage.createPhotographerProfile({
            ...validatedData,
            userId: user.id
          });
          
          if (!newProfile) {
            return res.status(500).json({ message: "Erro ao criar perfil de fotógrafo" });
          }
          
          console.log('Novo perfil criado. ID:', newProfile.id);
          updatedOrNewProfile = newProfile;
        } else {
          console.log('Atualizando perfil existente para usuário:', user.id);
          
          const updatedProfile = await storage.updatePhotographerProfile(user.id, validatedData);
          
          console.log('Perfil atualizado. ID:', updatedProfile?.id);
          updatedOrNewProfile = updatedProfile;
        }
        
        return res.status(200).json(updatedOrNewProfile);
      } catch (error) {
        if (error instanceof ZodError) {
          console.error('Erro de validação:', fromZodError(error).message);
          return res.status(400).json({ message: fromZodError(error).message });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating photographer profile:", error);
      res.status(500).json({ message: "Error updating photographer profile" });
    }
  });

  // Rotas para gerenciamento de serviços
  app.get("/api/photographers/services", isAuthenticated, async (req, res) => {
    try {
      // Verificar se o usuário é fotógrafo
      if (req.user.userType !== "photographer") {
        return res.status(403).json({ message: "Acesso não autorizado. Apenas fotógrafos podem acessar serviços." });
      }
      
      const services = await storage.getServices(req.user.id);
      
      return res.status(200).json(services);
    } catch (error: any) {
      console.error("Erro ao buscar serviços:", error);
      return res.status(500).json({ message: "Erro ao buscar serviços", details: error.message });
    }
  });
  
  app.post("/api/photographers/services", isAuthenticated, async (req, res) => {
    try {
      console.log("POST /api/photographers/services - Dados recebidos:", req.body);
      console.log("Tipo de conteúdo:", req.headers['content-type']);
      
      const result = insertServiceSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Falha na validação do schema:", result.error);
        console.log("Campos esperados pelo schema:", 
          Object.keys(insertServiceSchema.shape).join(", "));
        console.log("Campos recebidos:", Object.keys(req.body).join(", "));
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: result.error.format(),
          detalhes: "Verificar nomes de campos (camelCase vs snake_case)" 
        });
      }
      
      console.log("Validação do schema bem-sucedida:", result.data);
      
      const userId = parseInt(String(req.user.id));
      console.log(`Criando serviço para o usuário: ${userId} (${typeof userId})`);
      
      const service = await storage.createService({ ...result.data, userId });
      return res.status(201).json(service);
    } catch (error: any) {
      console.error("Erro ao criar serviço:", error.message);
      // Garantir que a resposta sempre seja JSON, mesmo em caso de erro
      return res.status(500).json({ 
        message: "Erro ao criar serviço", 
        details: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });
  
  app.patch("/api/photographers/services/:id", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const currentUserId = parseInt(String(req.user.id));
      
      console.log(`PATCH /api/photographers/services/${serviceId} - Usuário ${currentUserId} tentando atualizar serviço`);
      
      // Verificar se o serviço existe
      const existingService = await storage.getService(serviceId);
      
      if (!existingService) {
        console.log(`Serviço ${serviceId} não encontrado`);
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      console.log(`Serviço ${serviceId} encontrado:`);
      console.log(`- ID do serviço: ${existingService.id}`);
      console.log(`- ID do proprietário do serviço: ${existingService.userId} (${typeof existingService.userId})`);
      console.log(`- ID do usuário atual: ${currentUserId} (${typeof currentUserId})`);
      
      // Garantir que ambos os IDs sejam strings para comparação segura
      const serviceUserIdStr = String(existingService.userId);
      const currentUserIdStr = String(currentUserId);
      
      console.log(`IDs convertidos para string: ${serviceUserIdStr} === ${currentUserIdStr}`);
      console.log(`Resultado da comparação: ${serviceUserIdStr === currentUserIdStr}`);
      
      // Verificar se o serviço pertence ao usuário autenticado
      if (serviceUserIdStr !== currentUserIdStr) {
        console.log(`Acesso negado: Usuário ${currentUserIdStr} não tem permissão para editar serviço do usuário ${serviceUserIdStr}`);
        return res.status(403).json({ message: "Você não tem permissão para editar este serviço" });
      }
      
      console.log(`Permissão concedida, atualizando serviço ${serviceId}`);
      
      // Atualizar serviço
      const updatedService = await storage.updateService(serviceId, req.body);
      
      if (!updatedService) {
        console.log(`Erro ao atualizar serviço ${serviceId}: serviço não retornado pelo storage`);
        return res.status(500).json({ message: "Erro ao atualizar serviço" });
      }
      
      console.log(`Serviço ${serviceId} atualizado com sucesso`);
      return res.status(200).json(updatedService);
    } catch (error: any) {
      console.error("Erro ao atualizar serviço:", error);
      return res.status(500).json({ message: "Erro ao atualizar serviço", details: error.message });
    }
  });
  
  app.delete("/api/photographers/services/:id", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const currentUserId = parseInt(String(req.user.id));
      
      console.log(`DELETE /api/photographers/services/${serviceId} - Usuário ${currentUserId} tentando excluir serviço`);
      
      // Verificar se o serviço existe
      const service = await storage.getService(serviceId);
      if (!service) {
        console.log(`Serviço ${serviceId} não encontrado`);
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      console.log(`Serviço ${serviceId} encontrado:`);
      console.log(`- ID do proprietário do serviço: ${service.userId} (${typeof service.userId})`);
      console.log(`- ID do usuário atual: ${currentUserId} (${typeof currentUserId})`);
      
      // Garantir que ambos os IDs sejam strings para comparação segura
      const serviceUserIdStr = String(service.userId);
      const currentUserIdStr = String(currentUserId);
      
      console.log(`IDs convertidos para string: ${serviceUserIdStr} === ${currentUserIdStr}`);
      console.log(`Resultado da comparação: ${serviceUserIdStr === currentUserIdStr}`);
      
      // Verificar se o serviço pertence ao usuário autenticado
      if (serviceUserIdStr !== currentUserIdStr) {
        console.log(`Acesso negado: Usuário ${currentUserIdStr} não tem permissão para excluir serviço do usuário ${serviceUserIdStr}`);
        return res.status(403).json({ message: "Você não tem permissão para deletar este serviço" });
      }
      
      // Deletar o serviço
      await storage.deleteService(serviceId);
      console.log(`Serviço ${serviceId} excluído com sucesso`);
      return res.status(200).json({ message: "Serviço deletado com sucesso" });
    } catch (error: any) {
      console.error("Erro ao excluir serviço:", error);
      return res.status(500).json({ message: "Erro ao excluir serviço", details: error.message });
    }
  });
  
  // Rota para buscar serviços de um fotógrafo específico (para o cliente)
  app.get("/api/photographers/:id/services", async (req, res) => {
    try {
      const photographerId = parseInt(req.params.id);
      
      // Verificar se o fotógrafo existe
      const photographer = await storage.getUser(photographerId);
      
      if (!photographer || photographer.userType !== "photographer") {
        return res.status(404).json({ message: "Fotógrafo não encontrado" });
      }
      
      // Buscar apenas serviços ativos
      const services = await storage.getServices(photographerId);
      const activeServices = services.filter(service => service.active);
      
      return res.status(200).json(activeServices);
    } catch (error: any) {
      console.error("Erro ao buscar serviços do fotógrafo:", error);
      return res.status(500).json({ message: "Erro ao buscar serviços do fotógrafo", details: error.message });
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
      
      console.log("POST /api/sessions - Dados recebidos:", JSON.stringify(req.body, null, 2));
      
      // Verificar o tipo de usuário para determinar o comportamento
      if (user.userType === "client") {
        // Quando cliente cria a sessão, ele deve fornecer o photographerId
        const validatedData = insertSessionSchema.parse({
          ...req.body,
          clientId: user.id,
          status: "pending", // Sessões criadas por clientes começam como pendentes
        });
        
        // Garantir que a data esteja no formato correto (Date) antes de salvar
        if (typeof validatedData.date === 'string') {
          validatedData.date = new Date(validatedData.date);
        }
        
        const session = await storage.createSession(validatedData);
        res.status(201).json(session);
      } else if (user.userType === "photographer") {
        // Quando fotógrafo cria a sessão, ele deve fornecer o clientId
        // e pode definir o status inicial (confirmada por padrão)
        const validatedData = insertSessionSchema.parse({
          ...req.body,
          photographerId: user.id,
          status: req.body.status || "confirmed", // Sessões criadas por fotógrafos já começam confirmadas por padrão
        });
        
        // Garantir que a data esteja no formato correto (Date) antes de salvar
        if (typeof validatedData.date === 'string') {
          validatedData.date = new Date(validatedData.date);
        }
        
        const session = await storage.createSession(validatedData);
        res.status(201).json(session);
      } else {
        return res.status(403).json({ message: "Tipo de usuário não autorizado a criar sessões" });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Erro de validação Zod:", error.format());
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating session:", error);
      // Retornar detalhes do erro para ajudar no diagnóstico
      res.status(500).json({ 
        message: "Error creating session",
        details: error instanceof Error ? error.message : String(error) 
      });
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

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      console.log(`Requisição para reenvio de email de verificação recebida: ${email}`);
      
      if (!email) {
        console.log('Email não fornecido na requisição');
        return res.status(400).json({ success: false, message: "Email não fornecido" });
      }
      
      // Verificar se o usuário existe no Supabase Auth
      // Buscar usuário diretamente com a função getUserByEmail (que já existe)
      console.log(`Procurando usuário no banco de dados: ${email}`);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`Usuário não encontrado: ${email}`);
        return res.status(404).json({ success: false, message: "Usuário não encontrado" });
      }
      
      console.log(`Usuário encontrado: ${email}, ID: ${user.id}. Reenviando email...`);
      
      // Reenviar email de verificação
      const { data: resendData, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (resendError) {
        console.error("Erro ao reenviar email de verificação:", resendError);
        return res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar o email de verificação",
          details: resendError.message
        });
      }
      
      console.log(`Email de verificação reenviado com sucesso para: ${email}`, resendData);
      return res.status(200).json({ 
        success: true, 
        message: "Email de verificação reenviado com sucesso" 
      });
    } catch (error: any) {
      console.error("Erro ao reenviar email de verificação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao reenviar email de verificação",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
