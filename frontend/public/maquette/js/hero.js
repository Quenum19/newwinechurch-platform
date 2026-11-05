/* ════════════════════════════════════════════════════════════════════
   HERO — « L'armée de lumière » (WebGL natif, sans librairie)
   Des milliers de points lumineux, un par jeune : ils arrivent de partout,
   se rassemblent en formations successives — la croix (rassemblés autour
   de Christ), le cercle du logo (une seule famille), le globe (envoyés dans
   le monde) — puis se dispersent quand on fait défiler : sauvés pour sauver.
   Le curseur écarte la foule. Rendu arrêté hors écran.
   Version optimisée : plus de Three.js (≈ 600 Ko économisés sur l'accueil).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var canvas = document.getElementById('heroGl'), hero = document.getElementById('hero');
  if (!canvas || !hero) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var gl = null;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl) { document.documentElement.classList.add('no-webgl'); return; }

  // ── Formations ──
  var N = window.innerWidth < 760 ? 2600 : 6400;
  var A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), S = new Float32Array(N * 3), R = new Float32Array(N * 4);
  var GOLD = Math.PI * (3 - Math.sqrt(5));
  function rnd(a, b) { return a + Math.random() * (b - a); }
  for (var i = 0; i < N; i++) {
    var k = i * 3;
    // Croix : volume plein, la moitié des points plaquée sur les faces pour des arêtes nettes
    var vert = Math.random() < .6, x, y, z, hw = .17;
    if (vert) { x = rnd(-hw, hw); y = rnd(-1.75, 1.55); z = rnd(-hw, hw); } else { x = rnd(-1.05, 1.05); y = rnd(.52, .86); z = rnd(-hw, hw); }
    if (Math.random() < .55) { if (Math.random() < .5) z = Math.random() < .5 ? -hw : hw; else if (vert) x = Math.random() < .5 ? -hw : hw; else y = Math.random() < .5 ? .52 : .86; }
    A[k] = x; A[k + 1] = y; A[k + 2] = z;
    // Cercle du logo, légèrement incliné, avec un halo
    var th = Math.random() * Math.PI * 2, halo = Math.random() < .18, tub = halo ? rnd(.12, .38) : .09 * Math.sqrt(Math.random()), ta = Math.random() * Math.PI * 2;
    var rr = 1.5 + tub * Math.cos(ta), rx = rr * Math.cos(th), ry = rr * Math.sin(th), rz = tub * Math.sin(ta), c1 = Math.cos(.32), s1 = Math.sin(.32);
    B[k] = rx; B[k + 1] = ry * c1 - rz * s1; B[k + 2] = ry * s1 + rz * c1;
    // Globe (répartition de Fibonacci)
    var fy = 1 - (i / (N - 1)) * 2, fr = Math.sqrt(1 - fy * fy), fp = i * GOLD, rad = Math.random() < .12 ? rnd(.6, 1.4) : 1.48;
    C[k] = Math.cos(fp) * fr * rad; C[k + 1] = fy * rad; C[k + 2] = Math.sin(fp) * fr * rad;
    // Position dispersée
    var u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, dd = rnd(3.6, 9), su = Math.sqrt(1 - u * u);
    S[k] = Math.cos(phi) * su * dd; S[k + 1] = u * dd; S[k + 2] = Math.sin(phi) * su * dd - 1.5;
    R[i * 4] = Math.pow(Math.random(), 3); R[i * 4 + 1] = Math.random(); R[i * 4 + 2] = Math.random(); R[i * 4 + 3] = Math.random();
  }

  var VS = [
    'attribute vec3 aA;attribute vec3 aB;attribute vec3 aC;attribute vec3 aS;attribute vec4 aR;',
    'uniform mat4 uModel;uniform mat4 uView;uniform mat4 uProj;',
    'uniform float uTime;uniform float uIntro;uniform float uScroll;uniform vec3 uW;uniform vec3 uMouse;uniform float uSize;uniform float uPix;',
    'varying float vTint;varying float vAlpha;',
    'void main(){',
    '  vec3 form=aA*uW.x+aB*uW.y+aC*uW.z;',
    '  float t=uTime*.7+aR.y*6.2831;',
    '  form+=vec3(sin(t),cos(t*1.3),sin(t*.8))*.022*(.6+aR.x*2.);',
    '  float g=clamp(uIntro*1.25-aR.w*.25,0.,1.);g=g*g*(3.-2.*g);',
    '  float send=clamp(uScroll*1.5-aR.w*.35,0.,1.);',
    '  vec3 p=mix(aS,form,g*(1.-send*send));',
    '  vec3 d=p-uMouse;float dist=length(d);',
    '  p+=normalize(d+1e-4)*.55*smoothstep(.95,0.,dist)*g;',
    '  vec4 mv=uView*uModel*vec4(p,1.);',
    '  gl_Position=uProj*mv;',
    '  gl_PointSize=uSize*(.45+aR.x*1.6)*uPix/-mv.z;',
    '  vTint=aR.z;vAlpha=(.55+.45*sin(t*2.3))*(.35+.65*g);',
    '}'].join('\n');
  var FS = [
    'precision mediump float;varying float vTint;varying float vAlpha;',
    'void main(){',
    '  float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;',
    '  vec3 col=vTint<.6?vec3(1.,.96,.89):(vTint<.9?vec3(.98,.8,.46):vec3(1.,.42,.5));',
    '  gl_FragColor=vec4(col*a*vAlpha,a*vAlpha);',
    '}'].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { document.documentElement.classList.add('no-webgl'); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { document.documentElement.classList.add('no-webgl'); return; }
  gl.useProgram(prog);
  function attr(name, data, size) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  }
  attr('aA', A, 3); attr('aB', B, 3); attr('aC', C, 3); attr('aS', S, 3); attr('aR', R, 4);
  var U = {};
  ['uModel', 'uView', 'uProj', 'uTime', 'uIntro', 'uScroll', 'uW', 'uMouse', 'uSize', 'uPix'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0, 0, 0, 0);

  // ── Matrices (colonnes, comme WebGL) ──
  function persp(fovy, asp, n, f) { var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; }
  function model(tx, ty, s, ry, rx) {
    var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    // M = T · S · Ry · Rx
    return [s * cy, 0, -s * sy, 0, s * sy * sx, s * cx, s * cy * sx, 0, s * sy * cx, -s * sx, s * cy * cx, 0, tx, ty, 0, 1];
  }
  var CAMZ = 6.2, FOV = 38 * Math.PI / 180, VIEW = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -CAMZ, 1];
  gl.uniformMatrix4fv(U.uView, false, new Float32Array(VIEW));

  var dpr = Math.min(window.devicePixelRatio || 1, 2), aspect = 1, pos = { x: 0, y: 0, s: 1 }, visH = 1, visW = 1;
  function resize() {
    var r = hero.getBoundingClientRect(), w = Math.max(2, r.width), h = Math.max(2, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = w / h; visH = 2 * CAMZ * Math.tan(FOV / 2); visW = visH * aspect;
    if (aspect > 1.15) { pos.x = visW * .2; pos.y = .1; pos.s = 1; } else { pos.s = Math.min(1, visW / 3.6); pos.x = 0; pos.y = visH * .17; }
    gl.uniformMatrix4fv(U.uProj, false, new Float32Array(persp(FOV, aspect, .1, 60)));
    gl.uniform1f(U.uSize, aspect > 1.15 ? 30 : 26); gl.uniform1f(U.uPix, dpr);
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);

  // ── Souris projetée dans le repère de la formation ──
  var ndc = null, tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine) window.addEventListener('pointermove', function (e) { ndc = [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1]; tilt.tx = ndc[0]; tilt.ty = ndc[1]; }, { passive: true });
  function mouseLocal(ry, rx) {
    if (!ndc) return [99, 99, 99];
    // Point du plan z = 0 sous le curseur
    var wx = ndc[0] * visW / 2, wy = ndc[1] * visH / 2;
    var lx = (wx - pos.x) / pos.s, ly = (wy - pos.y) / pos.s, lz = 0;
    // Inverse de Ry puis de Rx
    var cy = Math.cos(-ry), sy = Math.sin(-ry), x1 = cy * lx + sy * lz, z1 = -sy * lx + cy * lz;
    var cx = Math.cos(-rx), sx = Math.sin(-rx), y2 = cx * ly - sx * z1, z2 = sx * ly + cx * z1;
    return [x1, y2, z2];
  }

  // ── Formations successives + légende ──
  var FORMS = ['Rassemblés autour de Christ', 'Une seule famille', 'Envoyés dans le monde'];
  var cur = 0, nxt = 0, mix = 1, holdUntil = 0, W = [1, 0, 0], caption = document.getElementById('heroCaptionTxt');
  function setCaption(t) { if (!caption) return; caption.classList.add('is-out'); setTimeout(function () { caption.textContent = t; caption.classList.remove('is-out'); }, 450); }
  function weights(a, b, m) { var e = m < .5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2; W = [0, 0, 0]; W[a] += 1 - e; W[b] += e; }

  var intro = reduced ? 1 : 0, introT = reduced ? 1 : 0;
  window.addEventListener('nwc:ready', function () { introT = 1; });
  setTimeout(function () { introT = 1; }, 2600);
  var visible = true, running = false, t0 = performance.now(), last = t0;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(hero);

  function frame(now) {
    if (!visible) { running = false; return; }
    var dt = Math.min(.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    intro += (introT - intro) * (reduced ? 1 : .022);
    if (!reduced && intro > .9) {
      if (mix >= 1 && t > holdUntil) { if (holdUntil > 0) { cur = nxt; nxt = (cur + 1) % 3; mix = 0; setCaption(FORMS[nxt]); } holdUntil = t + 7.2; }
      if (mix < 1) { mix = Math.min(1, mix + dt / 2.2); weights(cur, nxt, mix); if (mix >= 1) cur = nxt; }
    }
    tilt.x += (tilt.tx - tilt.x) * .04; tilt.y += (tilt.ty - tilt.y) * .04;
    var ry = (reduced ? 0 : Math.sin(t * .28) * .38) + tilt.x * .3, rx = -tilt.y * .18;
    gl.uniformMatrix4fv(U.uModel, false, new Float32Array(model(pos.x, pos.y, pos.s, ry, rx)));
    gl.uniform1f(U.uTime, reduced ? 0 : t); gl.uniform1f(U.uIntro, intro);
    gl.uniform1f(U.uScroll, Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))));
    gl.uniform3fv(U.uW, W); gl.uniform3fv(U.uMouse, mouseLocal(ry, rx));
    gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS, 0, N);
    if (reduced && Math.abs(intro - 1) < .001) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function start() { if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  start();
})();
