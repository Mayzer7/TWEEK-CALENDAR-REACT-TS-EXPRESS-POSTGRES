export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  avatar?: string;
}

export interface Task {
  id: string;
  user_id: string;
  date: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface SomedayItem {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Express.Request {
  user?: { id: string; email?: string; username?: string };
}
