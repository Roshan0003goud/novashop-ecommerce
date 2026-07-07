/* Checkout page: show cart summary, submit order via transactional endpoint. */
$(function () {
  if (!Shop.requireAuth()) return;
  var user = Shop.getUser();
  $('#name').val(user.name);

  function loadSummary() {
    Shop.api('GET', '/api/cart').done(function (res) {
      var $s = $('#summaryItems').empty();
      if (!res.items.length) {
        $s.html('<div class="empty">Your cart is empty. <a href="/">Shop →</a></div>');
        $('#payBtn').prop('disabled', true);
        return;
      }
      res.items.forEach(function (i) {
        var $row = $('<div class="summary"></div>');
        $row.append($('<span class="muted"></span>').text(i.quantity + '× ' + i.name));
        $row.append($('<span></span>').text(Shop.money(i.line_total)));
        $s.append($row);
      });
      $('#total').text(Shop.money(res.subtotal));
    });
  }

  $('#checkoutForm').on('submit', function (e) {
    e.preventDefault();
    $('#alert').empty();
    $('#payBtn').prop('disabled', true).text('Processing…');
    Shop.api('POST', '/api/orders/checkout', {
      shipping_name: $('#name').val(), shipping_addr: $('#addr').val(),
    }).done(function (res) {
      Shop.refreshCartCount();
      window.location.href = '/orders.html?success=' + res.order_id;
    }).fail(function (xhr) {
      $('#alert').html('<div class="alert alert-error">' + Shop.errMsg(xhr) + '</div>');
      $('#payBtn').prop('disabled', false).text('Pay & place order');
    });
  });

  loadSummary();
});
