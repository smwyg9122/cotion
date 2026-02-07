import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().min(3, '아이디는 최소 3자 이상이어야 합니다').max(50).regex(/^[a-zA-Z0-9_]+$/, '아이디는 영문, 숫자, _만 사용 가능합니다'),
  email: z.string().email('유효한 이메일 주소를 입력하세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(100),
});

export const userLoginSchema = z.object({
  username: z.string().min(1, '아이디를 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요'),
  newPassword: z.string().min(8, '새 비밀번호는 최소 8자 이상이어야 합니다'),
});
