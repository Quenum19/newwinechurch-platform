/* ════════════════════════════════════════════════════════════════════
   HERO — Sculpture liquide « vin nouveau » (WebGL, raymarching)
   Une goutte de vin rubis qui respire, traversée par la lumière
   (réfraction + absorption Beer-Lambert), entourée de l'anneau d'or
   du logo. Une petite goutte suit le curseur et s'en détache.
   Aucune librairie : un seul shader plein écran.
   Qualité adaptative : la résolution interne baisse si le GPU peine,
   et le rendu s'arrête dès que le hero sort de l'écran.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var canvas = document.getElementById('heroGl');
  if (!canvas) return;
  var hero = document.getElementById('hero');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { gl = null; }
  if (!gl) { document.documentElement.classList.add('no-webgl'); return; }

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;',
    'uniform vec2 uShift;uniform float uFocal;uniform float uIntro;',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}',

    // Le liquide : plusieurs gouttes qui fusionnent en douceur
    'float liquid(vec3 p){',
    '  float s=mix(.18,1.,uIntro);',
    '  p/=s;',
    '  float t=uTime*.33;',
    '  vec3 c1=vec3(sin(t*1.3)*.62,cos(t*1.1)*.40,sin(t*.7)*.34);',
    '  vec3 c2=vec3(-cos(t*.9)*.70,sin(t*1.7)*.36+.16,cos(t*1.2)*.30);',
    '  vec3 c3=vec3(sin(t*.6)*.28,-.60+sin(t*1.9)*.12,cos(t)*.28);',
    '  vec3 c4=vec3(cos(t*1.4)*.34,.60+cos(t*.8)*.10,sin(t*1.6)*.30);',
    '  float d=length(p)-.80;',
    '  d=smin(d,length(p-c1)-.42,.42);',
    '  d=smin(d,length(p-c2)-.36,.40);',
    '  d=smin(d,length(p-c3)-.30,.34);',
    '  d=smin(d,length(p-c4)-.26,.32);',
    '  vec3 m=vec3(uMouse.x*1.45,uMouse.y*.95,.42);',
    '  d=smin(d,length(p-m)-.16,.52);',
    '  d+=.016*sin(p.x*7.+uTime*1.1)*sin(p.y*6.-uTime*.9)*sin(p.z*7.+uTime*.7);',
    '  return d*s;',
    '}',

    // L'anneau d'or (le cercle du logo)
    'float ring(vec3 p){',
    '  p.yz*=rot(1.12);',
    '  p.xy*=rot(.36+sin(uTime*.25)*.08);',
    '  p.xz*=rot(uTime*.12);',
    '  float r=mix(.6,1.44,uIntro);',
    '  vec2 q=vec2(length(p.xz)-r,p.y);',
    '  return length(q)-.017;',
    '}',

    'vec3 nrmL(vec3 p){vec2 e=vec2(.0016,0.);return normalize(vec3(liquid(p+e.xyy)-liquid(p-e.xyy),liquid(p+e.yxy)-liquid(p-e.yxy),liquid(p+e.yyx)-liquid(p-e.yyx)));}',
    'vec3 nrmR(vec3 p){vec2 e=vec2(.0012,0.);return normalize(vec3(ring(p+e.xyy)-ring(p-e.xyy),ring(p+e.yxy)-ring(p-e.yxy),ring(p+e.yyx)-ring(p-e.yyx)));}',

    // Studio virtuel : plafond lumineux chaud, bande latérale, contre-jour rubis
    'vec3 env(vec3 d){',
    '  vec3 c=mix(vec3(.02,.004,.008),vec3(.15,.025,.05),smoothstep(-.8,.9,d.y));',
    '  c+=vec3(1.,.84,.64)*smoothstep(.80,.97,d.y)*2.3;',
    '  c+=vec3(1.,.78,.5)*smoothstep(.55,.92,d.x)*smoothstep(.7,0.,abs(d.y-.12))*1.7;',
    '  c+=vec3(.95,.22,.33)*smoothstep(.55,.95,-d.x)*smoothstep(.75,.1,abs(d.y))*1.1;',
    '  c+=vec3(1.,.9,.76)*pow(max(dot(d,normalize(vec3(.42,.62,.66))),0.),70.)*7.;',
    '  return c;',
    '}',

    'void main(){',
    '  vec2 fc=gl_FragCoord.xy;',
    '  vec2 uv=(fc-.5*uRes)/uRes.y;',
    '  vec2 u=uv-uShift;',
    '  u.y+=uScroll*.55;',
    '  vec3 ro=vec3(0.,0.,4.);',
    '  vec3 rd=normalize(vec3(u,-uFocal));',
    '  rd.xz*=rot(uMouse.x*.05);rd.yz*=rot(-uMouse.y*.04);',
    // Fond : nuit grenat, vignette, lueur rouge projetée par le vin
    '  float vg=smoothstep(1.35,.15,length(uv*vec2(.75,1.)));',
    '  vec3 col=vec3(.05,.012,.02)*(.35+.65*vg);',
    '  col+=vec3(.42,.04,.10)*exp(-2.6*dot(u,u)*uFocal)*.55*uIntro;',
    '  float b=dot(ro,rd);float cc=dot(ro,ro)-3.61;float h=b*b-cc;',
    '  if(h>0.){',
    '    float sh=sqrt(h);float t=max(-b-sh,0.);float tmax=-b+sh;',
    '    float id=0.;bool hit=false;',
    '    for(int i=0;i<84;i++){',
    '      vec3 p=ro+rd*t;',
    '      float a=liquid(p);float r=ring(p);',
    '      float d=min(a,r);',
    '      if(d<.0012){hit=true;id=a<r?1.:2.;break;}',
    '      t+=d*.9;',
    '      if(t>tmax)break;',
    '    }',
    '    if(hit){',
    '      vec3 p=ro+rd*t;',
    '      if(id<1.5){',
    '        vec3 n=nrmL(p);',
    '        float fr=.04+.96*pow(1.-max(dot(-rd,n),0.),4.);',
    '        vec3 rf=env(reflect(rd,n));',
    // Traversée de la goutte : on mesure l'épaisseur de vin
    '        vec3 rr=refract(rd,n,1./1.34);',
    '        vec3 q=p-n*.004;float th=0.;',
    '        for(int j=0;j<30;j++){',
    '          float d=-liquid(q);',
    '          if(d<.002)break;',
    '          float s=max(d,.02);q+=rr*s;th+=s;',
    '        }',
    '        vec3 n2=-nrmL(q);',
    '        vec3 rr2=refract(rr,n2,1.34);',
    '        if(dot(rr2,rr2)<.01)rr2=reflect(rr,n2);',
    '        vec3 tr=env(rr2);',
    '        vec3 ab=exp(-th*vec3(.85,5.6,4.3));',
    '        vec3 body=tr*ab+vec3(.32,.02,.06)*(1.-exp(-th*1.6))*.55;',
    '        col=mix(body,rf,fr);',
    '        vec3 L=normalize(vec3(.5,.8,.6));',
    '        col+=vec3(1.,.93,.82)*pow(max(dot(reflect(rd,n),L),0.),110.)*1.8;',
    // Bulles d'effervescence : le vin nouveau fermente
    '        vec2 bq=vec2(fc.x*.045,fc.y*.045-uTime*1.4);',
    '        vec2 bi=floor(bq);vec2 bf=fract(bq)-.5;',
    '        float rnd=fract(sin(dot(bi,vec2(127.1,311.7)))*43758.5453);',
    '        float bub=smoothstep(.09,.0,length(bf-vec2(rnd-.5,0.)*.6))*step(.93,rnd);',
    '        col+=vec3(1.,.75,.7)*bub*.35*smoothstep(.2,.9,th);',
    '      }else{',
    '        vec3 n=nrmR(p);',
    '        float fr=pow(1.-max(dot(-rd,n),0.),3.);',
    '        vec3 gold=vec3(1.,.77,.42);',
    '        col=env(reflect(rd,n))*gold*(.6+.9*fr)+gold*.07;',
    '      }',
    '    }',
    '  }',
    // Tonemapping doux + grain filmique
    '  col=col/(1.+col*.5);',
    '  col=pow(col,vec3(.93));',
    '  float g=fract(sin(dot(fc+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453);',
    '  col+=(g-.5)*.03;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[hero] shader :', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { document.documentElement.classList.add('no-webgl'); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { document.documentElement.classList.add('no-webgl'); return; }
  gl.useProgram(prog);

  // Triangle plein écran
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uRes', 'uTime', 'uMouse', 'uScroll', 'uShift', 'uFocal', 'uIntro'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  // ── État ──
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var quality = window.innerWidth > 1700 ? .62 : window.innerWidth > 900 ? .78 : .9;
  var cssW = 0, cssH = 0;
  var mouse = { x: .25, y: .1, tx: .25, ty: .1 };
  var hasPointer = window.matchMedia('(pointer: fine)').matches;
  var intro = 0, introTarget = 0;
  var visible = true, running = true;
  var t0 = performance.now(), last = t0, frames = 0, acc = 0;

  function layout() {
    var r = hero.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    var w = Math.max(2, Math.round(cssW * dpr * quality));
    var h = Math.max(2, Math.round(cssH * dpr * quality));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    var aspect = cssW / cssH;
    // Position et taille de la sculpture selon l'écran
    var shiftX = aspect > 1.15 ? Math.min(.42, aspect * .23) : 0;
    var shiftY = aspect > 1.15 ? .04 : .2;
    var focal = aspect > 1.15 ? 1.7 : Math.max(.95, Math.min(1.7, 2.05 * aspect));
    gl.uniform2f(U.uRes, w, h);
    gl.uniform2f(U.uShift, shiftX, shiftY);
    gl.uniform1f(U.uFocal, focal);
  }

  window.addEventListener('resize', layout, { passive: true });
  if (hasPointer) {
    window.addEventListener('pointermove', function (e) {
      if (!visible) return;
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1 - .3;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    }, { threshold: 0 }).observe(hero);
  }

  // L'intro « fait pousser » la goutte quand la page est prête
  window.addEventListener('nwc:ready', function () { introTarget = 1; });
  setTimeout(function () { introTarget = 1; }, 2600); // filet de sécurité

  function frame(now) {
    if (!visible) { running = false; return; }
    var dt = Math.min(64, now - last); last = now;
    var time = reduced ? 8 : (now - t0) / 1000;

    if (!hasPointer) {
      // Sur mobile, la petite goutte se promène toute seule
      mouse.tx = Math.sin(time * .45) * .55;
      mouse.ty = Math.cos(time * .32) * .45;
    }
    mouse.x += (mouse.tx - mouse.x) * .06;
    mouse.y += (mouse.ty - mouse.y) * .06;
    intro += (introTarget - intro) * (reduced ? 1 : .035);

    var sc = Math.min(1, Math.max(0, window.scrollY / Math.max(1, cssH)));
    gl.uniform1f(U.uTime, time);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uScroll, sc);
    gl.uniform1f(U.uIntro, intro);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Qualité adaptative toutes les 40 images
    frames++; acc += dt;
    if (frames >= 40) {
      var avg = acc / frames; frames = 0; acc = 0;
      var q = quality;
      if (avg > 24 && quality > .4) q = quality * .82;
      else if (avg < 15 && quality < 1) q = Math.min(1, quality * 1.1);
      if (Math.abs(q - quality) > .02) { quality = q; layout(); }
    }
    if (reduced && intro > .999) { running = false; return; }
    requestAnimationFrame(frame);
  }

  layout();
  requestAnimationFrame(frame);
})();
