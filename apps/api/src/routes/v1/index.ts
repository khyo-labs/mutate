import { FastifyInstance } from 'fastify';

import { adminRoutes } from './admin/index.js';
import { authRoutes } from './auth.js';
import { betterAuthRoutes } from './better-auth.js';
import { billingRoutes } from './billing.js';
import { convertRoutes } from './convert.js';
import { fileRoutes } from './files.js';
import { formatsRoutes } from './formats.js';
import { healthRoutes } from './health.js';
import { mutateRoutes } from './mutate.js';
import { securityRoutes } from './security.js';
import { userRoutes } from './user.js';
import { workspaceRoutes } from './workspaces/index.js';

export async function v1Routes(fastify: FastifyInstance) {
	await fastify.register(healthRoutes, { prefix: '/v1/health' });
	await fastify.register(betterAuthRoutes, { prefix: '/v1/auth' });
	await fastify.register(authRoutes, { prefix: '/v1/auth/custom' });
	await fastify.register(securityRoutes, { prefix: '/v1/security' });
	await fastify.register(workspaceRoutes, { prefix: '/v1/workspace' });
	await fastify.register(mutateRoutes, { prefix: '/v1/mutate' });
	await fastify.register(fileRoutes, { prefix: '/v1/files' });
	await fastify.register(billingRoutes, { prefix: '/v1/billing' });
	await fastify.register(adminRoutes, { prefix: '/v1/admin' });
	await fastify.register(userRoutes, { prefix: '/v1/user' });
	await fastify.register(convertRoutes, { prefix: '/v1/convert' });
	await fastify.register(formatsRoutes, { prefix: '/v1/formats' });
}
