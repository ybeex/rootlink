import type { FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export const REFRESH_TOKEN_COOKIE = 'rootlink_refresh_token';

// Refresh tokens are issued for 30 days (see AuthService.generateTokenPair).
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Sets the refresh token as an httpOnly, Secure (in production), SameSite=Strict
 * cookie scoped to the auth endpoints that need it. The cookie is the ONLY place
 * the refresh token is stored — it is never returned in a JSON response body, so
 * client-side JavaScript (and therefore XSS) cannot read it.
 *
 * SameSite=Strict is safe here because the only consumer is the SPA itself via
 * same-site fetches with credentials:'include'; no cross-site flow needs this
 * cookie attached.
 */
export function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v1/auth',
    domain: env.COOKIE_DOMAIN,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v1/auth',
    domain: env.COOKIE_DOMAIN,
  });
}
