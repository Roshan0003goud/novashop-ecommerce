/* Cart page: render items, change quantity, remove, live totals. */
$(function () {
  if (!Shop.requireAuth()) return;

  function load() {
    Shop.api('GET', '/api/cart').done(render).fail(function (xhr) {
      $('#alert').html('<div class="alert alert-error">' + Shop.errMsg(xhr) + '</div>');
    });
  }

  function render(res) {
    var $items = $('#items').empty();
    if (!res.items.length) {
      $items.html('<div class="empty">Your cart is empty. <a href="/">Start shopping →</a></div>');
      $('#subtotal').text('$0.00'); $('#total').text('$0.00');
      $('#checkoutBtn').addClass('btn').css('pointer-events', 'none').css('opacity', .5);
      return;
    }
    $('#checkoutBtn').css('pointer-events', '').css('opacity', 1);

    res.items.forEach(function (i) {
      var $row = $(
        '<div class="cart-item">' +
          '<img alt="" />' +
          '<div><div class="name"></div><div class="stock"></div></div>' +
          '<div class="qty"><button class="dec">−</button><span></span><button class="inc">+</button></div>' +
          '<div style="text-align:right"><div class="price"></div>' +
            '<button class="btn btn-danger remove" style="padding:4px 10px;margin-top:6px;font-size:12px">Remove</button></div>' +
        '</div>'
      );
      $row.find('img').attr('src', i.image_url || '');
      $row.find('.name').text(i.name);
      $row.find('.stock').text(Shop.money(i.price) + ' each');
      $row.find('.qty span').text(i.quantity);
      $row.find('.price').text(Shop.money(i.line_total));
      $row.data('id', i.product_id).data('qty', i.quantity).data('stock', i.stock);
      $items.append($row);
    });

    $('#subtotal').text(Shop.money(res.subtotal));
    $('#total').text(Shop.money(res.subtotal));
    Shop.refreshCartCount();
  }

  function setQty(productId, qty) {
    Shop.api('PUT', '/api/cart/' + productId, { quantity: qty })
      .done(load).fail(function (xhr) { alert(Shop.errMsg(xhr)); });
  }

  $('#items').on('click', '.inc', function () {
    var $r = $(this).closest('.cart-item');
    var q = $r.data('qty'), stock = $r.data('stock');
    if (q >= stock) { alert('No more stock available.'); return; }
    setQty($r.data('id'), q + 1);
  });
  $('#items').on('click', '.dec', function () {
    var $r = $(this).closest('.cart-item');
    setQty($r.data('id'), $r.data('qty') - 1);
  });
  $('#items').on('click', '.remove', function () {
    var $r = $(this).closest('.cart-item');
    Shop.api('DELETE', '/api/cart/' + $r.data('id')).done(load);
  });

  load();
});
