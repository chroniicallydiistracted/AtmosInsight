import 'dotenv/config';
import { app } from './app.js';
import { PORTS } from '@atmos/shared-utils';

const port = process.env.PORT ? Number(process.env.PORT) : PORTS.PROXY;
app.listen(port, () => {
  console.log(`proxy-server listening on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/api/healthz`);
});
