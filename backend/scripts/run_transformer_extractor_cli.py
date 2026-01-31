#!/usr/bin/env python
"""
TransformerExtractor CLI Validation Script

CLI tool for developers to validate transformer model extraction.
Loads a HuggingFace model, runs TransformerExtractor, and outputs
a human-readable summary plus JSON file.

Usage:
    python backend/scripts/run_transformer_extractor_cli.py
    python backend/scripts/run_transformer_extractor_cli.py --model gpt2
    python backend/scripts/run_transformer_extractor_cli.py --model t5-small
"""

import argparse
import json
import sys
import os
from pathlib import Path

# Add backend to path for imports
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run TransformerExtractor on a HuggingFace model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_transformer_extractor_cli.py
  python run_transformer_extractor_cli.py --model gpt2
  python run_transformer_extractor_cli.py --model t5-small
        """
    )
    parser.add_argument(
        "--model", "-m",
        type=str,
        default="bert-base-uncased",
        help="HuggingFace model name or path (default: bert-base-uncased)"
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default=None,
        help="Output directory for JSON (default: backend/output)"
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Skip saving JSON file (print summary only)"
    )
    return parser.parse_args()


def sanitize_filename(model_name: str) -> str:
    """Convert model name to safe filename."""
    # Replace slashes and other unsafe characters
    safe_name = model_name.replace("/", "_").replace("\\", "_")
    safe_name = safe_name.replace(":", "_").replace(" ", "_")
    return safe_name


def print_header():
    """Print CLI header."""
    print("=" * 50)
    print("TransformerExtractor CLI")
    print("=" * 50)


def print_summary(data: dict, model_name: str):
    """Print human-readable extraction summary."""
    metadata = data.get("metadata", {})
    layers = data.get("layers", [])
    connections = data.get("connections", [])
    blocks = data.get("transformer_blocks", [])
    
    # Count residual connections
    residual_count = sum(
        1 for c in connections 
        if c.get("connection_type") == "residual"
    )
    
    # Get positional encoding info
    pos_enc = metadata.get("positional_encoding", {})
    pos_type = pos_enc.get("type", metadata.get("position_encoding_type", "unknown"))
    
    print(f"Model: {model_name}")
    print(f"Architecture: {metadata.get('architecture_type', 'unknown')}")
    print(f"Total Layers: {len(layers)}")
    print(f"Transformer Blocks: {len(blocks)}")
    print(f"Residual Connections: {residual_count}")
    print(f"Positional Encoding: {pos_type}")


def print_footer(output_path: str = None):
    """Print CLI footer."""
    print("-" * 50)
    if output_path:
        print(f"JSON saved to: {output_path}")
    print("=" * 50)


def main():
    """Main entry point."""
    args = parse_args()
    
    print_header()
    print(f"Loading model: {args.model}...")
    print("-" * 50)
    
    try:
        # Import dependencies
        from transformers import AutoModel
        from extractors.transformer_extractor import TransformerExtractor
    except ImportError as e:
        print(f"Error: Missing dependencies - {e}")
        print("Install with: pip install transformers torch")
        sys.exit(1)
    
    try:
        # Load model
        model = AutoModel.from_pretrained(args.model)
    except Exception as e:
        print(f"Error: Failed to load model '{args.model}'")
        print(f"Details: {e}")
        print("-" * 50)
        print("Hint: Check the model name is valid on HuggingFace Hub")
        print("=" * 50)
        sys.exit(1)
    
    try:
        # Run extractor
        extractor = TransformerExtractor(model=model)
        data = extractor.extract()
    except Exception as e:
        print(f"Error: Extraction failed")
        print(f"Details: {e}")
        print("=" * 50)
        sys.exit(1)
    
    # Print summary
    print_summary(data, args.model)
    
    # Save JSON if requested
    output_path = None
    if not args.no_save:
        # Determine output directory
        if args.output_dir:
            output_dir = Path(args.output_dir)
        else:
            output_dir = BACKEND_DIR / "output"
        
        # Create directory if needed
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        safe_name = sanitize_filename(args.model)
        output_path = output_dir / f"{safe_name}_visualization.json"
        
        # Write JSON
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        output_path = str(output_path)
    
    print_footer(output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
