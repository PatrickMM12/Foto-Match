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
import { IStorage } from "./storage";
import { supabase } from "./supabase";
import { eq, and, like, or } from "drizzle-orm";

export class SupabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    
    // Mapear user_type para userType
    const user = { ...data };
    if (user.user_type) {
      user.userType = user.user_type;
      delete user.user_type;
    }
    
    return user as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    // Se o erro for "No rows found", retorne undefined em vez de lançar erro
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found error
        return undefined;
      }
      console.error("Erro ao buscar usuário por email:", error);
      return undefined;
    }
    
    if (!data) return undefined;
    
    // Mapear user_type para userType
    const user = { ...data };
    if (user.user_type) {
      user.userType = user.user_type;
      delete user.user_type;
    }
    
    return user as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      let authUserId = null;
      
      // Verificar se o usuário já existe no Supabase Auth
      try {
        // Tentar fazer login com as credenciais fornecidas para ver se já existe
        const { data: authData } = await supabase.auth.signInWithPassword({
          email: insertUser.email,
          password: insertUser.password,
        });
        
        // Se o login for bem-sucedido, já existe um usuário
        if (authData?.user?.id) {
          console.log(`Usuário já existe no Auth do Supabase e credenciais estão corretas: ${insertUser.email}`);
          authUserId = authData.user.id;
        }
      } catch (authCheckError) {
        // Ignorar erro de login, provavelmente o usuário não existe
      }
      
      // Se não encontrou pelo login, verifica se existe listando os usuários (requer admin)
      if (!authUserId) {
        try {
          const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
          
          // Se encontrar o usuário na lista de autenticação
          const existingUser = existingAuthUser?.users.find(user => user.email === insertUser.email);
          if (existingUser) {
            console.log(`Usuário já existe no Auth do Supabase, mas senha pode estar incorreta: ${insertUser.email}`);
            authUserId = existingUser.id;
          }
        } catch (adminCheckError) {
          // Ignorar erro de admin, pode não ter permissão
        }
      }
      
      // Se o usuário não existe no Supabase Auth, cria-o
      if (!authUserId) {
        // Criar o usuário na autenticação do Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: insertUser.email,
          password: insertUser.password,
          options: {
            data: {
              name: insertUser.name,
              user_type: insertUser.userType
            }
          }
        });

        if (authError) {
          console.error("Erro ao criar usuário na autenticação do Supabase:", authError);
          
          // Se o erro indicar que o usuário já existe
          if (authError.message && 
              (authError.message.includes('User already registered') || 
               authError.message.includes('duplicate key') ||
               authError.message.includes('already exists'))) {
            throw new Error("Email already in use");
          }
          
          throw authError;
        }

        if (!authData.user?.id) {
          console.error("Usuário criado no Supabase Auth mas sem ID retornado");
          throw new Error("Failed to get user ID from Supabase Auth");
        }
        
        authUserId = authData.user.id;
        console.log(`Novo usuário criado no Auth do Supabase: ${insertUser.email}`);
      }
      
      // Verificar se já existe o usuário na tabela users
      const { data: existingDBUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', insertUser.email)
        .maybeSingle();
        
      if (existingDBUser) {
        console.log(`Usuário já existe na tabela users: ${insertUser.email}`);
        
        // Buscar os dados completos do usuário
        const { data: fullUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', insertUser.email)
          .single();
          
        if (fullUser) {
          // Mapear user_type para userType
          const user = { ...fullUser };
          if (user.user_type) {
            user.userType = user.user_type;
            delete user.user_type;
          }
          
          return user as User;
        }
        
        throw new Error("Email already in use");
      }

      // Em seguida, armazenar os dados do usuário na tabela users
      // Mapeando explicitamente userType para user_type
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: insertUser.email,
          password: insertUser.password, // Armazenado apenas como backup
          name: insertUser.name,
          phone: insertUser.phone,
          avatar: insertUser.avatar,
          bio: insertUser.bio,
          location: insertUser.location,
          latitude: insertUser.latitude,
          longitude: insertUser.longitude,
          user_type: insertUser.userType, // Mapeamento explícito
          auth_id: authUserId,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir usuário na tabela users:", error);
        
        // Se o erro for relatado como "duplicate key", é um email duplicado
        if (error.message && error.message.includes("duplicate key") && 
            error.message.includes("email")) {
          throw new Error("Email already in use");
        }
        
        throw error;
      }

      if (!data) {
        throw new Error("User data not returned after insert");
      }
      
      // Mapear user_type para userType no objeto retornado
      const user = { ...data };
      if (user.user_type) {
        user.userType = user.user_type;
        delete user.user_type;
      }
      
      // Marcar o email como confirmado para permitir login imediato
      try {
        // No Supabase as vezes não temos acesso ao admin API, então essa parte pode falhar 
        // mas o usuário ainda será criado
        await supabase.auth.admin.updateUserById(
          authUserId,
          { email_confirm: true }
        );
      } catch (confirmError) {
        console.warn("Não foi possível marcar o email como confirmado:", confirmError);
      }
      
      return user as User;
    } catch (error) {
      console.error("Erro completo ao criar usuário:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // Se a senha estiver sendo atualizada, atualize-a na autenticação do Supabase
    if (userData.password) {
      // Primeiro, obtenha o usuário para encontrar o auth_id
      const user = await this.getUser(id);
      if (!user || !user.auth_id) return undefined;

      // Atualizar a senha na autenticação do Supabase
      const { error: authError } = await supabase.auth.admin.updateUserById(
        user.auth_id,
        { password: userData.password }
      );

      if (authError) throw authError;
    }

    // Preparar dados para atualização, mapeando userType para user_type se presente
    const updateData: any = { ...userData };
    if (userData.userType !== undefined) {
      updateData.user_type = userData.userType;
      delete updateData.userType; // Remover o campo userType para evitar conflitos
    }

    // Atualizar os dados do usuário na tabela users
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as User;
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
    console.log(`Buscando perfil do fotógrafo para userId: ${userId}`);
    
    try {
      const { data, error } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error(`Erro ao buscar perfil para userId: ${userId}`, error);
        return undefined;
      }
      
      if (!data) {
        console.log(`Nenhum perfil encontrado para userId: ${userId}`);
        return undefined;
      }
      
      // Log simplificado sem mostrar todos os dados
      console.log(`Perfil encontrado para userId: ${userId} [ID: ${data.id}]`);
      
      // Converter de snake_case para camelCase antes de retornar
      const profile: any = {
        id: data.id,
        userId: data.user_id,
        instagramUsername: data.instagram_username,
        specialties: data.specialties || [],
        yearsOfExperience: data.years_of_experience,
        equipmentDescription: data.equipment_description,
        portfolioImages: data.portfolio_images || [],
        availableTimes: data.available_times || {}
      };
      
      // Log simplificado sem mostrar todos os dados
      console.log(`Perfil formatado para userId: ${userId} [ID: ${profile.id}]`);
      
      return profile as PhotographerProfile;
    } catch (error) {
      console.error(`Erro não tratado ao buscar perfil para userId: ${userId}`, error);
      return undefined;
    }
  }

  async createPhotographerProfile(profile: InsertPhotographerProfile): Promise<PhotographerProfile> {
    // Mapear campos camelCase para snake_case
    const dbProfile: any = {
      user_id: profile.userId,
      instagram_username: profile.instagramUsername,
      specialties: profile.specialties,
      years_of_experience: profile.yearsOfExperience,
      equipment_description: profile.equipmentDescription,
      portfolio_images: profile.portfolioImages,
      available_times: profile.availableTimes
    };

    const { data, error } = await supabase
      .from('photographer_profiles')
      .insert(dbProfile)
      .select()
      .single();

    if (error) throw error;
    
    // Mapear de volta para camelCase
    const resultProfile = { ...data };
    if (resultProfile.user_id) {
      resultProfile.userId = resultProfile.user_id;
      delete resultProfile.user_id;
    }
    
    return resultProfile as PhotographerProfile;
  }

  async updatePhotographerProfile(userId: number, profileData: Partial<InsertPhotographerProfile>): Promise<PhotographerProfile | undefined> {
    try {
      // Verificar se o perfil existe
      const existingProfile = await this.getPhotographerProfile(userId);
      
      if (!existingProfile) {
        console.log(`Criando perfil para userId: ${userId} pois não existe`);
        return await this.createPhotographerProfile({
          ...profileData as InsertPhotographerProfile,
          userId
        });
      }
      
      // Preparar dados para atualização
      const dbProfileData: any = { ...profileData };
      
      // Mapear camelCase para snake_case
      if ('userId' in profileData) {
        dbProfileData.user_id = profileData.userId;
        delete dbProfileData.userId;
      }
      
      if ('instagramUsername' in profileData) {
        dbProfileData.instagram_username = profileData.instagramUsername;
        delete dbProfileData.instagramUsername;
      }
      
      if ('yearsOfExperience' in profileData) {
        dbProfileData.years_of_experience = profileData.yearsOfExperience;
        delete dbProfileData.yearsOfExperience;
      }
      
      if ('equipmentDescription' in profileData) {
        dbProfileData.equipment_description = profileData.equipmentDescription;
        delete dbProfileData.equipmentDescription;
      }
      
      if ('portfolioImages' in profileData) {
        dbProfileData.portfolio_images = profileData.portfolioImages;
        delete dbProfileData.portfolioImages;
      }
      
      if ('availableTimes' in profileData) {
        dbProfileData.available_times = profileData.availableTimes;
        delete dbProfileData.availableTimes;
      }
      
      // Log simplificado sem mostrar dados detalhados
      console.log(`Atualizando perfil de fotógrafo: userId=${userId}, profileId=${existingProfile.id}`);
      
      // Atualizar perfil
      const { data, error } = await supabase
        .from('photographer_profiles')
        .update(dbProfileData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error(`Erro ao atualizar perfil para userId: ${userId}`, error);
        return undefined;
      }
      
      // Converter de snake_case para camelCase antes de retornar
      const updatedProfile: any = {
        id: data.id,
        userId: data.user_id,
        instagramUsername: data.instagram_username,
        specialties: data.specialties || [],
        yearsOfExperience: data.years_of_experience,
        equipmentDescription: data.equipment_description,
        portfolioImages: data.portfolio_images || [],
        availableTimes: data.available_times || {}
      };
      
      console.log(`Perfil atualizado com sucesso: userId=${userId}, profileId=${updatedProfile.id}`);
      
      return updatedProfile as PhotographerProfile;
    } catch (error) {
      console.error(`Erro não tratado ao atualizar perfil para userId: ${userId}`, error);
      return undefined;
    }
  }

  // Services
  async getServices(userId: number): Promise<Service[]> {
    console.log("SupabaseStorage.getServices - Buscando serviços para userId:", userId);
    
    try {
      console.log("SupabaseStorage.getServices - Executando consulta com user_id =", userId);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error("SupabaseStorage.getServices - Erro do Supabase:", error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log("SupabaseStorage.getServices - Nenhum serviço encontrado para userId:", userId);
        
        // Verificar se há serviços sem filtro de userId para diagnóstico
        console.log("SupabaseStorage.getServices - Verificando todos os serviços na tabela");
        const { data: allData, error: allError } = await supabase
          .from('services')
          .select('*');
          
        if (!allError && allData && allData.length > 0) {
          console.log(`SupabaseStorage.getServices - Encontrados ${allData.length} serviços no total`);
          const uniqueUserIds = Array.from(new Set(allData.map(s => s.user_id)));
          console.log(`SupabaseStorage.getServices - IDs de usuários existentes: ${uniqueUserIds.join(', ')}`);
        }
        
        return [];
      }
      
      // Converter de snake_case para camelCase nos resultados
      const services = data.map(service => {
        // Criar um novo objeto para não modificar o original
        const formattedService: any = {};
        
        // Mapear os campos específicos para garantir a conversão correta
        formattedService.id = service.id;
        formattedService.userId = service.user_id; // Converter user_id para userId
        formattedService.name = service.name;
        formattedService.description = service.description;
        formattedService.price = service.price;
        formattedService.duration = service.duration;
        formattedService.maxPhotos = service.max_photos; // Converter max_photos para maxPhotos
        formattedService.additionalPhotoPrice = service.additional_photo_price; // Converter para additionalPhotoPrice
        formattedService.active = service.active;
        
        return formattedService;
      });
      
      console.log(`SupabaseStorage.getServices - ${services.length} serviços convertidos para userId:`, userId);
      console.log("SupabaseStorage.getServices - Serviços formatados:", services.map(s => ({ id: s.id, userId: s.userId, name: s.name })));
      
      return services as Service[];
    } catch (error) {
      console.error("SupabaseStorage.getServices - Erro não tratado:", error);
      return [];
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    console.log("SupabaseStorage.getService - Buscando serviço ID:", id);
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error("SupabaseStorage.getService - Erro do Supabase:", error);
        return undefined;
      }
      
      if (!data) {
        console.log("SupabaseStorage.getService - Serviço não encontrado para ID:", id);
        return undefined;
      }
      
      // Converter de snake_case para camelCase - criar um novo objeto com os campos mapeados explicitamente
      const formattedService: any = {
        id: data.id,
        userId: data.user_id, // Converter user_id para userId
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        maxPhotos: data.max_photos, // Converter max_photos para maxPhotos
        additionalPhotoPrice: data.additional_photo_price, // Converter para additionalPhotoPrice
        active: data.active
      };
      
      console.log("SupabaseStorage.getService - Serviço encontrado:", 
        { id: formattedService.id, userId: formattedService.userId, name: formattedService.name });
      
      return formattedService as Service;
    } catch (error) {
      console.error("SupabaseStorage.getService - Erro não tratado:", error);
      return undefined;
    }
  }

  async createService(service: InsertService): Promise<Service> {
    console.log("SupabaseStorage.createService - Iniciando criação de serviço para userId:", service.userId);
    
    try {
      // Verificar se os campos obrigatórios estão presentes
      if (!service.userId) {
        console.error("SupabaseStorage.createService - userId não fornecido");
        throw new Error("userId é obrigatório para criar um serviço");
      }
      
      if (!service.name) {
        console.error("SupabaseStorage.createService - name não fornecido");
        throw new Error("name é obrigatório para criar um serviço");
      }
      
      if (service.price === undefined || service.price === null) {
        console.error("SupabaseStorage.createService - price não fornecido");
        throw new Error("price é obrigatório para criar um serviço");
      }
      
      if (service.duration === undefined || service.duration === null) {
        console.error("SupabaseStorage.createService - duration não fornecido");
        throw new Error("duration é obrigatório para criar um serviço");
      }
      
      // Preparar dados para inserção, mapeando campos conforme necessário
      const dbService: any = {};
      
      // Mapear campos camelCase para snake_case para o banco de dados
      dbService.user_id = service.userId;
      dbService.name = service.name;
      dbService.description = service.description;
      dbService.price = service.price;
      dbService.duration = service.duration;
      dbService.active = service.active !== undefined ? service.active : true;
      
      // Campos opcionais
      if (service.maxPhotos !== undefined && service.maxPhotos !== null) {
        dbService.max_photos = service.maxPhotos;
      }
      
      if (service.additionalPhotoPrice !== undefined && service.additionalPhotoPrice !== null) {
        dbService.additional_photo_price = service.additionalPhotoPrice;
      }
      
      // Log simplificado sem exibir os dados completos
      console.log("SupabaseStorage.createService - Dados preparados para inserção no banco");
      
      // Fazer requisição ao Supabase
      console.log("SupabaseStorage.createService - Fazendo requisição ao Supabase");
      const { data, error } = await supabase
        .from('services')
        .insert(dbService)
        .select()
        .single();

      if (error) {
        console.error("SupabaseStorage.createService - Erro do Supabase:", error);
        throw error;
      }
      
      if (!data) {
        console.error("SupabaseStorage.createService - Nenhum dado retornado pelo Supabase");
        throw new Error("Nenhum dado retornado ao criar o serviço");
      }
      
      // Converter de snake_case para camelCase antes de retornar
      const resultService: any = { ...data };
      if ('additional_photo_price' in resultService) {
        resultService.additionalPhotoPrice = resultService.additional_photo_price;
        delete resultService.additional_photo_price;
      }
      
      console.log("SupabaseStorage.createService - Serviço criado com sucesso. ID:", resultService.id);
      return resultService as Service;
    } catch (error) {
      console.error("SupabaseStorage.createService - Erro não tratado:", error);
      throw error;
    }
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    console.log("SupabaseStorage.updateService - Atualizando serviço:", id);
    
    try {
      // Preparar dados para atualização, mapeando campos de camelCase para snake_case
      const dbServiceData: any = {};
      
      // Mapear os campos de forma explícita
      if ('userId' in serviceData) {
        dbServiceData.user_id = serviceData.userId;
      }
      
      if ('name' in serviceData) {
        dbServiceData.name = serviceData.name;
      }
      
      if ('description' in serviceData) {
        dbServiceData.description = serviceData.description;
      }
      
      if ('price' in serviceData) {
        dbServiceData.price = serviceData.price;
      }
      
      if ('duration' in serviceData) {
        dbServiceData.duration = serviceData.duration;
      }
      
      if ('maxPhotos' in serviceData) {
        dbServiceData.max_photos = serviceData.maxPhotos;
      }
      
      if ('additionalPhotoPrice' in serviceData) {
        dbServiceData.additional_photo_price = serviceData.additionalPhotoPrice;
      }
      
      if ('active' in serviceData) {
        dbServiceData.active = serviceData.active;
      }
      
      console.log("SupabaseStorage.updateService - Dados formatados para atualização:", dbServiceData);
      
      // Fazer requisição ao Supabase
      const { data, error } = await supabase
        .from('services')
        .update(dbServiceData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("SupabaseStorage.updateService - Erro do Supabase:", error);
        return undefined;
      }
      
      if (!data) {
        console.error("SupabaseStorage.updateService - Nenhum dado retornado pelo Supabase");
        return undefined;
      }
      
      // Converter de snake_case para camelCase antes de retornar
      const resultService: any = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        maxPhotos: data.max_photos,
        additionalPhotoPrice: data.additional_photo_price,
        active: data.active
      };
      
      console.log("SupabaseStorage.updateService - Serviço atualizado com sucesso. ID:", resultService.id);
      return resultService as Service;
    } catch (error) {
      console.error("SupabaseStorage.updateService - Erro não tratado:", error);
      return undefined;
    }
  }

  async deleteService(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Sessions
  async getSessions(userId: number, userType: 'photographer' | 'client'): Promise<Session[]> {
    const field = userType === 'photographer' ? 'photographer_id' : 'client_id';
    
    console.log(`Buscando sessões para ${userType} com ID ${userId}`);
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq(field, userId);
    
    if (error) {
      console.error("Erro ao buscar sessões:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`Nenhuma sessão encontrada para ${userType} com ID ${userId}`);
      return [];
    }
    
    // Converter os campos de snake_case para camelCase
    const sessions = data.map(session => {
      const formattedSession: any = {
        id: session.id,
        photographerId: session.photographer_id,
        clientId: session.client_id,
        serviceId: session.service_id,
        title: session.title,
        description: session.description,
        date: session.date,
        duration: session.duration,
        location: session.location,
        locationLat: session.location_lat,
        locationLng: session.location_lng,
        status: session.status,
        totalPrice: session.total_price,
        photosDelivered: session.photos_delivered,
        photosIncluded: session.photos_included,
        additionalPhotos: session.additional_photos,
        additionalPhotoPrice: session.additional_photo_price,
        paymentStatus: session.payment_status,
        amountPaid: session.amount_paid,
        createdAt: session.created_at
      };
      
      return formattedSession;
    });
    
    console.log(`Retornando ${sessions.length} sessões convertidas`);
    
    return sessions as Session[];
  }

  async getSession(id: number): Promise<Session | undefined> {
    console.log(`Buscando sessão com ID ${id}`);
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Erro ao buscar sessão:", error);
      return undefined;
    }
    
    if (!data) {
      console.log(`Nenhuma sessão encontrada com ID ${id}`);
      return undefined;
    }
    
    // Converter os campos de snake_case para camelCase
    const formattedSession: any = {
      id: data.id,
      photographerId: data.photographer_id,
      clientId: data.client_id,
      serviceId: data.service_id,
      title: data.title,
      description: data.description,
      date: data.date,
      duration: data.duration,
      location: data.location,
      locationLat: data.location_lat,
      locationLng: data.location_lng,
      status: data.status,
      totalPrice: data.total_price,
      photosDelivered: data.photos_delivered,
      photosIncluded: data.photos_included,
      additionalPhotos: data.additional_photos,
      additionalPhotoPrice: data.additional_photo_price,
      paymentStatus: data.payment_status,
      amountPaid: data.amount_paid,
      createdAt: data.created_at
    };
    
    console.log(`Sessão encontrada e convertida: ID ${formattedSession.id}`);
    
    return formattedSession as Session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    // Converter campos de camelCase para snake_case
    const snakeCaseSession: any = {};
    
    // Mapeamento explícito de cada campo
    if (session.clientId !== undefined) snakeCaseSession.client_id = session.clientId;
    if (session.photographerId !== undefined) snakeCaseSession.photographer_id = session.photographerId;
    if (session.serviceId !== undefined) snakeCaseSession.service_id = session.serviceId;
    if (session.title !== undefined) snakeCaseSession.title = session.title;
    if (session.description !== undefined) snakeCaseSession.description = session.description;
    if (session.date !== undefined) snakeCaseSession.date = session.date;
    if (session.duration !== undefined) snakeCaseSession.duration = session.duration;
    if (session.location !== undefined) snakeCaseSession.location = session.location;
    if (session.locationLat !== undefined) snakeCaseSession.location_lat = session.locationLat;
    if (session.locationLng !== undefined) snakeCaseSession.location_lng = session.locationLng;
    if (session.status !== undefined) snakeCaseSession.status = session.status;
    if (session.totalPrice !== undefined) snakeCaseSession.total_price = session.totalPrice;
    if (session.photosDelivered !== undefined) snakeCaseSession.photos_delivered = session.photosDelivered;
    if (session.photosIncluded !== undefined) snakeCaseSession.photos_included = session.photosIncluded;
    if (session.additionalPhotos !== undefined) snakeCaseSession.additional_photos = session.additionalPhotos;
    if (session.additionalPhotoPrice !== undefined) snakeCaseSession.additional_photo_price = session.additionalPhotoPrice;
    if (session.paymentStatus !== undefined) snakeCaseSession.payment_status = session.paymentStatus;
    if (session.amountPaid !== undefined) snakeCaseSession.amount_paid = session.amountPaid;
    
    console.log("Dados de sessão formatados para snake_case:", snakeCaseSession);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...snakeCaseSession,
        created_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar sessão:", error);
      throw error;
    }
    
    return data as Session;
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | undefined> {
    console.log(`Atualizando sessão com ID ${id}`);
    
    // Converter campos de camelCase para snake_case
    const snakeCaseSession: any = {};
    
    // Mapeamento explícito de cada campo
    if (sessionData.clientId !== undefined) snakeCaseSession.client_id = sessionData.clientId;
    if (sessionData.photographerId !== undefined) snakeCaseSession.photographer_id = sessionData.photographerId;
    if (sessionData.serviceId !== undefined) snakeCaseSession.service_id = sessionData.serviceId;
    if (sessionData.title !== undefined) snakeCaseSession.title = sessionData.title;
    if (sessionData.description !== undefined) snakeCaseSession.description = sessionData.description;
    if (sessionData.date !== undefined) snakeCaseSession.date = sessionData.date;
    if (sessionData.duration !== undefined) snakeCaseSession.duration = sessionData.duration;
    if (sessionData.location !== undefined) snakeCaseSession.location = sessionData.location;
    if (sessionData.locationLat !== undefined) snakeCaseSession.location_lat = sessionData.locationLat;
    if (sessionData.locationLng !== undefined) snakeCaseSession.location_lng = sessionData.locationLng;
    if (sessionData.status !== undefined) snakeCaseSession.status = sessionData.status;
    if (sessionData.totalPrice !== undefined) snakeCaseSession.total_price = sessionData.totalPrice;
    if (sessionData.photosDelivered !== undefined) snakeCaseSession.photos_delivered = sessionData.photosDelivered;
    if (sessionData.photosIncluded !== undefined) snakeCaseSession.photos_included = sessionData.photosIncluded;
    if (sessionData.additionalPhotos !== undefined) snakeCaseSession.additional_photos = sessionData.additionalPhotos;
    if (sessionData.additionalPhotoPrice !== undefined) snakeCaseSession.additional_photo_price = sessionData.additionalPhotoPrice;
    if (sessionData.paymentStatus !== undefined) snakeCaseSession.payment_status = sessionData.paymentStatus;
    if (sessionData.amountPaid !== undefined) snakeCaseSession.amount_paid = sessionData.amountPaid;
    
    console.log("Dados de atualização de sessão formatados para snake_case:", snakeCaseSession);
    
    const { data, error } = await supabase
      .from('sessions')
      .update(snakeCaseSession)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar sessão:", error);
      return undefined;
    }
    
    if (!data) {
      console.log(`Nenhum dado retornado ao atualizar sessão com ID ${id}`);
      return undefined;
    }
    
    // Converter os campos de snake_case para camelCase para retornar
    const formattedSession: any = {
      id: data.id,
      photographerId: data.photographer_id,
      clientId: data.client_id,
      serviceId: data.service_id,
      title: data.title,
      description: data.description,
      date: data.date,
      duration: data.duration,
      location: data.location,
      locationLat: data.location_lat,
      locationLng: data.location_lng,
      status: data.status,
      totalPrice: data.total_price,
      photosDelivered: data.photos_delivered,
      photosIncluded: data.photos_included,
      additionalPhotos: data.additional_photos,
      additionalPhotoPrice: data.additional_photo_price,
      paymentStatus: data.payment_status,
      amountPaid: data.amount_paid,
      createdAt: data.created_at
    };
    
    console.log(`Sessão atualizada: ID ${formattedSession.id}`);
    
    return formattedSession as Session;
  }

  async deleteSession(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);
    
    if (error || !data) return [];
    return data as Transaction[];
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    console.log("Criando transação com dados:", transaction);
    
    // Mapear de camelCase para snake_case
    const formattedTransaction = {
      user_id: transaction.userId,
      session_id: transaction.sessionId,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      type: transaction.type
    };
    
    console.log("Dados formatados para inserção:", formattedTransaction);
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(formattedTransaction)
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar transação:", error);
      throw error;
    }
    
    return data as Transaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from('transactions')
      .update(transactionData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as Transaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Reviews
  async getReviews(photographerId: number): Promise<Review[]> {
    console.log(`[SupabaseStorage.getReviews] Iniciando busca para photographerId=${photographerId} (Tipo: ${typeof photographerId})`);
    
    // Validar se o ID é um número válido
    if (isNaN(photographerId) || photographerId <= 0) {
      console.error(`[SupabaseStorage.getReviews] ID de fotógrafo inválido fornecido: ${photographerId}`);
      return []; // Retornar array vazio em vez de lançar erro
    }
    
    try {
      console.log(`[SupabaseStorage.getReviews] Executando consulta Supabase: from('reviews').select('*').eq('photographer_id', ${photographerId})`);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('photographer_id', photographerId);
      
      if (error) {
        console.error(`[SupabaseStorage.getReviews] Erro retornado pelo Supabase:`, JSON.stringify(error, null, 2));
        return []; // Retornar array vazio em vez de lançar erro
      }
      
      console.log(`[SupabaseStorage.getReviews] Consulta Supabase concluída. Número de reviews brutas encontradas: ${data?.length || 0}`);
      
      // Log dos dados brutos (se houver)
      if (data && data.length > 0) {
        console.log(`[SupabaseStorage.getReviews] Dados brutos recebidos do Supabase (primeira review):`, JSON.stringify(data[0], null, 2));
      } else {
        console.log(`[SupabaseStorage.getReviews] Nenhum dado bruto recebido do Supabase.`);
      }
      
      // Converter de snake_case para camelCase
      const mappedReviews = (data || []).map(review => ({
        id: review.id,
        sessionId: review.session_id,
        reviewerId: review.reviewer_id,
        photographerId: review.photographer_id, // Manter este campo para verificação
        rating: review.rating,
        qualityRating: review.quality_rating,
        professionalismRating: review.professionalism_rating,
        comment: review.comment,
        createdAt: review.created_at
      }));

      console.log(`[SupabaseStorage.getReviews] Mapeamento concluído. Número de reviews mapeadas: ${mappedReviews.length}`);
      if (mappedReviews.length > 0) {
         console.log(`[SupabaseStorage.getReviews] Primeira review mapeada:`, JSON.stringify(mappedReviews[0], null, 2));
      }

      return mappedReviews;
    } catch (catchError) {
      console.error(`[SupabaseStorage.getReviews] Erro inesperado capturado no bloco catch:`, catchError);
      return []; // Retornar array vazio em vez de lançar erro
    }
  }

  async getReviewsByUserId(userId: number): Promise<Review[]> {
    // Validar se o ID é um número válido
    if (isNaN(userId) || userId <= 0) {
      console.error(`ID de usuário inválido fornecido: ${userId}`);
      return []; // Retornar array vazio em vez de lançar erro
    }
    
    try {
      // Buscar usando photographer_id
      const { data: data1, error: error1 } = await supabase
        .from('reviews')
        .select('*')
        .eq('photographer_id', userId);
      
      if (error1) {
        console.error(`Erro ao buscar avaliações por photographer_id:`, error1);
      }
      
      // Usar o resultado que encontrou reviews, ou um array vazio se nenhum encontrou
      const reviews = (data1 && data1.length > 0) ? data1 : [];
      
      // Converter de snake_case para camelCase
      const mappedReviews = reviews.map(review => ({
        id: review.id,
        sessionId: review.session_id,
        reviewerId: review.reviewer_id,
        photographerId: review.photographer_id || review.user_id, // Usar qualquer um que estiver disponível
        rating: review.rating,
        qualityRating: review.quality_rating,
        professionalismRating: review.professionalism_rating,
        comment: review.comment,
        createdAt: review.created_at
      }));

      return mappedReviews;
    } catch (catchError) {
      console.error(`Erro ao buscar avaliações:`, catchError);
      return []; // Retornar array vazio em vez de lançar erro
    }
  }

  async getReviewsByClient(clientId: number): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', clientId);
    
    if (error || !data) return [];
    return data as Review[];
  }

  async getReview(id: number): Promise<Review | undefined> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Review;
  }

  async createReview(review: InsertReview): Promise<Review> {
    // Mapear de camelCase (do InsertReview) para snake_case (colunas do Supabase)
    const dbReview = {
      session_id: review.sessionId,
      reviewer_id: review.reviewerId,
      photographer_id: review.photographerId, // Mapeado corretamente
      rating: review.rating,
      quality_rating: review.qualityRating, // Mapeado corretamente
      professionalism_rating: review.professionalismRating, // Mapeado corretamente
      comment: review.comment,
      // createdAt é omitido, pois o banco de dados cuida disso com defaultNow()
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert(dbReview) // Usar o objeto mapeado dbReview
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating review:", error);
      throw error;
    }
    
    // O Supabase retorna snake_case, converter para camelCase antes de retornar
    const resultReview: any = { ...data };
    if (resultReview.session_id) {
      resultReview.sessionId = resultReview.session_id;
      delete resultReview.session_id;
    }
    if (resultReview.reviewer_id) {
      resultReview.reviewerId = resultReview.reviewer_id;
      delete resultReview.reviewer_id;
    }
    if (resultReview.photographer_id) {
      resultReview.photographerId = resultReview.photographer_id;
      delete resultReview.photographer_id;
    }
    if (resultReview.quality_rating) {
      resultReview.qualityRating = resultReview.quality_rating;
      delete resultReview.quality_rating;
    }
    if (resultReview.professionalism_rating) {
      resultReview.professionalismRating = resultReview.professionalism_rating;
      delete resultReview.professionalism_rating;
    }
    if (resultReview.created_at) {
      resultReview.createdAt = resultReview.created_at;
      delete resultReview.created_at;
    }

    return resultReview as Review;
  }

  // Portfolio
  async getPortfolioItems(userId: number): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', userId);
    
    if (error || !data) return [];
    return data as PortfolioItem[];
  }

  async getPortfolioItem(id: number): Promise<PortfolioItem | undefined> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as PortfolioItem;
  }

  async createPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({
        ...item,
        createdAt: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioItem;
  }

  async updatePortfolioItem(id: number, itemData: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as PortfolioItem;
  }

  async deletePortfolioItem(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Search photographers
  async searchPhotographers(query: string, lat?: number, lng?: number, radius: number = 50): Promise<UserWithProfile[]> {
    // Construir a consulta base
    let supabaseQuery = supabase
      .from('users')
      .select('*')
      .eq('userType', 'photographer');

    // Adicionar filtro de pesquisa se fornecido
    if (query) {
      const queryLower = query.toLowerCase();
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${queryLower}%,bio.ilike.%${queryLower}%,location.ilike.%${queryLower}%`
      );
    }

    // Executar a consulta
    const { data, error } = await supabaseQuery;
    
    if (error || !data) return [];
    
    // Filtrar por distância se lat/lng fornecidos
    let results = data as User[];
    if (lat && lng) {
      results = results.filter(user => {
        if (!user.latitude || !user.longitude) return false;
        
        // Cálculo aproximado de distância usando a fórmula de Haversine
        const R = 6371; // Raio da Terra em km
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

    // Buscar perfis de fotógrafo para todos os resultados
    const resultsWithProfiles = await Promise.all(
      results.map(async (user) => {
        const profile = await this.getPhotographerProfile(user.id);
        return { ...user, photographerProfile: profile };
      })
    );

    return resultsWithProfiles;
  }

  // Método para buscar todos os usuários do tipo client
  async getClientUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'client');
      
      if (error) {
        console.error("Erro ao buscar clientes:", error);
        return [];
      }
      
      if (!data) {
        return [];
      }
      
      // Mapear user_type para userType para manter consistência
      const clients = data.map(client => {
        const formattedClient: any = { ...client };
        if (formattedClient.user_type) {
          formattedClient.userType = formattedClient.user_type;
          delete formattedClient.user_type;
        }
        return formattedClient as User;
      });
      
      return clients;
    } catch (error) {
      console.error("Erro não tratado ao buscar clientes:", error);
      return [];
    }
  }
  
  async getAllPhotographers(): Promise<User[]> {
    try {
      console.log("[SupabaseStorage.getAllPhotographers] Buscando todos os fotógrafos");
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'photographer');
      
      if (error) {
        console.error("[SupabaseStorage.getAllPhotographers] Erro ao buscar fotógrafos:", error);
        return [];
      }
      
      if (!data) {
        console.log("[SupabaseStorage.getAllPhotographers] Nenhum fotógrafo encontrado");
        return [];
      }
      
      console.log(`[SupabaseStorage.getAllPhotographers] Encontrados ${data.length} fotógrafos`);
      
      // Mapear user_type para userType para manter consistência
      const photographers = data.map(photographer => {
        const formattedPhotographer: any = { ...photographer };
        if (formattedPhotographer.user_type) {
          formattedPhotographer.userType = formattedPhotographer.user_type;
          delete formattedPhotographer.user_type;
        }
        return formattedPhotographer as User;
      });
      
      return photographers;
    } catch (error) {
      console.error("[SupabaseStorage.getAllPhotographers] Erro não tratado:", error);
      return [];
    }
  }
  
  private degToRad(degrees: number): number {
    return degrees * (Math.PI/180);
  }
}

// Exportar uma instância da classe SupabaseStorage
export const supabaseStorage = new SupabaseStorage();