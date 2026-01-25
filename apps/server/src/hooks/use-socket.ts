import { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL, getAuthToken } from '../lib/api'
import type { WebSocketMessage } from '../types/websocket'

interface UseSocketOptions {
  enabled?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (message: WebSocketMessage) => void
}

export function useSocket(
  path: string, // e.g., "/projects/123/ws"
  options: UseSocketOptions = {},
) {
  const { enabled = true, onConnect, onDisconnect, onMessage } = options
  const socketRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use refs for callbacks to prevent re-connection on callback change
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
    onMessageRef.current = onMessage
  }, [onConnect, onDisconnect, onMessage])

  const connect = useCallback(() => {
    if (!enabled) return

    // cleanup existing socket
    if (socketRef.current) {
      // if already connecting or open, do nothing? or force reconnect?
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        return
      }
    }

    const token = getAuthToken()
    if (!token) {
      console.warn('WebSocket: No auth token found')
      return
    }

    // Convert HTTP URL to WebSocket URL
    const httpUrl = API_URL.replace(/\/$/, '') // remove trailing slash
    let wsUrl = httpUrl

    // If API_URL is absolute (e.g. http://localhost:3000), replace protocol
    if (httpUrl.startsWith('http')) {
      wsUrl = httpUrl.replace(/^http/, 'ws')
    } else if (httpUrl.startsWith('/')) {
      // If API_URL is relative (e.g. /api/v1), we generally want to respect the host
      // BUT if the WS path is root-relative (e.g. /ws/...), we might just want to use the path directly
      // assuming the WS server is on the same host/port.
      // Since our server serves both API and WS on the same port:
      wsUrl = ''
    }

    // Append path and auth token
    // If wsUrl is empty, it means we rely on browser's relative path handling for WebSocket
    // new WebSocket('/ws/...') works fine.
    wsUrl = `${wsUrl}${path}?token=${token}`

    console.log('WebSocket connecting to:', wsUrl)
    // Note: If wsUrl is relative (starts with /), the browser resolves it against window.location
    // but replaces protocol with ws:// or wss:// automatically.
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      if (onConnectRef.current) onConnectRef.current()
      // Clear reconnect timeout if any
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason)
      setIsConnected(false)
      socketRef.current = null
      if (onDisconnectRef.current) onDisconnectRef.current()

      // Auto-reconnect if not manually disabled and enabled is still true
      if (enabled && event.code !== 1000) {
        // 1000 is normal closure
        reconnectTimeoutRef.current = setTimeout(connect, 3000) // 3s delay
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error', error)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage
        if (onMessageRef.current) onMessageRef.current(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message', err)
      }
    }

    socketRef.current = ws
  }, [enabled, path])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }

    return () => {
      // Only close if enabled is changing to false or path changing (unmount handled by component unmount)
      // Actually, we want to close on unmount or deps change.
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted')
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connect])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }, [])

  return {
    isConnected,
    sendMessage,
  }
}
