export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  name: string;
}

export interface UserUpdateInput {
  name?: string;
  avatarUrl?: string;
}

export interface UserLoginInput {
  username: string;
  password: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}
