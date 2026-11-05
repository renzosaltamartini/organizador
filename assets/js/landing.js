// Installation guidance belongs to the sign-in screen, without a demo timer.
(function () {
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var hint = document.getElementById('en-ios');
  if (hint) hint.hidden = !ios || standalone;
})();
