/**
 * Formata um preço em centavos para exibição como moeda em reais (R$)
 * @param cents - Valor em centavos (inteiro)
 * @returns String formatada (ex: "R$ 150,00")
 */
export function formatPriceBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  
  // Converter centavos para reais
  const amount = cents / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

/**
 * Converte um valor em reais (exibido como string) para centavos (inteiro)
 * @param brlString - String com valor em reais (ex: "R$ 150,00" ou "150,00" ou "150")
 * @returns Valor em centavos como número inteiro
 */
export function convertBRLtoCents(brlString: string): number {
  if (!brlString) return 0;
  
  // Remover símbolo de moeda, separadores de milhar e substituir vírgula por ponto
  const cleanedValue = brlString
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
    
  // Converter para float e multiplicar por 100 para obter centavos
  const floatValue = parseFloat(cleanedValue);
  
  // Se não for um número válido, retorna 0
  if (isNaN(floatValue)) return 0;
  
  // Arredondar para evitar problemas de ponto flutuante
  return Math.round(floatValue * 100);
}

/**
 * Formata um valor decimal para centavos (usado no envio para API)
 * @param decimalValue - Valor decimal (ex: 150.50)
 * @returns Valor em centavos como número inteiro
 */
export function convertDecimalToCents(decimalValue: number | null | undefined): number {
  if (decimalValue === null || decimalValue === undefined) return 0;
  
  return Math.round(decimalValue * 100);
}

/**
 * Converte centavos para valor decimal (usado ao receber da API)
 * @param cents - Valor em centavos (inteiro)
 * @returns Valor decimal
 */
export function convertCentsToDecimal(cents: number | null | undefined): number {
  if (cents === null || cents === undefined) return 0;
  
  return cents / 100;
} 