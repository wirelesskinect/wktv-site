// Streaming box builder: box (one-time setup & activation) + rate plan (monthly or annual 1–5).
// Shows the total and links to checkout. The server sets the real price.
(function () {
  var form = document.getElementById('box-builder');
  if (!form) return;
  var monthly = Number(form.dataset.monthly);
  var annual = form.dataset.annual.split(',').map(Number);
  var annualPick = document.getElementById('box-annual-pick');
  var screens = document.getElementById('box-screens');
  var $ = function (id) { return document.getElementById(id); };

  function update() {
    var box = form.querySelector('input[name=box]:checked');
    var isAnnual = form.querySelector('input[name=rate]:checked').value === 'annual';
    var n = Number(screens.value) || 1;
    var fee = Number(box.dataset.fee);
    var rate = isAnnual ? annual[n - 1] : monthly;
    var total = fee + rate;
    annualPick.hidden = !isAnnual;
    $('box-sum-box').innerHTML = box.dataset.name + ' setup &amp; activation <small>(one-time)</small>';
    $('box-sum-fee').textContent = '$' + fee;
    $('box-sum-plan').textContent = isAnnual ? 'Annual · ' + n + ' connection' + (n > 1 ? 's' : '') : 'Monthly · 1 connection';
    $('box-sum-rate').textContent = '$' + rate;
    $('box-sum-total').textContent = '$' + total;
    var order = $('box-order');
    order.href = '/pay?plan=box-' + box.value + '-' + (isAnnual ? 'annual-' + n : 'monthly');
    order.innerHTML = 'Order my box · $' + total + ' <span>↗</span>';
    $('box-sum-then').textContent = 'Then $' + rate + (isAnnual ? '/year' : '/month') + '. The setup fee is one time only. US shipping.';
  }

  form.addEventListener('change', update);
  update();
})();
