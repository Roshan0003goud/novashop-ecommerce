'use strict';

const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/db');

/**
 * Real-time support chat between customers and admins.
 *
 * Rooms: each customer gets a private room `support:<userId>`.
 * - Customers auto-join their own room.
 * - Admins join the shared `admins` room and can open any customer room.
 * Messages are persisted to chat_messages so history survives reconnects.
 */
function initChat(io) {
  // Authenticate every socket via the JWT sent in the handshake.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      socket.user = verifyToken(token);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, name, role } = socket.user;
    const personalRoom = `support:${id}`;

    if (role === 'admin') {
      socket.join('admins');
    } else {
      socket.join(personalRoom);
      // Notify admins that a customer is online.
      io.to('admins').emit('presence', { userId: id, name, online: true });
    }

    // Admin opens a specific customer's room to view history + chat.
    socket.on('join_room', async ({ room }) => {
      if (role !== 'admin' || !room) return;
      socket.join(room);
      const history = await loadHistory(room);
      socket.emit('history', { room, messages: history });
    });

    // Customer requests their own history.
    socket.on('load_history', async () => {
      const room = role === 'admin' ? null : personalRoom;
      if (!room) return;
      const history = await loadHistory(room);
      socket.emit('history', { room, messages: history });
    });

    // Send a message. Customers always post to their own room;
    // admins post to the target room they specify.
    socket.on('chat_message', async ({ room, body }) => {
      const text = String(body || '').trim().slice(0, 2000);
      if (!text) return;
      const targetRoom = role === 'admin' ? room : personalRoom;
      if (!targetRoom) return;

      const message = {
        room: targetRoom,
        sender_id: id,
        sender_name: name,
        sender_role: role,
        body: text,
        created_at: new Date().toISOString(),
      };

      try {
        await query(
          'INSERT INTO chat_messages (room, sender_id, sender_name, sender_role, body) VALUES (?,?,?,?,?)',
          [targetRoom, id, name, role, text]
        );
      } catch (err) {
        console.error('persist chat error:', err.message);
      }

      // Deliver to everyone in the room + all admins (so the admin inbox updates).
      io.to(targetRoom).emit('chat_message', message);
      io.to('admins').emit('chat_message', message);
    });

    socket.on('typing', ({ room }) => {
      const targetRoom = role === 'admin' ? room : personalRoom;
      if (targetRoom) socket.to(targetRoom).emit('typing', { name, role });
    });

    socket.on('disconnect', () => {
      if (role !== 'admin') {
        io.to('admins').emit('presence', { userId: id, name, online: false });
      }
    });
  });
}

async function loadHistory(room, limit = 50) {
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const rows = await query(
    `SELECT room, sender_id, sender_name, sender_role, body, created_at
     FROM chat_messages WHERE room = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
    [room]
  );
  return rows.reverse();
}

module.exports = { initChat };
