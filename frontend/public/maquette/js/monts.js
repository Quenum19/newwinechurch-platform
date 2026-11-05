/* ════════════════════════════════════════════════════════════════════
   IMPACTER — Les 7 Monts en 3D (Three.js r128)
   Un relief topographique où chaque sommet est un « mont » de NWC,
   lié à une sphère de la société (noms et sphères relevés sur les
   bannières officielles). Courbes de niveau dorées antialiasées,
   le mont actif s'allume en rubis et émet une onde.
   L'interface (liste + fiche) fonctionne aussi sans WebGL.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MONTS = [
    { id: 'ararat', nom: 'Ararat', sphere: 'Le Gouvernement', q: 'Tu rêves d’être un haut dirigeant ?', ref: 'Genèse 8:4',
      txt: 'Ceux qui se préparent à diriger : politique, administration, leadership public. Former des dirigeants intègres pour la Côte d’Ivoire et l’Afrique.',
      img: 'img/s/m-ararat.webp', x: -6.0, z: 0.8, h: 2.1, s: .95 },
    { id: 'transfiguration', nom: 'Transfiguration', sphere: 'L’Art, le Sport, la Musique', q: 'Tu aimes l’art, le sport, la musique ?', ref: 'Matthieu 17:1-2',
      txt: 'Artistes, sportifs, musiciens. Faire briller la lumière de Christ sur scène, sur le terrain et dans les studios.',
      img: 'img/s/m-transfiguration.webp', x: -4.0, z: -1.6, h: 2.6, s: 1.0 },
    { id: 'oliviers', nom: 'Oliviers', sphere: 'L’Économie', q: 'Tu souhaites concevoir la politique économique des nations ?', ref: 'Actes 1:12',
      txt: 'Entrepreneurs, financiers, bâtisseurs. Créer de la richesse avec justice et financer la mission.',
      img: 'img/s/m-oliviers.webp', x: -2.0, z: 1.3, h: 1.65, s: .9 },
    { id: 'carmel', nom: 'Carmel', sphere: 'Le Média', q: 'Tu es passionné·e par l’image ?', ref: '1 Rois 18:19',
      txt: 'Créateurs de contenu, journalistes, vidéastes. Raconter les histoires qui changent les regards.',
      img: 'img/s/m-carmel.webp', x: 0.0, z: -1.2, h: 2.4, s: 1.0 },
    { id: 'sinai', nom: 'Sinaï', sphere: 'L’Éducation', q: 'Tu as la passion de transmettre ?', ref: 'Exode 19:20',
      txt: 'Enseignants, étudiants, chercheurs. Transmettre le savoir et former les esprits de demain.',
      img: 'img/s/m-sinai.webp', x: 2.1, z: 1.0, h: 3.0, s: .95 },
    { id: 'hermon', nom: 'Hermon', sphere: 'La Famille', q: 'Tu aimes te sentir en famille ?', ref: 'Psaume 133:3',
      txt: 'Le cœur de la maison : couples, parents, célibataires. Bâtir des familles solides et accueillantes.',
      img: 'img/s/m-hermon.webp', x: 4.1, z: -1.5, h: 2.3, s: 1.0 },
    { id: 'morijah', nom: 'Morijah', sphere: 'La Religion', q: 'Tu as à cœur la maison de Dieu ?', ref: '2 Chroniques 3:1',
      txt: 'Intercesseurs, serviteurs, futurs ministres. Garder le feu de l’adoration et de la prière au centre.',
      img: 'img/s/m-morijah.webp', x: 6.0, z: 0.7, h: 2.0, s: .9 }
  ];

  var section = document.getElementById('monts');
  if (!section) return;
  var listEl = document.getElementById('montList');
  var labelsEl = document.getElementById('montsLabels');
  var cardEl = document.getElementById('montCard');
  var el = {
    img: document.getElementById('montImg'), sphere: document.getElementById('montSphere'),
    name: document.getElementById('montName'), q: document.getElementById('montQ'),
    txt: document.getElementById('montTxt'), ref: document.getElementById('montRef'),
    join: document.getElementById('montJoin')
  };

  var active = 5;          // on ouvre sur Hermon, « La Famille »
  var userTook = false;    // l'animation automatique s'arrête dès que l'utilisateur choisit
  var labelNodes = [];

  // ── Interface : liste + étiquettes ──
  MONTS.forEach(function (m, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<b>' + m.nom + '</b><span>' + m.sphere + '</span>';
    b.addEventListener('click', function () { userTook = true; select(i); });
    li.appendChild(b); listEl.appendChild(li);

    var lab = document.createElement('button');
    lab.type = 'button';
    lab.className = 'mont-label';
    lab.textContent = m.nom;
    lab.setAttribute('aria-label', 'Mont ' + m.nom + ', ' + m.sphere);
    lab.addEventListener('click', function () { userTook = true; select(i); });
    labelsEl.appendChild(lab);
    labelNodes.push(lab);
  });

  function select(i) {
    var changed = i !== active;
    active = i;
    var m = MONTS[i];
    listEl.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('is-active', k === i); b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    labelNodes.forEach(function (n, k) { n.classList.toggle('is-active', k === i); });
    var apply = function () {
      el.img.src = m.img;
      el.img.alt = 'Les membres du Mont ' + m.nom + ' posent devant leur bannière';
      el.sphere.textContent = m.sphere;
      el.name.textContent = m.nom;
      el.q.textContent = '« ' + m.q + ' »';
      el.txt.textContent = m.txt;
      el.ref.textContent = m.ref;
      cardEl.classList.remove('is-swapping');
    };
    if (changed) { cardEl.classList.add('is-swapping'); setTimeout(apply, 260); } else apply();
    // Si la liste défile horizontalement (mobile), on garde le bouton actif visible
    var btn = listEl.querySelectorAll('button')[i];
    if (btn && listEl.scrollWidth > listEl.clientWidth) {
      listEl.scrollTo({ left: btn.parentNode.offsetLeft - 16, behavior: 'smooth' });
    }
  }
  select(active);

  el.join.addEventListener('click', function () {
    if (window.NWC && window.NWC.toast) window.NWC.toast('Super ! Le responsable du Mont ' + MONTS[active].nom + ' te contactera après le culte.');
  });

  // Défilement automatique des monts tant que personne n'a cliqué
  var inView = false;
  setInterval(function () {
    if (userTook || !inView || document.hidden) return;
    select((active + 1) % MONTS.length);
  }, 5200);

  // ── 3D ──
  var canvas = document.getElementById('montsGl');
  var stage = document.getElementById('montsStage');
  if (!window.THREE || !canvas) { labelsEl.hidden = true; watch(); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { labelsEl.hidden = true; watch(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x3A0C18, 1);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, 1, .1, 80);

  // Relief : somme de gaussiennes (une par mont) + crêtes douces
  var W = 19, D = 11;
  function height(x, z) {
    var h = 0;
    for (var k = 0; k < MONTS.length; k++) {
      var m = MONTS[k], dx = x - m.x, dz = z - m.z;
      h += m.h * Math.exp(-(dx * dx + dz * dz) / (2 * m.s * m.s));
    }
    h += .17 * Math.sin(x * 1.3 + z * .7) * Math.cos(z * 1.1 - x * .4)
       + .07 * Math.sin(x * 3.1 + 1.0) * Math.sin(z * 2.7)
       + .03 * Math.sin(x * 7.3) * Math.cos(z * 6.1);
    var e = Math.max(Math.abs(x) / (W / 2), Math.abs(z) / (D / 2));
    h -= Math.max(0, e - .72) * 1.8;
    return h;
  }
  var segX = window.innerWidth < 700 ? 200 : 320, segZ = Math.round(segX * D / W);
  var geo = new THREE.PlaneGeometry(W, D, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  var pos = geo.attributes.position;
  for (var i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  var uniforms = {
    uActive: { value: new THREE.Vector2(MONTS[active].x, MONTS[active].z) },
    uAmt: { value: 0 },
    uTime: { value: 0 },
    uFog: { value: new THREE.Color(0x3A0C18) }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    extensions: { derivatives: true },
    vertexShader: [
      'varying vec3 vPos;varying vec3 vN;varying float vDist;',
      'void main(){vPos=position;vN=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDist=-mv.z;gl_Position=projectionMatrix*mv;}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec2 uActive;uniform float uAmt;uniform float uTime;uniform vec3 uFog;',
      'varying vec3 vPos;varying vec3 vN;varying float vDist;',
      'void main(){',
      '  float h=vPos.y;',
      // Courbes de niveau fines + majeures toutes les 5
      '  float f=h*6.;float w=fwidth(f);',
      '  float dd=abs(fract(f-.5)-.5);',
      '  float line=1.-smoothstep(0.,w*1.25,dd);',
      '  float ddM=abs(fract(f/5.-.5)-.5)*5.;',
      '  float major=1.-smoothstep(0.,w*1.9,ddM);',
      // Quadrillage très discret (lecture « plan »)
      '  vec2 g=vPos.xz*1.25;vec2 gw=fwidth(g);vec2 gd=abs(fract(g-.5)-.5)/gw;',
      '  float grid=(1.-min(min(gd.x,gd.y),1.))*.12*smoothstep(1.2,-.4,h);',
      '  vec3 L=normalize(vec3(-.45,.85,.45));float diff=clamp(dot(normalize(vN),L),0.,1.);',
      '  vec3 base=mix(vec3(.12,.028,.048),vec3(.42,.085,.13),smoothstep(-.4,3.,h))*(.45+.8*diff);',
      '  vec3 gold=vec3(.89,.76,.48);vec3 rub=vec3(1.,.2,.33);',
      '  float dA=length(vPos.xz-uActive);',
      '  float act=uAmt*(1.-smoothstep(.15,1.8,dA));',
      '  vec3 lc=mix(gold,rub,act);',
      '  float lift=.3+.7*smoothstep(-.3,2.2,h);',
      '  vec3 col=base+lc*(line*.5+major*.65)*lift+gold*grid;',
      '  col+=rub*act*.16;',
      // Onde qui part du mont actif
      '  float rp=fract(uTime*.35);',
      '  float ring=(1.-smoothstep(0.,.07,abs(dA-rp*3.4)))*(1.-rp)*uAmt;',
      '  col+=rub*ring*.75;',
      '  float fog=smoothstep(9.,21.,vDist);',
      '  col=mix(col,uFog,fog);',
      '  gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n')
  });
  scene.add(new THREE.Mesh(geo, mat));

  // Repères au sommet de chaque mont : tige dorée + perle
  var markers = [];
  MONTS.forEach(function (m) {
    var top = height(m.x, m.z);
    m.top = top;
    var lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(m.x, top + .02, m.z), new THREE.Vector3(m.x, top + .62, m.z)]);
    var line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xE2C17B, transparent: true, opacity: .75 }));
    var pearl = new THREE.Mesh(new THREE.SphereGeometry(.055, 20, 20), new THREE.MeshBasicMaterial({ color: 0xE2C17B }));
    pearl.position.set(m.x, top + .02, m.z);
    scene.add(line); scene.add(pearl);
    markers.push({ pearl: pearl, anchor: new THREE.Vector3(m.x, top + .66, m.z) });
  });

  // Poussière d'or en suspension
  var N = 520, pts = new Float32Array(N * 3), speeds = new Float32Array(N);
  for (var p = 0; p < N; p++) {
    pts[p * 3] = (Math.random() - .5) * 17;
    pts[p * 3 + 1] = Math.random() * 3.6 + .1;
    pts[p * 3 + 2] = (Math.random() - .5) * 9;
    speeds[p] = .08 + Math.random() * .22;
  }
  var pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  var dust = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xE2C17B, size: .03, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(dust);

  // ── Caméra ──
  var mobile = false;
  var cam = { x: 0, y: 5.4, z: 11.4, lx: 0, ly: .9, lz: -.3 };
  var par = { x: 0, y: 0, tx: 0, ty: 0 };
  function resize() {
    var r = stage.getBoundingClientRect();
    var w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false);
    var aspect = w / h;
    mobile = aspect < 1.05;
    camera.aspect = aspect;
    // On garde ~16 unités de largeur visibles sur grand écran, on suit le mont actif sur mobile
    var hfov = mobile ? 50 : 62;
    camera.fov = Math.min(mobile ? 58 : 44, 2 * Math.atan(Math.tan(hfov * Math.PI / 360) / aspect) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);

  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    par.tx = ((e.clientX - r.left) / r.width - .5) * 2;
    par.ty = ((e.clientY - r.top) / r.height - .5) * 2;
  }, { passive: true });

  var vec = new THREE.Vector3();
  var running = false, t0 = performance.now(), last = t0;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(now) {
    if (!inView) { running = false; return; }
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var t = (now - t0) / 1000;
    var m = MONTS[active];
    var k = mobile ? .9 : .22;
    par.x += (par.tx - par.x) * .05; par.y += (par.ty - par.y) * .05;
    var drift = reduced ? 0 : Math.sin(t * .18) * .5;
    var tx = m.x * k + par.x * .7 + drift, ty = (mobile ? 5.9 : 5.4) - par.y * .35, tz = mobile ? 9.6 : 11.4;
    var e = reduced ? 1 : .035;
    cam.x += (tx - cam.x) * e; cam.y += (ty - cam.y) * e; cam.z += (tz - cam.z) * e;
    cam.lx += (m.x * (k + .08) - cam.lx) * e; cam.lz += (m.z * .25 - .3 - cam.lz) * e;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);

    var ua = uniforms.uActive.value;
    ua.x += (m.x - ua.x) * .08; ua.y += (m.z - ua.y) * .08;
    uniforms.uAmt.value += (1 - uniforms.uAmt.value) * .05;
    uniforms.uTime.value = t;

    // Poussière qui monte doucement
    if (!reduced) {
      var arr = pgeo.attributes.position.array;
      for (var q = 0; q < N; q++) {
        arr[q * 3 + 1] += speeds[q] * dt;
        if (arr[q * 3 + 1] > 3.8) arr[q * 3 + 1] = .1;
      }
      pgeo.attributes.position.needsUpdate = true;
    }

    // Perles : la perle active grossit et passe au rubis
    markers.forEach(function (mk, i) {
      var on = i === active;
      var s = mk.pearl.scale.x + ((on ? 1.9 : 1) - mk.pearl.scale.x) * .1;
      mk.pearl.scale.setScalar(s);
      mk.pearl.material.color.setHex(on ? 0xE3294E : 0xE2C17B);
    });

    renderer.render(scene, camera);

    // Étiquettes HTML projetées sur les sommets (texte net en 4K)
    var r = stage.getBoundingClientRect();
    markers.forEach(function (mk, i) {
      vec.copy(mk.anchor).project(camera);
      var x = (vec.x * .5 + .5) * r.width, y = (-vec.y * .5 + .5) * r.height;
      var n = labelNodes[i];
      var out = vec.z > 1 || x < -60 || x > r.width + 60;
      n.style.visibility = out ? 'hidden' : 'visible';
      n.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (y - 14).toFixed(1) + 'px,0) translate(-50%,-100%)';
    });

    requestAnimationFrame(frame);
  }

  function watch() {
    if (!('IntersectionObserver' in window)) { inView = true; start(); return; }
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      start();
    }, { threshold: .05 }).observe(section);
  }
  function start() {
    if (inView && renderer && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  watch();
})();
