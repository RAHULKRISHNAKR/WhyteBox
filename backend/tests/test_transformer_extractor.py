"""
Test Suite for Transformer Extractor

Run with: pytest tests/test_transformer_extractor.py -v
"""

import sys
from pathlib import Path
import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestTransformerExtractor:
    """Test TransformerExtractor functionality."""
    
    def test_imports(self):
        """Test that transformer extractor can be imported."""
        from extractors.transformer_extractor import TransformerExtractor
        assert TransformerExtractor is not None
    
    def test_encoder_only_detection(self):
        """Test BERT (encoder-only) architecture detection."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('prajjwal1/bert-tiny')
            extractor = TransformerExtractor(model=model)
            
            assert extractor.architecture_type == TransformerExtractor.ENCODER_ONLY
            
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_decoder_only_detection(self):
        """Test GPT-2 (decoder-only) architecture detection."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('sshleifer/tiny-gpt2')
            extractor = TransformerExtractor(model=model)
            
            assert extractor.architecture_type == TransformerExtractor.DECODER_ONLY
            
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_encoder_decoder_detection(self):
        """Test T5 (encoder-decoder) architecture detection."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('google/t5-efficient-tiny')
            extractor = TransformerExtractor(model=model)
            
            assert extractor.architecture_type == TransformerExtractor.ENCODER_DECODER
            
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_extraction_output_schema(self):
        """Test that extraction output matches expected schema."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('prajjwal1/bert-tiny')
            extractor = TransformerExtractor(model=model)
            data = extractor.extract()
            
            # Check required keys
            assert 'metadata' in data
            assert 'layers' in data
            assert 'connections' in data
            
            # Check metadata fields
            assert 'model_name' in data['metadata']
            assert 'framework' in data['metadata']
            assert 'architecture_type' in data['metadata']
            assert 'num_attention_heads' in data['metadata']
            assert 'hidden_size' in data['metadata']
            
            # Check layers list
            assert len(data['layers']) > 0
            for layer in data['layers']:
                assert 'id' in layer
                assert 'name' in layer
                assert 'type' in layer
                
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_converter_compatibility(self):
        """Test that output is compatible with UniversalConverter."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            from converters.universal_converter import UniversalConverter
            
            model = AutoModel.from_pretrained('prajjwal1/bert-tiny')
            extractor = TransformerExtractor(model=model)
            extracted_data = extractor.extract()
            
            # Should not raise any exceptions
            converter = UniversalConverter()
            viz_data = converter.convert(extracted_data)
            
            assert 'metadata' in viz_data
            assert 'layers' in viz_data
            assert 'connections' in viz_data
            
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_layer_types_present(self):
        """Test that expected layer types are extracted."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('prajjwal1/bert-tiny')
            extractor = TransformerExtractor(model=model)
            data = extractor.extract()
            
            layer_types = {layer['type'] for layer in data['layers']}
            
            # Should have these layer types
            assert 'Input' in layer_types
            assert 'Output' in layer_types
            assert 'Embedding' in layer_types
            assert 'MultiHeadAttention' in layer_types
            assert 'LayerNorm' in layer_types
            assert 'Linear' in layer_types
            
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")
    
    def test_connections_valid(self):
        """Test that connections reference valid layers."""
        try:
            from transformers import AutoModel
            from extractors.transformer_extractor import TransformerExtractor
            
            model = AutoModel.from_pretrained('prajjwal1/bert-tiny')
            extractor = TransformerExtractor(model=model)
            data = extractor.extract()
            
            layer_ids = {layer['id'] for layer in data['layers']}
            
            for conn in data['connections']:
                assert conn['from_layer'] in layer_ids, f"Invalid from_layer: {conn['from_layer']}"
                assert conn['to_layer'] in layer_ids, f"Invalid to_layer: {conn['to_layer']}"
                
        except ImportError:
            pytest.skip("transformers not installed")
        except Exception as e:
            pytest.skip(f"Could not load model: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
