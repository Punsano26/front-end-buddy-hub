import type { IPagination } from '../Global.model'

export interface IApiResponse<TData> {
  message: string
  data: TData
}

export interface IMessageResponse {
  message: string
}

export interface IApiTokenResponse<TData> {
  message: string
  accessToken: string
  refreshToken: string
  tokenExpiresIn: number | null
  tokenExpireAt?: number | null
  data: TData
}

export interface IBasePaginationResponse<T = unknown> {
  message: string
  pagination: IPagination
  data: T[]
}

export interface IErrorResponse {
  code: number
  message: string
}


export type TErrorResponse = IErrorResponse | string | any
