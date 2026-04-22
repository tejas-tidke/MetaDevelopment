import React from "react";

function Stepper({ steps, activeStep }) {
  return (
    <div className="app-stepper">
      {steps.map((step) => (
        <div key={step.key} className={`app-step ${activeStep === step.key ? "active" : ""}`}>
          {step.label}
        </div>
      ))}
    </div>
  );
}

export default Stepper;

