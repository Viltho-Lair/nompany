"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// A POINTER-INTERACTIVE GRADIENT IN RAW WEBGL, about a kilobyte of shader.
// No three.js: one full-screen triangle and one fragment program, so the studio
// pays nothing for it and this page pays almost nothing. The pointer bends the
// field like a lens and leaves a faint light where it rests; the smoothing is a
// per-frame lerp, which is what makes it drift after the hand rather than snap
// to it.
//
// It stops drawing when it is off screen (IntersectionObserver) or when the
// caller says it is not showing (`active`, for a fixed layer an observer always
// reports as visible), and draws one still frame under reduced motion.
//
// IT DOES NOT CALL `loseContext()` ON CLEANUP. A canvas hands back the SAME
// context on every getContext, so a cleanup that loses it poisons the next run
// of the effect: Strict Mode runs every effect twice in development, and the
// footer's field came up grey, drawing into a context that was already dead.
// The context goes when the canvas does.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float k;
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
  vec2 q=(m-.5)*vec2(r.x/r.y,1.);
  vec2 dq=p-q;float d=length(dq);
  p+=dq*.35*exp(-d*2.5);
  float s=t*.08;
  for(int i=1;i<6;i++){float f=float(i);
    p.x+=.3/f*sin(f*1.9*p.y+s*f+.7*f);
    p.y+=.3/f*cos(f*1.5*p.x+s*f*.8);}
  float v=.5+.5*sin(1.4*p.x+1.2*p.y);
  vec3 base=vec3(.027,.027,.039);
  vec3 deep=vec3(.13,.10,.38);
  vec3 lit=vec3(.55,.49,1.);
  vec3 c=mix(base,deep,smoothstep(.2,.9,v));
  c=mix(c,lit,pow(smoothstep(.72,1.,v),2.)*.5);
  c+=lit*.10*exp(-d*3.);
  float vig=smoothstep(1.35,.15,length((uv-vec2(.64,.62))*vec2(1.2,1.6)));
  c=mix(base,c,vig*k);
  gl_FragColor=vec4(c,1.);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export function ShaderField({ className = "", intensity = 1, active = true }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const activeRef = useRef(active);
  const wake = useRef(() => {});
  useEffect(() => {
    activeRef.current = active;
    if (active) wake.current();
  }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");
    const uK = gl.getUniformLocation(prog, "k");
    gl.uniform1f(uK, intensity);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 1;
    let h = 1;
    const target = { x: 0.62, y: 0.55 };
    const cur = { x: 0.62, y: 0.55 };
    const start = performance.now();
    let raf = 0;
    let visible = true;

    function draw(sec) {
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, sec);
      gl.uniform2f(uM, cur.x, cur.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(now) {
      raf = 0;
      if (!visible || !activeRef.current) return;
      draw((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    }
    function resize() {
      const b = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(b.width * dpr));
      h = Math.max(1, Math.round(b.height * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (reduce) draw(14);
    }
    function onMove(e) {
      const b = canvas.getBoundingClientRect();
      target.x = (e.clientX - b.left) / b.width;
      target.y = 1 - (e.clientY - b.top) / b.height;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    wake.current = () => {
      if (visible && !raf && !reduce) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake.current();
    });
    io.observe(canvas);

    if (reduce) draw(14);
    else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      wake.current = () => {};
    };
  }, [reduce, intensity]);

  return <canvas ref={ref} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
