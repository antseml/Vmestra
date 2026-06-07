const authTokenKey = 'vmestra-access-token'

export type AuthUser = {
  id: string
  displayName: string
  email: string
  createdAt?: string
  updatedAt?: string
}

export type AuthResponse = {
  accessToken: string
  expiresAt: string
  user: AuthUser
}

export type AuthCredentials = {
  email: string
  password: string
}

export type RegisterRequest = AuthCredentials & {
  displayName: string
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Auth required')
    this.name = 'AuthRequiredError'
  }
}

export class AuthApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | undefined

export function getAuthToken() {
  try {
    return localStorage.getItem(authTokenKey)
  } catch {
    return null
  }
}

function setAuthToken(token: string) {
  localStorage.setItem(authTokenKey, token)
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(authTokenKey)
  } catch {
    // The app can still fall back to the auth screen if storage is restricted.
  }
}

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler
}

export function handleUnauthorized() {
  clearAuthSession()
  unauthorizedHandler?.()
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (response.status === 401 && path === '/api/auth/me') {
    handleUnauthorized()
    throw new AuthRequiredError()
  }

  if (!response.ok) {
    let message = response.statusText || 'Не удалось выполнить запрос.'
    try {
      const errorBody = (await response.json()) as { message?: string; Message?: string }
      message = errorBody.message ?? errorBody.Message ?? message
    } catch {
      // Some responses, like 403, can be empty.
    }
    throw new AuthApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

function persistAuth(response: AuthResponse) {
  setAuthToken(response.accessToken)
  return response
}

export const authClient = {
  hasToken() {
    return Boolean(getAuthToken())
  },
  async register(request: RegisterRequest) {
    return persistAuth(
      await authRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    )
  },
  async login(request: AuthCredentials) {
    return persistAuth(
      await authRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    )
  },
  async me() {
    const token = getAuthToken()
    if (!token) throw new AuthRequiredError()

    return authRequest<AuthUser>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  logout() {
    clearAuthSession()
  },
}
