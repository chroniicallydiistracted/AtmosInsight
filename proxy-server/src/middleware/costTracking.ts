import { Request, Response, NextFunction } from 'express';

// Cost tracking middleware to annotate responses with cost information
export const costTracking = (req: Request, res: Response, next: NextFunction): void => {
  // Add cost tracking headers based on request patterns
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send to add cost headers
  res.send = function(body: any) {
    addCostHeaders(req, res);
    return originalSend.call(this, body);
  };

  // Override res.json to add cost headers
  res.json = function(obj: any) {
    addCostHeaders(req, res);
    return originalJson.call(this, obj);
  };

  next();
};

function addCostHeaders(req: Request, res: Response): void {
  const path = req.path;
  
  // Check for S3 routes that might have cost implications
  if (path.startsWith('/api/s3/')) {
    const pathParts = path.split('/');
    const providerId = pathParts[3];
    
    // Set provider ID header
    if (providerId) {
      res.setHeader('x-provider-id', providerId);
    }
    
    // Mark cross-region costs based on known provider patterns
    if (providerId?.includes('landsat') || 
        providerId?.includes('copernicus') || 
        providerId?.includes('sentinel')) {
      res.setHeader('x-cost-note', 'cross-region');
    } else if (providerId?.includes('noaa-') || 
               providerId?.includes('goes') ||
               providerId?.includes('hrrr') ||
               providerId?.includes('gfs')) {
      res.setHeader('x-cost-note', 'same-region');
    }
  }
  
  // Mark external service calls
  if (path.startsWith('/api/gibs/') ||
      path.startsWith('/api/air/') ||
      path.startsWith('/api/point/') ||
      path.startsWith('/api/space/') ||
      path.startsWith('/api/basemap/') ||
      path.startsWith('/api/owm/')) {
    res.setHeader('x-cost-note', 'external-service');
  }
}