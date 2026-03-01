"""
Explainability methods for neural network interpretability.

This package provides various explainability techniques including:
- Grad-CAM (Gradient-weighted Class Activation Mapping)
- Saliency Maps
- Integrated Gradients
- SmoothGrad
"""

from .base_explainer import BaseExplainer, ExplainabilityResult
from .gradcam import GradCAM
from .saliency import SaliencyMap
from .integrated_gradients import IntegratedGradients

__all__ = [
    "BaseExplainer",
    "ExplainabilityResult",
    "GradCAM",
    "SaliencyMap",
    "IntegratedGradients",
]

# Made with Bob
