import { Router } from 'express';
import { providers } from '@atmos/providers';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeHuman: formatUptime(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      providers: {
        total: providers.length,
        s3: providers.filter(p => p.access === 's3').length,
        non_s3: providers.filter(p => p.access === 'non_s3').length,
        cross_region: providers.filter(p => p.costNote === 'cross-region').length,
        requester_pays: providers.filter(p => p.s3?.requesterPays === true).length
      }
    });
  });

  router.get('/providers', (req, res) => {
    const { category, access, status } = req.query;
    
    let filteredProviders = providers;
    
    if (category) {
      filteredProviders = filteredProviders.filter(p => p.category === category);
    }
    
    if (access) {
      filteredProviders = filteredProviders.filter(p => p.access === access);
    }
    
    if (status) {
      filteredProviders = filteredProviders.filter(p => p.status === status || (!p.status && status === 'active'));
    }
    
    res.json({
      count: filteredProviders.length,
      providers: filteredProviders.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        access: p.access,
        auth: p.auth,
        costNote: p.costNote,
        status: p.status || 'active'
      }))
    });
  });

  return router;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}