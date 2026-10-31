export const Input = {
state: { up: false, down: false, left: false, right: false },
crosshair: null,

init() {
// Teclado: flechas + WASD (movimiento manual del héroe)
window.addEventListener('keydown', e => {
if (e.code.startsWith('Arrow')) e.preventDefault();
this.setKey(e.code, true);
});
window.addEventListener('keyup', e => this.setKey(e.code, false));
window.addEventListener('blur', () => {
this.state.up = this.state.down = this.state.left = this.state.right = false;
});

// ---- PREVENIR GESTOS NATIVOS EN MÓVIL ----
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// Cruceta global: sigue al puntero por TODA la pantalla
this.crosshair = document.getElementById('crosshair');
window.addEventListener('pointermove', e => {
if (!this.crosshair) return;
this.crosshair.style.left = e.clientX + 'px';
this.crosshair.style.top = e.clientY + 'px';
const hot = e.target && e.target.closest &&
e.target.closest('button, .card, input, label, canvas, .tab, a');
this.crosshair.classList.toggle('hot', !!hot);
}, { passive: true });
document.addEventListener('mouseout', e => {
if (!e.relatedTarget && this.crosshair) this.crosshair.style.display = 'none';
});
document.addEventListener('mouseover', () => {
if (this.crosshair) this.crosshair.style.display = '';
});
},

setKey(code, v) {
if (code === 'ArrowUp' || code === 'KeyW') this.state.up = v;
if (code === 'ArrowDown' || code === 'KeyS') this.state.down = v;
if (code === 'ArrowLeft' || code === 'KeyA') this.state.left = v;
if (code === 'ArrowRight' || code === 'KeyD') this.state.right = v;
},

axis() {
return {
x: (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0),
y: (this.state.down ? 1 : 0) - (this.state.up ? 1 : 0)
};
}
};