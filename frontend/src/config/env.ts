/**
 * VEL Finance — Environment Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Type-safe accessor for Vite environment variables.
 *
 * Rules:
 * - Always use getEnvConfig() — never access import.meta.env directly.
 * - All required variables throw an error at startup if missing.
 * - Centralizes all env reading to one place.
 */

interface EnvConfig {
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

let cachedConfig: EnvConfig | null = null;

/**
 * Returns validated, typed environment configuration.
 * Throws an Error if any required variable is missing.
 */
export function getEnvConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'];
  if (!apiBaseUrl) {
    throw new Error(
      '[VEL Finance] VITE_API_BASE_URL is not defined. ' +
      'Copy .env.example to .env and set the variable.',
    );
  }

  cachedConfig = {
    apiBaseUrl: String(apiBaseUrl),
    appName: String(import.meta.env['VITE_APP_NAME'] ?? 'VEL Finance - Group Finance'),
    appVersion: String(import.meta.env['VITE_APP_VERSION'] ?? '1.0.0'),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };

  return cachedConfig;
}
