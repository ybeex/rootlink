import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { nanoid } from 'nanoid';
import { getDb, users, refreshTokens } from '@rootlink/db';
import { eq, and, gt, isNull, asc } from 'drizzle-orm';
import type { RegisterInput, LoginInput } from '@rootlink/shared';
import { createAppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { emailQueue } from '../workers/queues.js';
import { writeAuditLog } from './admin.service.js';
import type { FastifyInstance } from 'fastify';

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(input: RegisterInput) {
    const { db } = getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
      .limit(1);

    if (existing[0]) {
      throw createAppError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists', 409);
    }

    const passwordHash = await argon2.hash(input.password, ARGON2_CONFIG);
    const emailVerifyToken = nanoid(64);
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone,
        locale: input.locale,
        emailVerifyToken,
        emailVerifyExpiresAt,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      });

    if (!user) throw createAppError('INTERNAL_ERROR', 'Failed to create user', 500);

    // Send verification email
    await emailQueue.add('send-verify', {
      to: user.email,
      templateId: 'verify-email',
      subject: 'Verify your RootLink email',
      templateData: {
        firstName: user.firstName,
        verifyUrl: `${env.APP_URL}/verify-email?token=${emailVerifyToken}`,
      },
    });

    return user;
  }

  // ── Verify email ──────────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const { db } = getDb();

    const now = new Date();
    const [user] = await db
      .select({ id: users.id, emailVerifyExpiresAt: users.emailVerifyExpiresAt })
      .from(users)
      .where(eq(users.emailVerifyToken, token))
      .limit(1);

    if (!user) {
      throw createAppError('TOKEN_INVALID', 'Invalid or expired verification token', 400);
    }

    if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < now) {
      throw createAppError('TOKEN_EXPIRED', 'Verification token has expired. Please request a new one.', 400);
    }

    await db
      .update(users)
      .set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiresAt: null })
      .where(eq(users.id, user.id));
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const { db } = getDb();

    const [user] = await db
      .select({ id: users.id, firstName: users.firstName })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    // Always succeed to prevent email enumeration
    if (!user) return;

    const resetToken = nanoid(64);
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({ passwordResetToken: resetToken, passwordResetExpiresAt: resetExpiresAt })
      .where(eq(users.id, user.id));

    await emailQueue.add('send-password-reset', {
      to: email,
      templateId: 'password-reset',
      subject: 'Reset your RootLink password',
      templateData: {
        firstName: user.firstName,
        resetUrl: `${env.APP_URL}/reset-password?token=${resetToken}`,
      },
    });
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string) {
    const { db } = getDb();

    const now = new Date();
    const [user] = await db
      .select({ id: users.id, passwordResetExpiresAt: users.passwordResetExpiresAt })
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (!user) {
      throw createAppError('TOKEN_INVALID', 'Invalid or expired reset token', 400);
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < now) {
      throw createAppError('TOKEN_EXPIRED', 'Reset token has expired. Please request a new one.', 400);
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_CONFIG);

    await db
      .update(users)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiresAt: null })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens for security
    await db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, user.id), eq(refreshTokens.isRevoked, false)));
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(input: LoginInput, ipAddress: string, userAgent: string) {
    const { db } = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
      .limit(1);

    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy';
    const passwordToCheck = user?.passwordHash ?? dummyHash;

    const isValid = await argon2.verify(passwordToCheck, input.password, {
      type: argon2.argon2id,
    });

    if (!user || !isValid) {
      if (user) {
        const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
        const updates: Record<string, unknown> = { failedLoginAttempts: newAttempts };
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updates['lockedUntil'] = new Date(Date.now() + LOCK_DURATION_MS);
        }
        await db.update(users).set(updates).where(eq(users.id, user.id));
        void writeAuditLog({
          userId:       user.id,
          action:       'auth.login_failed',
          resourceType: 'auth',
          ipAddress,
          userAgent,
          metadata:     { attempt: newAttempts, locked: newAttempts >= MAX_FAILED_ATTEMPTS },
        });
      }
      throw createAppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw createAppError('ACCOUNT_LOCKED', 'Account temporarily locked due to failed login attempts', 423);
    }

    if (user.twoFactorEnabled) {
      if (!input.totpCode) {
        throw createAppError('TOTP_REQUIRED', 'Two-factor authentication code required', 200);
      }
      if (!user.totpSecret || !authenticator.verify({ token: input.totpCode, secret: user.totpSecret })) {
        throw createAppError('TOTP_INVALID', 'Invalid two-factor authentication code', 401);
      }
    }

    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    void writeAuditLog({
      userId:       user.id,
      action:       'auth.login',
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });

    return this.generateTokenPair(user.id, user.email, user.subscriptionTier, ipAddress, userAgent);
  }

  // ── Token generation ──────────────────────────────────────────────────────

  async generateTokenPair(
    userId: string,
    email: string,
    tier: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const { db } = getDb();

    const accessToken = this.fastify.jwt.sign(
      { sub: userId, email, tier, iss: 'rootlink-api' },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    );

    // Token = <16-char selector>.<48-char verifier>. The selector is stored
    // in plaintext (indexed, unique) so refresh() can find the candidate row
    // in O(1) without a table scan. The verifier is never stored — only its
    // argon2 hash is, preserving the security property that a DB read alone
    // cannot produce a usable refresh token.
    const tokenSelector    = nanoid(16);
    const tokenVerifier    = nanoid(48);
    const refreshTokenValue = `${tokenSelector}.${tokenVerifier}`;
    const family           = nanoid(32);
    const tokenHash        = await argon2.hash(tokenVerifier, { type: argon2.argon2id });
    const expiresAt        = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId,
      tokenSelector,
      tokenHash,
      family,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenValue, expiresIn: env.JWT_ACCESS_EXPIRES_IN };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(token: string, ipAddress: string, userAgent: string) {
    const { db } = getDb();

    const dotIndex = token.indexOf('.');
    let matchedToken: Awaited<ReturnType<typeof db.select>>['0'] | null = null;

    if (dotIndex === 16) {
      // Current format: <selector>.<verifier> — O(1) indexed lookup by
      // tokenSelector, then a single argon2 verification of the matched row.
      const selector = token.slice(0, 16);
      const verifier = token.slice(17);

      const [candidate] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenSelector, selector),
            eq(refreshTokens.isRevoked, false),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (candidate && (await argon2.verify(candidate.tokenHash, verifier))) {
        matchedToken = candidate;
      }
    } else {
      // Legacy format (issued before the selector column existed): no
      // selector to index on, so fall back to a bounded, ordered scan.
      // Tokens in this format are naturally retired within 30 days
      // (their original expiry) since generateTokenPair() now always
      // issues the new selector.verifier format.
      const candidates = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            isNull(refreshTokens.tokenSelector),
            eq(refreshTokens.isRevoked, false),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        )
        .orderBy(asc(refreshTokens.createdAt))
        .limit(50);

      for (const rt of candidates) {
        if (await argon2.verify(rt.tokenHash, token)) {
          matchedToken = rt;
          break;
        }
      }
    }

    if (!matchedToken) {
      throw createAppError('TOKEN_INVALID', 'Invalid or expired refresh token', 401);
    }

    await db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(refreshTokens.id, matchedToken.id));

    const [user] = await db
      .select({ id: users.id, email: users.email, subscriptionTier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, matchedToken.userId))
      .limit(1);

    if (!user) throw createAppError('TOKEN_INVALID', 'User not found', 401);

    return this.generateTokenPair(user.id, user.email, user.subscriptionTier, ipAddress, userAgent);
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string) {
    const { db } = getDb();
    await db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)));
  }

  // ── TOTP setup ────────────────────────────────────────────────────────────

  async setupTotp(userId: string) {
    const { db } = getDb();

    const [user] = await db
      .select({ email: users.email, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw createAppError('NOT_FOUND', 'User not found', 404);
    if (user.twoFactorEnabled) {
      throw createAppError('VALIDATION_ERROR', '2FA is already enabled', 400);
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'RootLink', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));

    return { secret, qrCodeDataUrl };
  }

  async confirmTotp(userId: string, totpCode: string) {
    const { db } = getDb();

    const [user] = await db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.totpSecret) {
      throw createAppError('VALIDATION_ERROR', '2FA setup not initiated', 400);
    }

    if (!authenticator.verify({ token: totpCode, secret: user.totpSecret })) {
      throw createAppError('TOTP_INVALID', 'Invalid TOTP code', 400);
    }

    await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, userId));
  }
}
