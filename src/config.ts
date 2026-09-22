import dotenv from 'dotenv';
dotenv.config();

export interface GlpiConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  apiV1AppToken?: string;
  apiV1UserToken?: string;
}

export function loadConfig(): GlpiConfig {
  const {
    GLPI_BASE_URL,
    GLPI_CLIENT_ID,
    GLPI_CLIENT_SECRET,
    GLPI_USERNAME,
    GLPI_PASSWORD,
    GLPI_API_V1_APP_TOKEN,
    GLPI_API_V1_USER_TOKEN,
    GLPI_APP_TOKEN,
    GLPI_USER_TOKEN,
  } = process.env;

  if (!GLPI_BASE_URL) throw new Error('GLPI_BASE_URL is required');
  if (!GLPI_CLIENT_ID) throw new Error('GLPI_CLIENT_ID is required');
  if (!GLPI_CLIENT_SECRET) throw new Error('GLPI_CLIENT_SECRET is required');
  if (!GLPI_USERNAME) throw new Error('GLPI_USERNAME is required');
  if (!GLPI_PASSWORD) throw new Error('GLPI_PASSWORD is required');

  return {
    baseUrl: GLPI_BASE_URL.replace(/\/$/, ''),
    clientId: GLPI_CLIENT_ID,
    clientSecret: GLPI_CLIENT_SECRET,
    username: GLPI_USERNAME,
    password: GLPI_PASSWORD,
    apiV1AppToken: GLPI_API_V1_APP_TOKEN || GLPI_APP_TOKEN,
    apiV1UserToken: GLPI_API_V1_USER_TOKEN || GLPI_USER_TOKEN,
  };
}
