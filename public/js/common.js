/* Shared helpers: auth state, professional header/footer, jQuery AJAX wrappers. */
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
  Shop.esc = function (s) { return $('<i>').text(s == null ? '' : s).html(); };

  Shop.logout = function () {
    Shop.api('POST', '/api/auth/logout').always(function () {
      Shop.setToken(''); Shop.setUser(null);
      window.location.href = '/';
    });
  };

  // Inline SVG icons (no external dependencies).
  var icon = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.6"/><circle cx="18" cy="21" r="1.6"/><path d="M1 1h3l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  };

  // --- render professional top header ---
  Shop.renderNav = function () {
    var user = Shop.getUser();
    var q = new URLSearchParams(location.search).get('q') || '';

    var accountHtml, adminLink = '', ordersLink = '';
    if (user) {
      ordersLink = '<a class="hdr-link" href="/orders.html">Orders</a>';
      if (user.role === 'admin') adminLink = '<a class="hdr-link" href="/admin.html">Admin</a>';
      accountHtml =
        '<div class="hdr-account">' + icon.user +
        '<div class="hdr-account-text"><span class="hdr-hi">Hello, ' + Shop.esc(user.name.split(' ')[0]) + '</span>' +
        '<a href="#" id="navLogout" class="hdr-strong">Sign out</a></div></div>';
    } else {
      accountHtml =
        '<a class="hdr-account" href="/login.html">' + icon.user +
        '<div class="hdr-account-text"><span class="hdr-hi">Welcome</span>' +
        '<span class="hdr-strong">Sign in / Register</span></div></a>';
    }

    var html =
      '<div class="topbar"><div class="container topbar-inner">' +
        '<span>Free shipping on all orders over $50</span>' +
        '<span class="topbar-right">Secure checkout · Real-time support</span>' +
      '</div></div>' +
      '<header class="site-header"><div class="container header-inner">' +
        '<a class="logo" href="/"><span class="logo-mark">N</span> Nova<span class="logo-accent">Shop</span></a>' +
        '<form class="header-search" id="headerSearch" role="search">' +
          '<input type="search" id="headerSearchInput" placeholder="Search products, brands and categories" value="' + Shop.esc(q) + '" />' +
          '<button type="submit" aria-label="Search">' + icon.search + '</button>' +
        '</form>' +
        '<nav class="header-actions">' +
          ordersLink + adminLink + accountHtml +
          '<a class="hdr-cart" href="/cart.html">' + icon.cart +
            '<span class="cart-badge" id="navCartCount">0</span></a>' +
        '</nav>' +
      '</div></div>';

    $('#nav').html(html);

    $('#navLogout').on('click', function (e) { e.preventDefault(); Shop.logout(); });
    $('#headerSearch').on('submit', function (e) {
      e.preventDefault();
      var val = $('#headerSearchInput').val().trim();
      window.location.href = '/?q=' + encodeURIComponent(val);
    });

    if (user) Shop.refreshCartCount();
  };

  // --- render footer ---
  Shop.renderFooter = function () {
    var cols = [
      ['Shop', ['Electronics', 'Home & Kitchen', 'Apparel', 'Books']],
      ['Company', ['About us', 'Careers', 'Press', 'Sustainability']],
      ['Support', ['Help center', 'Track order', 'Returns', 'Contact us']],
    ];
    var colHtml = cols.map(function (c) {
      var items = c[1].map(function (i) { return '<li><a href="/">' + i + '</a></li>'; }).join('');
      return '<div class="footer-col"><h4>' + c[0] + '</h4><ul>' + items + '</ul></div>';
    }).join('');

    var html =
      '<footer class="site-footer"><div class="container footer-grid">' +
        '<div class="footer-brand">' +
          '<div class="logo"><span class="logo-mark">N</span> Nova<span class="logo-accent">Shop</span></div>' +
          '<p>A modern e-commerce experience with real-time support. Built with Node.js, MySQL &amp; Socket.IO.</p>' +
        '</div>' + colHtml +
      '</div>' +
      '<div class="footer-bottom"><div class="container footer-bottom-inner">' +
        '<span>© ' + new Date().getFullYear() + ' NovaShop. All rights reserved.</span>' +
        '<span>Visa · Mastercard · Amex · PayPal</span>' +
      '</div></div></footer>';
    $('#footer').html(html);
  };

  Shop.refreshCartCount = function () {
    if (!Shop.getUser()) return;
    Shop.api('GET', '/api/cart').done(function (res) {
      var count = (res.items || []).reduce(function (s, i) { return s + i.quantity; }, 0);
      $('#navCartCount').text(count).toggleClass('has-items', count > 0);
    });
  };

  Shop.requireAuth = function () {
    if (!Shop.getUser()) { window.location.href = '/login.html'; return false; }
    return true;
  };

  // Auto-render chrome where containers exist.
  $(function () {
    if ($('#nav').length) Shop.renderNav();
    if ($('#footer').length) Shop.renderFooter();
  });
})();
