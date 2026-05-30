// shader-upgrade.js
// Progressive image upgrade: low-res → high-res via WebGL displacement morph.
// NEVER replaces the DOM element — only swaps img.src after pre-decoding.
// This keeps all external references (video controller, event listeners) valid.

function initHighResUpgrade(img) {
  if (!img) return;

  // Wait for the low-res image to fully load before doing anything.
  // This prevents WebGL from grabbing an empty texture (blackout).
  if (!img.complete || img.naturalWidth === 0) {
    img.addEventListener('load', function() {
      initHighResUpgrade(img);
    }, { once: true });
    return;
  }

  function getShaderSrc() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var aspect = w / h; // < 1 = portrait, > 1 = landscape

    if (w <= 640) {
      // Wider mobiles (landscape, foldables, short-and-wide phones)
      // → use the landscape desktop image for better coverage
      if (aspect > 0.75) return 'shaders/desktop 19:6/landsacpe screen .jpeg';
      // Tall/narrow phones (standard portrait) → 9:16 mobile image
      return 'shaders/mobile-9:16/mobile.jpeg';
    }
    if (w <= 1024) {
      // Tablet range
      if (aspect > 1.2) return 'shaders/desktop 19:6/ screen .jpeg'; // Landscape tablet
      return 'shaders/tablets/tablets.png'; // Portrait tablet
    }
    
    // Desktop range (> 1024)
    return 'shaders/tablets/tablets.png';
  }

  var hiResSrc = getShaderSrc();

  // Already showing the target image — nothing to do
  var currentUrl = img.currentSrc || img.src;
  // Make sure to URI-encode the src string in case it has spaces when comparing against currentSrc
  if (currentUrl.indexOf(hiResSrc) !== -1 || currentUrl.indexOf(encodeURI(hiResSrc)) !== -1) return;

  var hiResImg = new Image();
  hiResImg.crossOrigin = 'anonymous'; // Prevent tainted canvas issues
  var isTransitioning = false;

  // On mobile (≤640px), the video controller owns the background.
  // Skip WebGL entirely — just silently swap the img src so the
  // hi-res version is ready as a fallback if videos fail to play.
  var isMobile = window.innerWidth <= 640;

  if (!isMobile && window.WebGLRenderingContext) {
    hiResImg.onload = function() {
      if (isTransitioning) return;
      isTransitioning = true;
      startWebGLTransition(img, hiResImg);
    };
    hiResImg.onerror = function() {
      if (isTransitioning) return;
      isTransitioning = true;
      fallbackSwap();
    };
  } else {
    hiResImg.onload = function() {
      if (isTransitioning) return;
      isTransitioning = true;
      fallbackSwap();
    };
  }

  // Start loading — no timeout, wait as long as the network needs
  hiResImg.src = hiResSrc;

  // ─── Fallback: simple src swap with pre-decode ───────────────────────
  function fallbackSwap() {
    preDecodeAndSwap(img, hiResImg);
  }

  // ─── Pre-decode, then swap src in-place (no DOM replacement) ─────────
  // Uses createImageBitmap where available, falls back to img.decode(),
  // and worst-case just sets src directly.
  function preDecodeAndSwap(target, source) {
    function doSwap() {
      // Create a smooth crossfade by overlaying a temporary clone
      var temp = target.cloneNode(true);
      temp.style.position = 'absolute';
      temp.style.inset = '0';
      temp.style.width = '100%';
      temp.style.height = '100%';
      temp.style.objectFit = 'cover';
      temp.style.objectPosition = 'top center';
      temp.style.zIndex = '-1';
      temp.removeAttribute('id');
      
      if (target.parentNode) {
        target.parentNode.insertBefore(temp, target);
      }
      
      // Swap the actual source and hide it temporarily
      target.style.transition = 'none';
      target.style.opacity = '0';
      target.src = source.src;
      
      // Force style recalc
      target.offsetHeight;
      
      // Fade in the new source over 0.8s
      target.style.transition = 'opacity 0.8s ease-in-out';
      target.style.opacity = '0.60'; // match .is-loaded opacity
      
      // Cleanup the clone after fade completes
      setTimeout(function() {
        if (temp.parentNode) {
          temp.parentNode.removeChild(temp);
        }
        target.style.transition = ''; // let CSS take over again
        target.style.opacity = '';
      }, 850);
    }

    if (typeof createImageBitmap === 'function') {
      createImageBitmap(source).then(doSwap).catch(doSwap);
    } else if (typeof source.decode === 'function') {
      source.decode().then(doSwap).catch(doSwap);
    } else {
      doSwap();
    }
  }

  // ─── WebGL transition ────────────────────────────────────────────────
  function startWebGLTransition(tex0Img, tex1Img) {
    var canvas = document.getElementById('shader-transition-canvas');
    if (!canvas) { fallbackSwap(); return; }

    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
             canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) { fallbackSwap(); return; }

    var CONSTANTS = {
      imageOpacity: '0.60',
      cssTransitionMs: 500,
      shaderDurationMs: 3500
    };

    var dpr = window.devicePixelRatio || 1;
    function updateCanvasSize() {
      canvas.width = tex0Img.clientWidth * dpr;
      canvas.height = tex0Img.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (program) {
        var canvasSizeLoc = gl.getUniformLocation(program, "canvasSize");
        if (canvasSizeLoc) {
          gl.uniform2f(canvasSizeLoc, canvas.width, canvas.height);
        }
      }
    }

    updateCanvasSize();

    var resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(function() {
        updateCanvasSize();
      });
      resizeObserver.observe(tex0Img);
    } else {
      window.addEventListener('resize', updateCanvasSize);
    }

    // Copy the image's CSS filter (contrast/brightness) onto the canvas
    if (window.getComputedStyle) {
      var computedFilter = window.getComputedStyle(tex0Img).filter;
      if (computedFilter && computedFilter !== 'none') {
        canvas.style.filter = computedFilter;
      }
    }

    // ── Shaders ────────────────────────────────────────────────────────────
    var vsSource = "attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }";

    // Shader with object-fit: cover and object-position: top center math built in
    var fsSource = `
      precision highp float;
      varying vec2 vUv;
      
      uniform sampler2D tex0;
      uniform sampler2D tex1;
      uniform float progress;
      uniform float time;
      
      uniform vec2 canvasSize;
      uniform vec2 tex0Size;
      uniform vec2 tex1Size;

      float hash(vec2 p) { 
        return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); 
      }
      
      float noise(vec2 x) { 
        vec2 i = floor(x); 
        vec2 f = fract(x); 
        float a = hash(i); 
        float b = hash(i + vec2(1.0, 0.0)); 
        float c = hash(i + vec2(0.0, 1.0)); 
        float d = hash(i + vec2(1.0, 1.0)); 
        vec2 u = f * f * (3.0 - 2.0 * f); 
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y; 
      }

      vec2 getCoverUv(vec2 uv, vec2 canvasResolution, vec2 texResolution) {
        float canvasAspect = canvasResolution.x / canvasResolution.y;
        float texAspect = texResolution.x / texResolution.y;
        vec2 objUv = uv;
        
        if (canvasAspect > texAspect) {
          float scale = canvasAspect / texAspect;
          objUv.y = 1.0 - (1.0 - uv.y) / scale; // object-position: top (1.0 is top in WebGL)
        } else {
          float scale = texAspect / canvasAspect;
          objUv.x = 0.5 + (uv.x - 0.5) / scale; // object-position: center
        }
        return objUv;
      }

      void main() {
        // vUv is 0..1 (bottom-left to top-right)
        vec2 uv = vUv;
        
        float intensity = progress * (1.0 - progress) * 4.0; 
        float n = noise(uv * 5.0 + time * 0.5); 
        vec2 disp = vec2(n - 0.5) * 0.1 * intensity; 
        vec2 rgbOffset = vec2(0.015, 0.0) * intensity; 
        
        vec2 uvDisplaced = uv + disp;
        
        // Calculate object-fit: cover coordinates
        vec2 uv0 = getCoverUv(uvDisplaced, canvasSize, tex0Size);
        vec2 uv1 = getCoverUv(uv - disp, canvasSize, tex1Size);
        
        // Flip Y back for textures
        uv0.y = 1.0 - uv0.y;
        uv1.y = 1.0 - uv1.y;

        vec4 c0 = texture2D(tex0, uv0); 
        
        float r1 = texture2D(tex1, uv1 + rgbOffset).r; 
        float g1 = texture2D(tex1, uv1).g; 
        float b1 = texture2D(tex1, uv1 - rgbOffset).b; 
        vec4 c1 = vec4(r1, g1, b1, 1.0); 
        
        float scanline = sin(uv.y * 800.0) * 0.04 * intensity; 
        c1.rgb -= scanline; 
        c0.rgb -= scanline; 
        
        gl_FragColor = mix(c0, c1, smoothstep(0.1, 0.9, progress)); 
      }
    `;

    function compile(src, type) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    var vs = compile(vsSource, gl.VERTEX_SHADER);
    var fs = compile(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) { destroyGL(); fallbackSwap(); return; }

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      destroyGL(); fallbackSwap(); return;
    }
    gl.useProgram(program);

    // ── Geometry ───────────────────────────────────────────────────────
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    var posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // ── Textures ──────────────────────────────────────────────────────
    function createTex(imgEl, unit) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgEl);
      } catch (e) {
        console.error("WebGL Texture Error:", e);
        return null;
      }
      return t;
    }

    var t0 = createTex(tex0Img, 0);
    var t1 = createTex(tex1Img, 1);

    if (!t0 || !t1) { destroyGL(); fallbackSwap(); return; }

    // ── Uniforms ──────────────────────────────────────────────────────
    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "tex1"), 1);
    gl.uniform2f(gl.getUniformLocation(program, "canvasSize"), canvas.width, canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, "tex0Size"), tex0Img.naturalWidth, tex0Img.naturalHeight);
    gl.uniform2f(gl.getUniformLocation(program, "tex1Size"), tex1Img.naturalWidth, tex1Img.naturalHeight);

    var pLoc = gl.getUniformLocation(program, "progress");
    var tLoc = gl.getUniformLocation(program, "time");

    // If the image was hidden by the mobile video player before we even finished loading,
    // skip the WebGL transition entirely and just swap the src in the background.
    if (!tex0Img.classList.contains('is-loaded')) {
      destroyGL();
      fallbackSwap();
      return;
    }

    // ── Show canvas and draw first frame synchronously ─────────────────
    canvas.style.display = 'block';
    
    // Start the canvas at the IMAGE's opacity so there's no brightness jump.
    // Then gradually fade up to the canvas's own CSS opacity (0.70).
    canvas.style.transition = 'none';
    canvas.style.opacity = CONSTANTS.imageOpacity;  // match .is-loaded opacity exactly
    canvas.offsetHeight;            // force style recalc before adding transition
    canvas.style.transition = 'opacity ' + (CONSTANTS.cssTransitionMs / 1000) + 's ease';
    canvas.style.opacity = '';      // removes inline → falls back to CSS 0.70

    gl.uniform1f(pLoc, 0.0);
    gl.uniform1f(tLoc, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Hide the image ONLY after the compositor has painted the canvas.
    // Double rAF guarantees the canvas is on-screen before the image disappears.
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        tex0Img.style.visibility = 'hidden';
      });
    });

    // ── Animation loop ────────────────────────────────────────────────
    var startTime = null;
    var duration = CONSTANTS.shaderDurationMs;

    function render(now) {
      if (!startTime) startTime = now;
      var elapsed = now - startTime;
      var rawProgress = Math.min(elapsed / duration, 1.0);

      // Smooth ease-in-out
      var progress = -(Math.cos(Math.PI * rawProgress) - 1) / 2;

      gl.uniform1f(pLoc, progress);
      gl.uniform1f(tLoc, elapsed * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (rawProgress < 1.0) {
        requestAnimationFrame(render);
      } else {
        // ── Transition complete ─────────────────────────────────────
        // Gradually fade the canvas back down to the image's opacity
        // before swapping, so there's no brightness jump at the end either.
        // ONLY do this if the image hasn't been hidden by the mobile video player!
        if (tex0Img.classList.contains('is-loaded')) {
          canvas.style.transition = 'opacity ' + (CONSTANTS.cssTransitionMs / 1000) + 's ease';
          canvas.style.opacity = CONSTANTS.imageOpacity;
        }

        // After the fade-down completes, swap src and clean up.
        // tex1Img is already fully loaded and decoded in memory — just swap src directly.
        // No createImageBitmap/decode needed (those trigger a re-fetch which causes CORS errors).
        setTimeout(function() {
          tex0Img.src = tex1Img.src;
          // Only restore visibility if the element is still supposed to be active
          if (tex0Img.classList.contains('is-loaded')) {
            tex0Img.style.visibility = '';
          }
          canvas.style.display = 'none';
          canvas.style.filter = '';
          canvas.style.transition = '';
          canvas.style.opacity = '';
          destroyGL();
        }, CONSTANTS.cssTransitionMs + 20); // slightly longer than the CSS transition
      }
    }

    requestAnimationFrame(render);

    // ── Cleanup helper (used on both success and error paths) ──────────
    function destroyGL() {
      if (t0) gl.deleteTexture(t0);
      if (t1) gl.deleteTexture(t1);
      if (buffer) gl.deleteBuffer(buffer);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (program) gl.deleteProgram(program);

      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();

      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', updateCanvasSize);
      }
    }
  }
}
