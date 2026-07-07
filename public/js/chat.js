/* Customer-facing real-time support chat widget (Socket.IO + jQuery). */
(function () {
  var user = Shop.getUser();
  if (!user || user.role === 'admin') return; // widget is for logged-in customers

  var socket = null;
  var typingTimer = null;

  var $fab = $('<button class="chat-fab" title="Chat with support">💬</button>');
  var $box = $(
    '<div class="chat-box">' +
      '<div class="chat-head"><span>Support chat</span><span style="cursor:pointer" id="chatClose">✕</span></div>' +
      '<div class="chat-msgs" id="chatMsgs"></div>' +
      '<div class="typing" id="chatTyping"></div>' +
      '<div class="chat-input">' +
        '<input class="input" id="chatText" placeholder="Type a message…" autocomplete="off"/>' +
        '<button class="btn btn-primary" id="chatSend">Send</button>' +
      '</div>' +
    '</div>'
  );
  $('body').append($fab).append($box);

  function connect() {
    if (socket) return;
    socket = io({ auth: { token: Shop.getToken() } });

    socket.on('connect', function () { socket.emit('load_history'); });
    socket.on('history', function (data) {
      $('#chatMsgs').empty();
      (data.messages || []).forEach(addMessage);
    });
    socket.on('chat_message', addMessage);
    socket.on('typing', function (d) {
      $('#chatTyping').text((d.name || 'Support') + ' is typing…');
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function () { $('#chatTyping').text(''); }, 1500);
    });
    socket.on('connect_error', function (err) {
      addSystem('Unable to connect to chat: ' + err.message);
    });
  }

  function addMessage(m) {
    var mine = m.sender_id === user.id;
    var $m = $('<div class="msg"></div>').addClass(mine ? 'me' : 'them');
    if (!mine) $m.append($('<span class="who"></span>').text(m.sender_name + (m.sender_role === 'admin' ? ' (support)' : '')));
    $m.append($('<span></span>').text(m.body));
    $('#chatMsgs').append($m);
    var el = document.getElementById('chatMsgs');
    el.scrollTop = el.scrollHeight;
  }
  function addSystem(text) {
    $('#chatMsgs').append($('<div class="typing"></div>').text(text));
  }

  function send() {
    var text = $('#chatText').val().trim();
    if (!text || !socket) return;
    socket.emit('chat_message', { body: text });
    $('#chatText').val('').focus();
  }

  $fab.on('click', function () {
    $box.toggleClass('open');
    if ($box.hasClass('open')) { connect(); $('#chatText').focus(); }
  });
  $box.on('click', '#chatClose', function () { $box.removeClass('open'); });
  $box.on('click', '#chatSend', send);
  $box.on('keydown', '#chatText', function (e) {
    if (e.key === 'Enter') { send(); }
    else if (socket) { socket.emit('typing', {}); }
  });
})();
