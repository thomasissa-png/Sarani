"use client";

import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
}

/**
 * Hook for programmatic confirmation dialogs.
 *
 * Usage:
 *   const { confirm, dialogProps } = useConfirm();
 *   // ...
 *   const ok = await confirm({ title: "Publish?", message: "..." });
 *   if (ok) doStuff();
 *   // ...
 *   <ConfirmDialog {...dialogProps} />
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      variant?: "danger" | "default";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel,
          variant: opts.variant,
          onConfirm: () => {
            setState((prev) => ({ ...prev, open: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const dialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm: state.onConfirm,
    onCancel: useCallback(() => {
      setState((prev) => ({ ...prev, open: false }));
    }, []),
  };

  return { confirm, dialogProps };
}
