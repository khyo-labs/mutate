import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authenticateJWT } from '../middleware/auth.js';

const authPlugin: FastifyPluginAsync = async function (fastify) {
	fastify.decorate('authenticate', authenticateJWT);
};

export default fp(authPlugin);
