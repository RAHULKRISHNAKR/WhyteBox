import React, { useState } from 'react';

const GuidedTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tourSteps = [
    {
      title: "Welcome to CNN Visualizer!",
      content: "This tour will guide you through understanding how computers see images. Ready to begin?",
      target: "header",
      position: "bottom"
    },
    {
      title: "The Model",
      content: "This 3D visualization shows the 'brain' of our computer vision system. Each colored shape represents a different part that helps recognize images.",
      target: ".model-visualizer",
      position: "left"
    },
    {
      title: "Image Input",
      content: "This is where we feed images to the AI. The computer breaks down the image into pixels (tiny colored dots) to begin processing.",
      target: ".image-input",
      position: "right"
    },
    {
      title: "Simple Features",
      content: "These first layers find simple patterns like edges, corners, and colors - the building blocks of all objects.",
      target: ".early-layers",
      position: "bottom"
    },
    {
      title: "Advanced Features",
      content: "Middle layers combine simple features into more complex shapes, like wheels, eyes, or windows.",
      target: ".middle-layers",
      position: "bottom"
    },
    {
      title: "Final Decision",
      content: "The final layers put everything together to make a decision: 'This is a cat' or 'This is a car'.",
      target: ".final-layers",
      position: "left"
    },
    {
      title: "Explainability View",
      content: "This special view shows which parts of the image were most important for the AI's decision. Brighter areas had more influence!",
      target: ".explainability-view",
      position: "right"
    },
    {
      title: "Try It Yourself!",
      content: "Now you can explore on your own. Upload your own image or try our sample images to see how the AI 'thinks'!",
      target: ".user-controls",
      position: "bottom"
    }
  ];

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    onComplete();
  };

  const step = tourSteps[currentStep];

  return (
    <div className="guided-tour" data-target={step.target} data-position={step.position}>
      <div className="tour-bubble">
        <div className="tour-header">
          <h3>{step.title}</h3>
          <button className="close-btn" onClick={skipTour}>×</button>
        </div>
        <div className="tour-content">
          <p>{step.content}</p>
        </div>
        <div className="tour-controls">
          {currentStep > 0 && <button className="secondary-btn" onClick={prevStep}>Previous</button>}
          <button className="primary-btn" onClick={nextStep}>
            {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
          <button className="tertiary-btn" onClick={skipTour}>Skip Tour</button>
        </div>
        <div className="tour-progress">
          Step {currentStep + 1} of {tourSteps.length}
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
