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
        console.error(`Erro ao buscar perfil do fotógrafo:`, error);
        return undefined;
      }
      
      if (!data) {
        console.log(`Nenhum perfil encontrado para userId: ${userId}`);
        return undefined;
      }
      
      console.log(`Perfil encontrado para userId: ${userId}`, data);
      
      // Mapear de snake_case para camelCase
      const profile: any = { ...data };
      if (profile.user_id) {
        profile.userId = profile.user_id;
        delete profile.user_id;
      }
      if (profile.instagram_username) {
        profile.instagramUsername = profile.instagram_username;
        delete profile.instagram_username;
      }
      if (profile.years_of_experience) {
        profile.yearsOfExperience = profile.years_of_experience;
        delete profile.years_of_experience;
      }
      if (profile.equipment_description) {
        profile.equipmentDescription = profile.equipment_description;
        delete profile.equipment_description;
      }
      if (profile.portfolio_images) {
        profile.portfolioImages = profile.portfolio_images;
        delete profile.portfolio_images;
      }
      if (profile.available_times) {
        profile.availableTimes = profile.available_times;
        delete profile.available_times;
      }
      
      console.log(`Perfil formatado para userId: ${userId}`, profile);
      
      return profile;
    } catch (err) {
      console.error(`Erro inesperado ao buscar perfil do fotógrafo:`, err);
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
    // Mapear campos camelCase para snake_case
    const dbProfileData: any = {};
    
    if (profileData.instagramUsername !== undefined) dbProfileData.instagram_username = profileData.instagramUsername;
    if (profileData.specialties !== undefined) dbProfileData.specialties = profileData.specialties || [];
    if (profileData.yearsOfExperience !== undefined) dbProfileData.years_of_experience = profileData.yearsOfExperience;
    if (profileData.equipmentDescription !== undefined) dbProfileData.equipment_description = profileData.equipmentDescription;
    if (profileData.portfolioImages !== undefined) dbProfileData.portfolio_images = profileData.portfolioImages || [];
    if (profileData.availableTimes !== undefined) dbProfileData.available_times = profileData.availableTimes || {};
    
    console.log('Atualizando perfil de fotógrafo:', userId, dbProfileData);
    
    const { data, error } = await supabase
      .from('photographer_profiles')
      .update(dbProfileData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil do fotógrafo:', error);
      return undefined;
    }
    
    if (!data) {
      console.error('Nenhum dado retornado após atualização do perfil');
      return undefined;
    }
    
    // Mapear de volta para camelCase
    const resultProfile: any = { ...data };
    if (resultProfile.user_id) {
      resultProfile.userId = resultProfile.user_id;
      delete resultProfile.user_id;
    }
    if ('instagram_username' in resultProfile) {
      resultProfile.instagramUsername = resultProfile.instagram_username;
      delete resultProfile.instagram_username;
    }
    if ('years_of_experience' in resultProfile) {
      resultProfile.yearsOfExperience = resultProfile.years_of_experience;
      delete resultProfile.years_of_experience;
    }
    if ('equipment_description' in resultProfile) {
      resultProfile.equipmentDescription = resultProfile.equipment_description;
      delete resultProfile.equipment_description;
    }
    if ('portfolio_images' in resultProfile) {
      resultProfile.portfolioImages = resultProfile.portfolio_images;
      delete resultProfile.portfolio_images;
    }
    if ('available_times' in resultProfile) {
      resultProfile.availableTimes = resultProfile.available_times;
      delete resultProfile.available_times;
    }
    
    return resultProfile as PhotographerProfile;
  }

  // Services
  async getServices(userId: number): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('userId', userId);
    
    if (error || !data) return [];
    return data as Service[];
  }

  async getService(id: number): Promise<Service | undefined> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Service;
  }

  async createService(service: InsertService): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single();

    if (error) throw error;
    return data as Service;
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const { data, error } = await supabase
      .from('services')
      .update(serviceData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as Service;
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
    const field = userType === 'photographer' ? 'photographerId' : 'clientId';
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq(field, userId);
    
    if (error || !data) return [];
    return data as Session[];
  }

  async getSession(id: number): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...session,
        createdAt: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Session;
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .update(sessionData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as Session;
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
      .eq('userId', userId);
    
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
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;
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
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('photographerId', photographerId);
    
    if (error || !data) return [];
    return data as Review[];
  }

  async getReviewsByClient(clientId: number): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewerId', clientId);
    
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
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...review,
        createdAt: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  }

  // Portfolio
  async getPortfolioItems(userId: number): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('userId', userId);
    
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

  private degToRad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

// Exportar uma instância da classe SupabaseStorage
export const supabaseStorage = new SupabaseStorage();