import * as SecureStore from 'expo-secure-store';
import { GROQ_API_URL, GROQ_MODEL } from '../constants';

const SECURE_KEY = 'varavuselavu_groq_api_key';

/**
 * Retrieves the stored Groq API key from SecureStore.
 */
export async function getGroqApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEY);
  } catch (err) {
    console.error('Failed to read Groq API key:', err);
    return null;
  }
}

/**
 * Saves the Groq API key to SecureStore.
 */
export async function setGroqApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY, key.trim());
}

/**
 * Deletes the Groq API key from SecureStore.
 */
export async function deleteGroqApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEY);
}

/**
 * Tests a Groq API key by querying the models endpoint.
 */
export async function testGroqApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      return { valid: true };
    }

    if (res.status === 401) {
      return { valid: false, error: 'Invalid API key (401 Unauthorized).' };
    }

    if (res.status === 429) {
      return { valid: true, error: 'Key is valid, but rate limit (429) was reached.' };
    }

    const data = await res.json().catch(() => ({}));
    return {
      valid: false,
      error: data?.error?.message || `Groq API returned status ${res.status}.`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { valid: false, error: 'Connection timed out. Check your internet connection.' };
    }
    return { valid: false, error: err.message || 'Network error while testing key.' };
  }
}

