import { NextResponse } from 'next/server'
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types'

export class ApiRouteError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const createRequestId = () => crypto.randomUUID()

export const jsonSuccess = <T>(data: T, requestId: string, status: number = 200) =>
  NextResponse.json<ApiSuccessResponse<T>>(
    {
      ok: true,
      data,
      requestId,
    },
    { status }
  )

export const jsonError = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown
) =>
  NextResponse.json<ApiErrorResponse>(
    {
      ok: false,
      error: {
        code,
        message,
        requestId,
        details,
      },
    },
    { status }
  )

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiRouteError(400, 'INVALID_JSON', 'Body request tidak valid.')
  }
}
