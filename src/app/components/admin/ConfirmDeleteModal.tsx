"use client";

import ConfirmModal, { type ConfirmModalProps } from "../ConfirmModal";

type ConfirmDeleteModalProps = Omit<
  ConfirmModalProps,
  "confirmLabel" | "loadingLabel" | "confirmColor"
> & {
  confirmLabel?: string;
  loadingLabel?: string;
};

/** Shared confirm dialog with delete-oriented defaults (admin CRUD). */
export default function ConfirmDeleteModal({
  title = "Delete Item",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmLabel = "Delete",
  loadingLabel = "Deleting...",
  ...rest
}: ConfirmDeleteModalProps) {
  return (
    <ConfirmModal
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      loadingLabel={loadingLabel}
      confirmColor="error"
      {...rest}
    />
  );
}
