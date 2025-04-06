export interface User {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: number | string;
  title: string;
  content?: string;
  author: { id: number | null; name: string | null; } | null;
  date: string;
  categories: string[];
  likes: number;
  commentCount: number;
  likedByCurrentUser?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommentUser {
  id: number;
  name: string | null;
  avatarUrl: string | null;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string; // Add optional updatedAt
  user: CommentUser;
}