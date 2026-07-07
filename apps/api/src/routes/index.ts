import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { treeRoutes } from './trees.routes.js';
import { personRoutes } from './persons.routes.js';
import { relationshipRoutes } from './relationships.routes.js';
import { mediaRoutes } from './media.routes.js';
import { sourceRoutes } from './sources.routes.js';
import { hintRoutes, gedcomRoutes } from './hints.routes.js';
import { userRoutes } from './users.routes.js';
import { billingRoutes } from './billing.routes.js';
import { adminRoutes } from './admin.routes.js';
import { healthRoutes } from './health.routes.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes,  { prefix: '/health' });
  await app.register(authRoutes,    { prefix: '/v1/auth' });
  await app.register(userRoutes,    { prefix: '/v1/users' });
  await app.register(billingRoutes, { prefix: '/v1/billing' });
  await app.register(adminRoutes,   { prefix: '/v1/admin' });
  await app.register(treeRoutes,    { prefix: '/v1/trees' });
  await app.register(personRoutes,       { prefix: '/v1/trees/:treeId/persons' });
  await app.register(relationshipRoutes, { prefix: '/v1/trees/:treeId/relationships' });
  await app.register(mediaRoutes,        { prefix: '/v1/trees/:treeId/media' });
  await app.register(sourceRoutes,       { prefix: '/v1/trees/:treeId/sources' });
  await app.register(hintRoutes,         { prefix: '/v1/trees/:treeId/hints' });
  await app.register(gedcomRoutes,       { prefix: '/v1/trees/:treeId/gedcom' });
}
