(function () {
  'use strict';
  var invite = /^#invite=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  if (!invite) {
    document.getElementById('friend-message').textContent = 'This invite link is incomplete. Ask your friend for a new link.';
    return;
  }
  var token = invite[1];
  document.getElementById('open-app').href = 'movo://friend?invite=' + token;
  document.getElementById('open-web').href = '/#friend=' + token;
  document.getElementById('friend-options').hidden = false;
}());
