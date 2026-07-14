import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { EnvConfig } from '../../config/env.validation';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const endpoint = this.config.get('S3_ENDPOINT');
    this.bucket = this.config.get('S3_BUCKET');

    this.client = new S3Client({
      region: this.config.get('S3_REGION'),
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
      credentials:
        this.config.get('S3_ACCESS_KEY') && this.config.get('S3_SECRET_KEY')
          ? {
              accessKeyId: this.config.get('S3_ACCESS_KEY')!,
              secretAccessKey: this.config.get('S3_SECRET_KEY')!,
            }
          : undefined,
    });
  }

  async upload(key: string, content: Buffer | string, contentType = 'application/octet-stream'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof content === 'string' ? Buffer.from(content) : content,
        ContentType: contentType,
      }),
    );

    this.logger.debug(`Uploaded object: ${key}`);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const stream = response.Body;
    if (!stream) throw new Error(`Object not found: ${key}`);

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
