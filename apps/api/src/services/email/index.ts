import sgMail from '@sendgrid/mail';

import { config } from '@/config.js';
import { logger } from '@/utils/logger.js';

sgMail.setApiKey(config.SENDGRID_API_KEY);

export type EmailParams = {
	to: string;
	subject: string;
	html: string;
};

export type EmailArgs = {
	user: any;
	url: string;
};

export async function sendEmail({ to, subject, html }: EmailParams) {
	const msg = {
		to,
		from: config.SENDGRID_FROM_EMAIL,
		subject,
		html,
	};

	try {
		await sgMail.send(msg);
		logger.info(`Email sent to ${to} with subject "${subject}"`);
	} catch (error) {
		logger.error('Error sending email');
		if (error && typeof error === 'object' && 'response' in error) {
			const responseError = error as { response: { body: any } };
			logger.error(responseError.response.body);
		} else {
			logger.error(error);
		}
		throw new Error('Failed to send email');
	}
}
