'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './HeroSphere.module.css';

/**
 * The landing hero's sphere, rendered in WebGL.
 *
 * The CSS version underneath stays exactly where it is and is never removed:
 * four blurred blobs on unrelated cycles, which is a good sphere. This draws
 * the same object properly — a lit surface with a real fresnel rim and noise
 * flowing over it in three dimensions rather than four divs sliding past each
 * other — and fades in over the top once the first frame is on screen. If
 * anything here fails, or the guards below decline, what remains is the CSS
 * sphere rather than a hole in the page.
 *
 * It declines to run when:
 *   - the visitor asked for reduced motion,
 *   - the viewport is narrow, where this costs battery for an effect the CSS
 *     version already delivers and where the hero is half the screen,
 *   - the device cannot give a WebGL context.
 *
 * three is imported inside the effect, so it is fetched only when all of that
 * passes, and never lands in the page's initial JavaScript.
 */
export default function HeroSphere() {
    const holder = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const el = holder.current;
        if (!el) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (window.matchMedia('(max-width: 720px)').matches) return;

        let disposed = false;
        let cleanup: (() => void) | undefined;

        (async () => {
            const THREE = await import('three');
            if (disposed) return;

            let renderer: import('three').WebGLRenderer;
            try {
                renderer = new THREE.WebGLRenderer({
                    alpha: true,
                    // The lit rim is a hard edge against black, and that is
                    // exactly where stair-stepping shows. Worth it for one mesh.
                    antialias: true,
                    powerPreference: 'low-power',
                });
            } catch {
                return; // no WebGL: the CSS sphere is already on screen
            }

            // Measure the canvas itself, not the holder. The holder spans the
            // whole hero; the canvas is the square the stylesheet sizes.
            const canvas = renderer.domElement;
            const size = () => canvas.clientWidth || Math.min(el.clientWidth, el.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.setClearColor(0x000000, 0);
            canvas.className = styles.canvas;
            el.appendChild(canvas);
            // Only once it is in the document does it have a measurable size.
            renderer.setSize(size(), size(), false);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
            camera.position.z = 3.15;

            const uniforms = {
                uTime: { value: 0 },
                uPointer: { value: new THREE.Vector2(0, 0) },
            };

            const material = new THREE.ShaderMaterial({
                uniforms,
                transparent: true,
                vertexShader: /* glsl */ `
                    varying vec3 vNormal;
                    varying vec3 vView;
                    varying vec3 vPos;

                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vPos = position;
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        vView = normalize(-mv.xyz);
                        gl_Position = projectionMatrix * mv;
                    }
                `,
                fragmentShader: /* glsl */ `
                    precision highp float;

                    varying vec3 vNormal;
                    varying vec3 vView;
                    varying vec3 vPos;

                    uniform float uTime;
                    uniform vec2 uPointer;

                    // Ashima's simplex noise, trimmed to the 3D case.
                    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
                    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
                    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
                    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

                    float snoise(vec3 v){
                        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                        vec3 i  = floor(v + dot(v, C.yyy));
                        vec3 x0 = v - i + dot(i, C.xxx);
                        vec3 g = step(x0.yzx, x0.xyz);
                        vec3 l = 1.0 - g;
                        vec3 i1 = min(g.xyz, l.zxy);
                        vec3 i2 = max(g.xyz, l.zxy);
                        vec3 x1 = x0 - i1 + C.xxx;
                        vec3 x2 = x0 - i2 + C.yyy;
                        vec3 x3 = x0 - D.yyy;
                        i = mod289(i);
                        vec4 p = permute(permute(permute(
                                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                        float n_ = 0.142857142857;
                        vec3 ns = n_ * D.wyz - D.xzx;
                        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                        vec4 x_ = floor(j * ns.z);
                        vec4 y_ = floor(j - 7.0 * x_);
                        vec4 x = x_ * ns.x + ns.yyyy;
                        vec4 y = y_ * ns.x + ns.yyyy;
                        vec4 h = 1.0 - abs(x) - abs(y);
                        vec4 b0 = vec4(x.xy, y.xy);
                        vec4 b1 = vec4(x.zw, y.zw);
                        vec4 s0 = floor(b0) * 2.0 + 1.0;
                        vec4 s1 = floor(b1) * 2.0 + 1.0;
                        vec4 sh = -step(h, vec4(0.0));
                        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
                        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
                        vec3 p0 = vec3(a0.xy, h.x);
                        vec3 p1 = vec3(a0.zw, h.y);
                        vec3 p2 = vec3(a1.xy, h.z);
                        vec3 p3 = vec3(a1.zw, h.w);
                        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                        m = m * m;
                        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                    }

                    void main() {
                        vec3 n = normalize(vNormal);

                        // Two noise fields at different scales and speeds, the
                        // second warped by the first. One field alone reads as a
                        // texture; warped, it reads as something moving under a
                        // surface — the same idea as the four CSS blobs, done
                        // properly.
                        vec3 q = vPos * 1.35 + vec3(0.0, uTime * 0.055, 0.0);
                        float base = snoise(q);
                        float detail = snoise(vPos * 3.1 + base * 0.85 + uTime * 0.03);
                        float field = base * 0.65 + detail * 0.35;

                        // A key light high and to the left, leaning with the
                        // pointer so the sphere feels lit from the room.
                        vec3 key = normalize(vec3(-0.42 + uPointer.x * 0.28,
                                                   0.58 - uPointer.y * 0.28,
                                                   0.72));
                        float facing = max(dot(n, key), 0.0);

                        // Grazing angles catch the light: the rim that makes a
                        // dark sphere read as a sphere rather than a hole.
                        float fres = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 4.2);

                        // The rim has to be DIRECTIONAL. Fresnel alone is equal
                        // in every direction, which drew an even ring right
                        // around the edge — the look of a CSS glow, not a lit
                        // object. Gating it by how much each point faces the key
                        // light turns that ring into a crescent: bright where
                        // the light is, gone on the far side. This one term is
                        // the difference between a sphere and a circle.
                        float rim = fres * (0.06 + 0.94 * pow(facing, 0.6));

                        // The headline sits over the middle, so the middle stays
                        // dark: a tight specular key, and noise at a level you
                        // read as sheen rather than as smudge.
                        float key2 = pow(facing, 5.0) * 0.20;
                        float lum = key2 + field * 0.028 + rim * 1.0;
                        lum = clamp(lum, 0.0, 1.0);

                        // Monochrome, with the site's lilac allowed only into
                        // the rim — the one place colour appears on this page.
                        vec3 paper = vec3(1.0);
                        vec3 lilac = vec3(0.878, 0.753, 0.973);
                        vec3 col = mix(vec3(0.015), paper, lum);
                        col = mix(col, lilac, rim * 0.30);

                        // An ordered dither, a hundredth of a step. Long, dark
                        // gradients band badly at 8 bits, which is the ribbing
                        // that showed across the top of the sphere.
                        float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        col += (d - 0.5) * 0.012;

                        // Opaque: the body is near-black against a black hero,
                        // so there is nothing to fade to, and the translucency
                        // was what made it read as fog rather than an object.
                        gl_FragColor = vec4(col, 1.0);
                    }
                `,
            });

            const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 24), material);
            scene.add(mesh);

            const onResize = () => {
                const s = size();
                if (s > 0) renderer.setSize(s, s, false);
            };
            window.addEventListener('resize', onResize, { passive: true });

            const onPointer = (e: PointerEvent) => {
                uniforms.uPointer.value.set(
                    e.clientX / window.innerWidth - 0.5,
                    e.clientY / window.innerHeight - 0.5
                );
            };
            window.addEventListener('pointermove', onPointer, { passive: true });

            // Nothing is drawn while the hero is off screen or the tab is in
            // the background. A shader running behind six other sections is
            // pure battery cost.
            let visible = true;
            const io = new IntersectionObserver(
                ([entry]) => {
                    visible = entry.isIntersecting;
                },
                { threshold: 0 }
            );
            io.observe(el);

            let frame = 0;
            let first = true;
            const clock = new THREE.Clock();

            const tick = () => {
                frame = requestAnimationFrame(tick);
                if (!visible || document.hidden) return;
                uniforms.uTime.value = clock.getElapsedTime();
                mesh.rotation.y += 0.0012;
                renderer.render(scene, camera);
                if (first) {
                    first = false;
                    setReady(true); // fade in only once there is a frame to show
                    // Retire the CSS sphere underneath. Its warm blobs were
                    // showing through this canvas's transparent edge as an
                    // olive fringe down one side, and two spheres stacked at
                    // slightly different sizes muddied the interior. It stays
                    // in the DOM as the fallback; it just stops being drawn.
                    el.parentElement?.setAttribute('data-webgl', 'on');
                }
            };
            frame = requestAnimationFrame(tick);

            cleanup = () => {
                cancelAnimationFrame(frame);
                io.disconnect();
                window.removeEventListener('resize', onResize);
                window.removeEventListener('pointermove', onPointer);
                el.parentElement?.removeAttribute('data-webgl');
                mesh.geometry.dispose();
                material.dispose();
                renderer.dispose();
                renderer.domElement.remove();
            };
        })();

        return () => {
            disposed = true;
            cleanup?.();
        };
    }, []);

    return (
        <div
            ref={holder}
            className={`${styles.holder} ${ready ? styles.ready : ''}`}
            aria-hidden="true"
        />
    );
}
