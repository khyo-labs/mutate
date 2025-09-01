import axios from 'axios';

const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/v1/auth`,
	withCredentials: true,
});

export const sendResetPassword = async (email: string) => {
	await api.post('/forgot-password', { email });
};

export const verifyEmail = async (token: string) => {
	await api.post('/verify-email', { token });
};

export const resetPassword = async (password: string, token: string) => {
	await api.post('/reset-password', { password, token });
};
