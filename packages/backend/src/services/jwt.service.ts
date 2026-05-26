import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export class JWTService {
  // jwtid (jti) ensures every issued token is unique even when generated
  // within the same second for the same user — otherwise the JWT bytes
  // would be identical (iat is second-granularity) and the sessions table's
  // UNIQUE(refresh_token) constraint would explode on rapid logins/refreshes.
  static generateAccessToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.accessExpiry,
      jwtid: randomUUID(),
    };
    return jwt.sign(payload, config.jwt.accessSecret, options);
  }

  static generateRefreshToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiry,
      jwtid: randomUUID(),
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.accessSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}
