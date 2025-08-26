import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authenticateSession } from '../middleware/auth.js';

const authPlugin: FastifyPluginAsync = async function (fastify) {
	fastify.decorate('authenticate', authenticateSession);
};

export default fp(authPlugin);
