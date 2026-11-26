// Run the production HTTP server on loopback. Separate processes share one isolated database.
import { once } from 'node:events';
import { createServer } from 'node:net';

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(done => reservation.close(done));
const origin = `http://127.0.0.1:${port}`;
Object.assign(process.env, {NODE_ENV:'test',AUTH_PROVIDER:'local',HOST: '127.0.0.1', PORT: String(port), APP_ORIGIN: origin});
const { server } = await import('../server.mjs');
const { canManageWarehouse } = await import('../backend/procurement.mjs');
const { db, getUser } = await import('../backend/store.mjs');
if (!server.listening) await once(server, 'listening');
process.on('message', message => {
  if (message === 'stop') {
    server.close(() => { db.close(); process.disconnect(); });
    server.closeAllConnections();
  } else if (message.checkWarehouseFor !== undefined) {
    process.send(canManageWarehouse(getUser(message.checkWarehouseFor)));
  }
});
process.send(origin);
