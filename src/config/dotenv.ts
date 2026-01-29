import dotenv from 'dotenv';

// Carrega o arquivo .env apropriado conforme o ambiente
const CURRENT_ENV = process.env.NODE_ENV || 'development';
const ENV_FILE = CURRENT_ENV === 'development' ? '.env' : '.env.production';

dotenv.config({ path: ENV_FILE });

// Falha rápida: valida variáveis obrigatórias e mostra quais faltam
const REQUIRED_ENV_VARS: string[] = [
  // URLs e chaves de serviços externos
  'BACKEND_PUBLIC_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GOOGLE_CLIENT_ID',
  // E-mail (transporter)
  'EMAIL_USER',
  'EMAIL_PASS',
  'COOKIE_SAME_SITE',
  // AWS S3
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME'
];

// Variáveis opcionais com valores padrão
const OPTIONAL_ENV_VARS: Record<string, string> = {
  'BCRYPT_SALT_ROUNDS': '12',
};

// Em produção, exige também DB e RabbitMQ
if (CURRENT_ENV === 'production') {
  REQUIRED_ENV_VARS.push(
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'RABBITMQ_URL',
  );
}

const missing: string[] = REQUIRED_ENV_VARS.filter((key) => {
  const v = process.env[key];
  return v === undefined || String(v).trim() === '';
});

if (missing.length) {
  const list = missing.join(', ');
  const msg = [
    'Variáveis de ambiente ausentes:',
    list,
    `(arquivo carregado: ${ENV_FILE}, NODE_ENV=${CURRENT_ENV})`,
    'Defina-as no ambiente ou no arquivo correspondente para evitar erros silenciosos.'
  ].join(' ');
  throw new Error(msg);
}

export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'sports_highlights',
  },
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mail_user: process.env.EMAIL_USER || '',
  mail_pass: process.env.EMAIL_PASS || '',
  mail_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  rabbitmqUrl: process.env.RABBITMQ_URL || '',
  dev_email: process.env.DEV_EMAIL || 'hendriusfelix.dev@gmail.com',

  backend_public_url: process.env.BACKEND_PUBLIC_URL || '',
  cookie_same_site: process.env.COOKIE_SAME_SITE || 'lax',
  jwt_secret: process.env.JWT_SECRET || 'default_secret',
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '1h',
  bcrypt_salt_rounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
  cookie_max_age: parseInt(process.env.COOKIE_MAX_AGE || String(1000 * 60 * 60), 10), // 1 hora

  aws_access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
  aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
  aws_region: process.env.AWS_REGION || 'sa-east-1',
  s3_bucket_name: process.env.S3_BUCKET_NAME || ''
}