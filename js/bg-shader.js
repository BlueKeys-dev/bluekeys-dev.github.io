/**
 * BlueKeys — Premium WebGL Fluid Background Shader
 * Gentle, spacious breathing flow with subtle desktop-only ripple
 */
function initBgShader() {
  const canvas = document.getElementById("shader-canvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: false,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    console.warn("WebGL not supported — CSS background fallback active.");
    return;
  }

  const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

  // ── Vertex Shader ──────────────────────────────────────────
  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      v_uv.y = 1.0 - v_uv.y;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // ── Fragment Shader ────────────────────────────────────────
  const fsSource = `
    precision mediump float;
    ${isMobile ? '#define IS_MOBILE' : ''}
    varying vec2 v_uv;

    uniform vec2  u_resolution;
    uniform float u_time;
    uniform vec2  u_mouse;
    uniform vec3  u_touch;

    // ─── Simplex 2-D noise ───────────────────────────────────
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(
        0.211324865405187,
        0.366025403784439,
       -0.577350269189626,
        0.024390243902439
      );
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                                    + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                               dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // ─── Fractional Brownian Motion ──────────────────────
    float fbm(vec2 p) {
      float value = 0.0;
      float amp   = 0.5;
      float freq  = 1.0;
      #ifdef IS_MOBILE
        for (int i = 0; i < 2; i++) {
          value += amp * snoise(p * freq);
          freq  *= 2.0;
          amp   *= 0.5;
        }
      #else
        for (int i = 0; i < 3; i++) {
          value += amp * snoise(p * freq);
          freq  *= 2.0;
          amp   *= 0.5;
        }
      #endif
      return value;
    }

    void main() {
      float aspect = u_resolution.x / u_resolution.y;
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      st.x *= aspect;
      
      float t = u_time;

      #ifndef IS_MOBILE
        // ── Desktop-only: Touch/Click ripple warp ──────────────
        vec2 touch = u_touch.xy / u_resolution;
        touch.x *= aspect;
        touch.y = 1.0 - touch.y;
        float strength = u_touch.z;
        float tDist = distance(st, touch);
        float ripple = sin(tDist * 30.0 - t * 6.0)
                     * exp(-tDist * 5.0)
                     * strength;
        vec2 dir = (tDist > 0.001) ? normalize(st - touch) : vec2(0.0);
        st += dir * ripple * 0.08;
      #endif

      // ── Spacious fluid scale ─────────────────────────────
      // Lower = more zoomed out = more spacious/airy
      vec2 base = st * 0.45; // slightly wider
      
      // ── Slow breathing pulse ─────────────────────────────
      float breath = sin(t * 0.25) * 0.15 + 1.0;

      // ── Single-layer domain warping (clean, not cluttered) ──
      vec2 q = vec2(
        fbm(base + vec2(t * 0.02, t * 0.01)),
        fbm(base + vec2(-t * 0.015, t * 0.025))
      );

      // Gentle warp
      float flow = fbm(base + 1.8 * q);

      // ── Colour palette ─────────────────────────────────────
      vec3 brandBlue = vec3(0.20, 0.65, 0.90);   // strong brand blue
      vec3 skyBlue   = vec3(0.40, 0.75, 0.95);   // bright sky
      vec3 deepBlue  = vec3(0.10, 0.45, 0.80);   // rich deep accent

      // Calculate how "fluid" this pixel is
      float f = flow * breath;
      float fluidIntensity = smoothstep(-0.2, 0.8, f);
      
      // Base color is sky blue
      vec3 color = skyBlue;
      
      // Mix in brand blue and deep blue based on the warp
      color = mix(color, brandBlue, smoothstep(0.2, 1.1, q.x + q.y));
      color = mix(color, deepBlue, smoothstep(0.5, 1.5, q.x * q.y + 0.4));

      #ifndef IS_MOBILE
        // Subtle film grain (desktop only)
        float grain = fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453) * 0.025;
        color -= grain;

        // Mouse hover — soft gradient pull
        vec2 mouse = u_mouse / u_resolution;
        mouse.x *= aspect;
        mouse.y = 1.0 - mouse.y;
        float mDist = distance(st, mouse);
        float hover = smoothstep(0.6, 0.0, mDist) * 0.2;
        color = mix(color, skyBlue, hover);

        // Ripple colour bloom
        float bloom = exp(-tDist * 8.0) * strength;
        color = mix(color, vec3(1.0), bloom * 0.3);
        color = mix(color, skyBlue, bloom * 0.5);
      #endif

      // ── Vertical alpha fade ────────────────────────────────
      // Base transparency is the fluid intensity (so background shows through)
      float alpha = fluidIntensity;
      
      // Fade out near the bottom
      float fade = smoothstep(0.0, 0.6, v_uv.y + 0.1);

      #ifdef IS_MOBILE
        gl_FragColor = vec4(color, alpha * fade * 0.6); // 60% opacity max on mobile
      #else
        gl_FragColor = vec4(color, alpha * fade * 0.5); // 50% opacity max on desktop
      #endif
    }
  `;

  // ── Shader compilation ─────────────────────────────────────
  function compileShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // ── Full-screen quad ───────────────────────────────────────
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,  1, 1,
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // ── Uniforms ───────────────────────────────────────────────
  const loc = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    time: gl.getUniformLocation(program, "u_time"),
    mouse: gl.getUniformLocation(program, "u_mouse"),
    touch: gl.getUniformLocation(program, "u_touch"),
  };

  // ── Pointer state ──────────────────────────────────────────
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  let mouse = { x: cx, y: cy };
  let targetMouse = { x: cx, y: cy };
  let touchPoint = { x: cx, y: cy };
  let touchStrength = 0;

  if (!isMobile) {
    // Desktop only — mouse hover + click ripple
    window.addEventListener("mousemove", (e) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    });

    window.addEventListener("mousedown", (e) => {
      touchPoint.x = e.clientX;
      touchPoint.y = e.clientY;
      touchStrength = 1.0;
    });
  }
  // No touch events on mobile — shader is purely ambient

  // ── Resize (debounced) ─────────────────────────────────────
  let resizeTimer;
  function resize() {
    const dpr = isMobile ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.25);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(loc.resolution, canvas.width, canvas.height);
    }
  }
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();

  // ── Blend for transparent canvas ───────────────────────────
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ── Render loop ────────────────────────────────────────────
  const t0 = performance.now();
  let lastFrame = 0;
  let isVisible = false;
  let animationFrameId = null;

  function render(now) {
    if (!isVisible) return;

    const frameBudget = isMobile ? 33 : 16;
    if (now - lastFrame >= frameBudget) {
      lastFrame = now;

      if (!isMobile) {
        mouse.x += (targetMouse.x - mouse.x) * 0.04;
        mouse.y += (targetMouse.y - mouse.y) * 0.04;
        touchStrength *= 0.97;
        if (touchStrength < 0.005) touchStrength = 0;
      }

      gl.uniform1f(loc.time, (now - t0) * 0.001);
      gl.uniform2f(loc.mouse, mouse.x, mouse.y);
      gl.uniform3f(loc.touch, touchPoint.x, touchPoint.y, touchStrength);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  // ── Always-on rendering ─────────────────────────────────────
  if (isMobile) {
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 1s ease-in-out";
    requestAnimationFrame(() => { canvas.style.opacity = "1"; });
  }

  isVisible = true;
  lastFrame = performance.now();
  animationFrameId = requestAnimationFrame(render);
}

// Initialize immediately if DOM is already parsed, otherwise wait
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBgShader);
} else {
  initBgShader();
}
