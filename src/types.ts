export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Design {
  id: number;
  userId: number;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
