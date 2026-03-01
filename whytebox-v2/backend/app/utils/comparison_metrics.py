"""
Comparison metrics for explainability methods.

Provides quantitative metrics to compare and evaluate different
explainability techniques.
"""

from typing import Dict, List, Tuple
import numpy as np


class ExplainabilityMetrics:
    """
    Metrics for comparing explainability methods.
    
    Provides various quantitative measures to evaluate and compare
    attribution maps from different explainability techniques.
    """
    
    @staticmethod
    def compute_sparsity(attribution_map: np.ndarray, threshold: float = 0.1) -> float:
        """
        Compute sparsity of attribution map.
        
        Measures the fraction of attributions below a threshold.
        Higher sparsity indicates more focused explanations.
        
        Args:
            attribution_map: Attribution map
            threshold: Threshold for considering attribution significant
            
        Returns:
            Sparsity score [0, 1]
        """
        # Normalize to [0, 1]
        normalized = (attribution_map - attribution_map.min()) / (attribution_map.max() - attribution_map.min() + 1e-7)
        
        # Count pixels below threshold
        sparse_pixels = np.sum(normalized < threshold)
        total_pixels = normalized.size
        
        return sparse_pixels / total_pixels
    
    @staticmethod
    def compute_concentration(attribution_map: np.ndarray, top_k_percent: float = 0.1) -> float:
        """
        Compute concentration of attributions.
        
        Measures how much of the total attribution is concentrated
        in the top-k% of pixels.
        
        Args:
            attribution_map: Attribution map
            top_k_percent: Percentage of top pixels to consider
            
        Returns:
            Concentration score [0, 1]
        """
        # Flatten and sort
        flat = attribution_map.flatten()
        sorted_attrs = np.sort(flat)[::-1]
        
        # Get top-k pixels
        k = int(len(sorted_attrs) * top_k_percent)
        top_k_sum = np.sum(sorted_attrs[:k])
        total_sum = np.sum(sorted_attrs)
        
        return top_k_sum / (total_sum + 1e-7)
    
    @staticmethod
    def compute_complexity(attribution_map: np.ndarray) -> float:
        """
        Compute complexity of attribution map.
        
        Measures the complexity using total variation.
        Lower complexity indicates smoother explanations.
        
        Args:
            attribution_map: Attribution map
            
        Returns:
            Complexity score
        """
        # Compute gradients
        grad_x = np.diff(attribution_map, axis=1)
        grad_y = np.diff(attribution_map, axis=0)
        
        # Total variation
        tv = np.sum(np.abs(grad_x)) + np.sum(np.abs(grad_y))
        
        # Normalize by size
        return tv / attribution_map.size
    
    @staticmethod
    def compute_similarity(
        map1: np.ndarray,
        map2: np.ndarray,
        method: str = "correlation"
    ) -> float:
        """
        Compute similarity between two attribution maps.
        
        Args:
            map1: First attribution map
            map2: Second attribution map
            method: Similarity method ('correlation', 'cosine', 'ssim')
            
        Returns:
            Similarity score
        """
        # Ensure same shape
        if map1.shape != map2.shape:
            raise ValueError("Attribution maps must have same shape")
        
        # Flatten
        flat1 = map1.flatten()
        flat2 = map2.flatten()
        
        if method == "correlation":
            # Pearson correlation
            return np.corrcoef(flat1, flat2)[0, 1]
        
        elif method == "cosine":
            # Cosine similarity
            dot_product = np.dot(flat1, flat2)
            norm1 = np.linalg.norm(flat1)
            norm2 = np.linalg.norm(flat2)
            return dot_product / (norm1 * norm2 + 1e-7)
        
        elif method == "ssim":
            # Structural similarity (simplified)
            mean1 = np.mean(flat1)
            mean2 = np.mean(flat2)
            var1 = np.var(flat1)
            var2 = np.var(flat2)
            cov = np.mean((flat1 - mean1) * (flat2 - mean2))
            
            c1 = 0.01 ** 2
            c2 = 0.03 ** 2
            
            ssim = ((2 * mean1 * mean2 + c1) * (2 * cov + c2)) / \
                   ((mean1**2 + mean2**2 + c1) * (var1 + var2 + c2))
            
            return ssim
        
        else:
            raise ValueError(f"Unknown similarity method: {method}")
    
    @staticmethod
    def compute_faithfulness(
        model: any,
        input_data: np.ndarray,
        attribution_map: np.ndarray,
        target_class: int,
        num_steps: int = 10
    ) -> float:
        """
        Compute faithfulness of attribution map.
        
        Measures how well the attribution map reflects the model's
        actual decision-making by progressively removing features.
        
        Args:
            model: The model
            input_data: Input data
            attribution_map: Attribution map
            target_class: Target class
            num_steps: Number of removal steps
            
        Returns:
            Faithfulness score
        """
        # This is a placeholder - actual implementation would require
        # running the model multiple times with masked inputs
        # For now, return a dummy value
        return 0.0
    
    @staticmethod
    def rank_methods(
        attribution_maps: Dict[str, np.ndarray],
        weights: Dict[str, float] = None
    ) -> List[Tuple[str, float]]:
        """
        Rank explainability methods based on multiple metrics.
        
        Args:
            attribution_maps: Dictionary of method names to attribution maps
            weights: Optional weights for different metrics
            
        Returns:
            List of (method_name, score) tuples sorted by score
        """
        if weights is None:
            weights = {
                "sparsity": 0.3,
                "concentration": 0.3,
                "complexity": 0.4,
            }
        
        scores = {}
        
        for method_name, attr_map in attribution_maps.items():
            # Compute metrics
            sparsity = ExplainabilityMetrics.compute_sparsity(attr_map)
            concentration = ExplainabilityMetrics.compute_concentration(attr_map)
            complexity = ExplainabilityMetrics.compute_complexity(attr_map)
            
            # Normalize complexity (lower is better)
            complexity_score = 1.0 / (1.0 + complexity)
            
            # Weighted sum
            score = (
                weights["sparsity"] * sparsity +
                weights["concentration"] * concentration +
                weights["complexity"] * complexity_score
            )
            
            scores[method_name] = score
        
        # Sort by score (descending)
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        return ranked
    
    @staticmethod
    def compare_all_metrics(
        attribution_maps: Dict[str, np.ndarray]
    ) -> Dict[str, Dict[str, float]]:
        """
        Compute all metrics for all methods.
        
        Args:
            attribution_maps: Dictionary of method names to attribution maps
            
        Returns:
            Dictionary of method names to metric dictionaries
        """
        results = {}
        
        for method_name, attr_map in attribution_maps.items():
            results[method_name] = {
                "sparsity": ExplainabilityMetrics.compute_sparsity(attr_map),
                "concentration": ExplainabilityMetrics.compute_concentration(attr_map),
                "complexity": ExplainabilityMetrics.compute_complexity(attr_map),
            }
        
        # Compute pairwise similarities
        method_names = list(attribution_maps.keys())
        for i, name1 in enumerate(method_names):
            for name2 in method_names[i+1:]:
                similarity = ExplainabilityMetrics.compute_similarity(
                    attribution_maps[name1],
                    attribution_maps[name2],
                    method="correlation"
                )
                
                # Store in both directions
                if "similarities" not in results[name1]:
                    results[name1]["similarities"] = {}
                if "similarities" not in results[name2]:
                    results[name2]["similarities"] = {}
                
                results[name1]["similarities"][name2] = similarity
                results[name2]["similarities"][name1] = similarity
        
        return results
    
    @staticmethod
    def generate_comparison_report(
        attribution_maps: Dict[str, np.ndarray]
    ) -> Dict[str, any]:
        """
        Generate comprehensive comparison report.
        
        Args:
            attribution_maps: Dictionary of method names to attribution maps
            
        Returns:
            Comprehensive comparison report
        """
        # Compute all metrics
        metrics = ExplainabilityMetrics.compare_all_metrics(attribution_maps)
        
        # Rank methods
        ranking = ExplainabilityMetrics.rank_methods(attribution_maps)
        
        # Generate report
        report = {
            "num_methods": len(attribution_maps),
            "methods": list(attribution_maps.keys()),
            "metrics": metrics,
            "ranking": [
                {"method": name, "score": score}
                for name, score in ranking
            ],
            "best_method": ranking[0][0] if ranking else None,
            "summary": {
                "most_sparse": max(metrics.items(), key=lambda x: x[1]["sparsity"])[0],
                "most_concentrated": max(metrics.items(), key=lambda x: x[1]["concentration"])[0],
                "least_complex": min(metrics.items(), key=lambda x: x[1]["complexity"])[0],
            }
        }
        
        return report

# Made with Bob
