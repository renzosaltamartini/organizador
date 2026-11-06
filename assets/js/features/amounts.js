const states = new WeakMap();
const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const format = value => (value < 0 ? '-$' : '$') + formatter.format(Math.abs(value));

// Only changed or newly visible values animate. Repeated synchronization does
// not restart a running counter. A new target continues from the current value.
export function animateAmount(element, value, fit) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const visible = element.getClientRects().length > 0;
  const previous = states.get(element);
  if (previous && previous.target === target && previous.visible === visible) { fit?.(); return; }
  if (previous) cancelAnimationFrame(previous.frame);
  const state = { target, visible, current: previous?.current || 0, frame: 0 };
  states.set(element, state);
  element.classList.remove('bump');
  element.setAttribute('aria-label', format(target));
  element.textContent = format(target);
  fit?.();
  if (!visible || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.current = target;
    return;
  }
  const from = previous?.visible ? previous.current : 0;
  const start = performance.now();
  function step(now) {
    const progress = Math.min(1, (now - start) / 950);
    const eased = 1 - Math.pow(1 - progress, 3);
    state.current = progress === 1 ? target : from + (target - from) * eased;
    element.textContent = format(Math.round(state.current * 100) / 100);
    if (progress < 1) state.frame = requestAnimationFrame(step);
    else fit?.();
  }
  state.current = from;
  element.textContent = format(from);
  state.frame = requestAnimationFrame(step);
}
