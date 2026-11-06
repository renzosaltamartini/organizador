export function setupMoneyCard() {
  const card = document.getElementById('money-card');
  if (!card) return;
  const visibilityButtons = [...card.querySelectorAll('[data-money-visibility]')];
  const amounts = [...card.querySelectorAll('.private-amount > strong')];
  let concealed = false;
  try { concealed = sessionStorage.getItem('money-concealed') === 'true'; } catch {}
  function updateVisibility() {
    card.classList.toggle('amounts-concealed', concealed);
    amounts.forEach(amount => amount.setAttribute('aria-hidden', String(concealed)));
    card.querySelectorAll('.private-amount').forEach(wrapper => {
      if (concealed) wrapper.setAttribute('aria-label', 'Monto oculto');
      else wrapper.removeAttribute('aria-label');
    });
    visibilityButtons.forEach(button => {
      const label = concealed ? 'Mostrar montos' : 'Ocultar montos';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(concealed));
    });
  }
  visibilityButtons.forEach(button => button.addEventListener('click', () => {
    concealed = !concealed;
    updateVisibility();
    try { sessionStorage.setItem('money-concealed', String(concealed)); } catch {}
  }));
  updateVisibility();
  const scene = card.parentElement;
  const front = card.querySelector('.money-card-front');
  const back = card.querySelector('.money-card-back');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rotator = card.querySelector('.money-card-rotator');
  let turning = false, turnTimer;
  let flipped = false, pointer = null, frame = 0, point = null;
  function reset() {
    cancelAnimationFrame(frame); frame = 0; point = null;
    card.classList.remove('is-tracking', 'is-pressed');
    ['--rx', '--ry', '--light-x', '--light-y'].forEach(name => card.style.removeProperty(name));
  }
  function track(event) {
    if (reduced.matches || turning) return;
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = scene.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (point.x - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (point.y - rect.top) / rect.height * 2 - 1));
      card.classList.add('is-tracking');
      // The touched edge recedes, like pressing a physical card.
      card.style.setProperty('--rx', y * 12 + 'deg');
      card.style.setProperty('--ry', -x * 15 + 'deg');
      card.style.setProperty('--light-x', (x + 1) * 50 + '%');
      card.style.setProperty('--light-y', (y + 1) * 50 + '%');
    });
  }
  function flip() {
    if (turning) return;
    reset();
    turning = true;
    card.classList.add('is-turning');
    const hadFocus = card.contains(document.activeElement);
    flipped = !flipped;
    card.classList.toggle('is-flipped', flipped);
    front.inert = flipped; back.inert = !flipped;
    front.setAttribute('aria-hidden', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
    function finish() {
      clearTimeout(turnTimer);
      turning = false;
      card.classList.remove('is-turning');
      rotator.removeEventListener('transitionend', onEnd);
      if (hadFocus) (flipped ? back : front).querySelector('.money-card-flip').focus({ preventScroll: true });
    }
    function onEnd(event) {
      if (event.target === rotator && event.propertyName === 'transform') finish();
    }
    rotator.addEventListener('transitionend', onEnd);
    turnTimer = setTimeout(finish, reduced.matches ? 0 : 900);
  }
  card.querySelectorAll('.money-card-flip').forEach(button => button.addEventListener('click', flip));
  scene.addEventListener('pointerdown', event => {
    if (turning || !event.isPrimary || event.button !== 0 || event.target.closest('button,a')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    scene.setPointerCapture(event.pointerId);
    track(event); card.classList.add('is-pressed');
  });
  scene.addEventListener('pointermove', event => {
    if (event.target.closest('button,a')) return;
    if (event.pointerType === 'mouse' || pointer?.id === event.pointerId) track(event);
  });
  scene.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) flip();
    pointer = null; reset();
  });
  scene.addEventListener('pointerleave', () => { if (!pointer) reset(); });
  scene.addEventListener('pointercancel', () => { pointer = null; reset(); });
  scene.addEventListener('lostpointercapture', () => { pointer = null; reset(); });
  reduced.addEventListener('change', reset);
}
