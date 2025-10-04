import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authenticate } from '@/middleware/auth.js';

const authPlugin: FastifyPluginAsync = async function (fastify) {
	fastify.decorate('authenticate', authenticate);
};

export default fp(authPlugin);
