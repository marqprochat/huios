const DEVELOPMENT_JWT_SECRET = 'huios-secret-key-change-in-production';

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  const environment = process.env.NODE_ENV;

  if (configuredSecret && (
    configuredSecret !== DEVELOPMENT_JWT_SECRET ||
    environment === 'development' ||
    environment === 'test'
  )) {
    return configuredSecret;
  }

  if (environment === 'development' || environment === 'test') {
    return DEVELOPMENT_JWT_SECRET;
  }

  throw new Error('JWT_SECRET is required outside development and test');
}
