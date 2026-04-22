import React from "react";
import Stepper from "../../components/ui/Stepper";

const campaignWizardSteps = [
  { key: "details", label: "Details" },
  { key: "audience", label: "Audience" },
  { key: "template", label: "Template" },
  { key: "review", label: "Review" },
];

function CampaignWizardLayout({ activeStep, title, subtitle, children }) {
  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="app-section-body">
          <Stepper steps={campaignWizardSteps} activeStep={activeStep} />
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-body">{children}</div>
      </section>
    </div>
  );
}

export default CampaignWizardLayout;
