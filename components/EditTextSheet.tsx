"use client";

import { useState } from "react";
import { EditSheet, editFieldClass, editLabelClass } from "@/components/EditSheet";

interface Props {
  heading: string;
  initialText: string;
  saving: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function EditTextSheet({ heading, initialText, saving, onClose, onSave }: Props) {
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();

  return (
    <EditSheet
      heading={heading}
      canSave={trimmed.length > 0}
      saving={saving}
      onClose={onClose}
      onSave={() => (trimmed === initialText ? onClose() : onSave(trimmed))}
    >
      <div className="mb-4">
        <label htmlFor="edit-text" className={editLabelClass}>Name</label>
        <input
          id="edit-text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={editFieldClass}
          autoComplete="off"
        />
      </div>
    </EditSheet>
  );
}
