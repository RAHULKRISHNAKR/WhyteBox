class AnimationStateManager {
  constructor() {
    this.currentStep = 0;
    this.isAnimating = false;
    this.animationSpeed = 1.0;
    this.activations = [];
    this.onStepChange = null;
    this.animationInterval = null;
  }
  
  setActivations(activations) {
    this.activations = activations;
    this.currentStep = 0;
  }
  
  setOnStepChangeCallback(callback) {
    this.onStepChange = callback;
  }
  
  start() {
    if (this.isAnimating || !this.activations.length) return;
    
    this.isAnimating = true;
    this.animationInterval = setInterval(() => {
      this.nextStep();
      
      if (this.currentStep >= this.activations.length) {
        this.pause();
      }
    }, 1000 / this.animationSpeed);
  }
  
  pause() {
    this.isAnimating = false;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
  
  reset() {
    this.pause();
    this.currentStep = 0;
    if (this.onStepChange) this.onStepChange(0);
  }
  
  nextStep() {
    if (this.currentStep < this.activations.length) {
      this.currentStep++;
      if (this.onStepChange) this.onStepChange(this.currentStep);
    }
  }
  
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      if (this.onStepChange) this.onStepChange(this.currentStep);
    }
  }
  
  setSpeed(speed) {
    this.animationSpeed = speed;
    // Update interval if animation is running
    if (this.isAnimating) {
      this.pause();
      this.start();
    }
  }
  
  getCurrentActivation() {
    if (this.currentStep > 0 && this.currentStep <= this.activations.length) {
      return this.activations[this.currentStep - 1];
    }
    return null;
  }
}

export default AnimationStateManager;
