/* Admin dashboard: real-time support inbox + add-product form. */
$(function () {
  var user = Shop.getUser();
  if (!user) { window.location.href = '/login.html'; return; }
  if (user.role !== 'admin') { window.location.href = '/'; return; }

  var socket = io({ auth: { token: Shop.getToken() } });
  var rooms = {};          // room -> { name, online }
  var activeRoom = null;
  var typingTimer = null;

  socket.on('connect_error', function (err) {
    $('#alert').html('<div class="alert alert-error">Chat connection failed: ' + err.message + '</div>');
  });

  // Customer comes online / goes offline.
  socket.on('presence', function (p) {
    var room = 'support:' + p.userId;
    rooms[room] = rooms[room] || { name: p.name };
    rooms[room].name = p.name;
    rooms[room].online = p.online;
    renderRooms();
  });

  // Any customer message shows up here (admins receive all).
  socket.on('chat_message', function (m) {
    rooms[m.room] = rooms[m.room] || { name: m.sender_name, online: true };
    if (m.sender_role === 'customer') rooms[m.room].name = m.sender_name;
    renderRooms();
    if (m.room === activeRoom) appendMessage(m);
    else if (m.sender_role === 'customer') flash(m.room);
  });

  socket.on('history', function (data) {
    if (data.room !== activeRoom) return;
    $('#chatMsgs').empty();
    if (!data.messages.length) $('#chatMsgs').html('<div class="empty">No messages yet.</div>');
    data.messages.forEach(appendMessage);
  });

  socket.on('typing', function (d) {
    if (d.role !== 'customer') return;
    $('#chatTyping').text((d.name || 'Customer') + ' is typing…');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { $('#chatTyping').text(''); }, 1500);
  });

  function renderRooms() {
    var keys = Object.keys(rooms);
    var $list = $('#roomList').empty();
    if (!keys.length) { $list.html('<div class="muted" style="font-size:13px">Waiting for customers…</div>'); return; }
    keys.forEach(function (room) {
      var r = rooms[room];
      var $i = $('<div class="room-item"></div>').toggleClass('active', room === activeRoom).data('room', room);
      $i.append($('<span class="dot"></span>').toggleClass('on', !!r.online));
      $i.append($('<span></span>').text(r.name || room));
      if (r.unread) $i.append($('<span class="cart-badge"></span>').text(r.unread));
      $list.append($i);
    });
  }

  function flash(room) {
    rooms[room].unread = (rooms[room].unread || 0) + 1;
    renderRooms();
  }

  function appendMessage(m) {
    if ($('#chatMsgs .empty').length) $('#chatMsgs').empty();
    var mine = m.sender_role === 'admin';
    var $m = $('<div class="msg"></div>').addClass(mine ? 'me' : 'them');
    if (!mine) $m.append($('<span class="who"></span>').text(m.sender_name));
    $m.append($('<span></span>').text(m.body));
    $('#chatMsgs').append($m);
    var el = document.getElementById('chatMsgs');
    el.scrollTop = el.scrollHeight;
  }

  $('#roomList').on('click', '.room-item', function () {
    activeRoom = $(this).data('room');
    if (rooms[activeRoom]) rooms[activeRoom].unread = 0;
    $('#activeRoomLabel').text('Chat with ' + (rooms[activeRoom].name || activeRoom));
    $('#chatText, #chatSend').prop('disabled', false);
    $('#chatMsgs').html('<div class="empty">Loading…</div>');
    socket.emit('join_room', { room: activeRoom });
    renderRooms();
  });

  function send() {
    var text = $('#chatText').val().trim();
    if (!text || !activeRoom) return;
    socket.emit('chat_message', { room: activeRoom, body: text });
    $('#chatText').val('').focus();
  }
  $('#chatSend').on('click', send);
  $('#chatText').on('keydown', function (e) {
    if (e.key === 'Enter') send();
    else if (activeRoom) socket.emit('typing', { room: activeRoom });
  });

  // --- Add product ---
  $('#productForm').on('submit', function (e) {
    e.preventDefault();
    Shop.api('POST', '/api/products', {
      name: $('#pname').val(), category: $('#pcat').val(),
      price: parseFloat($('#pprice').val()), stock: parseInt($('#pstock').val(), 10) || 0,
      image_url: $('#pimg').val(), description: $('#pdesc').val(),
    }).done(function () {
      $('#alert').html('<div class="alert alert-success">Product added.</div>');
      $('#productForm')[0].reset(); $('#pstock').val('25');
    }).fail(function (xhr) {
      $('#alert').html('<div class="alert alert-error">' + Shop.errMsg(xhr) + '</div>');
    });
  });
});
