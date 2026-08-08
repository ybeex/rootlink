import { Queue } from 'bullmq';
import { getRedis } from '../lib/redis.js';
import { QUEUE_NAMES } from '@rootlink/shared';

function createQueue<T>(name: string) {
  return new Queue<T>(name, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });
}

export interface MediaProcessingJob {
  assetId: string;
  treeId: string;
  storageKey: string;
  type: string;
}

export interface EmailNotificationJob {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
}

export interface GedcomImportJob {
  treeId: string;
  userId: string;
  storageKey: string;
}

export interface GedcomExportJob {
  treeId: string;
  userId: string;
  requestId: string;
}

export interface AiHintJob {
  personId: string;
  treeId: string;
  userId: string;
}

export interface AiBioJob {
  personId: string;
  treeId: string;
  userId: string;
}

export interface DataQualityJob {
  personId: string;
  treeId: string;
}

export interface MediaDeletionJob {
  /** One or more S3/MinIO object keys to delete (an asset's original file plus any thumbnail variants). */
  storageKeys: string[];
}

export interface DnaProcessingJob {
  kitId: string;
}

export const mediaProcessingQueue = createQueue<MediaProcessingJob>(QUEUE_NAMES.mediaProcessing);
export const emailQueue = createQueue<EmailNotificationJob>(QUEUE_NAMES.emailNotifications);
export const gedcomImportQueue = createQueue<GedcomImportJob>(QUEUE_NAMES.gedcomImport);
export const gedcomExportQueue = createQueue<GedcomExportJob>(QUEUE_NAMES.gedcomExport);
export const aiHintQueue = createQueue<AiHintJob>(QUEUE_NAMES.aiHintGeneration);
export const aiBioQueue = createQueue<AiBioJob>(QUEUE_NAMES.aiBioGeneration);
export const dataQualityQueue = createQueue<DataQualityJob>(QUEUE_NAMES.dataQualityScore);
export const mediaDeletionQueue = createQueue<MediaDeletionJob>(QUEUE_NAMES.mediaDeletion);
export const dnaProcessingQueue = createQueue<DnaProcessingJob>(QUEUE_NAMES.dnaProcessing);

export const allQueues = [
  mediaProcessingQueue,
  emailQueue,
  gedcomImportQueue,
  gedcomExportQueue,
  aiHintQueue,
  aiBioQueue,
  dataQualityQueue,
  mediaDeletionQueue,
  dnaProcessingQueue,
];
