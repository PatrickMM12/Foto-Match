import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do arquivo .env
const result = config({ path: resolve(__dirname, '../.env') });

if (result.error) {
  console.error('Erro ao carregar o arquivo .env:', result.error);
  process.exit(1);
}

export default result;