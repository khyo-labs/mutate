import { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		authenticate: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
	}

	interface FastifyRequest {
		currentUser?: {
			id: string;
			organizationId: string;
			role: string;
		};
	}
}
