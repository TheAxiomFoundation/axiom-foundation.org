"use client";

import { useEffect } from "react";

// Brown (#b45309) → Ink (#1c1917)
const FROM = [180, 83, 9];
const TO = [28, 25, 23];

const SELECTOR =
  ".heading-page, .heading-section, .heading-sub, .text-gradient, .btn-primary, .gradient-fill, .gradient-icon";

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/**
 * Sets --gx (gradient offset for background-clip:text) and
 * --gc (interpolated solid color) on each gradient element.
 * Text uses --gx for smooth gradients; SVG icons use --gc via color.
 */
export function GradientSync() {
  useEffect(() => {
    function sync() {
      const vw = window.innerWidth;
      const els = document.querySelectorAll<HTMLElement>(SELECTOR);

      // Batch reads
      const measurements = Array.from(els).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          left: rect.left,
          cx: rect.left + el.offsetWidth / 2,
        };
      });

      // Batch writes
      for (const { el, left, cx } of measurements) {
        el.style.setProperty("--gx", `-${left}px`);
        const t = Math.min(1, Math.max(0, cx / vw));
        const r = lerp(FROM[0], TO[0], t);
        const g = lerp(FROM[1], TO[1], t);
        const b = lerp(FROM[2], TO[2], t);
        el.style.setProperty("--gc", `rgb(${r},${g},${b})`);
      }
    }

    sync();

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(sync, 80);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
