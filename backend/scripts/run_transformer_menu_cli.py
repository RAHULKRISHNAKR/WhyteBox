#!/usr/bin/env python
"""
Transformer Visualization CLI - Interactive Menu

Interactive CLI tool to select and extract transformer models for visualization.
Similar to CNN model selection flow.

Usage:
    cd backend
    python scripts/run_transformer_menu_cli.py
"""

import json
import sys
import os
from pathlib import Path

# Suppress TensorFlow warnings before any imports
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Suppress transformers warnings
import warnings
warnings.filterwarnings('ignore')

# Add backend to path for imports
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

# Suppress logging
import logging
logging.disable(logging.WARNING)

# =============================================================================
# TRANSFORMER MODELS REGISTRY
# =============================================================================

TRANSFORMER_MODELS = {
    1: {"name": "BERT Base", "hf": "bert-base-uncased"},
    2: {"name": "DistilBERT", "hf": "distilbert-base-uncased"},
    3: {"name": "GPT-2", "hf": "gpt2"},
    4: {"name": "T5 Small", "hf": "t5-small"}
}


# =============================================================================
# CLI FUNCTIONS
# =============================================================================

def print_header():
    """Print CLI header."""
    print()
    print("=" * 40)
    print("Transformer Visualization CLI")
    print("=" * 40)


def print_menu():
    """Print model selection menu."""
    print()
    print("Choose Transformer Model:")
    for num, model in TRANSFORMER_MODELS.items():
        print(f"  {num}. {model['name']}")
    print()


def get_user_choice() -> int:
    """Get and validate user input."""
    while True:
        try:
            choice = input("Enter choice: ").strip()
            
            if not choice:
                print("Please enter a number.")
                continue
            
            choice_num = int(choice)
            
            if choice_num not in TRANSFORMER_MODELS:
                print(f"Invalid choice. Please enter 1-{len(TRANSFORMER_MODELS)}.")
                continue
            
            return choice_num
            
        except ValueError:
            print("Invalid input. Please enter a number.")
        except KeyboardInterrupt:
            print("\n\nExiting...")
            sys.exit(0)


def sanitize_filename(model_name: str) -> str:
    """Convert model name to safe filename."""
    safe_name = model_name.replace("/", "_").replace("\\", "_")
    safe_name = safe_name.replace(":", "_").replace(" ", "_")
    return safe_name


def print_summary(data: dict, model_info: dict):
    """Print extraction summary."""
    metadata = data.get("metadata", {})
    layers = data.get("layers", [])
    connections = data.get("connections", [])
    blocks = data.get("transformer_blocks", [])
    
    # Count residual connections
    residual_count = sum(
        1 for c in connections 
        if c.get("connection_type") == "residual"
    )
    
    # Get positional encoding
    pos_enc = metadata.get("positional_encoding", {})
    pos_type = pos_enc.get("type", metadata.get("position_encoding_type", "unknown"))
    
    print()
    print("=" * 40)
    print(f"Selected Model: {model_info['name']}")
    print(f"Architecture: {metadata.get('architecture_type', 'unknown')}")
    print(f"Total Layers: {len(layers)}")
    print(f"Transformer Blocks: {len(blocks)}")
    print(f"Residual Connections: {residual_count}")
    print(f"Positional Encoding: {pos_type}")
    print("-" * 40)


def save_json(data: dict, model_hf: str) -> str:
    """Save JSON output and return path."""
    output_dir = BACKEND_DIR / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    safe_name = sanitize_filename(model_hf)
    output_path = output_dir / f"{safe_name}_visualization.json"
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return str(output_path)


def main():
    """Main entry point."""
    print_header()
    print_menu()
    
    # Get user selection
    choice = get_user_choice()
    model_info = TRANSFORMER_MODELS[choice]
    
    print()
    print(f"Loading {model_info['name']}...")
    print("(This may take a moment for first download)")
    
    try:
        # Import dependencies
        from transformers import AutoModel
        from extractors.transformer_extractor import TransformerExtractor
    except ImportError as e:
        print(f"\nError: Missing dependencies - {e}")
        print("Install with: pip install transformers torch")
        sys.exit(1)
    
    try:
        # Load model
        model = AutoModel.from_pretrained(model_info['hf'])
        
        # Run extractor
        extractor = TransformerExtractor(model=model)
        data = extractor.extract()
        
    except Exception as e:
        print(f"\nError: Failed to process model")
        print(f"Details: {e}")
        sys.exit(1)
    
    # Print summary
    print_summary(data, model_info)
    
    # Save JSON
    output_path = save_json(data, model_info['hf'])
    print(f"JSON saved to: {output_path}")
    print("=" * 40)
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
