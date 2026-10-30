// Streaming box cards: pick 1–5 connections, update prices and the order buttons.
// 2nd connection +$50, 3rd–5th +$25 each. The server sets the real price at checkout.
(function () {
  var EXTRA = [0, 50, 25, 25, 25];
  function extra(n) { var t = 0; for (var i = 0; i < n; i++) t += EXTRA[i]; return t; }

  document.querySelectorAll('.box-card').forEach(function (card) {
    var options = card.querySelectorAll('.box-option');
    options.forEach(function (opt) {
      var btn = opt.querySelector('[data-plan-id]');
      opt.dataset.base = btn.dataset.planId;
      opt.dataset.basePrice = btn.dataset.price.replace(/[^0-9]/g, '');
      opt.dataset.baseName = btn.dataset.plan;
    });

    function setConnections(n) {
      card.querySelectorAll('[data-box-conn]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.boxConn) === n));
      });
      options.forEach(function (opt) {
        var price = Number(opt.dataset.basePrice) + extra(n);
        var btn = opt.querySelector('[data-plan-id]');
        var priceEl = opt.querySelector('.price');
        btn.dataset.planId = opt.dataset.base + (n > 1 ? '-c' + n : '');
        btn.dataset.price = '$' + price + ' shipped';
        btn.dataset.plan = opt.dataset.baseName + (n > 1 ? ' · ' + n + ' connections' : '');
        btn.innerHTML = 'Order · $' + price + ' <span>↗</span>';
        priceEl.innerHTML = '$' + price + '<span>shipped</span>';
      });
    }

    card.querySelectorAll('[data-box-conn]').forEach(function (b) {
      b.addEventListener('click', function () { setConnections(Number(b.dataset.boxConn)); });
    });
  });
})();
