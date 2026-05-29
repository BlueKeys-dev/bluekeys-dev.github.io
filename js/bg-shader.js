/**
 * BlueKeys — Interactive WebGL Fluid Background Shader
 * Slow breathing flow + dramatic ripple warp on touch/click
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
    varying vec2 v_uv;

    uniform vec2  u_resolution;
    uniform float u_time;
    uniform vec2  u_mouse;       // smoothed pointer position (px)
    uniform vec3  u_touch;       // (x, y) in px + z = ripple strength [0..1]

    // ─── Simplex 2-D noise ───────────────────────────────────
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(
        0.211324865405187,   // (3.0-sqrt(3.0))/6.0
        0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
       -0.577350269189626,   // -1.0 + 2.0 * C.x
        0.024390243902439    // 1.0 / 41.0
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

    // ─── Fractional Brownian Motion (4 octaves) ──────────────────────
    float fbm(vec2 p) {
      float value = 0.0;
      float amp   = 0.5;
      float freq  = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amp * snoise(p * freq);
        freq  *= 2.0;
        amp   *= 0.5;
      }
      return value;
    }

    void main() {
      float aspect = u_resolution.x / u_resolution.y;
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      st.x *= aspect;
      
      // ── Increased Fluid Amount ──────────────────────────
      vec2 base = st * 0.8; // Zoomed in slightly to show more fluid movement
      
      // ── Breathing pulse ────────────────────────────────────
      float t = u_time * 1.0; // Normal time
      float breath = sin(t * 0.5) * 0.30 + 1.0;

      // ── Normal Domain Warping ──────────────────────────
      // First layer (macro)
      vec2 q = vec2(
        fbm(base + vec2(t * 0.04, t * 0.02)),
        fbm(base + vec2(-t * 0.03, t * 0.05))
      );
      
      // Second layer (micro)
      vec2 r = vec2(
        fbm(base + 6.0 * q + vec2(t * 0.06, t * 0.04)),
        fbm(base + 6.0 * q + vec2(-t * 0.04, -t * 0.06))
      );
      
      // Third layer (ultra micro)
      vec2 s = vec2(
        fbm(base + 8.0 * r + vec2(t * 0.08, t * 0.05)),
        fbm(base + 8.0 * r + vec2(-t * 0.05, -t * 0.07))
      );

      // The final warped flow field
      float flow = fbm(base + 6.0 * s);

      // ── Spray / Fluid Particles ────────────────────────
      // Very high frequency noise moving rapidly to simulate tiny spray particles
      float particleNoise = snoise(st * 50.0 - t * 1.5 + flow * 5.0);
      float spray = smoothstep(0.80, 0.98, particleNoise) * 0.9;

      // ── High-frequency grain/texture layer ────────────────────────
      float grain = fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453) * 0.035;
      float detail = snoise(st * 8.0 + t * 0.2 + flow * 0.5) * 0.1;

      // ── Mouse hover — soft gradient pull ───────────────────
      vec2 mouse = u_mouse / u_resolution;
      mouse.x *= aspect;
      mouse.y = 1.0 - mouse.y;
      float mDist = distance(st, mouse);
      float hover = smoothstep(0.6, 0.0, mDist) * 0.25;

      // ── Touch/Click ripple warp ────────────────────────────
      vec2 touch = u_touch.xy / u_resolution;
      touch.x *= aspect;
      touch.y = 1.0 - touch.y;
      float strength = u_touch.z;

      float tDist = distance(st, touch);
      // Expanding ring ripple with Chromatic Aberration potential
      float ripple = sin(tDist * 30.0 - t * 6.0)
                   * exp(-tDist * 5.0)
                   * strength;
      
      vec2 dir = (tDist > 0.001) ? normalize(st - touch) : vec2(0.0);
      st += dir * ripple * 0.12; // Slightly stronger warp

      // Recompute flow at warped position for visible distortion
      float warpedFlow = fbm(st * 0.8 + 6.0 * s);

      // ── Colour palette ─────────────────────────────────────
      vec3 col1 = vec3(0.980, 0.976, 0.965);   // #FAF9F6  off-white
      vec3 col2 = vec3(0.557, 0.792, 0.902);   // #8ecae6  brand blue
      vec3 col3 = vec3(0.886, 0.945, 0.973);   // #e2f1f8  soft accent
      vec3 col4 = vec3(0.300, 0.600, 0.800);   // Deep blue for accents
      vec3 colSpray = vec3(0.9, 0.95, 1.0);    // Bright icy white for spray

      // Mix colours from warped flow + detail + breath
      float f = warpedFlow * breath + detail;
      
      vec3 color = mix(col1, col3, smoothstep(-0.6, 0.8, f));
      
      // Increased fluid coloring
      color = mix(color, col2, smoothstep(0.1, 1.2, r.x + r.y) * 0.75);
      color = mix(color, col4, smoothstep(0.5, 1.5, q.x + q.y) * 0.4); 
      
      // Add the fluid spray/particles over the top
      color = mix(color, colSpray, spray);

      // Add film grain
      color -= grain;

      // Hover brightens the blue
      color = mix(color, col2, hover * 0.4);

      // Ripple colour bloom — brief blue flash near touch
      float bloom = exp(-tDist * 8.0) * strength;
      color = mix(color, vec3(1.0, 1.0, 1.0), bloom * 0.4); // flash bright
      color = mix(color, col4, bloom * 0.6); // then deep blue

      // ── Vertical alpha fade (mask at bottom) ───────────────
      float alpha = smoothstep(0.0, 0.7, v_uv.y + 0.25);

      gl_FragColor = vec4(color, alpha * 0.85);
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
    time:       gl.getUniformLocation(program, "u_time"),
    mouse:      gl.getUniformLocation(program, "u_mouse"),
    touch:      gl.getUniformLocation(program, "u_touch"),
  };

  // ── Pointer state ──────────────────────────────────────────
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  let mouse       = { x: cx, y: cy };
  let targetMouse  = { x: cx, y: cy };
  let touchPoint   = { x: cx, y: cy };
  let touchStrength = 0;

  // Mouse
  window.addEventListener("mousemove", (e) => {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
  });

  // Click — fire ripple on desktop
  window.addEventListener("mousedown", (e) => {
    touchPoint.x = e.clientX;
    touchPoint.y = e.clientY;
    touchStrength = 1.0;
  });

  // Touch — full mobile support
  window.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    targetMouse.x = t.clientX;
    targetMouse.y = t.clientY;
    touchPoint.x  = t.clientX;
    touchPoint.y  = t.clientY;
    touchStrength  = 1.0;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    targetMouse.x = t.clientX;
    targetMouse.y = t.clientY;
    // Keep ripple alive while dragging
    touchPoint.x  = t.clientX;
    touchPoint.y  = t.clientY;
    if (touchStrength < 0.3) touchStrength = 0.5;
  }, { passive: true });

  // touchend — let it decay naturally (no reset)

  // ── Resize (debounced) ─────────────────────────────────────
  let resizeTimer;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Scale canvas internal resolution by Device Pixel Ratio (fixes low-res blur)
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      
      // Keep CSS size identical to viewport
      canvas.style.width  = w + "px";
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

  // ── Render loop & Smart Loading ────────────────────────────
  const t0 = performance.now();
  let lastFrame = 0;
  let isVisible = false;
  let animationFrameId = null;

  function render(now) {
    if (!isVisible) return; // Stop the loop if not visible

    // Throttle to ~80 fps max (12 ms frame budget)
    if (now - lastFrame >= 12) {
      lastFrame = now;

      // Smooth mouse interpolation (spring-damper)
      mouse.x += (targetMouse.x - mouse.x) * 0.06;
      mouse.y += (targetMouse.y - mouse.y) * 0.06;

      // Decay ripple strength
      touchStrength *= 0.97;
      if (touchStrength < 0.005) touchStrength = 0;

      gl.uniform1f(loc.time, (now - t0) * 0.001);
      gl.uniform2f(loc.mouse, mouse.x, mouse.y);
      gl.uniform3f(loc.touch, touchPoint.x, touchPoint.y, touchStrength);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    animationFrameId = requestAnimationFrame(render);
  }

  // ── Smart Loading (Intersection Observer) ────────────────────
  // We observe the features section so the shader only runs when the user reaches it.
  const featuresSection = document.querySelector(".features-section");

  if (featuresSection) {
    if (window.innerWidth < 768) {
      canvas.style.opacity = "0"; // Hide instantly on mobile initially
      canvas.style.transition = "opacity 0.6s ease-in-out";
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        
        // On mobile, completely hide the canvas when on the welcome page
        if (window.innerWidth < 768) {
          canvas.style.opacity = isVisible ? "0.5" : "0";
        }

        if (isVisible) {
          if (!animationFrameId) {
            lastFrame = performance.now();
            animationFrameId = requestAnimationFrame(render);
          }
        } else {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      });
    }, { threshold: 0.01 });

    observer.observe(featuresSection);
  } else {
    // Fallback if loaded directly without the dynamic wrapper
    isVisible = true;
    animationFrameId = requestAnimationFrame(render);
  }
}

// Initialize immediately if DOM is already parsed, otherwise wait
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBgShader);
} else {
  initBgShader();
}
