import { S3Client } from '@aws-sdk/client-s3';
import { config } from './dotenv';

if (!config.aws_region || !config.aws_access_key_id || !config.aws_secret_access_key) {
  throw new Error('Variaveis de ambiente AWS não estão definidos nas variáveis de ambiente.');
}

export const s3Client = new S3Client({
  region: config.aws_region,
  credentials: {
    accessKeyId: config.aws_access_key_id,
    secretAccessKey: config.aws_secret_access_key,
  },
})