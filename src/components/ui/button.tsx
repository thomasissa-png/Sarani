"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type BaseProps = {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: never;
  };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-brand-flame text-brand-black",
    "hover:bg-brand-flame-dark",
    "disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed",
  ].join(" "),
  secondary: [
    "bg-transparent text-brand-black border-[1.5px] border-brand-black",
    "hover:bg-brand-black hover:text-brand-white",
  ].join(" "),
  ghost: [
    "bg-transparent text-brand-cerulean-dark",
    "hover:underline hover:underline-offset-4",
  ].join(" "),
};

const baseStyles = [
  "inline-flex items-center justify-center",
  "font-bold text-base leading-normal",
  "rounded-full min-w-[160px]",
  "px-8 py-4",
  "transition-all duration-150 ease-in-out",
  "focus-visible:outline-3 focus-visible:outline-brand-cerulean focus-visible:outline-offset-2",
  "cursor-pointer",
].join(" ");

const springTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 20,
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(baseStyles, variantStyles[variant], className);

  if ("href" in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink;
    const isInternal = href.startsWith("/") || href.startsWith("#");
    return (
      <motion.div
        className="inline-block"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={springTransition}
      >
        {isInternal ? (
          <Link href={href} className={classes} {...rest}>
            {children}
          </Link>
        ) : (
          <a href={href} className={classes} {...rest}>
            {children}
          </a>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="inline-block"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={springTransition}
    >
      <button className={classes} {...(props as ButtonAsButton)}>
        {children}
      </button>
    </motion.div>
  );
}
