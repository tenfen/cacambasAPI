import { Expo } from 'expo-server-sdk';

// Criar instância do Expo SDK
const expo = new Expo();

/**
 * Envia notificação push para um ou múltiplos dispositivos
 */
export async function sendPushNotification(tokens, title, message, data = {}) {
  console.log('📡 ===== PUSH NOTIFICATION SERVICE =====');
  console.log('📝 Título:', title);
  console.log('💬 Mensagem:', message);
  console.log('🎯 Data:', JSON.stringify(data));
  console.log('🔑 Tokens recebidos:', tokens.length);
  
  // Filtrar tokens válidos
  const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));
  console.log(`✅ Tokens válidos: ${validTokens.length}/${tokens.length}`);
  
  if (validTokens.length === 0) {
    console.log('⚠️ Nenhum token válido encontrado');
    tokens.forEach((token, index) => {
      console.log(`Token ${index + 1}: ${token} - Válido? ${Expo.isExpoPushToken(token)}`);
    });
    return { success: false, message: 'Nenhum token válido' };
  }

  // Criar mensagens
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: message,
    data: data,
    priority: 'high',
  }));
  
  console.log('📨 Mensagens criadas:', messages.length);

  // Dividir em chunks (Expo aceita max 100 por vez)
  const chunks = expo.chunkPushNotifications(messages);
  console.log(`📦 Dividido em ${chunks.length} chunks`);
  const tickets = [];

  try {
    // Enviar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🚀 Enviando chunk ${i + 1}/${chunks.length} com ${chunk.length} mensagens`);
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(`📬 Tickets recebidos do chunk ${i + 1}:`, JSON.stringify(ticketChunk, null, 2));
      tickets.push(...ticketChunk);
    }

    console.log('✅ Push notifications enviadas com sucesso!');
    console.log('🎫 Total de tickets:', tickets.length);
    console.log('📊 Tickets:', JSON.stringify(tickets, null, 2));
    return { success: true, tickets };
  } catch (error) {
    console.error('❌ ===== ERRO AO ENVIAR PUSH =====');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Valida se um token é válido
 */
export function isValidPushToken(token) {
  return Expo.isExpoPushToken(token);
}
