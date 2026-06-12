"use client";

import { useEffect, useMemo, useState } from "react";

type Option = {
  id: string;
  label: string;
  blurb: string;
  bg?: string;
  custom?:
    | "drifting-glyphs"
    | "citation-field"
    | "contour-map"
    | "knowledge-graph"
    | "paper-layers"
    | "vertical-typography"
    | "ink-stroke"
    | "shader-mesh"
    | "shader-3d"
    | "citation-3d-network";
};

const OPTIONS: Option[] = [
  {
    id: "current",
    label: "1. Current — warm amber mesh",
    blurb: "Your 'dirty' gradient baseline, for reference.",
    bg: `
      radial-gradient(ellipse 70% 65% at 88% 8%, rgba(146,64,14,0.38), transparent 70%),
      radial-gradient(ellipse 65% 60% at 12% 92%, rgba(146,64,14,0.28), transparent 70%),
      #faf9f6
    `,
  },
  {
    id: "top-wash",
    label: "2. Top wash (gradient)",
    blurb: "Single linear amber fade. For comparison against the non-gradient approaches.",
    bg: `linear-gradient(to bottom, rgba(146,64,14,0.10) 0%, transparent 50%), #faf9f6`,
  },
  {
    id: "drifting-glyphs",
    label: "3. Drifting glyphs (§ ¶ † ‡)",
    blurb:
      "Editorial legal marks (§, ¶, †, ‡, ※) floating at low opacity, slowly drifting and rotating. On-brand for a law foundation. Like Anthropic's homepage but with statute symbols.",
    custom: "drifting-glyphs",
  },
  {
    id: "citation-field",
    label: "4. Citation marquee field",
    blurb:
      "Multiple horizontal bands of slowly-scrolling statute citations at different speeds and directions, all very low opacity. Reads as 'the corpus is alive' without being noisy.",
    custom: "citation-field",
  },
  {
    id: "contour-map",
    label: "5. Contour map (SVG)",
    blurb:
      "Actual topographic lines drawn in SVG, like a survey map. Used by Stripe Atlas and financial sites. Calm structure, no color wash.",
    custom: "contour-map",
  },
  {
    id: "knowledge-graph",
    label: "6. Knowledge graph (animated)",
    blurb:
      "Faint constellation of dots connected by lines, pulsing along edges. Reads as 'rules referencing rules' — what Axiom actually is.",
    custom: "knowledge-graph",
  },
  {
    id: "paper-layers",
    label: "7. Layered paper sheets",
    blurb:
      "Multiple slightly-rotated paper rectangles stacked behind the content with drop shadows. Reads as a sheaf of statutes. Physical, tactile, no pattern.",
    custom: "paper-layers",
  },
  {
    id: "vertical-typography",
    label: "8. Vertical citation column",
    blurb:
      "Faint vertical columns of statute references running down the left and right margins (like a printed book's running marginalia). Editorial, on-brand, no center wash.",
    custom: "vertical-typography",
  },
  {
    id: "ink-stroke",
    label: "9. Animated ink stroke",
    blurb:
      "A single hand-drawn quill stroke animating across the page on load and looping every ~20s. Subtle, kinetic, evokes the act of inscription.",
    custom: "ink-stroke",
  },
  {
    id: "shader-mesh",
    label: "10. Custom WebGL shader (flat mesh)",
    blurb:
      "Hand-written GLSL fragment shader, similar approach to Linear's hero. Multi-octave simplex noise sampled with time drives a 4-stop amber/cream/warm-white color ramp. Runs on the GPU at 60fps.",
    custom: "shader-mesh",
  },
  {
    id: "shader-3d",
    label: "11. Custom 3D form (tennr-style)",
    blurb:
      "Raymarched 3D geometry in pure WebGL. An organic morphing form (sphere displaced by noise) rotates slowly to the right of the hero. Iridescent amber-on-cream material with rim lighting.",
    custom: "shader-3d",
  },
  {
    id: "citation-3d-network",
    label: "12. 3D citation network (scroll-driven)",
    blurb:
      "On-brand 3D form: each node is a statute reference (§ 24, § 117, etc.), each edge is a citation between rules. Scroll the page to rotate the whole structure around its vertical axis. The corpus, made visible.",
    custom: "citation-3d-network",
  },
];

const GRAIN_BG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0.085 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

const VIGNETTE_BG = `radial-gradient(ellipse at center, transparent 50%, rgba(28,25,23,0.06) 100%)`;

/* ─────────────────────────── Custom background layers ─────────────────────────── */

const GLYPHS = ["§", "¶", "†", "‡", "※", "§", "¶"];

function DriftingGlyphsLayer() {
  const items = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        glyph: GLYPHS[i % GLYPHS.length],
        left: `${(i * 73) % 95 + 2}%`,
        top: `${(i * 41) % 90 + 3}%`,
        size: 60 + ((i * 17) % 90),
        delay: -(i * 3.1),
        duration: 28 + (i % 6) * 5,
        rotate: (i * 27) % 360,
      })),
    []
  );
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes glyph-drift {
              0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); }
              50% { transform: translate(2vw, -3vh) rotate(calc(var(--r, 0deg) + 8deg)); }
            }
          `,
        }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: -4, pointerEvents: "none", overflow: "hidden" }}>
        {items.map((it, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: it.left,
              top: it.top,
              fontFamily: "var(--f-serif), Georgia, serif",
              fontSize: it.size,
              fontStyle: "italic",
              color: "rgba(146,64,14,0.10)",
              animation: `glyph-drift ${it.duration}s ease-in-out ${it.delay}s infinite`,
              ["--r" as string]: `${it.rotate}deg`,
              userSelect: "none",
            }}
          >
            {it.glyph}
          </span>
        ))}
      </div>
    </>
  );
}

const CITATIONS = [
  "26 USC § 24",
  "Pub. L. 117-2",
  "Reg. § 1.151-3",
  "5 USC § 552",
  "Cal. Rev. & Tax. § 17041",
  "20 USC § 1087",
  "ITA s.118",
  "FCA s.5",
  "42 USC § 1396a",
  "Pub. L. 116-260",
  "Reg. § 1.401(k)-1",
  "29 CFR § 825.100",
];

function CitationFieldLayer() {
  const rows = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        top: `${5 + i * 12}%`,
        direction: i % 2 === 0 ? "ltr" : "rtl",
        duration: 90 + i * 18,
        delay: -i * 6,
        items: Array.from({ length: 6 }, (_, j) => CITATIONS[(i * 3 + j) % CITATIONS.length]),
      })),
    []
  );
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes citation-ltr {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            @keyframes citation-rtl {
              from { transform: translateX(-50%); }
              to { transform: translateX(0); }
            }
          `,
        }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: -4, pointerEvents: "none", overflow: "hidden" }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: row.top,
              left: 0,
              width: "200%",
              whiteSpace: "nowrap",
              display: "flex",
              gap: 80,
              fontFamily: "var(--f-mono)",
              fontSize: 14,
              letterSpacing: "0.06em",
              color: "rgba(28,25,23,0.06)",
              animation: `${row.direction === "ltr" ? "citation-ltr" : "citation-rtl"} ${row.duration}s linear ${row.delay}s infinite`,
            }}
          >
            {[...row.items, ...row.items, ...row.items, ...row.items].map((cite, j) => (
              <span key={j}>{cite}</span>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function ContourMapLayer() {
  /* Concentric organic ovals at different scales/positions; pure SVG paths */
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "fixed", inset: 0, zIndex: -4, pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <g fill="none" stroke="rgba(146,64,14,0.16)" strokeWidth="1">
          {[60, 110, 170, 240, 320, 410, 510].map((r, i) => (
            <ellipse key={`a${i}`} cx="420" cy="280" rx={r * 1.6} ry={r} />
          ))}
        </g>
        <g fill="none" stroke="rgba(146,64,14,0.13)" strokeWidth="1">
          {[50, 95, 150, 215, 290, 375].map((r, i) => (
            <ellipse key={`b${i}`} cx="1280" cy="780" rx={r * 1.4} ry={r * 0.9} />
          ))}
        </g>
        <g fill="none" stroke="rgba(146,64,14,0.10)" strokeWidth="1">
          {[40, 75, 120, 175].map((r, i) => (
            <ellipse key={`c${i}`} cx="1380" cy="180" rx={r * 1.3} ry={r * 0.85} />
          ))}
        </g>
      </svg>
    </>
  );
}

function KnowledgeGraphLayer() {
  const { nodes, edges } = useMemo(() => {
    const N = 22;
    const nodes = Array.from({ length: N }, (_, i) => {
      const seed = i * 9301 + 49297;
      const x = ((seed * 233280) % 1597) / 1597;
      const y = ((seed * 521) % 997) / 997;
      return { x: x * 1600, y: y * 1000, id: i };
    });
    const edges: { a: number; b: number; delay: number }[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < 280) edges.push({ a: i, b: j, delay: (i + j) % 12 });
      }
    }
    return { nodes, edges };
  }, []);
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes edge-pulse {
              0%, 100% { stroke-opacity: 0.08; }
              50% { stroke-opacity: 0.20; }
            }
            @keyframes node-pulse {
              0%, 100% { fill-opacity: 0.22; }
              50% { fill-opacity: 0.42; }
            }
          `,
        }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "fixed", inset: 0, zIndex: -4, pointerEvents: "none", width: "100%", height: "100%" }}
      >
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            x1={nodes[e.a].x}
            y1={nodes[e.a].y}
            x2={nodes[e.b].x}
            y2={nodes[e.b].y}
            stroke="rgba(146,64,14,1)"
            strokeWidth="0.8"
            style={{ animation: `edge-pulse 6s ease-in-out ${e.delay * 0.4}s infinite` }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={3}
            fill="rgba(146,64,14,1)"
            style={{ animation: `node-pulse 5s ease-in-out ${(i % 8) * 0.6}s infinite` }}
          />
        ))}
      </svg>
    </>
  );
}

function PaperLayersLayer() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -6,
          background: "linear-gradient(180deg, #efe9dc 0%, #e9e0cc 100%)",
        }}
      />
      {/* Multiple stacked paper sheets behind content */}
      {[
        { rot: -2.5, off: { left: "6vw", right: "8vw", top: "4vh", bottom: "4vh" }, shade: 0.22 },
        { rot: 1.8, off: { left: "8vw", right: "6vw", top: "5vh", bottom: "5vh" }, shade: 0.18 },
        { rot: -0.7, off: { left: "7vw", right: "7vw", top: "3vh", bottom: "3vh" }, shade: 0.14 },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            ...s.off,
            zIndex: -5 + i,
            background: "#f6f2e8",
            transform: `rotate(${s.rot}deg)`,
            boxShadow: `0 30px 60px -20px rgba(28,25,23,${s.shade}), 0 6px 16px -6px rgba(28,25,23,${s.shade * 0.5})`,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* The "top" sheet content actually lives on. This is just a final paper colour */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: "#faf9f6",
          pointerEvents: "none",
          opacity: 0,
        }}
      />
    </>
  );
}

function VerticalTypographyLayer() {
  const columns = useMemo(
    () => [
      { side: "left" as const, items: ["26 USC § 24", "Pub. L. 117-2", "Reg. § 1.151-3", "5 USC § 552", "Cal. R&T § 17041"] },
      { side: "right" as const, items: ["20 USC § 1087", "ITA s.118", "FCA s.5", "42 USC § 1396a", "Reg. § 1.401(k)-1"] },
    ],
    []
  );
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      {columns.map((col, ci) => (
        <div
          key={ci}
          style={{
            position: "fixed",
            top: 0,
            bottom: 0,
            [col.side]: "1.2vw",
            zIndex: -4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            pointerEvents: "none",
          }}
        >
          {col.items.map((c, i) => (
            <span
              key={i}
              style={{
                writingMode: "vertical-rl",
                transform: col.side === "right" ? "rotate(180deg)" : undefined,
                fontFamily: "var(--f-mono)",
                fontSize: 12,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "rgba(28,25,23,0.18)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

/* ─────── Custom WebGL shader (Linear-style noise-driven color mesh) ─────── */

const SHADER_VERT = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const SHADER_FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  // 2D simplex noise (Ashima / Stefan Gustavson, public domain)
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                   + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m * m; m = m * m;
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

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    // Slight aspect correction so the noise pattern doesn't squash on wide screens
    vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0);

    float t = u_time * 0.04;

    // Multi-octave noise → smooth, organic field in [0, 1]
    float n = snoise(p * 1.4 + vec2( t,        t * 0.6)) * 0.5;
    n     += snoise(p * 2.6 + vec2(-t * 0.7,  t * 0.4)) * 0.25;
    n     += snoise(p * 5.0 + vec2( t * 0.3, -t * 0.5)) * 0.125;
    n = clamp(n * 0.55 + 0.5, 0.0, 1.0);

    // Top→bottom bias so the warmth concentrates upward, like sunlight on paper
    float bias = mix(0.15, -0.10, uv.y);
    n = clamp(n + bias, 0.0, 1.0);

    // 4-stop color ramp anchored to the brand palette
    vec3 paper      = vec3(0.980, 0.976, 0.965); // #faf9f6
    vec3 warmCream  = vec3(0.984, 0.961, 0.918); // #fbf5ea
    vec3 amberLight = vec3(0.973, 0.886, 0.733); // #f8e2bb
    vec3 amber      = vec3(0.851, 0.467, 0.137); // toned-down #d97706

    vec3 col = paper;
    col = mix(col, warmCream,  smoothstep(0.30, 0.55, n));
    col = mix(col, amberLight, smoothstep(0.55, 0.78, n) * 0.85);
    col = mix(col, amber,      smoothstep(0.82, 1.00, n) * 0.55);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderMeshLayer() {
  useEffect(() => {
    const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(sh));
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, SHADER_VERT);
    const fs = compile(gl.FRAGMENT_SHADER, SHADER_FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      id="shader-canvas"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -4,
        pointerEvents: "none",
      }}
    />
  );
}

/* ─────── Raymarched 3D form (tennr-style organic shape) ─────── */

const SHADER_3D_FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  // ── hash + noise ──
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 p = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(p+vec3(0,0,0)), hash(p+vec3(1,0,0)), f.x),
                   mix(hash(p+vec3(0,1,0)), hash(p+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(p+vec3(0,0,1)), hash(p+vec3(1,0,1)), f.x),
                   mix(hash(p+vec3(0,1,1)), hash(p+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for(int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
    return v;
  }

  // ── SDF: organic blob (sphere + noise displacement) ──
  float sdfShape(vec3 p) {
    float t = u_time * 0.18;
    vec3 q = p;
    // Slow rotation around Y
    float c = cos(t * 0.5), s = sin(t * 0.5);
    q.xz = mat2(c, -s, s, c) * q.xz;
    // Base radius
    float r = 1.0;
    // Noise displacement, animated
    float d = fbm(q * 1.4 + vec3(0.0, t * 0.6, 0.0)) * 0.55;
    d += fbm(q * 3.1 - vec3(t * 0.3, 0.0, 0.0)) * 0.18;
    return length(p) - r - d * 0.6;
  }

  vec3 calcNormal(vec3 p) {
    const float h = 0.001;
    const vec2 k = vec2(1.0, -1.0);
    return normalize( k.xyy * sdfShape(p + k.xyy * h) +
                      k.yyx * sdfShape(p + k.yyx * h) +
                      k.yxy * sdfShape(p + k.yxy * h) +
                      k.xxx * sdfShape(p + k.xxx * h) );
  }

  // ── raymarch ──
  float raymarch(vec3 ro, vec3 rd, out vec3 hitPos) {
    float t = 0.0;
    for(int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = sdfShape(p);
      if(d < 0.001) { hitPos = p; return t; }
      if(t > 8.0) break;
      t += d * 0.85;
    }
    return -1.0;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;

    // Anchor the form to the right side of the page (like tennr)
    uv.x -= 0.32;

    // Paper color, top→bottom subtle warmth
    vec2 sc = gl_FragCoord.xy / u_resolution.xy;
    vec3 paper = mix(vec3(0.984, 0.969, 0.945), vec3(0.980, 0.976, 0.965), sc.y);

    // Camera
    vec3 ro = vec3(0.0, 0.0, 3.6);
    vec3 rd = normalize(vec3(uv, -1.3));

    vec3 col = paper;

    vec3 hit;
    float t = raymarch(ro, rd, hit);
    if(t > 0.0) {
      vec3 n = calcNormal(hit);
      vec3 viewDir = normalize(ro - hit);

      // Soft lighting from upper-left
      vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
      float diff = clamp(dot(n, lightDir) * 0.5 + 0.5, 0.0, 1.0); // wrap-around
      float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 1.6);

      // Iridescent amber palette — view-angle dependent shift
      vec3 base   = vec3(0.973, 0.886, 0.733); // #f8e2bb warm cream
      vec3 mid    = vec3(0.917, 0.612, 0.220); // amber
      vec3 deep   = vec3(0.573, 0.251, 0.055); // #92400e

      float shade = diff;
      vec3 shape = mix(deep, mid, smoothstep(0.15, 0.55, shade));
      shape = mix(shape, base, smoothstep(0.55, 0.95, shade));

      // Rim glow
      shape += vec3(1.0, 0.78, 0.45) * fres * 0.35;

      // Soft edge into paper (anti-alias the silhouette)
      float edge = smoothstep(0.0, 0.015, abs(sdfShape(hit)));
      col = mix(shape, paper, edge);

      // Soft contact shadow under shape
      float shadow = 1.0 - smoothstep(0.0, 1.4, length(uv + vec2(0.0, 0.45))) * 0.4;
      col *= shadow;
    } else {
      // Soft glow / radiance around the shape on the paper
      vec3 glowCenter = vec3(0.0, 0.0, 0.0);
      float dist = length(uv);
      float glow = smoothstep(1.6, 0.4, dist) * 0.08;
      col = paper + vec3(0.92, 0.55, 0.18) * glow;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Shader3DLayer() {
  useEffect(() => {
    const canvas = document.getElementById("shader-3d-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("3D shader compile error:", gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, SHADER_VERT);
    const fs = compile(gl.FRAGMENT_SHADER, SHADER_3D_FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("3D program link error:", gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap DPR for raymarch perf
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      id="shader-3d-canvas"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -4,
        pointerEvents: "none",
      }}
    />
  );
}

/* ─────── 3D citation network (rules + edges, scroll-rotated) ─────── */

const CITATION_LABELS = [
  "§ 24",
  "§ 32",
  "§ 152",
  "§ 401(k)",
  "§ 117",
  "§ 162",
  "§ 1396a",
  "§ 552",
  "Pub. L. 117-2",
  "Reg. § 1.151-3",
  "§ 2014",
  "§ 1087",
  "§ 25A",
  "ITA s.118",
  "§ 36B",
  "§ 21",
  "§ 219",
  "§ 408",
];

type Node3 = { x: number; y: number; z: number; label: string };
type Edge3 = { a: number; b: number };

function makeNetwork(): { nodes: Node3[]; edges: Edge3[] } {
  // Deterministic Fibonacci sphere distribution
  const N = 22;
  const nodes: Node3[] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2; // [-1, 1]
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    nodes.push({
      x: x * 1.6,
      y: y * 1.6,
      z: z * 1.6,
      label: CITATION_LABELS[i % CITATION_LABELS.length],
    });
  }
  // Edges between nodes within a distance threshold
  const edges: Edge3[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 1.7) edges.push({ a: i, b: j });
    }
  }
  return { nodes, edges };
}

function Citation3DNetworkLayer() {
  const { nodes, edges } = useMemo(() => makeNetwork(), []);
  const [scrollPct, setScrollPct] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      setT((performance.now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Rotation: scroll drives Y rotation (1.5 turns over full scroll),
  // time adds a gentle ambient drift on X.
  const ry = scrollPct * Math.PI * 3 + t * 0.05;
  const rx = Math.sin(t * 0.18) * 0.25 + 0.15;

  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const cosX = Math.cos(rx), sinX = Math.sin(rx);

  // Project node from 3D world → 2D viewport (perspective)
  const VB_W = 800;
  const VB_H = 1000;
  const CX = 500; // anchor right-of-center, like tennr's hero
  const CY = 500;
  const FOCAL = 480;
  const CAM_Z = 4.6;

  type Projected = {
    sx: number;
    sy: number;
    z: number; // depth from camera
    scale: number; // ~1/z
    label: string;
    i: number;
  };
  const projected: Projected[] = nodes.map((n, i) => {
    // Rotate around Y, then X
    const x1 = n.x * cosY + n.z * sinY;
    const z1 = -n.x * sinY + n.z * cosY;
    const y1 = n.y;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    const depth = CAM_Z + z2;
    const k = FOCAL / depth;
    return {
      sx: CX + x1 * k,
      sy: CY + y2 * k,
      z: depth,
      scale: 1 / depth,
      label: n.label,
      i,
    };
  });

  // Sort edges by average depth so back ones draw first
  const edgeData = edges
    .map((e) => {
      const a = projected[e.a];
      const b = projected[e.b];
      const avgZ = (a.z + b.z) / 2;
      return { a, b, avgZ };
    })
    .sort((x, y) => y.avgZ - x.avgZ);

  // Sort nodes by depth (back first)
  const nodeData = [...projected].sort((a, b) => b.z - a.z);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          position: "fixed",
          right: "0",
          top: "0",
          width: "min(70vw, 1000px)",
          height: "100vh",
          zIndex: -4,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* Soft glow under the structure */}
        <defs>
          <radialGradient id="net-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(146,64,14,0.10)" />
            <stop offset="100%" stopColor="rgba(146,64,14,0)" />
          </radialGradient>
        </defs>
        <ellipse cx={CX} cy={CY} rx="380" ry="320" fill="url(#net-glow)" />

        {/* Edges (back to front) */}
        {edgeData.map((e, i) => {
          const opacity = Math.max(0, Math.min(0.55, 1 / e.avgZ - 0.12));
          return (
            <line
              key={`e${i}`}
              x1={e.a.sx}
              y1={e.a.sy}
              x2={e.b.sx}
              y2={e.b.sy}
              stroke={`rgba(146,64,14,${opacity * 0.9})`}
              strokeWidth={Math.max(0.4, 1.4 / e.avgZ * 2.4)}
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes + labels */}
        {nodeData.map((n) => {
          const radius = Math.max(2.5, 6 * n.scale * 5);
          const opacity = Math.max(0.25, Math.min(1, 1 / n.z + 0.15));
          const labelOpacity = Math.max(0, Math.min(0.9, 1 / n.z - 0.05));
          const fontSize = Math.max(9, 14 * n.scale * 5);
          return (
            <g key={`n${n.i}`}>
              {/* Halo */}
              <circle
                cx={n.sx}
                cy={n.sy}
                r={radius * 2.4}
                fill={`rgba(146,64,14,${opacity * 0.15})`}
              />
              <circle
                cx={n.sx}
                cy={n.sy}
                r={radius}
                fill={`rgba(146,64,14,${opacity * 0.95})`}
              />
              {/* Label (only for closer-to-camera nodes to avoid clutter) */}
              {n.z < CAM_Z + 0.5 && (
                <text
                  x={n.sx + radius + 5}
                  y={n.sy + 3}
                  fontFamily="var(--f-mono)"
                  fontSize={fontSize}
                  fill={`rgba(28,25,23,${labelOpacity * 0.85})`}
                  style={{ letterSpacing: "0.02em" }}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
}

function InkStrokeLayer() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ink-draw {
              0% { stroke-dashoffset: 4000; opacity: 0; }
              8% { opacity: 1; }
              50% { stroke-dashoffset: 0; opacity: 1; }
              80% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
          `,
        }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: -5, background: "#faf9f6" }} />
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "fixed", inset: 0, zIndex: -4, pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <path
          d="M -50 600 C 200 400, 450 850, 700 500 S 1100 200, 1300 550 S 1700 800, 1900 400"
          stroke="rgba(146,64,14,0.22)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="4000"
          style={{ animation: "ink-draw 22s ease-in-out infinite" }}
        />
        <path
          d="M -40 300 C 250 500, 600 100, 850 350 S 1300 700, 1700 280"
          stroke="rgba(146,64,14,0.13)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="4000"
          style={{ animation: "ink-draw 28s ease-in-out 4s infinite" }}
        />
      </svg>
    </>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function BackgroundsPreviewPage() {
  const [selectedId, setSelectedId] = useState("current");
  const [grain, setGrain] = useState(true);
  const [vignette, setVignette] = useState(true);
  const selected = OPTIONS.find((o) => o.id === selectedId) ?? OPTIONS[0];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html::before,
            body::before,
            body::after {
              display: none !important;
            }
            html,
            body {
              background: transparent !important;
            }
            header.nav-bar,
            footer {
              display: none !important;
            }
          `,
        }}
      />

      {selected.bg ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -5,
            background: selected.bg,
            pointerEvents: "none",
          }}
        />
      ) : null}
      {selected.custom === "drifting-glyphs" ? <DriftingGlyphsLayer /> : null}
      {selected.custom === "citation-field" ? <CitationFieldLayer /> : null}
      {selected.custom === "contour-map" ? <ContourMapLayer /> : null}
      {selected.custom === "knowledge-graph" ? <KnowledgeGraphLayer /> : null}
      {selected.custom === "paper-layers" ? <PaperLayersLayer /> : null}
      {selected.custom === "vertical-typography" ? <VerticalTypographyLayer /> : null}
      {selected.custom === "ink-stroke" ? <InkStrokeLayer /> : null}
      {selected.custom === "shader-mesh" ? <ShaderMeshLayer /> : null}
      {selected.custom === "shader-3d" ? <Shader3DLayer /> : null}
      {selected.custom === "citation-3d-network" ? <Citation3DNetworkLayer /> : null}

      {grain ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -2,
            backgroundImage: GRAIN_BG,
            opacity: 0.85,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {vignette ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            background: VIGNETTE_BG,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* Sticky picker */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250, 249, 246, 0.86)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--color-rule)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-ink-muted)",
              marginRight: 8,
            }}
          >
            Background:
          </span>
          {OPTIONS.map((opt) => {
            const active = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedId(opt.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-rule)"}`,
                  background: active ? "var(--color-accent)" : "transparent",
                  color: active ? "#faf9f6" : "var(--color-ink)",
                  cursor: "pointer",
                  fontFamily: "var(--f-body)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", color: "var(--color-ink-secondary)" }}>
              <input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} />
              Grain
            </label>
            <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", color: "var(--color-ink-secondary)" }}>
              <input type="checkbox" checked={vignette} onChange={(e) => setVignette(e.target.checked)} />
              Vignette
            </label>
          </div>
        </div>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px 12px",
            fontSize: 13,
            color: "var(--color-ink-secondary)",
          }}
        >
          {selected.blurb}
        </div>
      </div>

      <main style={{ position: "relative", zIndex: 1 }}>
        <section
          style={{
            minHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "96px 32px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-ink-muted)",
                  marginBottom: 24,
                }}
              >
                § Axiom Foundation
              </div>
              <h1
                style={{
                  fontFamily: "var(--f-display)",
                  fontSize: "clamp(2.5rem, 5.6vw, 4.5rem)",
                  fontWeight: 300,
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  textWrap: "balance",
                  margin: 0,
                }}
              >
                Computable law{" "}
                <span style={{ color: "var(--color-accent)", fontStyle: "italic" }}>
                  for all.
                </span>
              </h1>
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: "var(--color-ink-secondary)",
                  marginTop: 24,
                  maxWidth: 520,
                }}
              >
                A free, open foundation transcribing statute into a machine-readable
                record. So every benefit, every tax, every rule can be computed —
                by anyone, for anyone.
              </p>
              <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
                <button
                  style={{
                    padding: "12px 24px",
                    background: "var(--color-accent)",
                    color: "#faf9f6",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  See it in Axiom →
                </button>
                <button
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    color: "var(--color-ink)",
                    border: "1px solid var(--color-rule-strong)",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Read the foundation
                </button>
              </div>
            </div>

            <div
              style={{
                background: "var(--color-paper-elevated)",
                border: "1px solid var(--color-rule)",
                borderRadius: 8,
                boxShadow:
                  "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -12px rgba(28,25,23,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--color-rule)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  26 USC § 24
                </span>
                <span style={{ color: "var(--color-rule-strong)" }}>·</span>
                <span style={{ fontSize: 14 }}>Child Tax Credit</span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "16px 20px",
                  background: "#1c1917",
                  color: "#e7e5e4",
                  fontFamily: "var(--f-mono)",
                  fontSize: 12,
                  lineHeight: 1.6,
                  overflowX: "auto",
                }}
              >
                {`module: tax.federal.income.credits.ctc
title: Child Tax Credit
authority: 26 USC § 24
inputs:
  - qualifying_children: int
  - filing_status: enum
  - agi: money
formula:
  credit = qualifying_children × $2,000
  phaseout = max(0, agi − threshold) × 0.05
  result = max(0, credit − phaseout)`}
              </pre>
            </div>
          </div>
        </section>

        <section
          style={{
            padding: "96px 32px",
            maxWidth: 1200,
            margin: "0 auto",
            borderTop: "1px solid var(--color-rule)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-ink-muted)",
              marginBottom: 16,
            }}
          >
            ¶ Second section
          </div>
          <h2
            style={{
              fontFamily: "var(--f-display)",
              fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)",
              fontWeight: 300,
              letterSpacing: "-0.015em",
              margin: 0,
              marginBottom: 24,
            }}
          >
            Scroll down to see how the background reads with more content stacked
            against it.
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--color-ink-secondary)",
              maxWidth: 720,
              marginTop: 24,
            }}
          >
            Some treatments look great behind a sparse hero but go muddy behind
            dense prose. Toggle through the options above and watch this paragraph
            too — that's the real test.
          </p>
        </section>

        <div style={{ height: "180vh" }} />
      </main>
    </>
  );
}
