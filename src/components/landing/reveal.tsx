"use client";

import { motion, type Variants } from "motion/react";

/**
 * Scroll-triggered reveal primitive used across landing sections to
 * give the marketing site a sense of motion without each section
 * rolling its own IntersectionObserver. Fades + slides up the child
 * tree the first time it enters the viewport and stays in place
 * afterwards (no replay on re-entry, which reads as fidgety).
 *
 * Respects ``prefers-reduced-motion``: the framer-motion runtime
 * automatically drops to instant transitions when the user opts out.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  amount = 0.2,
  yOffset = 16,
}: {
  children: React.ReactNode;
  /** Stagger this reveal behind its neighbours; in seconds. */
  delay?: number;
  className?: string;
  /** Output element tag — defaults to a div. Useful when wrapping a
   *  section / list / paragraph and you don't want a stray div. */
  as?: "div" | "section" | "ul" | "li" | "p" | "header";
  /** Fraction of the element that must be in view before triggering.
   *  Defaults to 0.2 so we don't fire on a 1-px peek. */
  amount?: number;
  /** How far up the content slides in (px). 0 disables the slide. */
  yOffset?: number;
}) {
  const Component = motion[as] as typeof motion.div;
  const variants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        delay,
      },
    },
  };
  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </Component>
  );
}

/**
 * Container variant that staggers the reveal of its direct children
 * — pair with `<RevealItem>` children so each card cascades in
 * instead of arriving in a single slab.
 */
export function RevealGroup({
  children,
  className,
  delay = 0,
  staggerChildren = 0.08,
  as = "div",
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: number;
  as?: "div" | "section" | "ul";
  amount?: number;
}) {
  const Component = motion[as] as typeof motion.div;
  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: delay,
        staggerChildren,
      },
    },
  };
  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className,
  yOffset = 16,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  yOffset?: number;
  as?: "div" | "li" | "p";
}) {
  const Component = motion[as] as typeof motion.div;
  const variants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };
  return (
    <Component className={className} variants={variants}>
      {children}
    </Component>
  );
}
