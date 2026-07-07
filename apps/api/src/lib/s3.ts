import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

function createS3Client(): S3Client {
  return new S3Client({
    region: env.STORAGE_REGION,
    ...(env.STORAGE_ENDPOINT && { endpoint: env.STORAGE_ENDPOINT }),
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!env.STORAGE_ENDPOINT, // Required for MinIO/local
  });
}

let _s3: S3Client | null = null;
export function getS3(): S3Client {
  _s3 ??= createS3Client();
  return _s3;
}
