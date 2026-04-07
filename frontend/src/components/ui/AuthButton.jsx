import React from "react";

const VARIANT_CLASS = {
  submit: "auth-submit",
  social: "auth-social-btn",
  muted: "auth-btn-muted",
  primary: "auth-btn-primary",
};

function AuthButton({
  type,
  variant = "submit",
  fullWidth = false,
  className = "",
  children,
  ...props
}) {
  const baseClass = VARIANT_CLASS[variant] || VARIANT_CLASS.submit;
  const classes = [baseClass, fullWidth ? "full" : "", className].filter(Boolean).join(" ");

  return (
    <button type={type || "button"} className={classes} {...props}>
      {children}
    </button>
  );
}

export default AuthButton;
