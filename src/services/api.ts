import { Comment, Post, User } from "../types";

const API_BASE_URL = "http://localhost:4000/api";

type PostInputData = Omit<Post, "id">;
type LoginCredentials = Pick<User, "email"> & { password: string };
type LoginResponse = { message: string; token: string; user: User };
type ChangePasswordData = { currentPassword: string; newPassword: string };
type AddCommentData = { content: string };
type EditCommentData = { content: string };

type JsonResponse<T> = T & { message?: string };

async function safeResponseJson<T = unknown>(response: Response): Promise<T> {
  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapUserFromApi(apiUser: { id: number; email: string; name: string; avatar_url?: string; created_at: string; updated_at?: string }): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    avatarUrl: apiUser.avatar_url || null,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at || apiUser.created_at,
  };
}

export const getAllPosts = async (): Promise<Post[]> => {
  const response = await fetch(`${API_BASE_URL}/posts`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const getPostById = async (id: string): Promise<Post> => {
  const response = await fetch(`${API_BASE_URL}/posts/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("Post not found.");
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const createPost = async (postData: PostInputData): Promise<{ insertedId: number }> => {
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ...postData, categories: postData.categories || [] }),
  });
  const body = await safeResponseJson<JsonResponse<{ insertedId: number }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const updatePost = async (id: string | number, postData: PostInputData): Promise<{ post: Post }> => {
  const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ...postData, categories: postData.categories || [] }),
  });
  const body = await safeResponseJson<JsonResponse<{ post: Post }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const deletePost = async (id: string | number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const body = await safeResponseJson<JsonResponse<{ message: string }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body.message ? body : { message: "Post deleted successfully!" };
};

export const toggleLikePost = async (id: string | number): Promise<{ liked: boolean; likesCount: number }> => {
  const response = await fetch(`${API_BASE_URL}/posts/${id}/like`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const body = await safeResponseJson<JsonResponse<{ liked: boolean; likesCount: number }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const registerUser = async (formData: FormData): Promise<{ userId: number }> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    body: formData,
  });
  const body = await safeResponseJson<JsonResponse<{ userId: number }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const body = await safeResponseJson<JsonResponse<{ token: string; user: { id: number; email: string; name: string; avatar_url?: string; created_at: string; updated_at?: string } }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return {
    message: body.message!,
    token: body.token,
    user: mapUserFromApi(body.user),
  };
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const body = await safeResponseJson<JsonResponse<{ id: number; email: string; name: string; avatar_url?: string; created_at: string; updated_at?: string }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return mapUserFromApi(body);
};

export const updateUserProfile = async (formData: FormData): Promise<{ user: User }> => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: formData,
  });
  const body = await safeResponseJson<JsonResponse<{ user: { id: number; email: string; name: string; avatar_url?: string; created_at: string; updated_at?: string } }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return { user: mapUserFromApi(body.user) };
};

export const changePassword = async (passwords: ChangePasswordData): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/users/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(passwords),
  });
  const body = await safeResponseJson<JsonResponse<{ message: string }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const getCommentsForPost = async (postId: string | number): Promise<Comment[]> => {
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const addComment = async (postId: string | number, commentData: AddCommentData): Promise<Comment> => {
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(commentData),
  });
  const body = await safeResponseJson<JsonResponse<Comment>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const editComment = async (commentId: string | number, commentData: EditCommentData): Promise<{ comment: Comment }> => {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(commentData),
  });
  const body = await safeResponseJson<JsonResponse<{ comment: Comment }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};

export const deleteComment = async (commentId: string | number): Promise<{ message: string; commentId: number }> => {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const body = await safeResponseJson<JsonResponse<{ message: string; commentId: number }>>(response);
  if (!response.ok) throw new Error(body.message || `HTTP error! status: ${response.status}`);
  return body;
};
