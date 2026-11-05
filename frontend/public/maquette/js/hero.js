/* ════════════════════════════════════════════════════════════════════
   HERO — « L'armée de lumière » (Three.js)
   Des milliers de points lumineux, un par jeune : ils arrivent de partout,
   se rassemblent en formations successives — la croix (rassemblés autour
   de Christ), le cercle du logo (une seule famille), le globe (envoyés
   dans le monde) — puis se dispersent quand on fait défiler la page :
   sauvés pour sauver. Le curseur écarte la foule sur son passage.
   Rendu arrêté dès que le hero sort de l'écran.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var canvas = document.getElementById('heroGl');
  var hero = document.getElementById('hero');
  if (!canvas || !hero) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  function fallback() { document.documentElement.classList.add('no-webgl'); }
  if (!window.THREE) { fallback(); return; }
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { fallback(); return; }
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
  camera.position.set(0, 0, 6.2);
  var group = new THREE.Group();
  scene.add(group);

  // ── Les formations (une position par point et par formation) ──
  var N = window.innerWidth < 760 ? 2800 : 6800;
  var A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), S = new Float32Array(N * 3), R = new Float32Array(N * 4);
  var GOLD = Math.PI * (3 - Math.sqrt(5));
  function rnd(a, b) { return a + Math.random() * (b - a); }

  for (var i = 0; i < N; i++) {
    var k = i * 3;

    // Formation 1 — la croix (volume plein, une moitié des points plaquée sur les faces pour des arêtes nettes)
    var vert = Math.random() < .6, x, y, z, hw = .17;
    if (vert) { x = rnd(-hw, hw); y = rnd(-1.75, 1.55); z = rnd(-hw, hw); }
    else { x = rnd(-1.05, 1.05); y = rnd(.52, .86); z = rnd(-hw, hw); }
    if (Math.random() < .55) {
      var ax = Math.floor(Math.random() * 2);
      if (ax === 0) z = Math.random() < .5 ? -hw : hw;
      else if (vert) x = Math.random() < .5 ? -hw : hw;
      else y = Math.random() < .5 ? .52 : .86;
    }
    A[k] = x; A[k + 1] = y; A[k + 2] = z;

    // Formation 2 — le cercle du logo (anneau légèrement incliné + halo)
    var th = Math.random() * Math.PI * 2, halo = Math.random() < .18;
    var tub = halo ? rnd(.12, .38) : .09 * Math.sqrt(Math.random()), ta = Math.random() * Math.PI * 2;
    var rr = 1.5 + tub * Math.cos(ta);
    var rx = rr * Math.cos(th), ry = rr * Math.sin(th), rz = tub * Math.sin(ta);
    var tilt = .32, c1 = Math.cos(tilt), s1 = Math.sin(tilt);
    B[k] = rx; B[k + 1] = ry * c1 - rz * s1; B[k + 2] = ry * s1 + rz * c1;

    // Formation 3 — le globe (répartition de Fibonacci, quelques points à l'intérieur)
    var fy = 1 - (i / (N - 1)) * 2, fr = Math.sqrt(1 - fy * fy), fp = i * GOLD;
    var rad = Math.random() < .12 ? rnd(.6, 1.4) : 1.48;
    C[k] = Math.cos(fp) * fr * rad; C[k + 1] = fy * rad; C[k + 2] = Math.sin(fp) * fr * rad;

    // Position dispersée (avant l'arrivée, après l'envoi)
    var u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, d = rnd(3.6, 9), su = Math.sqrt(1 - u * u);
    S[k] = Math.cos(phi) * su * d; S[k + 1] = u * d; S[k + 2] = Math.sin(phi) * su * d - 1.5;

    // Taille (peu de gros points), phase, teinte, vitesse
    R[i * 4] = Math.pow(Math.random(), 3); R[i * 4 + 1] = Math.random(); R[i * 4 + 2] = Math.random(); R[i * 4 + 3] = Math.random();
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(A.slice(), 3)); // requis par Three, non utilisé
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 3));
  geo.setAttribute('aB', new THREE.BufferAttribute(B, 3));
  geo.setAttribute('aC', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(S, 3));
  geo.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  var uniforms = {
    uTime: { value: 0 }, uIntro: { value: reduced ? 1 : 0 }, uScroll: { value: 0 },
    uW: { value: new THREE.Vector3(1, 0, 0) }, uMouse: { value: new THREE.Vector3(99, 99, 99) },
    uSize: { value: 30 }, uPix: { value: dpr }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'uniform float uTime;uniform float uIntro;uniform float uScroll;uniform vec3 uW;uniform vec3 uMouse;uniform float uSize;uniform float uPix;',
      'attribute vec3 aA;attribute vec3 aB;attribute vec3 aC;attribute vec3 aS;attribute vec4 aR;',
      'varying float vTint;varying float vAlpha;',
      'void main(){',
      '  vec3 form=aA*uW.x+aB*uW.y+aC*uW.z;',
      '  float t=uTime*.7+aR.y*6.2831;',
      '  form+=vec3(sin(t),cos(t*1.3),sin(t*.8))*.022*(.6+aR.x*2.);',
      // Chaque point arrive à son rythme, puis repart quand on défile
      '  float g=clamp(uIntro*1.25-aR.w*.25,0.,1.);',
      '  g=g*g*(3.-2.*g);',
      '  float send=clamp(uScroll*1.5-aR.w*.35,0.,1.);',
      '  vec3 p=mix(aS,form,g*(1.-send*send));',
      '  vec3 d=p-uMouse;float dist=length(d);',
      '  p+=normalize(d+1e-4)*.55*smoothstep(.95,0.,dist)*g;',
      '  vec4 mv=modelViewMatrix*vec4(p,1.);',
      '  gl_Position=projectionMatrix*mv;',
      '  gl_PointSize=uSize*(.45+aR.x*1.6)*uPix/-mv.z;',
      '  vTint=aR.z;',
      '  vAlpha=(.55+.45*sin(t*2.3))*(.35+.65*g);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying float vTint;varying float vAlpha;',
      'void main(){',
      '  float d=length(gl_PointCoord-.5);',
      '  float a=smoothstep(.5,0.,d);a*=a;',
      '  vec3 ivoire=vec3(1.,.96,.89);vec3 dore=vec3(.98,.80,.46);vec3 rouge=vec3(1.,.42,.5);',
      '  vec3 col=vTint<.6?ivoire:(vTint<.9?dore:rouge);',
      '  gl_FragColor=vec4(col,a*vAlpha);',
      '}'
    ].join('\n')
  });
  group.add(new THREE.Points(geo, mat));

  // ── Mise en place selon l'écran ──
  var aspect = 1;
  function resize() {
    var r = hero.getBoundingClientRect();
    var w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    var visH = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360), visW = visH * aspect;
    if (aspect > 1.15) { group.position.set(visW * .2, .1, 0); group.scale.setScalar(1); }
    else { var s = Math.min(1, visW / 3.6); group.scale.setScalar(s); group.position.set(0, visH * .17, 0); }
    uniforms.uSize.value = aspect > 1.15 ? 30 : 26;
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);

  // ── Curseur : on projette la souris sur le plan de la formation ──
  var ndc = new THREE.Vector2(9, 9), hasMouse = false, ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine) {
    window.addEventListener('pointermove', function (e) {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      tilt.tx = ndc.x; tilt.ty = ndc.y; hasMouse = true;
    }, { passive: true });
  }

  // ── Cycle des formations + légende ──
  var FORMS = ['Rassemblés autour de Christ', 'Une seule famille', 'Envoyés dans le monde'];
  var cur = 0, nxt = 0, mix = 1, holdUntil = 0;
  var caption = document.getElementById('heroCaptionTxt');
  function setCaption(txt) {
    if (!caption) return;
    caption.classList.add('is-out');
    setTimeout(function () { caption.textContent = txt; caption.classList.remove('is-out'); }, 450);
  }
  function weights(a, b, m) {
    var e = m < .5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2; // easeInOutCubic
    var w = [0, 0, 0]; w[a] += 1 - e; w[b] += e;
    uniforms.uW.value.set(w[0], w[1], w[2]);
  }

  // ── Intro et visibilité ──
  var introTarget = reduced ? 1 : 0;
  window.addEventListener('nwc:ready', function () { introTarget = 1; });
  setTimeout(function () { introTarget = 1; }, 2600);
  var visible = true, running = false, t0 = performance.now(), last = t0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }, { threshold: 0 }).observe(hero);
  }

  function frame(now) {
    if (!visible) { running = false; return; }
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var t = (now - t0) / 1000;
    uniforms.uTime.value = reduced ? 0 : t;
    uniforms.uIntro.value += (introTarget - uniforms.uIntro.value) * (reduced ? 1 : .022);
    uniforms.uScroll.value = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));

    // Formations : on tient 5 s, puis on se transforme en 2,2 s
    if (!reduced && uniforms.uIntro.value > .9) {
      if (mix >= 1 && t > holdUntil) {
        if (holdUntil > 0) { cur = nxt; nxt = (cur + 1) % 3; mix = 0; setCaption(FORMS[nxt]); }
        holdUntil = t + 5 + 2.2;
      }
      if (mix < 1) { mix = Math.min(1, mix + dt / 2.2); weights(cur, nxt, mix); if (mix >= 1) cur = nxt; }
    }

    // Balancement doux (la croix reste lisible) + inclinaison vers la souris
    tilt.x += (tilt.tx - tilt.x) * .04; tilt.y += (tilt.ty - tilt.y) * .04;
    group.rotation.y = (reduced ? 0 : Math.sin(t * .28) * .38) + tilt.x * .3;
    group.rotation.x = -tilt.y * .18;

    if (hasMouse) {
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) { group.updateMatrixWorld(); uniforms.uMouse.value.copy(group.worldToLocal(hit)); }
    }

    renderer.render(scene, camera);
    if (reduced && Math.abs(uniforms.uIntro.value - 1) < .001) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function start() { if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  start();
})();
