import { createClient } from '@supabase/supabase-js';
import './env';

// Obter as variáveis de ambiente para o Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem ser definidos nas variáveis de ambiente');
  process.exit(1);
}

// Criar e exportar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false
  }
});