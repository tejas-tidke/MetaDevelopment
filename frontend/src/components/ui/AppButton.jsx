import React from "react";

const VARIANT_CLASS = {
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
  ghost: "ghost",
};

const SIZE_CLASS = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

function AppButton({
  type,
  variant = "secondary",
  size = "md",
  icon,
  fullWidth = false,
  className = "",
  children,
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.secondary;
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  const classes = [
    "workspace-btn",
    variantClass,
    sizeClass,
    fullWidth ? "full-width" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type || "button"} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}

export default AppButton;
