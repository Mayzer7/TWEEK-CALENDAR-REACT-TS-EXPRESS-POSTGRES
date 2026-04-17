const API_URL =
  (import.meta as any).env?.VITE_API_URL?.toString() || "http://localhost:3001/api";

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send reset email");
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset password");
    return data;
  },

  async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get user");
    return data;
  },

  async getTasks(token: string, startDate?: string, endDate?: string) {
    let url = `${API_URL}/tasks`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get tasks");
    return data.tasks;
  },

  async createTask(token: string, date: string, text: string, completed = false) {
    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date, text, completed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create task");
    return data.task;
  },

  async updateTask(token: string, id: string, updates: { text?: string; completed?: boolean; position?: number; date?: string }) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update task");
    return data.task;
  },

  async deleteTask(token: string, id: string) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete task");
    }
  },

  async getTasksByDate(token: string, date: string) {
    const res = await fetch(`${API_URL}/tasks/by-date/${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get tasks");
    return data.tasks;
  },

  async searchTasks(token: string, query: string) {
    const res = await fetch(`${API_URL}/tasks/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to search tasks");
    return data.tasks;
  },

  async updateAvatar(token: string, avatar: string) {
    const res = await fetch(`${API_URL}/auth/me/avatar`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ avatar }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update avatar");
    return data;
  },

  async reorderTasks(
    token: string,
    updates: Array<{ id: string; date: string; position: number }>
  ) {
    const res = await fetch(`${API_URL}/tasks/reorder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reorder tasks");
    return data;
  },

};

export const storage = {
  getToken: () => localStorage.getItem("token"),
  setToken: (token: string) => localStorage.setItem("token", token),
  removeToken: () => localStorage.removeItem("token"),
  getUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: User) => localStorage.setItem("user", JSON.stringify(user)),
  removeUser: () => localStorage.removeItem("user"),
  clear: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
