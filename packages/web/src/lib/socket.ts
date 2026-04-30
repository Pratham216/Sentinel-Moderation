import { io, Socket } from 'socket.io-client';

const baseURL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  if (!socket) {
    socket = io(baseURL || window.location.origin, {
      path: '/socket.io',
      auth: { token },
      autoConnect: !!token,
      transports: ['websocket', 'polling'],
    });
  } else if (token !== undefined) {
    socket.auth = { token };
    if (token && !socket.connected) {
      socket.connect();
    } else if (!token && socket.connected) {
      socket.disconnect();
    }
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
