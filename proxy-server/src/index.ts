import { app } from './app.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`proxy-server listening on port ${port}`);
});
