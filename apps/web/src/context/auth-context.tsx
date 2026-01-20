import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from '../lib/api'
import { useMe } from '../hooks/use-users'
import { userKeys } from '../lib/query-keys'
import type { User } from '../types/issues'

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (token: string, user: User, sessionId: string) => void
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const { data: user, isLoading, isError } = useMe()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken())

    useEffect(() => {
        if (user) {
            setIsAuthenticated(true)
        } else if (isError) {
            setIsAuthenticated(false)
            clearAuthToken()
        }
    }, [user, isError])

    const login = (token: string, userData: User, _sessionId: string) => {
        setAuthToken(token)
        // Optimistically update user data
        queryClient.setQueryData(userKeys.me(), userData)
        setIsAuthenticated(true)
        // Refetch user to be sure
        queryClient.invalidateQueries({ queryKey: userKeys.me() })
    }

    const logout = async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' })
        } catch (e) {
            console.error('Logout failed', e)
        } finally {
            clearAuthToken()
            setIsAuthenticated(false)
            queryClient.setQueryData(['users', 'me'], null)
            router.navigate({ to: '/login' })
        }
    }

    return (
        <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
