/**
 * FastAPI 用户管理接口
 * 后端地址：http://127.0.0.1:8000
 */
import request from './request'

// 用户数据类型
export interface User {
  id: number
  name: string
  email: string
  age?: number
}

// 创建用户请求
export interface UserCreateRequest {
  name: string
  email: string
  age?: number
}

// 更新用户请求
export interface UserUpdateRequest {
  name?: string
  email?: string
  age?: number
}

// 搜索查询请求
export interface UserSearchRequest {
  keyword?: string
  page?: number
  page_size?: number
}

// 搜索响应
export interface UserSearchResponse {
  total: number
  page: number
  page_size: number
  results: User[]
}

// ─── 用户 CRUD 接口 ────────────────────────────────

/**
 * 获取用户列表
 * GET /users
 */
export const getUsers = () => {
  return request.get<User[]>('/users')
}

/**
 * 获取单个用户
 * GET /users/{user_id}
 */
export const getUser = (userId: number) => {
  return request.get<User>(`/users/${userId}`)
}

/**
 * 创建用户
 * POST /users
 */
export const createUser = (data: UserCreateRequest) => {
  return request.post<User>('/users', data)
}

/**
 * 更新用户
 * PUT /users/{user_id}
 */
export const updateUser = (userId: number, data: UserUpdateRequest) => {
  return request.put<User>(`/users/${userId}`, data)
}

/**
 * 删除用户
 * DELETE /users/{user_id}
 */
export const deleteUser = (userId: number) => {
  return request.delete(`/users/${userId}`)
}

/**
 * 批量创建用户
 * POST /users/batch
 */
export const batchCreateUsers = (users: UserCreateRequest[]) => {
  return request.post<{ success: boolean; created_count: number; users: User[] }>('/users/batch', { users })
}

/**
 * 搜索用户（带分页）
 * POST /users/search
 */
export const searchUsers = (data: UserSearchRequest) => {
  return request.post<UserSearchResponse>('/users/search', data)
}

// ─── 认证接口 ────────────────────────────────

/**
 * 用户登录
 * POST /auth/login
 */
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  message: string
}

export const login = (data: LoginRequest) => {
  return request.post<LoginResponse>('/auth/login', data)
}

// ─── 消息接口 ────────────────────────────────

export interface SendMessageRequest {
  to_user_id: number
  content: string
  sender?: string
}

export interface SendMessageResponse {
  success: boolean
  message_id: number
  content: string
}

export const sendMessage = (data: SendMessageRequest) => {
  return request.post<SendMessageResponse>('/messages/send', data)
}