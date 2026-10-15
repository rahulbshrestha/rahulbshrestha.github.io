// Easter egg: clicking the profile photo turns it into a Game Boy-style pixel image
// and plays a short causality "battle" where do(X) cuts the confounded edge Z -> X.
(function () {
  var photo = document.getElementById('profile-photo');
  if (!photo) return;

  var GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']; // darkest -> lightest
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = null;
  var panel = null;
  var timers = [];
  var active = false;

  function loadFont() {
    if (document.getElementById('retro-font')) return;
    var link = document.createElement('link');
    link.id = 'retro-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);
  }

  // Downscale the photo and map brightness onto the 4 Game Boy greens. Local contrast keeps the
  // face readable against the bright sky; thresholds are the image's own brightness quartiles,
  // with a light 2x2 Bayer dither for the classic look.
  function pixelate() {
    var size = 96, gamma = 0.8, localContrast = 2.5, radius = 8, dither = 0.3;
    var small = document.createElement('canvas');
    small.width = small.height = size;
    var sctx = small.getContext('2d');
    var side = Math.min(photo.naturalWidth, photo.naturalHeight);
    sctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    var img = sctx.getImageData(0, 0, size, size);
    var d = img.data;
    var lums = [];
    for (var i = 0; i < d.length; i += 4) {
      lums.push(255 * Math.pow((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255, gamma));
    }
    var enhanced = lums.map(function (v, p) {
      var px = p % size, py = Math.floor(p / size), sum = 0, n = 0;
      for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
          var nx = px + dx, ny = py + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) { sum += lums[ny * size + nx]; n++; }
        }
      }
      return v + localContrast * (v - sum / n);
    });
    var sorted = enhanced.slice().sort(function (a, b) { return a - b; });
    var q = [0.25, 0.5, 0.75].map(function (f) { return sorted[Math.floor(f * sorted.length)]; });
    var bayer = [[-0.375, 0.125], [0.375, -0.125]];
    for (var p = 0; p < enhanced.length; p++) {
      var x = p % size, y = Math.floor(p / size);
      var lum = enhanced[p] + bayer[y % 2][x % 2] * (q[2] - q[0]) / 2 * dither;
      var hex = GB[lum < q[0] ? 0 : lum < q[1] ? 1 : lum < q[2] ? 2 : 3];
      d[p * 4] = parseInt(hex.substr(1, 2), 16);
      d[p * 4 + 1] = parseInt(hex.substr(3, 2), 16);
      d[p * 4 + 2] = parseInt(hex.substr(5, 2), 16);
    }
    sctx.putImageData(img, 0, 0);

    canvas = document.createElement('canvas');
    canvas.className = 'retro-photo';
    canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(small, 0, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Pixelated Game Boy version of the profile photo');
    canvas.addEventListener('click', toggle);
    photo.style.display = 'none';
    photo.parentNode.insertBefore(canvas, photo);
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'retro-battle';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Causality animation: intervening on X with do(X) cuts the confounding arrow from Z');
    panel.innerHTML =
      '<button class="retro-close" aria-label="Close">✕</button>' +
      '<svg viewBox="0 0 120 72" shape-rendering="crispEdges" aria-hidden="true">' +
      '<defs><marker id="retro-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">' +
      '<path d="M0,0 L6,3 L0,6 z" fill="#0f380f"/></marker></defs>' +
      '<line class="edge edge-zx" x1="54" y1="18" x2="30" y2="47" marker-end="url(#retro-arrow)"/>' +
      '<line class="edge edge-zy" x1="66" y1="18" x2="90" y2="47" marker-end="url(#retro-arrow)"/>' +
      '<line class="edge edge-xy" x1="34" y1="56" x2="84" y2="56" marker-end="url(#retro-arrow)"/>' +
      '<g class="cut"><line x1="37" y1="28" x2="47" y2="38"/><line x1="47" y1="28" x2="37" y2="38"/></g>' +
      '<rect class="node node-z" x="52" y="2" width="16" height="16"/><text class="label-z" x="60" y="13.5">Z</text>' +
      '<rect class="node node-x" x="16" y="48" width="16" height="16"/><text x="24" y="59.5">X</text>' +
      '<rect class="node" x="88" y="48" width="16" height="16"/><text x="96" y="59.5">Y</text>' +
      '</svg>' +
      '<div class="retro-text"><span class="retro-line"></span><span class="retro-next">▼</span></div>';
    panel.querySelector('.retro-close').addEventListener('click', toggle);
    document.body.appendChild(panel);
  }

  // Each scene: the text to type and the state of the graph while it shows
  var scenes = [
    { text: 'A wild CONFOUNDER Z appeared!', state: 'start' },
    { text: 'Z causes both X and Y, so their correlation is not just X\'s effect.', state: 'confounded' },
    { text: 'RAHUL used do(X)!', state: 'intervene' },
    { text: 'do(X) sets X by hand. Z no longer affects X, so its arrow is cut.', state: 'cut' },
    { text: "The backdoor path is blocked. It's super effective!", state: 'cut' },
    { text: "Now we see X's true causal effect on Y.", state: 'done' }
  ];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function play() {
    var line = panel.querySelector('.retro-line');
    if (reduceMotion) {
      panel.setAttribute('data-state', 'done');
      line.textContent = scenes[scenes.length - 1].text;
      return;
    }
    var t = 300;
    scenes.forEach(function (scene) {
      later(function () {
        panel.setAttribute('data-state', scene.state);
        line.textContent = '';
      }, t);
      for (var i = 1; i <= scene.text.length; i++) {
        (function (n) { later(function () { line.textContent = scene.text.slice(0, n); }, t + 40 * n); })(i);
      }
      t += 40 * scene.text.length + 1500;
    });
  }

  function onKey(e) { if (e.key === 'Escape') toggle(); }

  function toggle() {
    active = !active;
    timers.forEach(clearTimeout);
    timers = [];
    if (active) {
      loadFont();
      pixelate();
      buildPanel();
      document.addEventListener('keydown', onKey);
      play();
    } else {
      if (canvas) canvas.remove();
      if (panel) panel.remove();
      canvas = panel = null;
      photo.style.display = '';
      document.removeEventListener('keydown', onKey);
    }
  }

  photo.addEventListener('click', toggle);
})();
