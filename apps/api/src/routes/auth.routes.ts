import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  enableTotpSchema,
  type RegisterInput,
  type LoginInput,
} from '@rootlink/shared';
import { authenticate } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE } from '../lib/cookies.js';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // ── Register ────────────────────────────────────────────────────────────
  app.post<{ Body: RegisterInput }>('/register', {
    config: { rateLimit: { max: 3, timeWindow: '1h' } },
  }, async (request, reply) => {
    await handleIdempotency(request, reply);
    if (reply.sent) return;
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
        fields: formatZodError(parsed.error),
      });
    }
    const user = await authService.register(parsed.data);
    return reply.status(201).send({
      success: true,
      data: { user, message: 'Account created. Please verify your email.' },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────
  app.post<{ Body: LoginInput }>('/login', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid credentials format', 400);
    }
    const tokens = await authService.login(
      parsed.data,
      request.ip,
      request.headers['user-agent'] ?? '',
    );

    // The refresh token is set as an httpOnly cookie and is never included in
    // the JSON response — this is the only thing an XSS-injected script could
    // otherwise read via localStorage/sessionStorage (audit fix #2).
    setRefreshTokenCookie(reply, tokens.refreshToken);

    return reply.send({
      success: true,
      data: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Refresh ─────────────────────────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw createAppError('TOKEN_INVALID', 'No refresh token cookie present', 401);
    }

    const tokens = await authService.refresh(
      refreshToken,
      request.ip,
      request.headers['user-agent'] ?? '',
    );

    // Rotation: the old cookie value is now revoked server-side; overwrite
    // with the newly-issued token.
    setRefreshTokenCookie(reply, tokens.refreshToken);

    return reply.send({
      success: true,
      data: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────────
  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    await authService.logout(request.user.sub);
    clearRefreshTokenCookie(reply);
    return reply.status(204).send();
  });

  // ── Verify email ────────────────────────────────────────────────────────
  app.get<{ Querystring: { token: string } }>('/verify-email', async (request, reply) => {
    const { token } = request.query;
    if (!token) throw createAppError('VALIDATION_ERROR', 'token is required', 400);
    await authService.verifyEmail(token);
    // Redirect to web app after verification
    return reply.redirect(`${process.env['APP_URL'] ?? 'http://localhost:3000'}/login?verified=1`);
  });

  // ── Forgot password ─────────────────────────────────────────────────────
  app.post<{ Body: { email: string } }>('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1h' } },
  }, async (request, reply) => {
    const { email } = request.body;
    if (email && typeof email === 'string') {
      await authService.forgotPassword(email);
    }
    // Always return 200 to prevent email enumeration
    return reply.send({
      success: true,
      data: { message: 'If an account exists, a reset link has been sent.' },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Reset password ──────────────────────────────────────────────────────
  app.post<{ Body: { token: string; password: string } }>('/reset-password', async (request, reply) => {
    const { token, password } = request.body;
    if (!token || !password) {
      throw createAppError('VALIDATION_ERROR', 'token and password are required', 400);
    }
    await authService.resetPassword(token, password);
    return reply.send({
      success: true,
      data: { message: 'Password reset successfully. Please sign in.' },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── TOTP setup ──────────────────────────────────────────────────────────
  app.post('/totp/setup', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await authService.setupTotp(request.user.sub);
    return reply.send({
      success: true,
      data: result,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  app.post<{ Body: { totpCode: string } }>(
    '/totp/confirm',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsed = enableTotpSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'totpCode must be 6 digits', 400);
      }
      await authService.confirmTotp(request.user.sub, parsed.data.totpCode);
      return reply.send({
        success: true,
        data: { message: 'Two-factor authentication enabled.' },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
