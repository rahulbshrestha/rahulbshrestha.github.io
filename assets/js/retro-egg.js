// Easter egg: clicking the profile photo turns it into pixel art and opens a Pokémon-style
// battle where your trainer faces CONFOUNDER Z. Of four moves only do(X) works: it cuts the confounded edge
// Z -> X. The wrong moves run out of PP and Z's bias hits back.
(function () {
  var photo = document.getElementById('profile-photo');
  if (!photo) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHAR_MS = reduceMotion ? 0 : 30;
  var PAUSE_MS = reduceMotion ? 400 : 1100;
  var MOVES = [
    { name: 'do(X)', correct: true },
    { name: 'CORRELATE', why: 'Correlation is not causation. Z still fools you!' },
    { name: 'MORE DATA', why: 'More data does not remove confounding!' },
    { name: 'P-HACK', why: 'P-hacking only finds fake effects!' }
  ];

  // Original pixel-art trainer seen from behind and to the side, mid-throw, Gen 1 style (40x40)
  var TRAINER = [
    '........................................',
    '....................K...................',
    '...............KKKKKLKKKKK..............',
    '.............KKDLLLLLLLLLLKK............',
    '............KLDLLWWWWLLLLLLLK...........',
    '...........KLDLWWWWWWWWLLLLLLK..........',
    '..........KLDLDWWWWWWWWLLLLLLLK.........',
    '.........KLDLDLWWWWWWWWLLLLLLLLK........',
    '.........KDLDLDLLWWWWLLLLLLLLLLK........',
    '.........KLDLDLDLLLLLLLLLLLLLLLK........',
    '.........KDLDLDLLLLLLLLLLLLLLLLKKKKKK...',
    '.........KLDLDLDLLLLLLLLLLDDLLLLLLLLDK..',
    '..........KLDLDLLLLLLLLLLLLDDDDDDDDDDDK.',
    '.........KDDDDDDDDDDDDDDDDDDDDDDDDDDDK..',
    '.........KDDDDDDDDDDDDDDDDDDDDKKKKKKK...',
    '..........KKKKKDLLLLLLLLLLKKKK..........',
    '............KKKKKKKKLKKKKKWWWK..........',
    '............KKKKKKKKKKKKKKLWWWK.........',
    '.............KKKKKKKKKKKKKLWWWK.........',
    '..........KKKKKKKKKKKKKKKKLWWWK.........',
    '.......KKKLLLLKKKKKKKKKKKKWWWWK.........',
    '......KLLLLLLLKKKKKKKKKKKKKWWK..........',
    '.....KLLLWWWWWKKKKKKKKKKKKKKKK..........',
    '....KLLWWWWWWWKKKKKKKKKDDDDDDDK.........',
    '...KLLWWWWWWWWWWKKKKKKKDDDDDLLDK........',
    '...KLWWWWWWWWWWWWWWLLKKDDDDDLLLDKK......',
    '..KLLWWWWWWWWWWWWWWLLLKKDDDDDLLLDDK.....',
    '..KLLLLLLLLLLLLLLLLLLLKKDDDDDDLLLDDK....',
    '..KLLLLLLLLLLLLLLLLLLLKKDDDDDDDLLLDDK...',
    '..KLLLLLLLLLLLLLLLLLLLLKKDDDDDDDLLLDDK..',
    '..KLLLLLLLLLLLLLLLLLLLLKKDDDDDDDDLLLDDK.',
    '..KLLLLLLLLLLLLLLLLLLLLKKDDDDDDDDDLLDDDK',
    '..KDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDWWWWK',
    '..KDLDLLLLLDWWDLLLLLLLLLDDDDDDDDDDDWWWWK',
    '..KLDLDLLLLDWWDLLLLLLLLLDDDDDDDDDDWWWWWW',
    '..KDLDLLLLLDDDDLLLLLLLLLDDDDDDDDDDDWWWWK',
    '..KLDLDLLLLLLLLLLLLLLLLLDDDDDDDDDDDWWWWK',
    '..KDLDLLLLLLLLLLLLLLLLLLDDDDDDDDDDDDKKK.',
    '..KLDLDLLLLLLLLLLLLLLLLLDDDDDDDDDDDK....',
    '..KDLDLLLLLLLLLLLLLLLLLLDDDDDDDDDDK.....'
  ];
  // Game Boy 4-shade greens: K darkest, D dark, L light, W lightest
  var TRAINER_COLORS = { K: '#0f380f', D: '#306230', L: '#8bac0f', W: '#e0f0c0' };

  function drawTrainer(target) {
    var ctx = target.getContext('2d');
    TRAINER.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var color = TRAINER_COLORS[row[x]];
        if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
      }
    });
  }

  var canvas = null;
  var panel = null;
  var timers = [];
  var active = false;
  var myHp = 100;

  function loadFont() {
    if (document.getElementById('retro-font')) return;
    var link = document.createElement('link');
    link.id = 'retro-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);
  }

  // Downscale the photo and round each colour channel to a few levels: 8-bit pixel art
  // that still looks like the original
  function pixelate() {
    var size = 64, levels = 6, step = 255 / (levels - 1);
    var small = document.createElement('canvas');
    small.width = small.height = size;
    var sctx = small.getContext('2d');
    var side = Math.min(photo.naturalWidth, photo.naturalHeight);
    sctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    var img = sctx.getImageData(0, 0, size, size);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      for (var c = 0; c < 3; c++) d[i + c] = Math.round(Math.round(d[i + c] / step) * step);
    }
    sctx.putImageData(img, 0, 0);

    canvas = document.createElement('canvas');
    canvas.className = 'retro-photo';
    canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(small, 0, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Pixel-art version of the profile photo');
    canvas.addEventListener('click', toggle);
    photo.style.display = 'none';
    photo.parentNode.insertBefore(canvas, photo);
  }

  function hpBar(cls) {
    return '<div class="hp"><span class="hp-label">HP</span><div class="hp-bar"><i class="hp-fill ' + cls + '"></i></div></div>';
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'retro-battle';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Causality battle: pick the move that defeats the confounder');
    panel.innerHTML =
      '<button class="retro-close" aria-label="Close">✕</button>' +
      '<div class="battle-wipe" aria-hidden="true">' + new Array(9).join('<i></i>') + '</div>' +
      '<div class="battle-field">' +
        '<div class="info-box foe-info"><div class="mon-name">CONFOUNDER Z</div>' + hpBar('foe-hp') + '</div>' +
        '<svg class="foe-sprite" viewBox="0 0 120 72" shape-rendering="crispEdges" aria-hidden="true">' +
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
        '<canvas class="me-sprite" width="40" height="40" aria-hidden="true"></canvas>' +
        '<div class="info-box me-info"><div class="mon-name">YOU</div>' + hpBar('me-hp') + '</div>' +
      '</div>' +
      '<div class="retro-text"><span class="retro-line" aria-hidden="true"></span><span class="retro-next" aria-hidden="true">▼</span></div>' +
      '<p class="retro-sr" aria-live="polite"></p>' +
      '<div class="moves"></div>';
    panel.querySelector('.retro-close').addEventListener('click', toggle);
    drawTrainer(panel.querySelector('.me-sprite'));
    document.body.appendChild(panel);
  }

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // Type each line into the text box in turn, run its optional effect, then call done
  function say(lines, done) {
    var box = panel.querySelector('.retro-line');
    var sr = panel.querySelector('.retro-sr');
    var t = 0;
    lines.forEach(function (line) {
      var text = typeof line === 'string' ? line : line.text;
      later(function () {
        box.textContent = '';
        sr.textContent = text;
        if (line.effect) line.effect();
      }, t);
      for (var i = 1; i <= text.length; i++) {
        (function (n) { later(function () { box.textContent = text.slice(0, n); }, t + CHAR_MS * n); })(i);
      }
      t += CHAR_MS * text.length + PAUSE_MS;
    });
    // Hand control back as soon as the last line has finished typing
    later(done || function () {}, t - PAUSE_MS);
  }

  function setHp(cls, value) {
    var fill = panel.querySelector('.' + cls);
    fill.style.width = value + '%';
    fill.className = 'hp-fill ' + cls + (value <= 25 ? ' low' : value <= 50 ? ' mid' : '');
  }

  function setBusy(busy) {
    panel.querySelectorAll('.move').forEach(function (b) {
      b.disabled = busy || b.classList.contains('no-pp');
    });
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function renderMoves() {
    var box = panel.querySelector('.moves');
    box.innerHTML = '';
    shuffle(MOVES).forEach(function (move) {
      var b = document.createElement('button');
      b.className = 'move';
      b.innerHTML = '<span class="move-name"></span><span class="pp">PP 1/1</span>';
      b.querySelector('.move-name').textContent = move.name;
      b.setAttribute('aria-label', 'Use ' + move.name);
      b.addEventListener('click', function () { useMove(move, b); });
      box.appendChild(b);
    });
  }

  function hit(el) {
    el.classList.remove('hit');
    void el.offsetWidth; // restart the shake animation
    el.classList.add('hit');
  }

  function useMove(move, button) {
    setBusy(true);
    if (move.correct) {
      say([
        { text: 'YOU used do(X)!', effect: function () { panel.setAttribute('data-state', 'intervene'); } },
        { text: 'The arrow Z→X is cut. The backdoor path is closed!', effect: function () { panel.setAttribute('data-state', 'cut'); } },
        { text: "It's super effective!", effect: function () { setHp('foe-hp', 0); hit(panel.querySelector('.foe-sprite')); } },
        { text: 'CONFOUNDER Z fainted!', effect: function () { panel.setAttribute('data-state', 'won'); } },
        'You found the causal effect of X on Y!'
      ], showPlayAgain);
    } else {
      button.classList.add('no-pp');
      button.querySelector('.pp').textContent = 'PP 0/1';
      button.setAttribute('aria-label', move.name + ' (used)');
      myHp = Math.max(myHp - 25, 10);
      say([
        'YOU used ' + move.name + '!',
        "It's not very effective...",
        move.why,
        { text: "CONFOUNDER Z's bias hit YOU!", effect: function () { setHp('me-hp', myHp); hit(panel.querySelector('.me-sprite')); } },
        'What will YOU do?'
      ], function () { setBusy(false); });
    }
  }

  function showPlayAgain() {
    var box = panel.querySelector('.moves');
    box.innerHTML = '<button class="move play-again">▶ PLAY AGAIN</button>';
    box.querySelector('.play-again').addEventListener('click', startBattle);
    box.querySelector('.play-again').focus();
  }

  function startBattle() {
    timers.forEach(clearTimeout);
    timers = [];
    myHp = 100;
    panel.removeAttribute('data-state');
    panel.querySelector('.retro-line').textContent = '';
    setHp('foe-hp', 100);
    setHp('me-hp', 100);
    renderMoves();
    setBusy(true);

    // Gen 1 wild-battle transition: flashes, then black stripes sweep across, then sprites slide in
    var stages = reduceMotion ? [] : [['is-flash', 600], ['is-wipe', 800], ['is-enter', 900]];
    var t = 0;
    stages.forEach(function (stage) {
      later(function () {
        panel.classList.remove('is-flash', 'is-wipe', 'is-enter');
        panel.classList.add(stage[0]);
      }, t);
      t += stage[1];
    });
    later(function () {
      panel.classList.remove('is-flash', 'is-wipe', 'is-enter');
      say(['A wild CONFOUNDER Z appeared!', 'Z causes both X and Y.', 'What will YOU do?'], function () {
        setBusy(false);
        panel.querySelector('.move').focus();
      });
    }, t);
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
      startBattle();
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
