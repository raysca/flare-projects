import { create } from 'zustand'
import { UserPresence } from '../types/websocket'

interface PresenceState {
    // Map of context ID (projectId or issueId) to a map of userId -> UserPresence
    activeUsers: Record<string, Record<string, UserPresence>>

    // Actions
    setUserOnline: (contextId: string, user: UserPresence) => void
    setUserOffline: (contextId: string, userId: string) => void
    setTyping: (contextId: string, userId: string, isTyping: boolean) => void

    // Typing state: contextId -> userId -> boolean
    typingUsers: Record<string, Record<string, boolean>>
}

export const usePresenceStore = create<PresenceState>((set) => ({
    activeUsers: {},
    typingUsers: {},

    setUserOnline: (contextId, user) =>
        set((state) => {
            const contextUsers = state.activeUsers[contextId] || {}
            return {
                activeUsers: {
                    ...state.activeUsers,
                    [contextId]: {
                        ...contextUsers,
                        [user.userId]: user,
                    },
                },
            }
        }),

    setUserOffline: (contextId, userId) =>
        set((state) => {
            const contextUsers = { ...state.activeUsers[contextId] }
            delete contextUsers[userId]
            return {
                activeUsers: {
                    ...state.activeUsers,
                    [contextId]: contextUsers,
                },
            }
        }),

    setTyping: (contextId, userId, isTyping) =>
        set((state) => {
            const contextTyping = state.typingUsers[contextId] || {}
            if (isTyping) {
                return {
                    typingUsers: {
                        ...state.typingUsers,
                        [contextId]: {
                            ...contextTyping,
                            [userId]: true,
                        },
                    },
                }
            } else {
                const newContextTyping = { ...contextTyping }
                delete newContextTyping[userId]
                return {
                    typingUsers: {
                        ...state.typingUsers,
                        [contextId]: newContextTyping,
                    },
                }
            }
        }),
}))
