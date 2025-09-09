/**
 * AtmosInsight S3 Client
 * Direct S3 access for provider buckets with region-aware routing
 */

export interface S3Provider {
  id: string;
  name: string;
  category: string;
  access: 's3';
  s3: {
    bucket: string;
    region: string;
    requesterPays: boolean;
    prefixExamples: string[];
    snsTopic?: string;
  };
  auth: 'none' | 'earthdata' | 'requester-pays';
  license: string;
  attribution: string;
  notes?: string;
  costNote: string;
}

export interface S3ObjectMeta {
  key: string;
  lastModified: Date;
  size: number;
  contentType?: string;
  etag: string;
}

export interface S3ListResult {
  objects: S3ObjectMeta[];
  continuationToken?: string;
  hasMore: boolean;
}

export class AtmosS3Client {
  private providers: Map<string, S3Provider> = new Map();

  constructor(providers: S3Provider[]) {
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  /**
   * Get provider configuration by ID
   */
  getProvider(providerId: string): S3Provider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * List all available providers
   */
  listProviders(): S3Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by category
   */
  getProvidersByCategory(category: string): S3Provider[] {
    return Array.from(this.providers.values()).filter(p => p.category === category);
  }

  /**
   * Build direct HTTPS URL for S3 object
   */
  buildObjectUrl(providerId: string, key: string): string {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const { bucket, region } = provider.s3;
    
    // Use virtual-hosted-style URLs with region-specific endpoints
    if (region === 'us-east-1') {
      return `https://${bucket}.s3.amazonaws.com/${key}`;
    } else {
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Build list URL for S3 prefix
   */
  buildListUrl(providerId: string, prefix: string, maxKeys = 1000, continuationToken?: string): string {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const { bucket, region } = provider.s3;
    const endpoint = region === 'us-east-1' 
      ? `https://${bucket}.s3.amazonaws.com`
      : `https://${bucket}.s3.${region}.amazonaws.com`;

    const params = new URLSearchParams({
      'list-type': '2',
      prefix,
      'max-keys': maxKeys.toString()
    });

    if (continuationToken) {
      params.set('continuation-token', continuationToken);
    }

    return `${endpoint}/?${params.toString()}`;
  }

  /**
   * Fetch S3 object with proper headers
   */
  async fetchObject(providerId: string, key: string): Promise<Response> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const url = this.buildObjectUrl(providerId, key);
    const headers: HeadersInit = {};

    // Add requester-pays header if needed
    if (provider.s3.requesterPays) {
      headers['x-amz-request-payer'] = 'requester';
    }

    // Add cost awareness header
    headers['x-cost-note'] = provider.costNote;
    headers['x-provider-id'] = providerId;

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`S3 fetch failed: ${response.status} ${response.statusText} for ${url}`);
    }

    return response;
  }

  /**
   * List S3 objects in a prefix
   */
  async listObjects(providerId: string, prefix: string, maxKeys = 1000, continuationToken?: string): Promise<S3ListResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const url = this.buildListUrl(providerId, prefix, maxKeys, continuationToken);
    const headers: HeadersInit = {};

    // Add requester-pays header if needed
    if (provider.s3.requesterPays) {
      headers['x-amz-request-payer'] = 'requester';
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`S3 list failed: ${response.status} ${response.statusText} for ${url}`);
    }

    const xmlText = await response.text();
    return this.parseListResponse(xmlText);
  }

  /**
   * Parse S3 ListObjectsV2 XML response
   */
  private parseListResponse(xmlText: string): S3ListResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const objects: S3ObjectMeta[] = [];
    const contents = doc.querySelectorAll('Contents');

    for (const content of contents) {
      const key = content.querySelector('Key')?.textContent;
      const lastModified = content.querySelector('LastModified')?.textContent;
      const size = content.querySelector('Size')?.textContent;
      const etag = content.querySelector('ETag')?.textContent;

      if (key && lastModified && size && etag) {
        objects.push({
          key,
          lastModified: new Date(lastModified),
          size: parseInt(size, 10),
          etag: etag.replace(/"/g, '')
        });
      }
    }

    const nextContinuationToken = doc.querySelector('NextContinuationToken')?.textContent;
    const isTruncated = doc.querySelector('IsTruncated')?.textContent === 'true';

    return {
      objects,
      continuationToken: nextContinuationToken || undefined,
      hasMore: isTruncated
    };
  }

  /**
   * Get recent objects from a time-based prefix
   */
  async getRecentObjects(providerId: string, basePrefix: string, hours: number = 24, maxObjects: number = 100): Promise<S3ObjectMeta[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Generate time-based prefixes for the last N hours
    const now = new Date();
    const prefixes: string[] = [];

    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const year = time.getUTCFullYear();
      const month = String(time.getUTCMonth() + 1).padStart(2, '0');
      const day = String(time.getUTCDate()).padStart(2, '0');
      const hour = String(time.getUTCHours()).padStart(2, '0');

      // Try different common patterns
      const patterns = [
        `${basePrefix}${year}/${month}/${day}/${hour}/`,
        `${basePrefix}${year}${month}${day}/${hour}/`,
        `${basePrefix}${year}/${month}/${day}/`,
        `${basePrefix}${year}.${month}.${day}/`
      ];

      prefixes.push(...patterns);
    }

    const allObjects: S3ObjectMeta[] = [];

    // Search recent prefixes
    for (const prefix of prefixes.slice(0, 10)) { // Limit to avoid too many requests
      try {
        const result = await this.listObjects(providerId, prefix, Math.min(maxObjects, 100));
        allObjects.push(...result.objects);
        
        if (allObjects.length >= maxObjects) break;
      } catch (error) {
        // Continue to next prefix if this one fails
        console.debug(`Failed to list ${prefix}:`, error);
      }
    }

    // Sort by last modified time (newest first) and limit
    return allObjects
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, maxObjects);
  }

  /**
   * Check if a provider bucket is accessible
   */
  async checkBucketAccess(providerId: string): Promise<{ accessible: boolean; error?: string; sampleObjects?: number }> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { accessible: false, error: 'Provider not found' };
    }

    try {
      // Try to list a small number of objects with common prefixes
      const testPrefixes = provider.s3.prefixExamples || [''];
      
      for (const prefix of testPrefixes) {
        try {
          const result = await this.listObjects(providerId, prefix, 10);
          return { 
            accessible: true, 
            sampleObjects: result.objects.length 
          };
        } catch (error) {
          continue; // Try next prefix
        }
      }

      return { accessible: false, error: 'No accessible prefixes found' };
    } catch (error) {
      return { 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Create S3 client from providers.json
 */
export async function createS3Client(): Promise<AtmosS3Client> {
  try {
    // In a real app, this would load from your providers.json
    const response = await fetch('/api/catalog/providers');
    const data = await response.json();
    
    // Filter to only S3 providers
    const s3Providers = data.providers.filter((p: any) => p.access === 's3');
    
    return new AtmosS3Client(s3Providers);
  } catch (error) {
    console.error('Failed to load providers:', error);
    throw new Error('Could not initialize S3 client');
  }
}
