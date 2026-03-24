import { cn } from "@/lib/utils";
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
    "bg-brand-lemon text-brand-black",
    "hover:bg-brand-lemon-dark hover:scale-[1.02]",
    "active:scale-[0.98] active:bg-brand-lemon-dark",
    "disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:hover:scale-100",
  ].join(" "),
  secondary: [
    "bg-transparent text-brand-black border-[1.5px] border-brand-black",
    "hover:bg-brand-black hover:text-brand-white",
    "active:bg-neutral-800 active:text-brand-white",
  ].join(" "),
  ghost: [
    "bg-transparent text-brand-cerulean",
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

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(baseStyles, variantStyles[variant], className);

  if ("href" in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}
