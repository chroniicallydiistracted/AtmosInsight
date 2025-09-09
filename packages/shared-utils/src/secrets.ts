import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Secrets management utility
export interface SecretsConfig {
  region?: string;
  enabled?: boolean;
}

let secretsClient: SecretsManagerClient | null = null;

export function initializeSecretsManager(config: SecretsConfig = {}) {
  if (config.enabled !== false && process.env.AWS_REGION) {
    secretsClient = new SecretsManagerClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1'
    });
  }
}

export async function getSecret(secretName: string, fallbackEnvVar?: string): Promise<string> {
  // Try AWS Secrets Manager first if initialized
  if (secretsClient && secretName) {
    try {
      console.log(`Fetching secret from AWS Secrets Manager: ${secretName}`);
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await secretsClient.send(command);
      
      if (response.SecretString) {
        // Parse JSON if it looks like JSON, otherwise return as string
        try {
          const parsed = JSON.parse(response.SecretString);
          // If it's a JSON object with a single key, return that value
          const keys = Object.keys(parsed);
          if (keys.length === 1) {
            return parsed[keys[0]];
          }
          return response.SecretString;
        } catch {
          return response.SecretString;
        }
      }
      
      if (response.SecretBinary) {
        return Buffer.from(response.SecretBinary).toString('utf-8');
      }
    } catch (error) {
      console.warn(`Failed to fetch secret ${secretName}:`, error);
      // Fall through to environment variable fallback
    }
  }

  // Fallback to environment variable
  if (fallbackEnvVar && process.env[fallbackEnvVar]) {
    return process.env[fallbackEnvVar]!;
  }

  // Last resort: try the secret name as an env var
  if (process.env[secretName]) {
    return process.env[secretName]!;
  }

  throw new Error(`Secret not found: ${secretName}${fallbackEnvVar ? ` (fallback: ${fallbackEnvVar})` : ''}`);
}

export async function getSecretOptional(secretName: string, fallbackEnvVar?: string): Promise<string | null> {
  try {
    return await getSecret(secretName, fallbackEnvVar);
  } catch {
    return null;
  }
}

// Helper for getting API keys with common patterns
export async function getApiKey(keyName: string): Promise<string> {
  const secretName = `${keyName}_SECRET`;
  const envVarName = keyName;
  
  return getSecret(secretName, envVarName);
}

export async function getApiKeyOptional(keyName: string): Promise<string | null> {
  const secretName = `${keyName}_SECRET`;
  const envVarName = keyName;
  
  return getSecretOptional(secretName, envVarName);
}