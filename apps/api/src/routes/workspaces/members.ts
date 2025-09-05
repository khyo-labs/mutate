import { FastifyInstance, FastifyRequest } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { auth } from '../../lib/auth.js';
import { validateWorkspaceAccess } from '../../middleware/workspace-access.js';
import { validateWorkspaceAdmin } from '../../middleware/workspace-admin.js';
import { sendEmail } from '../../services/email/index.js';
import { getErrorMessage } from '../../utils/error.js';
import { config } from '../../config.js';

const workspaceParamsSchema = {
  type: 'object',
  properties: {
    workspaceId: { type: 'string' },
  },
  required: ['workspaceId'],
} as const;

const memberParamsSchema = {
  type: 'object',
  properties: {
    workspaceId: { type: 'string' },
    memberId: { type: 'string' },
  },
  required: ['workspaceId', 'memberId'],
} as const;

const invitationParamsSchema = {
  type: 'object',
  properties: {
    workspaceId: { type: 'string' },
    invitationId: { type: 'string' },
  },
  required: ['workspaceId', 'invitationId'],
} as const;

const inviteMemberSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'member'] },
  },
  required: ['email', 'role'],
} as const;

const updateRoleSchema = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ['admin', 'member'] },
  },
  required: ['role'],
} as const;

type RequestWithHeaders = FastifyRequest & {
    headers: {
        authorization?: string;
    }
}

export async function memberRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', validateWorkspaceAccess);

  // List Members and Invitations
  fastify.get<{ Params: FromSchema<typeof workspaceParamsSchema> }>(
    '/',
    async (request, reply) => {
      const { workspaceId } = request.params;

      try {
        const [membersResponse, invitationsResponse] = await Promise.all([
          auth.api.listMembers({
            query: { organizationId: workspaceId },
            headers: (request as RequestWithHeaders).headers,
          }),
          auth.api.listInvitations({
            query: { organizationId: workspaceId },
            headers: (request as RequestWithHeaders).headers,
          }),
        ]);

        const members = Array.isArray(membersResponse) ? membersResponse : [];
        const invitations = Array.isArray(invitationsResponse) ? invitationsResponse : [];

        const data = [
          ...members.map((m) => ({ ...m, type: 'member' })),
          ...invitations.map((i) => ({
            ...i,
            type: 'invitation',
            invitationLink: `${config.BASE_URL}/join?invitation=${i.id}`,
          })),
        ];

        return reply.send({ success: true, data });
      } catch (error) {
        fastify.log.error(error, `Failed to list members for workspace ${workspaceId}`);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'FAILED_TO_LIST_MEMBERS',
            message: getErrorMessage(error, 'Failed to list members'),
          },
        });
      }
    },
  );

  // Invite Member
  fastify.post<{ Params: FromSchema<typeof workspaceParamsSchema>, Body: FromSchema<typeof inviteMemberSchema> }>(
    '/',
    { preHandler: [validateWorkspaceAdmin] },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const { email, role } = request.body;

      try {
        const invitation = await auth.api.createInvitation({
          body: {
            organizationId: workspaceId,
            email,
            role,
          },
          headers: (request as RequestWithHeaders).headers,
        });

        const invitationLink = `${config.BASE_URL}/join?invitation=${invitation.id}`;

        await sendEmail({
          to: email,
          subject: `You're invited to join ${request.workspace?.name}`,
          html: `<p>You have been invited to join the ${request.workspace?.name} workspace. Click <a href="${invitationLink}">here</a> to accept.</p><p>Link: ${invitationLink}</p>`,
        });

        return reply.status(201).send({ success: true, data: { ...invitation, invitationLink } });
      } catch (error) {
        fastify.log.error(error, `Failed to invite member to workspace ${workspaceId}`);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'FAILED_TO_INVITE_MEMBER',
            message: getErrorMessage(error, 'Failed to invite member'),
          },
        });
      }
    },
  );

  // Remove Member
  fastify.delete<{ Params: FromSchema<typeof memberParamsSchema> }>(
    '/:memberId',
    { preHandler: [validateWorkspaceAdmin] },
    async (request, reply) => {
        const { workspaceId, memberId } = request.params;
        try {
            await auth.api.removeMember({
                body: {
                    organizationId: workspaceId,
                    memberIdOrEmail: memberId,
                },
                headers: (request as RequestWithHeaders).headers,
            });
            return reply.send({ success: true });
        } catch (error) {
            fastify.log.error(error, `Failed to remove member ${memberId} from workspace ${workspaceId}`);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'FAILED_TO_REMOVE_MEMBER',
                    message: getErrorMessage(error, 'Failed to remove member'),
                },
            });
        }
    },
  );

  // Update Member Role
  fastify.put<{ Params: FromSchema<typeof memberParamsSchema>; Body: FromSchema<typeof updateRoleSchema> }>(
    '/:memberId/role',
    { preHandler: [validateWorkspaceAdmin] },
    async (request, reply) => {
        const { workspaceId, memberId } = request.params;
        const { role } = request.body;
        try {
            await auth.api.updateMemberRole({
                body: {
                    organizationId: workspaceId,
                    memberId,
                    role,
                },
                headers: (request as RequestWithHeaders).headers,
            });
            return reply.send({ success: true });
        } catch (error) {
            fastify.log.error(error, `Failed to update role for member ${memberId} in workspace ${workspaceId}`);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'FAILED_TO_UPDATE_ROLE',
                    message: getErrorMessage(error, 'Failed to update member role'),
                },
            });
        }
    },
  );

  // Cancel Invitation
  fastify.delete<{ Params: FromSchema<typeof invitationParamsSchema> }>(
    '/invitations/:invitationId',
    { preHandler: [validateWorkspaceAdmin] },
    async (request, reply) => {
        const { invitationId } = request.params;
        try {
            await auth.api.cancelInvitation({
                body: {
                    invitationId,
                },
                headers: (request as RequestWithHeaders).headers,
            });
            return reply.send({ success: true });
        } catch (error) {
            fastify.log.error(error, `Failed to cancel invitation ${invitationId}`);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'FAILED_TO_CANCEL_INVITATION',
                    message: getErrorMessage(error, 'Failed to cancel invitation'),
                },
            });
        }
    },
  );

  // Resend Invitation
  fastify.post<{ Params: FromSchema<typeof invitationParamsSchema> }>(
      '/invitations/:invitationId/resend',
      { preHandler: [validateWorkspaceAdmin] },
      async (request, reply) => {
          const { invitationId, workspaceId } = request.params;

          try {
              const invitation = await auth.api.getInvitation({
                  query: { id: invitationId },
                  headers: (request as RequestWithHeaders).headers,
              });

              if (!invitation) {
                  return reply.status(404).send({ success: false, error: { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found' }});
              }

              const newInvitation = await auth.api.createInvitation({
                  body: {
                      organizationId: workspaceId,
                      email: invitation.email,
                      role: invitation.role,
                      resend: true,
                  },
                  headers: (request as RequestWithHeaders).headers,
              });

              const invitationLink = `${config.BASE_URL}/join?invitation=${newInvitation.id}`;

              await sendEmail({
                  to: invitation.email,
                  subject: `Reminder: You're invited to join ${request.workspace?.name}`,
                  html: `<p>You have been invited to join the ${request.workspace?.name} workspace. Click <a href="${invitationLink}">here</a> to accept.</p><p>Link: ${invitationLink}</p>`,
              });

              return reply.send({ success: true, data: newInvitation });
          } catch (error) {
              fastify.log.error(error, `Failed to resend invitation ${invitationId}`);
              return reply.status(500).send({
                  success: false,
                  error: {
                      code: 'FAILED_TO_RESEND_INVITATION',
                      message: getErrorMessage(error, 'Failed to resend invitation'),
                  },
              });
          }
      }
  );
}
