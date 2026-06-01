/**
 * Axios 请求封装
 * 统一处理请求拦截、响应拦截、错误处理
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// FastAPI 后端地址
// 开发环境：使用 Vite 代理 /api -> localhost:8000
// 生产环境：使用环境变量中的后端地址
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL,
  // 请求超时时间
  timeout: 30000,
  // 请求头
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可在此添加 token 等认证信息
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `  ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回 data
    return response.data
  },
  (error) => {
    // 统一错误处理
    const message = error.response?.data?.detail || error.message || '请求失败'
    console.error('API 错误:', message)
    return Promise.reject(error)
  }
)

// 封装常用请求方法
export default {
  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config })
  },
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  },
  delete<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, { params, ...config })
  },
  // 文件上传
  upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    })
  }
}