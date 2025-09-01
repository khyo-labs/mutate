import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authRoutes } from '../routes/auth.js';
import { betterAuthRoutes } from '../routes/better-auth.js';

const authRoutesPlugin: FastifyPluginAsync = async function (fastify) {
	fastify.register(authRoutes);
	fastify.register(betterAuthRoutes);
};

export default fp(authRoutesPlugin);
