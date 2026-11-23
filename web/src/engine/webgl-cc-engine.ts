import type { Lut3DData } from './lut-loader';

export interface SpatialFxParams {
  glowIntensity: number; // 0..1.5 (S_Glow / Deep Glow / BCC Glow)
  glowThreshold: number; // 0..1
  glowRadius: number; // 0..1
  glowTint: [number, number, number]; // RGB multiplier e.g. [1, 1, 1]
  softFocus: number; // 0..1 (Orton / Dreamy Soft Focus)
  sharpen: number; // 0..1.5 (S_Sharpen / Unsharp Mask)
  vignette: number; // 0..1
  grain: number; // 0..0.35
  chromaticAberration: number; // 0..1
}

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const PASS1_GRADE_FRAG = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler3D uLut;
uniform float uLutSize;
uniform float uMix;
uniform float uCA;

vec3 lookupLut(vec3 col) {
  vec3 c = clamp(col, 0.0, 1.0);
  vec3 uvw = (c * (uLutSize - 1.0) + 0.5) / uLutSize;
  return texture(uLut, uvw).rgb;
}

void main() {
  vec3 orig = texture(uSource, vUv).rgb;
  vec3 sampleRgb = orig;

  if (uCA > 0.001) {
    vec2 dir = (vUv - 0.5) * uCA * 0.0085;
    float r = texture(uSource, clamp(vUv + dir, 0.0, 1.0)).r;
    float g = orig.g;
    float b = texture(uSource, clamp(vUv - dir, 0.0, 1.0)).b;
    sampleRgb = vec3(r, g, b);
  }

  vec3 graded = lookupLut(sampleRgb);
  vec3 mixed = mix(orig, graded, clamp(uMix, 0.0, 1.0));
  fragColor = vec4(mixed, 1.0);
}
`;

const BRIGHT_EXTRACT_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform float uThreshold;
uniform vec3 uTint;

void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = 0.16;
  float soft = clamp((luma - uThreshold + knee) / (2.0 * knee), 0.0, 1.0);
  soft = soft * soft * (3.0 - 2.0 * soft);
  float contrib = max(luma - uThreshold, 0.0) + soft * knee * 0.5;
  float scale = luma > 0.0001 ? contrib / luma : 0.0;
  fragColor = vec4(c * scale * uTint, 1.0);
}
`;

const BLUR_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uStep;

void main() {
  vec3 sum = texture(uTex, vUv).rgb * 0.227027;
  sum += texture(uTex, clamp(vUv + uStep * 1.384615, 0.0, 1.0)).rgb * 0.316216;
  sum += texture(uTex, clamp(vUv - uStep * 1.384615, 0.0, 1.0)).rgb * 0.316216;
  sum += texture(uTex, clamp(vUv + uStep * 3.230769, 0.0, 1.0)).rgb * 0.070270;
  sum += texture(uTex, clamp(vUv - uStep * 3.230769, 0.0, 1.0)).rgb * 0.070270;
  fragColor = vec4(sum, 1.0);
}
`;

const COMPOSITE_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler2D uGrade;
uniform sampler2D uBloom;
uniform sampler2D uSoft;
uniform vec2 uTexel;
uniform float uSharpen;
uniform float uSoftFocus;
uniform float uGlowIntensity;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform float uSplitPos;
uniform float uShowOriginal;
uniform float uMix;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 orig = texture(uSource, vUv).rgb;
  if (uShowOriginal > 0.5 || vUv.x < uSplitPos) {
    fragColor = vec4(orig, 1.0);
    return;
  }

  vec3 cc = texture(uGrade, vUv).rgb;
  float fxMix = clamp(uMix, 0.0, 1.0);

  // Edge-aware clamped unsharp mask
  if (uSharpen > 0.001) {
    vec3 n1 = texture(uGrade, clamp(vUv + vec2(uTexel.x, 0.0), 0.0, 1.0)).rgb;
    vec3 n2 = texture(uGrade, clamp(vUv - vec2(uTexel.x, 0.0), 0.0, 1.0)).rgb;
    vec3 n3 = texture(uGrade, clamp(vUv + vec2(0.0, uTexel.y), 0.0, 1.0)).rgb;
    vec3 n4 = texture(uGrade, clamp(vUv - vec2(0.0, uTexel.y), 0.0, 1.0)).rgb;
    vec3 n5 = texture(uGrade, clamp(vUv + uTexel, 0.0, 1.0)).rgb;
    vec3 n6 = texture(uGrade, clamp(vUv - uTexel, 0.0, 1.0)).rgb;
    vec3 n7 = texture(uGrade, clamp(vUv + vec2(uTexel.x, -uTexel.y), 0.0, 1.0)).rgb;
    vec3 n8 = texture(uGrade, clamp(vUv + vec2(-uTexel.x, uTexel.y), 0.0, 1.0)).rgb;
    vec3 blur = (n1 + n2 + n3 + n4) * 0.15 + (n5 + n6 + n7 + n8) * 0.1;
    vec3 detail = clamp(cc - blur, -0.22, 0.22);
    cc = clamp(cc + detail * (uSharpen * 1.35 * fxMix), 0.0, 1.0);
  }

  // Dreamy Orton / Soft Focus diffusion
  if (uSoftFocus > 0.001) {
    vec3 soft = texture(uSoft, vUv).rgb;
    vec3 screened = 1.0 - (1.0 - cc) * (1.0 - soft * 0.72);
    cc = mix(cc, screened, clamp(uSoftFocus * 0.65 * fxMix, 0.0, 0.85));
  }

  // Dual-pass Glow / Bloom
  if (uGlowIntensity > 0.001) {
    vec3 bloom = texture(uBloom, vUv).rgb * (uGlowIntensity * fxMix);
    vec3 clampedBloom = clamp(bloom, 0.0, 0.96);
    cc = 1.0 - (1.0 - cc) * (1.0 - clampedBloom);
    cc = clamp(cc + bloom * 0.18, 0.0, 1.0);
  }

  // Smooth vignette
  if (uVignette > 0.001) {
    float dist = distance(vUv, vec2(0.5)) * 1.4142;
    float vig = smoothstep(0.42, 1.18, dist);
    cc *= mix(1.0, 1.0 - clamp(uVignette, 0.0, 1.0) * 0.64 * fxMix, vig);
  }

  // Midtone-weighted organic film grain
  if (uGrain > 0.001) {
    float luma = dot(cc, vec3(0.2126, 0.7152, 0.0722));
    float weight = 1.0 - abs(luma - 0.5) * 1.05;
    float n = hash12(gl_FragCoord.xy + vec2(uTime * 17.3, uTime * 31.7));
    cc = clamp(cc + (n - 0.5) * uGrain * 0.45 * weight * fxMix, 0.0, 1.0);
  }

  fragColor = vec4(clamp(cc, 0.0, 1.0), 1.0);
}
`;

interface FboTarget {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  width: number;
  height: number;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error('Failed to create WebGL program');
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'Unknown program link error';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

function createRenderTarget(gl: WebGL2RenderingContext, width: number, height: number): FboTarget {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  if (!tex || !fbo) throw new Error('Failed to create FBO target');

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { fbo, tex, width, height };
}

export class WebGLCCEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;

  private gradeProg: WebGLProgram;
  private brightProg: WebGLProgram;
  private blurProg: WebGLProgram;
  private compProg: WebGLProgram;

  private sourceTex: WebGLTexture;
  private lutTex: WebGLTexture;
  private lutSize = 64;

  private gradeFbo: FboTarget | null = null;
  private bloomA: FboTarget | null = null;
  private bloomB: FboTarget | null = null;
  private softA: FboTarget | null = null;
  private softB: FboTarget | null = null;

  private sourceWidth = 0;
  private sourceHeight = 0;

  private params: SpatialFxParams = {
    glowIntensity: 0,
    glowThreshold: 0.72,
    glowRadius: 0.4,
    glowTint: [1, 1, 1],
    softFocus: 0,
    sharpen: 0,
    vignette: 0,
    grain: 0,
    chromaticAberration: 0,
  };
  private mix = 1;
  private splitPos = 0.5;
  private showOriginal = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error('Browser ini belum mendukung WebGL2 untuk simulasi CC real-time.');
    }
    this.gl = gl;

    this.gradeProg = linkProgram(gl, VERT_SRC, PASS1_GRADE_FRAG);
    this.brightProg = linkProgram(gl, VERT_SRC, BRIGHT_EXTRACT_FRAG);
    this.blurProg = linkProgram(gl, VERT_SRC, BLUR_FRAG);
    this.compProg = linkProgram(gl, VERT_SRC, COMPOSITE_FRAG);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error('Failed to create WebGL quad buffers');
    this.vao = vao;
    this.vbo = vbo;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    for (const prog of [this.gradeProg, this.brightProg, this.blurProg, this.compProg]) {
      const loc = gl.getAttribLocation(prog, 'aPos');
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }
    gl.bindVertexArray(null);

    const sourceTex = gl.createTexture();
    const lutTex = gl.createTexture();
    if (!sourceTex || !lutTex) throw new Error('Failed to create WebGL textures');
    this.sourceTex = sourceTex;
    this.lutTex = lutTex;

    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  }

  private deleteFbo(target: FboTarget | null) {
    if (!target) return;
    this.gl.deleteFramebuffer(target.fbo);
    this.gl.deleteTexture(target.tex);
  }

  private ensureTargets(width: number, height: number) {
    const gl = this.gl;
    const cappedW = Math.max(2, Math.min(width, 1920));
    const scale = width > 1920 ? 1920 / width : 1;
    const cappedH = Math.max(2, Math.round(height * scale));

    if (this.canvas.width !== cappedW || this.canvas.height !== cappedH) {
      this.canvas.width = cappedW;
      this.canvas.height = cappedH;
    }

    if (this.gradeFbo && this.gradeFbo.width === cappedW && this.gradeFbo.height === cappedH) {
      return;
    }

    this.deleteFbo(this.gradeFbo);
    this.deleteFbo(this.bloomA);
    this.deleteFbo(this.bloomB);
    this.deleteFbo(this.softA);
    this.deleteFbo(this.softB);

    const halfW = Math.max(2, Math.floor(cappedW / 2));
    const halfH = Math.max(2, Math.floor(cappedH / 2));
    const quarterW = Math.max(2, Math.floor(cappedW / 4));
    const quarterH = Math.max(2, Math.floor(cappedH / 4));

    this.gradeFbo = createRenderTarget(gl, cappedW, cappedH);
    this.bloomA = createRenderTarget(gl, quarterW, quarterH);
    this.bloomB = createRenderTarget(gl, quarterW, quarterH);
    this.softA = createRenderTarget(gl, halfW, halfH);
    this.softB = createRenderTarget(gl, halfW, halfH);
  }

  public setLut(lut: Lut3DData) {
    const gl = this.gl;
    this.lutSize = lut.size;
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA8,
      lut.size,
      lut.size,
      lut.size,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      lut.data
    );
  }

  public setSource(source: HTMLImageElement | HTMLVideoElement) {
    const isVideo = source instanceof HTMLVideoElement;
    const w = isVideo ? source.videoWidth : source.naturalWidth || source.width;
    const h = isVideo ? source.videoHeight : source.naturalHeight || source.height;
    if (!w || !h) return false;
    if (isVideo && source.readyState < 2) return false;

    this.sourceWidth = w;
    this.sourceHeight = h;
    this.ensureTargets(w, h);

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return true;
  }

  public setParams(fx: SpatialFxParams, mix: number, splitPos: number, showOriginal: boolean) {
    this.params = fx;
    this.mix = mix;
    this.splitPos = splitPos;
    this.showOriginal = showOriginal;
  }

  private drawQuad(target: FboTarget | null, w: number, h: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public render(timeSeconds = 0) {
    if (!this.sourceWidth || !this.sourceHeight || !this.gradeFbo || !this.bloomA || !this.bloomB || !this.softA || !this.softB) {
      return;
    }

    const gl = this.gl;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Pass 1: Chromatic aberration + 3D LUT color grading -> gradeFbo
    gl.useProgram(this.gradeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.uniform1i(gl.getUniformLocation(this.gradeProg, 'uSource'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.uniform1i(gl.getUniformLocation(this.gradeProg, 'uLut'), 1);

    gl.uniform1f(gl.getUniformLocation(this.gradeProg, 'uLutSize'), this.lutSize);
    gl.uniform1f(gl.getUniformLocation(this.gradeProg, 'uMix'), this.mix);
    gl.uniform1f(gl.getUniformLocation(this.gradeProg, 'uCA'), this.params.chromaticAberration);
    this.drawQuad(this.gradeFbo, cw, ch);

    // Pass 2: Glow highlight extract & Dual-Kawase separable blur
    if (this.params.glowIntensity > 0.001) {
      gl.useProgram(this.brightProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.gradeFbo.tex);
      gl.uniform1i(gl.getUniformLocation(this.brightProg, 'uTex'), 0);
      gl.uniform1f(gl.getUniformLocation(this.brightProg, 'uThreshold'), this.params.glowThreshold);
      gl.uniform3fv(gl.getUniformLocation(this.brightProg, 'uTint'), this.params.glowTint);
      this.drawQuad(this.bloomA, this.bloomA.width, this.bloomA.height);

      gl.useProgram(this.blurProg);
      gl.uniform1i(gl.getUniformLocation(this.blurProg, 'uTex'), 0);
      const radiusFactor = 0.75 + this.params.glowRadius * 2.6;
      const sx = radiusFactor / this.bloomA.width;
      const sy = radiusFactor / this.bloomA.height;

      // Pass A -> B (horizontal)
      gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), sx, 0);
      this.drawQuad(this.bloomB, this.bloomB.width, this.bloomB.height);

      // Pass B -> A (vertical)
      gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), 0, sy);
      this.drawQuad(this.bloomA, this.bloomA.width, this.bloomA.height);

      // Second wide pass for creamy Deep Glow tail
      gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), sx * 2.1, 0);
      this.drawQuad(this.bloomB, this.bloomB.width, this.bloomB.height);

      gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), 0, sy * 2.1);
      this.drawQuad(this.bloomA, this.bloomA.width, this.bloomA.height);
    }

    // Pass 3: Soft / Dreamy Orton Blur
    if (this.params.softFocus > 0.001) {
      gl.useProgram(this.blurProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(gl.getUniformLocation(this.blurProg, 'uTex'), 0);
      const stepX = 1.6 / this.softA.width;
      const stepY = 1.6 / this.softA.height;

      gl.bindTexture(gl.TEXTURE_2D, this.gradeFbo.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), stepX, 0);
      this.drawQuad(this.softB, this.softB.width, this.softB.height);

      gl.bindTexture(gl.TEXTURE_2D, this.softB.tex);
      gl.uniform2f(gl.getUniformLocation(this.blurProg, 'uStep'), 0, stepY);
      this.drawQuad(this.softA, this.softA.width, this.softA.height);
    }

    // Pass 4: Composite to display canvas with Unsharp Mask, Glow, Soft, Vignette, Grain & Split
    gl.useProgram(this.compProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.uniform1i(gl.getUniformLocation(this.compProg, 'uSource'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.gradeFbo.tex);
    gl.uniform1i(gl.getUniformLocation(this.compProg, 'uGrade'), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
    gl.uniform1i(gl.getUniformLocation(this.compProg, 'uBloom'), 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.softA.tex);
    gl.uniform1i(gl.getUniformLocation(this.compProg, 'uSoft'), 3);

    gl.uniform2f(gl.getUniformLocation(this.compProg, 'uTexel'), 1 / cw, 1 / ch);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uSharpen'), this.params.sharpen);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uSoftFocus'), this.params.softFocus);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uGlowIntensity'), this.params.glowIntensity);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uVignette'), this.params.vignette);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uGrain'), this.params.grain);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uTime'), timeSeconds);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uSplitPos'), this.splitPos);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uShowOriginal'), this.showOriginal ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.compProg, 'uMix'), this.mix);

    this.drawQuad(null, cw, ch);
  }

  public renderThumbnailDataUrl(
    source: HTMLImageElement | HTMLVideoElement,
    lut: Lut3DData,
    fx: SpatialFxParams
  ): string | null {
    const prevMix = this.mix;
    const prevSplit = this.splitPos;
    const prevShowOrig = this.showOriginal;
    const prevParams = this.params;

    const ok = this.setSource(source);
    if (!ok) return null;

    this.setLut(lut);
    this.setParams(fx, 1, 0, false);
    this.render(0.5);

    const outCanvas = document.createElement('canvas');
    const targetW = 400;
    const targetH = Math.max(120, Math.round((this.canvas.height / this.canvas.width) * targetW));
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(this.canvas, 0, 0, targetW, targetH);
    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.86);

    this.setParams(prevParams, prevMix, prevSplit, prevShowOrig);
    return dataUrl;
  }

  public dispose() {
    const gl = this.gl;
    this.deleteFbo(this.gradeFbo);
    this.deleteFbo(this.bloomA);
    this.deleteFbo(this.bloomB);
    this.deleteFbo(this.softA);
    this.deleteFbo(this.softB);
    gl.deleteTexture(this.sourceTex);
    gl.deleteTexture(this.lutTex);
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.gradeProg);
    gl.deleteProgram(this.brightProg);
    gl.deleteProgram(this.blurProg);
    gl.deleteProgram(this.compProg);
  }
}
