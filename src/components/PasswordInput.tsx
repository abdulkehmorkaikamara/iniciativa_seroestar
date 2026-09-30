import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
}

// A password <input> with a show/hide toggle, so a user (or an admin
// setting a temporary password for someone else) can double-check exactly
// what they typed before submitting. Drop-in replacement for
// <input type="password" .../> — accepts the same props, including inside
// an existing `relative` wrapper that already positions a left-side icon
// (its own inner `relative` wrapper only affects the toggle button, so it
// nests safely).
export default function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full pr-9 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
