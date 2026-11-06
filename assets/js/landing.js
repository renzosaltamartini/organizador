// Installation guidance belongs to the sign-in screen, without a demo timer.
(function () {
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var hint = document.getElementById('en-ios');
  if (hint) hint.hidden = !ios || standalone;
})();

/* Animaciones accesibles para preguntas frecuentes al abrir y cerrar. */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('#login-modal .entry-help details').forEach(details => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('p');
    if (!summary || !content) return;
    let current = null;
    summary.addEventListener('click', event => {
      if (reduceMotion.matches || !content.animate) return;
      event.preventDefault();
      if (current) { current.cancel(); current = null; }
      const opening = !details.open;
      if (opening) details.open = true;
      const height = content.scrollHeight;
      current = content.animate(
        opening ? [{height:'0px',opacity:0,transform:'translateY(-7px)'},{height:height+'px',opacity:1,transform:'translateY(0)'}] :
                  [{height:height+'px',opacity:1,transform:'translateY(0)'},{height:'0px',opacity:0,transform:'translateY(-7px)'}],
        {duration:300,easing:'cubic-bezier(.2,.8,.2,1)'}
      );
      const animation = current;
      animation.onfinish = () => {
        if (current !== animation) return;
        if (!opening) details.open = false;
        current = null;
      };
      animation.oncancel = () => { if (current === animation) current = null; };
    });
  });
})();
