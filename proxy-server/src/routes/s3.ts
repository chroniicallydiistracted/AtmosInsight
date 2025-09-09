import { Router } from 'express';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getProvider } from '@atmos/providers';
import { AppError } from '../middleware/errorHandler.js';

export function createS3Router(): Router {
  const router = Router();

  // S3 object proxy: /api/s3/:provider/*
  router.get('/:provider/*', async (req, res, next) => {
    try {
      const { provider: providerId } = req.params;
      const objectPath = req.params[0]; // Everything after the provider ID
      
      const provider = getProvider(providerId);
      if (!provider) {
        const error: AppError = new Error(`Unknown provider: ${providerId}`);
        error.status = 404;
        return next(error);
      }

      if (provider.access !== 's3' || !provider.s3) {
        const error: AppError = new Error(`Provider ${providerId} is not an S3 provider`);
        error.status = 400;
        return next(error);
      }

      const { bucket, region, requesterPays } = provider.s3;
      
      // Create S3 client with appropriate region
      const s3Client = new S3Client({ 
        region,
        forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true'
      });

      // Build S3 key from object path and provider prefix examples
      const s3Key = objectPath;
      
      // Set up command parameters
      const params = {
        Bucket: bucket,
        Key: s3Key,
        ...(requesterPays && { RequestPayer: 'requester' as const })
      };

      // Handle HEAD requests for metadata
      if (req.method === 'HEAD') {
        const command = new HeadObjectCommand(params);
        const response = await s3Client.send(command);
        
        // Set response headers from S3 metadata
        if (response.ContentType) res.setHeader('Content-Type', response.ContentType);
        if (response.ContentLength) res.setHeader('Content-Length', response.ContentLength);
        if (response.LastModified) res.setHeader('Last-Modified', response.LastModified.toUTCString());
        if (response.ETag) res.setHeader('ETag', response.ETag);
        
        // Set cache headers based on provider type
        setCacheHeaders(res, provider);
        
        return res.status(200).end();
      }

      // Handle GET requests
      const command = new GetObjectCommand(params);
      
      // For development, we'll use signed URLs to avoid streaming large files
      // In production, you might want to stream directly
      if (process.env.NODE_ENV === 'development' && req.query.signed === 'true') {
        const signedUrl = await getSignedUrl(s3Client, command, { 
          expiresIn: 3600 // 1 hour
        });
        
        return res.json({
          signedUrl,
          bucket,
          key: s3Key,
          region,
          expiresIn: 3600
        });
      }

      // Stream the object directly
      const response = await s3Client.send(command);
      
      // Set response headers from S3 metadata
      if (response.ContentType) res.setHeader('Content-Type', response.ContentType);
      if (response.ContentLength) res.setHeader('Content-Length', response.ContentLength);
      if (response.LastModified) res.setHeader('Last-Modified', response.LastModified.toUTCString());
      if (response.ETag) res.setHeader('ETag', response.ETag);
      
      // Set cache headers based on provider type
      setCacheHeaders(res, provider);
      
      // Stream the body
      if (response.Body) {
        const stream = response.Body as NodeJS.ReadableStream;
        stream.pipe(res);
      } else {
        res.status(204).end();
      }

    } catch (error) {
      console.error('S3 proxy error:', error);
      
      if (error instanceof Error) {
        const appError: AppError = new Error(`S3 request failed: ${error.message}`);
        appError.status = 500;
        
        // Handle specific AWS errors
        if ('Code' in error) {
          switch ((error as any).Code) {
            case 'NoSuchKey':
            case 'NoSuchBucket':
              appError.status = 404;
              appError.message = 'Object not found';
              break;
            case 'AccessDenied':
              appError.status = 403;
              appError.message = 'Access denied';
              break;
          }
        }
        
        return next(appError);
      }
      
      next(error);
    }
  });

  return router;
}

function setCacheHeaders(res: any, provider: any): void {
  // Dynamic data gets short cache
  if (provider.category === 'weather' || provider.category === 'lightning') {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  }
  // Static data gets longer cache
  else if (provider.category === 'satellite' || provider.category === 'elevation') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Default cache
  else {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  }
}