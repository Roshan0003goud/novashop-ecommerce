/* Shared helpers: auth state, nav rendering, jQuery AJAX wrappers. */
(function () {
  window.Shop = window.Shop || {};

  // --- token storage (also mirrored in httpOnly cookie for API calls) ---
  Shop.getToken = function () { return localStorage.getItem('token') || ''; };
  Shop.setToken = function (t) { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); };
  Shop.getUser = function () {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
  };
  Shop.setUser = function (u) { u ? localStorage.setItem('user', JSON.stringify(u)) : localStorage.removeItem('user'); };

  // --- jQuery AJAX helper (sends Bearer token + cookies) ---
  Shop.api = function (method, url, data) {
    return $.ajax({
      url: url,
      method: method,
      contentType: 'application/json',
      data: data ? JSON.stringify(data) : undefined,
      xhrFields: { withCredentials: true },
      headers: Shop.getToken() ? { Authorization: 'Bearer ' + Shop.getToken() } : {},
    });
  };

  Shop.errMsg = function (xhr) {
    return (xhr && xhr.responseJSON && xhr.responseJSON.error) || 'Something went wrong.';
  };

  Shop.money = function (n) { return '$' + Number(n).toFixed(2); };

  Shop.logout = function () {
    Shop.api('POST', '/api/auth/logout').always(function () {
      Shop.setToken(''); Shop.setUser(null);
      window.location.href = '/';
    });
  };

  // --- render top nav based on auth + cart count ---
  Shop.renderNav = function () {
    var user = Shop.getUser();
    var links = [
      '<a href="/">Shop</a>',
    ];
    if (user) {
      links.push('<a href="/orders.html">Orders</a>');
      if (user.role === 'admin') links.push('<a href="/admin.html">Admin</a>');
      links.push('<a href="/cart.html">Cart <span class="cart-badge" id="navCartCount">0</span></a>');
      links.push('<a href="#" id="navLogout">Logout (' + $('<i>').text(user.name.split(' ')[0]).html() + ')</a>');
    } else {
      links.push('<a href="/cart.html">Cart <span class="cart-badge" id="navCartCount">0</span></a>');
      links.push('<a href="/login.html">Login</a>');
      links.push('<a class="btn btn-primary" href="/register.html" style="padding:8px 14px">Sign up</a>');
    }

    var html =
      '<header class="nav"><div class="container"><div class="nav-inner">' +
      '<a class="brand" href="/">Nova<span>Shop</span></a>' +
      '<nav class="nav-links">' + links.join('') + '</nav>' +
      '</div></div></header>';

    $('#nav').html(html);
    $('#navLogout').on('click', function (e) { e.preventDefault(); Shop.logout(); });

    if (user) Shop.refreshCartCount();
  };

  Shop.refreshCartCount = function () {
    if (!Shop.getUser()) return;
    Shop.api('GET', '/api/cart').done(function (res) {
      var count = (res.items || []).reduce(function (s, i) { return s + i.quantity; }, 0);
      $('#navCartCount').text(count);
    });
  };

  Shop.requireAuth = function () {
    if (!Shop.getUser()) { window.location.href = '/login.html'; return false; }
    return true;
  };

  // Auto-render nav if a #nav container exists.
  $(function () { if ($('#nav').length) Shop.renderNav(); });
})();
