import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
  withCredentials: true,
  autoConnect: false
})

export default socket
