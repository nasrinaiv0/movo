/* The iPhone "Join MOVO" page (api/download.js): copy the friend's referral code, then open the App Store.
 * Without JavaScript or clipboard access the button is a plain App Store link and the code stays on screen. */
(function () {
  var button = document.getElementById('movo-store');
  var codeEl = document.getElementById('movo-ref');
  var status = document.getElementById('movo-status');
  if (!button || !codeEl) return;
  var code = String(codeEl.getAttribute('data-ref') || '');
  var store = String(button.getAttribute('data-store') || '');
  if (!/^M[0-9A-HJ-NP-Z]{5}$/.test(code) || !/^https:\/\/apps\.apple\.com\//.test(store)) return;
  button.addEventListener('click', function (event) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return; // the plain link opens the App Store
    event.preventDefault();
    navigator.clipboard.writeText(code).then(function () {
      if (status) status.textContent = 'Code ' + code + ' copied. Paste it in MOVO after signing in.';
    }, function () { /* copy refused: the code is still on screen */ }).then(function () {
      window.location.href = store;
    });
  });
}());
