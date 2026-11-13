const { z, text } = require('./common');

// bcrypt only uses the first 72 bytes of a password, so longer ones are refused
const password = z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(72, 'Password is too long (max 72)');
const email = z.email({ error: 'A valid email is required' }).trim().toLowerCase();

exports.register = z.object({ name: text('Name', 80), email, password });

exports.login = z.object({
  email: z.string({ error: 'Email is required' }).trim().toLowerCase().min(1, 'Email is required'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

exports.updateMe = z.object({ name: text('Name', 80) });

exports.changePassword = z.object({
  currentPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: password,
});

exports.forgotPassword = z.object({ email });
exports.resetPassword = z.object({
  token: z.string({ error: 'Token is required' }).regex(/^[0-9a-f]{64}$/, 'This reset link is invalid'),
  password,
});
exports.deleteMe = z.object({ password: z.string({ error: 'Password is required' }).min(1, 'Password is required') });
