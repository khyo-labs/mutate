import { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		authenticate: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
		requireVerifiedEmail: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
	}

	interface FastifyRequest {
		currentUser?: {
			id: string;
			organizationId: string;
			role: string;
			isAdmin: boolean;
			adminPermissions?: unknown;
		};
		workspace?: {
			id: string;
			name: string;
			slug: string | null;
			memberRole: string;
		};
	}
}
