/* Catalog page: search, filter, sort, paginate, add-to-cart. */
$(function () {
  var state = { search: '', category: '', sort: 'newest', page: 1 };
  var debounce;

  function loadCategories() {
    Shop.api('GET', '/api/products/categories').done(function (res) {
      res.categories.forEach(function (c) {
        $('#category').append($('<option>').val(c.category).text(c.category + ' (' + c.count + ')'));
      });
    });
  }

  function loadProducts() {
    var qs = $.param({
      search: state.search, category: state.category, sort: state.sort, page: state.page, limit: 12,
    });
    Shop.api('GET', '/api/products?' + qs).done(render).fail(function (xhr) {
      $('#grid').empty();
      $('#alert').html('<div class="alert alert-error">' + Shop.errMsg(xhr) +
        ' — did you run <code>npm run db:setup &amp;&amp; npm run db:seed</code>?</div>');
    });
  }

  function render(res) {
    $('#alert').empty();
    var $grid = $('#grid').empty();
    if (!res.items.length) { $grid.html('<div class="empty">No products match your search.</div>'); $('#pagination').empty(); return; }

    res.items.forEach(function (p) {
      var out = p.stock <= 0;
      var $card = $(
        '<div class="card">' +
          '<img class="thumb" loading="lazy" alt="" />' +
          '<div class="body">' +
            '<div class="cat"></div>' +
            '<div class="name"></div>' +
            '<div class="row">' +
              '<div class="price"></div>' +
              '<div class="stock"></div>' +
            '</div>' +
            '<button class="btn btn-primary btn-block add" style="margin-top:6px">Add to cart</button>' +
          '</div>' +
        '</div>'
      );
      $card.find('.thumb').attr('src', p.image_url || '');
      $card.find('.cat').text(p.category);
      $card.find('.name').text(p.name);
      $card.find('.price').text(Shop.money(p.price));
      $card.find('.stock').text(out ? 'Out of stock' : p.stock + ' in stock');
      $card.find('.add').prop('disabled', out).toggleClass('btn-primary', !out).data('id', p.id)
        .text(out ? 'Unavailable' : 'Add to cart');
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
      else $b.on('click', function () { state.page = target; loadProducts(); window.scrollTo(0, 0); });
      return $b;
    };
    $p.append(mk('‹ Prev', page - 1, page <= 1));
    for (var i = 1; i <= pages; i++) $p.append(mk(String(i), i, false, i === page));
    $p.append(mk('Next ›', page + 1, page >= pages));
  }

  // --- events ---
  $('#search').on('input', function () {
    clearTimeout(debounce);
    var v = $(this).val();
    debounce = setTimeout(function () { state.search = v; state.page = 1; loadProducts(); }, 300);
  });
  $('#category').on('change', function () { state.category = $(this).val(); state.page = 1; loadProducts(); });
  $('#sort').on('change', function () { state.sort = $(this).val(); state.page = 1; loadProducts(); });

  $('#grid').on('click', '.add', function () {
    if (!Shop.getUser()) { window.location.href = '/login.html'; return; }
    var id = $(this).data('id'); var $btn = $(this);
    $btn.prop('disabled', true).text('Adding…');
    Shop.api('POST', '/api/cart', { product_id: id, quantity: 1 })
      .done(function () { $btn.text('Added ✓'); Shop.refreshCartCount();
        setTimeout(function () { $btn.prop('disabled', false).text('Add to cart'); }, 1000); })
      .fail(function (xhr) { $btn.prop('disabled', false).text('Add to cart'); alert(Shop.errMsg(xhr)); });
  });

  loadCategories();
  loadProducts();
});
