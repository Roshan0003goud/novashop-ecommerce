/* Catalog page: search, filter, sort, paginate, add-to-cart. */
$(function () {
  var initialQ = new URLSearchParams(location.search).get('q') || '';
  var state = { search: initialQ, category: '', sort: 'newest', page: 1 };

  // Deterministic pseudo rating so cards look real (stable per product id).
  function rating(id) {
    var r = 3.9 + ((id * 7) % 11) / 10; // 3.9 – 4.9
    var reviews = 12 + ((id * 37) % 480);
    return { r: Math.min(5, r).toFixed(1), reviews: reviews };
  }
  function starHtml(r) {
    var full = Math.round(r);
    return '<span class="s">' + '★'.repeat(full) + '☆'.repeat(5 - full) + '</span>';
  }

  function loadCategories() {
    Shop.api('GET', '/api/products/categories').done(function (res) {
      var $chips = $('#chips').empty();
      $chips.append(chip('All', ''));
      res.categories.forEach(function (c) { $chips.append(chip(c.category, c.category, c.count)); });
      syncChips();
    });
  }
  function chip(label, value, count) {
    var $c = $('<button class="chip"></button>').data('value', value)
      .text(label + (count ? '  ·  ' + count : ''));
    return $c;
  }
  function syncChips() {
    $('#chips .chip').each(function () {
      $(this).toggleClass('active', String($(this).data('value')) === String(state.category));
    });
  }

  function loadProducts() {
    var qs = $.param({
      search: state.search, category: state.category, sort: state.sort, page: state.page, limit: 12,
    });
    Shop.api('GET', '/api/products?' + qs).done(render).fail(function (xhr) {
      $('#grid').empty();
      $('#alert').html('<div class="alert alert-error">' + Shop.errMsg(xhr) + '</div>');
    });
  }

  function render(res) {
    $('#alert').empty();
    var label = res.total + ' product' + (res.total === 1 ? '' : 's');
    if (state.search) label += ' for “' + Shop.esc(state.search) + '”';
    $('#resultCount').text(label);

    var $grid = $('#grid').empty();
    if (!res.items.length) {
      $grid.html('<div class="empty">No products match your search. <a href="/">Clear filters →</a></div>');
      $('#pagination').empty();
      return;
    }

    res.items.forEach(function (p) {
      var out = p.stock <= 0;
      var rt = rating(p.id);
      var $card = $(
        '<article class="card">' +
          '<div class="thumb-wrap"><img class="thumb" loading="lazy" alt="" />' +
            '<span class="tag"></span></div>' +
          '<div class="body">' +
            '<div class="cat"></div>' +
            '<div class="name"></div>' +
            '<div class="stars"></div>' +
            '<div class="row"><div class="price"></div>' +
              '<button class="add" title="Add to cart">+</button></div>' +
          '</div>' +
        '</article>'
      );
      $card.find('.thumb').attr('src', p.image_url || '');
      $card.find('.cat').text(p.category);
      $card.find('.name').text(p.name);
      $card.find('.stars').html(starHtml(Number(rt.r)) + rt.r + ' (' + rt.reviews + ')');
      $card.find('.price').text(Shop.money(p.price));
      var $tag = $card.find('.tag');
      if (out) $tag.addClass('out').text('Sold out');
      else if (p.stock <= 25) $tag.text('Low stock');
      else $tag.remove();
      $card.find('.add').prop('disabled', out).data('id', p.id).text(out ? '×' : '+');
      $grid.append($card);
    });

    renderPagination(res.page, res.pages);
  }

  function renderPagination(page, pages) {
    var $p = $('#pagination').empty();
    if (pages <= 1) return;
    var mk = function (label, target, disabled, active) {
      var $b = $('<button class="btn"></button>').text(label);
      if (active) $b.addClass('btn-primary');
      if (disabled) $b.prop('disabled', true);
      else $b.on('click', function () { state.page = target; loadProducts(); document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' }); });
      return $b;
    };
    $p.append(mk('‹', page - 1, page <= 1));
    for (var i = 1; i <= pages; i++) $p.append(mk(String(i), i, false, i === page));
    $p.append(mk('›', page + 1, page >= pages));
  }

  // --- events ---
  $('#chips').on('click', '.chip', function () {
    state.category = $(this).data('value'); state.page = 1;
    syncChips(); loadProducts();
  });
  $('#sort').on('change', function () { state.sort = $(this).val(); state.page = 1; loadProducts(); });

  $('#grid').on('click', '.add', function () {
    if (!Shop.getUser()) { window.location.href = '/login.html'; return; }
    var id = $(this).data('id'); var $btn = $(this);
    $btn.prop('disabled', true).text('✓');
    Shop.api('POST', '/api/cart', { product_id: id, quantity: 1 })
      .done(function () { Shop.refreshCartCount();
        setTimeout(function () { $btn.prop('disabled', false).text('+'); }, 900); })
      .fail(function (xhr) { $btn.prop('disabled', false).text('+'); alert(Shop.errMsg(xhr)); });
  });

  loadCategories();
  loadProducts();
});