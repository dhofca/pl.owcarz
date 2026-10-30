const root = document.documentElement, toggle = document.getElementById('theme-toggle');
const themeColors = document.querySelectorAll('meta[name="theme-color"]');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
// the browser bar follows the theme in use, including a manual override
const syncTheme = () => {
	toggle.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
	themeColors.forEach(m => m.content = isDark() ? '#351e28' : '#d7efff');
};
toggle.addEventListener('click', () => {
	const next = isDark() ? 'light' : 'dark';
	root.dataset.theme = next;
	try { localStorage.setItem('theme', next); } catch (e) {}
	syncTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
syncTheme();

// ASCII halftone – density falls off from a point near the top-right corner.
// A refresh band rolls down the screen and redraws the characters it passes; elsewhere a few cells flicker.
const canvas = document.querySelector('.ascii'), ctx = canvas.getContext('2d');
const RAMP = ' .:-=+*#%@', CELL_W = 11, CELL_H = 18;
const still = matchMedia('(prefers-reduced-motion: reduce)');
let cols, rows, grid, color;
const level = (x, y) => {
	const dx = (x / cols - .96) / .48, dy = (y / rows - .1) / .8;
	const d = 1 - Math.hypot(dx, dy);
	return Math.max(0, Math.min(RAMP.length - 1, Math.round((d + (Math.random() - .5) * .18) * (RAMP.length - 1))));
};
const cell = (x, y) => {
	ctx.clearRect(x * CELL_W, y * CELL_H, CELL_W, CELL_H);
	const ch = RAMP[grid[y * cols + x]];
	if (ch !== ' ') ctx.fillText(ch, x * CELL_W, y * CELL_H + CELL_H / 2);
};
const draw = () => {
	const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
	canvas.width = w * dpr; canvas.height = h * dpr;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	cols = Math.ceil(w / CELL_W); rows = Math.ceil(h / CELL_H);
	color = getComputedStyle(root).getPropertyValue('--ascii');
	ctx.font = '500 13px "Martian Mono", ui-monospace, monospace';
	ctx.textBaseline = 'middle'; ctx.fillStyle = color;
	grid = new Uint8Array(cols * rows);
	for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { grid[y * cols + x] = level(x, y); cell(x, y); }
};
const band = document.querySelector('.band'), PERIOD = 9000;
const reroll = (x, y) => { grid[y * cols + x] = level(x, y); cell(x, y); };
// the loop only runs while motion is allowed; it starts again if that setting changes
let last = 0, running = false;
const frame = now => {
	if (still.matches) { running = false; return; }
	if (grid) {
		const h = canvas.clientHeight, bh = band.offsetHeight;
		const y = -bh + (now % PERIOD) / PERIOD * (h + bh);
		band.style.transform = `translateY(${y}px)`;
		if (now - last > 60) {
			last = now;
			// redraw the rows under the brightest part of the band
			const top = Math.max(0, (y + bh * .35) / CELL_H | 0), bottom = Math.min(rows, (y + bh * .65) / CELL_H | 0);
			for (let i = 0; bottom > top && i < cols / 3; i++) reroll(Math.random() * cols | 0, top + (Math.random() * (bottom - top) | 0));
			for (let i = 0; i < Math.ceil(grid.length / 600); i++) reroll(Math.random() * cols | 0, Math.random() * rows | 0);
		}
	}
	requestAnimationFrame(frame);
};
const start = () => { if (!running && !still.matches) { running = true; requestAnimationFrame(frame); } };
new ResizeObserver(draw).observe(canvas);
toggle.addEventListener('click', draw);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
document.fonts?.ready.then(draw);
still.addEventListener('change', start);
start();
