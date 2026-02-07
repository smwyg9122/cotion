import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export class JWTService {
  static generateAccessToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.accessExpiry,
    };
    return jwt.sign(payload, config.jwt.accessSecret, options);
  }

  static generateRefreshToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiry,
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
