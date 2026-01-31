"""
Transformer Model Extractor - Phase 2: Semantic Structure Enrichment

Extracts layer information and connections from HuggingFace Transformer models
using config and module inspection only (no forward passes).

Phase 2 adds:
- Transformer block grouping (TransformerEncoderBlock, TransformerDecoderBlock)
- Explicit residual connection metadata
- Attention configuration per block
- Enhanced positional encoding classification

Supports:
- Encoder-only models (BERT, RoBERTa, DistilBERT)
- Decoder-only models (GPT-2, GPT-Neo)
- Encoder-decoder models (T5, BART)
"""

import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from extractors.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)


class TransformerExtractor(BaseExtractor):
    """
    Extractor for HuggingFace Transformer models.
    
    Phase 2 Implementation:
    - Static architecture extraction via config inspection
    - Block-level grouping with sub_layers for frontend rendering
    - Explicit residual connections (around attention and FFN)
    - Attention configuration metadata per block
    - No forward passes or attention weight extraction
    """
    
    # Architecture type constants
    ENCODER_ONLY = "encoder_only"
    DECODER_ONLY = "decoder_only"
    ENCODER_DECODER = "encoder_decoder"
    
    def __init__(
        self,
        model: Any,
        model_name: Optional[str] = None,
        extract_weights: bool = False,
        extract_detailed_params: bool = True,
        device: str = 'cpu'
    ):
        """
        Initialize Transformer extractor.
        
        Args:
            model: HuggingFace PreTrainedModel instance
            model_name: Custom display name for the model
            extract_weights: Whether to extract weight tensors (not implemented)
            extract_detailed_params: Extract detailed layer parameters
            device: Device to use ('cpu' or 'cuda')
        """
        # Import here to avoid dependency issues if transformers not installed
        try:
            from transformers import PreTrainedModel, PretrainedConfig
            import torch
        except ImportError as e:
            raise ImportError(
                "HuggingFace transformers and PyTorch are required. "
                "Install with: pip install transformers torch"
            ) from e
        
        # Validate model type
        if not isinstance(model, PreTrainedModel):
            raise TypeError(
                f"Expected PreTrainedModel, got {type(model).__name__}. "
                "Pass a HuggingFace model instance (e.g., AutoModel.from_pretrained('bert-base-uncased'))"
            )
        
        # Store torch reference for later use
        self._torch = torch
        
        # Extract config from model
        self.config = model.config
        
        # Infer model name from config if not provided
        if model_name is None:
            model_name = getattr(self.config, '_name_or_path', None) or \
                         getattr(self.config, 'model_type', 'transformer')
        
        # Determine a reasonable "input shape" for transformers
        # Format: [batch_size, sequence_length]
        max_pos = getattr(self.config, 'max_position_embeddings', 512)
        input_shape = (1, min(max_pos, 128))  # Use 128 as default seq_len
        
        # Initialize base extractor
        super().__init__(
            model=model,
            input_shape=input_shape,
            model_name=model_name,
            extract_weights=extract_weights,
            extract_detailed_params=extract_detailed_params
        )
        
        self.device = device
        self.model.to(device)
        self.model.eval()
        
        # Detect architecture type
        self.architecture_type = self._detect_architecture_type()
        
        # Track layer index for ID generation
        self._layer_index = 0
        
        # Phase 2: Store transformer blocks for grouping
        self._transformer_blocks: List[Dict[str, Any]] = []
        
        logger.info(
            f"Initialized TransformerExtractor for {self.model_name} "
            f"(architecture: {self.architecture_type})"
        )
    
    # =========================================================================
    # ARCHITECTURE DETECTION
    # =========================================================================
    
    def _detect_architecture_type(self) -> str:
        """
        Detect whether model is encoder-only, decoder-only, or encoder-decoder.
        
        Uses HuggingFace config attributes to determine architecture:
        - is_encoder_decoder=True: Encoder-decoder (T5, BART)
        - is_decoder=True (with is_encoder_decoder=False): Decoder-only (GPT-2)
        - Neither: Encoder-only (BERT)
        
        Returns:
            One of: ENCODER_ONLY, DECODER_ONLY, ENCODER_DECODER
        """
        # Check for encoder-decoder first (T5, BART, MarianMT, etc.)
        if getattr(self.config, 'is_encoder_decoder', False):
            return self.ENCODER_DECODER
        
        # Check for decoder-only (GPT-2, GPT-Neo, LLaMA, etc.)
        if getattr(self.config, 'is_decoder', False):
            return self.DECODER_ONLY
        
        # Check model_type for common decoder-only models that may not set is_decoder
        decoder_model_types = {'gpt2', 'gpt_neo', 'gpt_neox', 'llama', 'opt', 'bloom', 'falcon'}
        model_type = getattr(self.config, 'model_type', '').lower()
        if model_type in decoder_model_types:
            return self.DECODER_ONLY
        
        # Default to encoder-only (BERT, RoBERTa, DistilBERT, etc.)
        return self.ENCODER_ONLY
    
    # =========================================================================
    # MAIN EXTRACTION
    # =========================================================================
    
    def extract(self) -> Dict[str, Any]:
        """
        Extract complete model information.
        
        Returns:
            Dictionary with:
            - metadata: Model-level info including positional encoding
            - layers: Flat list of all layers (backward compatible)
            - connections: Sequential + explicit residual connections
            - transformer_blocks: Grouped blocks with sub_layers (Phase 2)
        """
        logger.info(f"Starting extraction of {self.architecture_type} model: {self.model_name}")
        
        try:
            # Reset state
            self._layer_index = 0
            self._transformer_blocks = []
            
            # Extract components in order
            self.metadata = self.extract_metadata()
            self.layers_data = self.extract_layers()
            self.connections_data = self.extract_connections()
            
            # Validate extraction
            is_valid, errors = self.validate_extraction()
            if not is_valid:
                logger.warning(f"Extraction validation warnings: {errors}")
            
            result = {
                'metadata': self.metadata,
                'layers': self.layers_data,
                'connections': self.connections_data,
                # Phase 2: Add grouped transformer blocks
                'transformer_blocks': self._transformer_blocks
            }
            
            logger.info(
                f"✓ Successfully extracted {len(self.layers_data)} layers, "
                f"{len(self.connections_data)} connections, "
                f"{len(self._transformer_blocks)} transformer blocks"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"✗ Extraction failed: {str(e)}")
            raise
    
    def extract_metadata(self) -> Dict[str, Any]:
        """
        Extract model-level metadata from config.
        
        Phase 2: Enhanced with positional_encoding object.
        
        Returns:
            Dictionary with model information including transformer-specific fields.
        """
        # Get common config attributes with safe defaults
        hidden_size = getattr(self.config, 'hidden_size', 
                              getattr(self.config, 'd_model', 768))
        num_attention_heads = getattr(self.config, 'num_attention_heads',
                                      getattr(self.config, 'n_head', 12))
        num_hidden_layers = getattr(self.config, 'num_hidden_layers',
                                    getattr(self.config, 'n_layer', 12))
        vocab_size = getattr(self.config, 'vocab_size', 30522)
        max_position = getattr(self.config, 'max_position_embeddings', 512)
        
        # Count parameters
        total_params = self._count_parameters()
        
        # Phase 2: Enhanced positional encoding info
        positional_encoding = self._get_positional_encoding_metadata()
        
        metadata = {
            'model_name': self.model_name,
            'framework': 'pytorch',
            'framework_version': self._torch.__version__,
            'version': '2.0.0',  # Bumped for Phase 2
            'extractor': 'TransformerExtractor',
            'architecture_type': self.architecture_type,
            'model_type': getattr(self.config, 'model_type', 'unknown'),
            
            # Transformer-specific
            'hidden_size': hidden_size,
            'num_attention_heads': num_attention_heads,
            'num_hidden_layers': num_hidden_layers,
            'vocab_size': vocab_size,
            'max_position_embeddings': max_position,
            'intermediate_size': getattr(self.config, 'intermediate_size',
                                         getattr(self.config, 'n_inner', hidden_size * 4)),
            
            # Phase 2: Enhanced positional encoding classification
            'positional_encoding': positional_encoding,
            # Keep legacy field for backward compatibility
            'position_encoding_type': positional_encoding['type'],
            
            # Standard fields
            'total_layers': num_hidden_layers,
            'total_parameters': total_params,
            'trainable_parameters': total_params,
            'input_shape': list(self.input_shape),
            'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'device': self.device,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add encoder-decoder specific info
        if self.architecture_type == self.ENCODER_DECODER:
            metadata['num_decoder_layers'] = getattr(
                self.config, 'num_decoder_layers', num_hidden_layers
            )
        
        return metadata
    
    def extract_layers(self) -> List[Dict[str, Any]]:
        """
        Extract detailed layer information for transformer components.
        
        Returns:
            List of layer dictionaries (flat, for backward compatibility).
            Also populates self._transformer_blocks with grouped blocks.
        """
        layers = []
        
        # 1. Add synthetic input layer
        layers.append(self._create_input_layer())
        
        # 2. Extract embedding layers
        embedding_layers = self._extract_embedding_layers()
        layers.extend(embedding_layers)
        
        # 3. Extract encoder blocks (if present)
        if self.architecture_type in [self.ENCODER_ONLY, self.ENCODER_DECODER]:
            encoder_layers = self._extract_encoder_blocks()
            layers.extend(encoder_layers)
        
        # 4. Extract decoder blocks (if present)
        if self.architecture_type in [self.DECODER_ONLY, self.ENCODER_DECODER]:
            decoder_layers = self._extract_decoder_blocks()
            layers.extend(decoder_layers)
        
        # 5. Extract output head
        output_head_layers = self._extract_output_head()
        layers.extend(output_head_layers)
        
        # 6. Add synthetic output layer
        layers.append(self._create_output_layer(layers))
        
        return layers
    
    def extract_connections(self) -> List[Dict[str, Any]]:
        """
        Extract connections between layers.
        
        Phase 2: Includes explicit residual connections with semantic metadata.
        
        Returns:
            List of connection dictionaries with types:
            - 'sequential': Normal forward flow
            - 'residual': Skip connections around attention/FFN
        """
        connections = []
        
        if not self.layers_data:
            return connections
        
        # Build sequential connections between all adjacent layers
        for i in range(len(self.layers_data) - 1):
            current_layer = self.layers_data[i]
            next_layer = self.layers_data[i + 1]
            
            connections.append({
                'from_layer': current_layer['id'],
                'to_layer': next_layer['id'],
                'connection_type': 'sequential',
                'data_flow': 'forward'
            })
        
        # Phase 2: Build explicit residual connections
        residual_connections = self._build_residual_connections()
        connections.extend(residual_connections)
        
        return connections
    
    # =========================================================================
    # LAYER EXTRACTION HELPERS
    # =========================================================================
    
    def _create_input_layer(self) -> Dict[str, Any]:
        """Create synthetic input layer for visualization."""
        return {
            'id': 'layer_input',
            'name': 'Input Tokens',
            'type': 'Input',
            'index': -1,
            'input_shape': list(self.input_shape),
            'output_shape': list(self.input_shape),
            'parameters': {
                'batch_size': self.input_shape[0],
                'sequence_length': self.input_shape[1]
            },
            'activation': None,
            'trainable': False,
            'visualization': {'color': '#20E830', 'size_hint': 1.0}
        }
    
    def _create_output_layer(self, layers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create synthetic output layer for visualization."""
        last_shape = layers[-1]['output_shape'] if layers else list(self.input_shape)
        
        return {
            'id': 'layer_output',
            'name': 'Output',
            'type': 'Output',
            'index': self._layer_index,
            'input_shape': last_shape,
            'output_shape': last_shape,
            'parameters': {},
            'activation': None,
            'trainable': False,
            'visualization': {'color': '#F96020', 'size_hint': 1.0}
        }
    
    def _extract_embedding_layers(self) -> List[Dict[str, Any]]:
        """
        Extract embedding layer information.
        
        Phase 2: Enhanced with positional encoding metadata in parameters.
        """
        layers = []
        hidden_size = getattr(self.config, 'hidden_size', 
                              getattr(self.config, 'd_model', 768))
        vocab_size = getattr(self.config, 'vocab_size', 30522)
        max_position = getattr(self.config, 'max_position_embeddings', 512)
        
        # Token embedding layer
        layer_id = f'layer_{self._layer_index}'
        self._layer_index += 1
        layers.append({
            'id': layer_id,
            'name': 'token_embeddings',
            'type': 'Embedding',
            'index': self._layer_index - 1,
            'input_shape': list(self.input_shape),
            'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'parameters': {
                'vocab_size': vocab_size,
                'embedding_dim': hidden_size,
                'padding_idx': getattr(self.config, 'pad_token_id', 0)
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#9B59B6', 'size_hint': 1.2}
        })
        
        # Position embedding layer - Phase 2: Enhanced metadata
        position_info = self._get_positional_encoding_metadata()
        if position_info['type'] in ['absolute_learned', 'absolute']:
            layer_id = f'layer_{self._layer_index}'
            self._layer_index += 1
            layers.append({
                'id': layer_id,
                'name': 'position_embeddings',
                'type': 'PositionEmbedding',
                'index': self._layer_index - 1,
                'input_shape': [self.input_shape[0], self.input_shape[1]],
                'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
                'parameters': {
                    'max_position': max_position,
                    'embedding_dim': hidden_size,
                    # Phase 2: Full positional encoding metadata
                    'positional_encoding': position_info
                },
                'activation': None,
                'trainable': True,
                'visualization': {'color': '#8E44AD', 'size_hint': 1.0}
            })
        
        # Token type embeddings (BERT-style, if present)
        if getattr(self.config, 'type_vocab_size', 0) > 0:
            layer_id = f'layer_{self._layer_index}'
            self._layer_index += 1
            layers.append({
                'id': layer_id,
                'name': 'token_type_embeddings',
                'type': 'Embedding',
                'index': self._layer_index - 1,
                'input_shape': list(self.input_shape),
                'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
                'parameters': {
                    'vocab_size': self.config.type_vocab_size,
                    'embedding_dim': hidden_size
                },
                'activation': None,
                'trainable': True,
                'visualization': {'color': '#9B59B6', 'size_hint': 0.8}
            })
        
        # Embedding LayerNorm
        layer_id = f'layer_{self._layer_index}'
        self._layer_index += 1
        layers.append({
            'id': layer_id,
            'name': 'embeddings_layernorm',
            'type': 'LayerNorm',
            'index': self._layer_index - 1,
            'input_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'parameters': {
                'normalized_shape': hidden_size,
                'eps': getattr(self.config, 'layer_norm_eps', 
                               getattr(self.config, 'layer_norm_epsilon', 1e-12))
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#3498DB', 'size_hint': 0.8}
        })
        
        # Embedding dropout
        dropout_prob = getattr(self.config, 'hidden_dropout_prob',
                               getattr(self.config, 'dropout', 0.1))
        layer_id = f'layer_{self._layer_index}'
        self._layer_index += 1
        layers.append({
            'id': layer_id,
            'name': 'embeddings_dropout',
            'type': 'Dropout',
            'index': self._layer_index - 1,
            'input_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'output_shape': [self.input_shape[0], self.input_shape[1], hidden_size],
            'parameters': {'p': dropout_prob},
            'activation': None,
            'trainable': False,
            'visualization': {'color': '#B8E986', 'size_hint': 0.6}
        })
        
        return layers
    
    def _extract_encoder_blocks(self) -> List[Dict[str, Any]]:
        """Extract encoder block layers and create grouped block metadata."""
        layers = []
        num_layers = getattr(self.config, 'num_hidden_layers',
                             getattr(self.config, 'n_layer', 12))
        
        for block_idx in range(num_layers):
            block_layers, block_meta = self._extract_transformer_block(
                block_index=block_idx,
                block_type='encoder'
            )
            layers.extend(block_layers)
            self._transformer_blocks.append(block_meta)
        
        return layers
    
    def _extract_decoder_blocks(self) -> List[Dict[str, Any]]:
        """Extract decoder block layers and create grouped block metadata."""
        layers = []
        
        # For encoder-decoder models, use num_decoder_layers
        if self.architecture_type == self.ENCODER_DECODER:
            num_layers = getattr(self.config, 'num_decoder_layers',
                                 getattr(self.config, 'num_hidden_layers', 6))
        else:
            num_layers = getattr(self.config, 'num_hidden_layers',
                                 getattr(self.config, 'n_layer', 12))
        
        for block_idx in range(num_layers):
            block_layers, block_meta = self._extract_transformer_block(
                block_index=block_idx,
                block_type='decoder'
            )
            layers.extend(block_layers)
            self._transformer_blocks.append(block_meta)
        
        return layers
    
    def _extract_transformer_block(
        self,
        block_index: int,
        block_type: str
    ) -> tuple:
        """
        Extract layers from a single transformer block.
        
        Phase 2: Returns both flat layers AND a grouped block with sub_layers.
        
        Each block contains:
        - Self-attention (+ cross-attention for decoder in enc-dec)
        - LayerNorm layers
        - Feed-forward network (MLP)
        
        Args:
            block_index: Index of this block in the stack
            block_type: 'encoder' or 'decoder'
            
        Returns:
            Tuple of (flat_layers_list, block_metadata_dict)
        """
        layers = []
        sub_layers = []  # Phase 2: For grouped block structure
        
        hidden_size = getattr(self.config, 'hidden_size',
                              getattr(self.config, 'd_model', 768))
        num_heads = getattr(self.config, 'num_attention_heads',
                            getattr(self.config, 'n_head', 12))
        intermediate_size = getattr(self.config, 'intermediate_size',
                                    getattr(self.config, 'n_inner', hidden_size * 4))
        
        seq_len = self.input_shape[1]
        batch_size = self.input_shape[0]
        base_shape = [batch_size, seq_len, hidden_size]
        
        block_prefix = f'{block_type}_{block_index}'
        block_id = f'{block_type}_block_{block_index}'
        
        # Determine if this is a causal (decoder) attention
        is_causal = (block_type == 'decoder')
        has_cross_attention = (block_type == 'decoder' and 
                               self.architecture_type == self.ENCODER_DECODER)
        
        # Track layer IDs for residual connections within this block
        block_layer_ids = {
            'block_input': None,  # Layer before self-attention
            'self_attention': None,
            'self_attention_ln': None,
            'cross_attention': None,
            'cross_attention_ln': None,
            'ffn_intermediate': None,
            'ffn_output': None,
            'ffn_ln': None
        }
        
        # --- Self-Attention ---
        layer_id = f'layer_{self._layer_index}'
        block_layer_ids['self_attention'] = layer_id
        self._layer_index += 1
        
        self_attn_layer = {
            'id': layer_id,
            'name': f'{block_prefix}_self_attention',
            'type': 'MultiHeadAttention',
            'index': self._layer_index - 1,
            'input_shape': base_shape,
            'output_shape': base_shape,
            'parameters': {
                'num_heads': num_heads,
                'head_dim': hidden_size // num_heads,
                'hidden_size': hidden_size,
                'attention_type': 'self',
                'is_causal': is_causal,
                'dropout': getattr(self.config, 'attention_probs_dropout_prob',
                                   getattr(self.config, 'attn_pdrop', 0.1))
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#E74C3C', 'size_hint': 1.5},
            # Phase 2: Mark parent block
            'parent_block': block_id
        }
        layers.append(self_attn_layer)
        sub_layers.append({
            'id': layer_id,
            'type': 'MultiHeadAttention',
            'role': 'self_attention'
        })
        
        # --- Attention LayerNorm ---
        layer_id = f'layer_{self._layer_index}'
        block_layer_ids['self_attention_ln'] = layer_id
        self._layer_index += 1
        
        attn_ln_layer = {
            'id': layer_id,
            'name': f'{block_prefix}_attention_layernorm',
            'type': 'LayerNorm',
            'index': self._layer_index - 1,
            'input_shape': base_shape,
            'output_shape': base_shape,
            'parameters': {
                'normalized_shape': hidden_size,
                'eps': getattr(self.config, 'layer_norm_eps',
                               getattr(self.config, 'layer_norm_epsilon', 1e-12))
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#3498DB', 'size_hint': 0.8},
            'parent_block': block_id
        }
        layers.append(attn_ln_layer)
        sub_layers.append({
            'id': layer_id,
            'type': 'LayerNorm',
            'role': 'post_attention_ln'
        })
        
        # --- Cross-Attention (only for decoder in encoder-decoder models) ---
        if has_cross_attention:
            layer_id = f'layer_{self._layer_index}'
            block_layer_ids['cross_attention'] = layer_id
            self._layer_index += 1
            
            cross_attn_layer = {
                'id': layer_id,
                'name': f'{block_prefix}_cross_attention',
                'type': 'MultiHeadAttention',
                'index': self._layer_index - 1,
                'input_shape': base_shape,
                'output_shape': base_shape,
                'parameters': {
                    'num_heads': num_heads,
                    'head_dim': hidden_size // num_heads,
                    'hidden_size': hidden_size,
                    'attention_type': 'cross',
                    'is_causal': False,  # Cross-attention is never causal
                    'dropout': getattr(self.config, 'attention_probs_dropout_prob',
                                       getattr(self.config, 'attn_pdrop', 0.1))
                },
                'activation': None,
                'trainable': True,
                'visualization': {'color': '#C0392B', 'size_hint': 1.5},
                'parent_block': block_id
            }
            layers.append(cross_attn_layer)
            sub_layers.append({
                'id': layer_id,
                'type': 'MultiHeadAttention',
                'role': 'cross_attention'
            })
            
            # Cross-attention LayerNorm
            layer_id = f'layer_{self._layer_index}'
            block_layer_ids['cross_attention_ln'] = layer_id
            self._layer_index += 1
            
            cross_ln_layer = {
                'id': layer_id,
                'name': f'{block_prefix}_cross_attention_layernorm',
                'type': 'LayerNorm',
                'index': self._layer_index - 1,
                'input_shape': base_shape,
                'output_shape': base_shape,
                'parameters': {
                    'normalized_shape': hidden_size,
                    'eps': getattr(self.config, 'layer_norm_eps', 1e-12)
                },
                'activation': None,
                'trainable': True,
                'visualization': {'color': '#3498DB', 'size_hint': 0.8},
                'parent_block': block_id
            }
            layers.append(cross_ln_layer)
            sub_layers.append({
                'id': layer_id,
                'type': 'LayerNorm',
                'role': 'post_cross_attention_ln'
            })
        
        # --- Feed-Forward Network (MLP) ---
        # FFN intermediate (expand)
        layer_id = f'layer_{self._layer_index}'
        block_layer_ids['ffn_intermediate'] = layer_id
        self._layer_index += 1
        
        ffn_int_layer = {
            'id': layer_id,
            'name': f'{block_prefix}_ffn_intermediate',
            'type': 'Linear',
            'index': self._layer_index - 1,
            'input_shape': base_shape,
            'output_shape': [batch_size, seq_len, intermediate_size],
            'parameters': {
                'in_features': hidden_size,
                'out_features': intermediate_size,
                'has_bias': True
            },
            'activation': self._get_hidden_activation(),
            'trainable': True,
            'visualization': {'color': '#2ECC71', 'size_hint': 1.2},
            'parent_block': block_id
        }
        layers.append(ffn_int_layer)
        sub_layers.append({
            'id': layer_id,
            'type': 'FeedForward',
            'role': 'ffn_up'
        })
        
        # FFN output (project back)
        layer_id = f'layer_{self._layer_index}'
        block_layer_ids['ffn_output'] = layer_id
        self._layer_index += 1
        
        ffn_out_layer = {
            'id': layer_id,
            'name': f'{block_prefix}_ffn_output',
            'type': 'Linear',
            'index': self._layer_index - 1,
            'input_shape': [batch_size, seq_len, intermediate_size],
            'output_shape': base_shape,
            'parameters': {
                'in_features': intermediate_size,
                'out_features': hidden_size,
                'has_bias': True
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#27AE60', 'size_hint': 1.0},
            'parent_block': block_id
        }
        layers.append(ffn_out_layer)
        sub_layers.append({
            'id': layer_id,
            'type': 'FeedForward',
            'role': 'ffn_down'
        })
        
        # --- FFN LayerNorm ---
        layer_id = f'layer_{self._layer_index}'
        block_layer_ids['ffn_ln'] = layer_id
        self._layer_index += 1
        
        ffn_ln_layer = {
            'id': layer_id,
            'name': f'{block_prefix}_ffn_layernorm',
            'type': 'LayerNorm',
            'index': self._layer_index - 1,
            'input_shape': base_shape,
            'output_shape': base_shape,
            'parameters': {
                'normalized_shape': hidden_size,
                'eps': getattr(self.config, 'layer_norm_eps',
                               getattr(self.config, 'layer_norm_epsilon', 1e-12))
            },
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#3498DB', 'size_hint': 0.8},
            'parent_block': block_id
        }
        layers.append(ffn_ln_layer)
        sub_layers.append({
            'id': layer_id,
            'type': 'LayerNorm',
            'role': 'post_ffn_ln'
        })
        
        # =================================================================
        # Phase 2: Create grouped block metadata
        # =================================================================
        block_type_name = ('TransformerEncoderBlock' if block_type == 'encoder' 
                           else 'TransformerDecoderBlock')
        
        block_metadata = {
            'id': block_id,
            'type': block_type_name,
            'index': block_index,
            'name': f'{block_type.capitalize()} Block {block_index}',
            
            # Sub-layers for frontend to understand internal structure
            'sub_layers': sub_layers,
            
            # First and last layer IDs for connection purposes
            'first_layer_id': layers[0]['id'] if layers else None,
            'last_layer_id': layers[-1]['id'] if layers else None,
            
            # Phase 2: Explicit attention configuration
            'attention_config': {
                'num_heads': num_heads,
                'head_dim': hidden_size // num_heads,
                'hidden_size': hidden_size,
                'is_causal': is_causal,
                'has_cross_attention': has_cross_attention
            },
            
            # Residual connection info within this block
            # (explicit documentation of where residuals happen)
            'residual_connections': self._get_block_residual_info(
                block_layer_ids, has_cross_attention
            )
        }
        
        return layers, block_metadata
    
    def _get_block_residual_info(
        self, 
        layer_ids: Dict[str, Optional[str]], 
        has_cross_attention: bool
    ) -> List[Dict[str, str]]:
        """
        Generate explicit residual connection info for a transformer block.
        
        Phase 2: Documents the two (or three) residual connections per block:
        1. Around self-attention → to self_attention_ln
        2. Around cross-attention → to cross_attention_ln (if present)
        3. Around FFN → to ffn_ln
        
        Returns:
            List of residual connection descriptors
        """
        residuals = []
        
        # Residual around self-attention:
        # Input to block → added to self-attention output before LayerNorm
        if layer_ids['self_attention'] and layer_ids['self_attention_ln']:
            residuals.append({
                'type': 'attention_residual',
                'around': 'self_attention',
                'from_before': layer_ids['self_attention'],
                'to_after': layer_ids['self_attention_ln'],
                'description': 'Skip connection around self-attention sublayer'
            })
        
        # Residual around cross-attention (if present)
        if has_cross_attention and layer_ids['cross_attention'] and layer_ids['cross_attention_ln']:
            residuals.append({
                'type': 'attention_residual',
                'around': 'cross_attention',
                'from_before': layer_ids['cross_attention'],
                'to_after': layer_ids['cross_attention_ln'],
                'description': 'Skip connection around cross-attention sublayer'
            })
        
        # Residual around FFN:
        # Input to FFN → added to FFN output before LayerNorm
        if layer_ids['ffn_intermediate'] and layer_ids['ffn_ln']:
            residuals.append({
                'type': 'ffn_residual',
                'around': 'feed_forward',
                'from_before': layer_ids['ffn_intermediate'],
                'to_after': layer_ids['ffn_ln'],
                'description': 'Skip connection around feed-forward sublayer'
            })
        
        return residuals
    
    def _extract_output_head(self) -> List[Dict[str, Any]]:
        """Extract output head layers (pooler, classifier, LM head, etc.)"""
        layers = []
        hidden_size = getattr(self.config, 'hidden_size',
                              getattr(self.config, 'd_model', 768))
        vocab_size = getattr(self.config, 'vocab_size', 30522)
        seq_len = self.input_shape[1]
        batch_size = self.input_shape[0]
        
        # Final LayerNorm (common in many models)
        layer_id = f'layer_{self._layer_index}'
        self._layer_index += 1
        layers.append({
            'id': layer_id,
            'name': 'final_layernorm',
            'type': 'LayerNorm',
            'index': self._layer_index - 1,
            'input_shape': [batch_size, seq_len, hidden_size],
            'output_shape': [batch_size, seq_len, hidden_size],
            'parameters': {'normalized_shape': hidden_size},
            'activation': None,
            'trainable': True,
            'visualization': {'color': '#3498DB', 'size_hint': 0.8}
        })
        
        # Architecture-specific heads
        if self.architecture_type == self.ENCODER_ONLY:
            # BERT-style: Pooler for [CLS] token
            layer_id = f'layer_{self._layer_index}'
            self._layer_index += 1
            layers.append({
                'id': layer_id,
                'name': 'pooler',
                'type': 'Linear',
                'index': self._layer_index - 1,
                'input_shape': [batch_size, hidden_size],
                'output_shape': [batch_size, hidden_size],
                'parameters': {
                    'in_features': hidden_size,
                    'out_features': hidden_size,
                    'has_bias': True
                },
                'activation': 'tanh',
                'trainable': True,
                'visualization': {'color': '#50C878', 'size_hint': 1.0}
            })
        else:
            # GPT/T5 style: LM head for next token prediction
            layer_id = f'layer_{self._layer_index}'
            self._layer_index += 1
            layers.append({
                'id': layer_id,
                'name': 'lm_head',
                'type': 'Linear',
                'index': self._layer_index - 1,
                'input_shape': [batch_size, seq_len, hidden_size],
                'output_shape': [batch_size, seq_len, vocab_size],
                'parameters': {
                    'in_features': hidden_size,
                    'out_features': vocab_size,
                    'has_bias': False,
                    'tied_embeddings': self._has_tied_embeddings()
                },
                'activation': None,
                'trainable': True,
                'visualization': {'color': '#50C878', 'size_hint': 1.2}
            })
        
        return layers
    
    # =========================================================================
    # CONNECTION HELPERS
    # =========================================================================
    
    def _build_residual_connections(self) -> List[Dict[str, Any]]:
        """
        Build explicit residual connections from transformer block metadata.
        
        Phase 2: Uses the block-level residual info for explicit connections.
        Residual connections are:
        1. Around self-attention (input → add with attention output)
        2. Around cross-attention if present
        3. Around FFN (post-attention → add with FFN output)
        
        Returns:
            List of residual connection dictionaries with semantic metadata.
        """
        residual_connections = []
        
        # Use the transformer block metadata to generate residuals
        for block in self._transformer_blocks:
            block_id = block['id']
            
            for residual in block.get('residual_connections', []):
                from_layer = residual.get('from_before')
                to_layer = residual.get('to_after')
                
                if from_layer and to_layer:
                    # Find the layer BEFORE the 'from_layer' (the actual residual source)
                    from_idx = next(
                        (i for i, l in enumerate(self.layers_data) if l['id'] == from_layer),
                        None
                    )
                    
                    if from_idx is not None and from_idx > 0:
                        # The residual comes from the layer BEFORE self-attention/FFN
                        actual_from = self.layers_data[from_idx - 1]['id']
                        
                        residual_connections.append({
                            'from_layer': actual_from,
                            'to_layer': to_layer,
                            'connection_type': 'residual',
                            'data_flow': 'forward',
                            # Phase 2: Semantic metadata
                            'residual_type': residual['type'],
                            'around_sublayer': residual['around'],
                            'parent_block': block_id,
                            'description': residual.get('description', '')
                        })
        
        return residual_connections
    
    # =========================================================================
    # POSITIONAL ENCODING
    # =========================================================================
    
    def _get_positional_encoding_metadata(self) -> Dict[str, Any]:
        """
        Phase 2: Enhanced positional encoding classification.
        
        Returns a detailed object describing the positional encoding:
        - type: 'absolute_learned', 'relative_bias', 'rotary', 'sinusoidal', 'alibi'
        - applied_in: Where the encoding is applied ('embedding', 'attention', 'both')
        - Additional type-specific parameters
        """
        pos_type = self._detect_position_encoding_type()
        
        # Base metadata
        metadata = {
            'type': pos_type,
            'max_position': getattr(self.config, 'max_position_embeddings', 512)
        }
        
        # Type-specific details
        if pos_type == 'absolute_learned':
            metadata['applied_in'] = 'embedding'
            metadata['trainable'] = True
            
        elif pos_type == 'rotary':
            metadata['applied_in'] = 'attention'
            metadata['trainable'] = False
            # RoPE-specific params
            if hasattr(self.config, 'rope_scaling'):
                metadata['rope_scaling'] = self.config.rope_scaling
            if hasattr(self.config, 'rotary_dim'):
                metadata['rotary_dim'] = self.config.rotary_dim
            metadata['rotary_pct'] = getattr(self.config, 'rotary_pct', 1.0)
            
        elif pos_type == 'relative_bias':
            metadata['applied_in'] = 'attention'
            metadata['trainable'] = True
            # T5-style relative position params
            metadata['num_buckets'] = getattr(
                self.config, 'relative_attention_num_buckets', 32
            )
            metadata['max_distance'] = getattr(
                self.config, 'relative_attention_max_distance', 128
            )
            
        elif pos_type == 'sinusoidal':
            metadata['applied_in'] = 'embedding'
            metadata['trainable'] = False
            
        elif pos_type == 'alibi':
            metadata['applied_in'] = 'attention'
            metadata['trainable'] = False
        
        return metadata
    
    def _detect_position_encoding_type(self) -> str:
        """
        Detect the type of positional encoding used.
        
        Returns:
            Position encoding type string.
        """
        # Check for ALiBi (Attention with Linear Biases)
        if getattr(self.config, 'alibi', False):
            return 'alibi'
        
        # Check for rotary embeddings (RoPE)
        if hasattr(self.config, 'rope_scaling') or hasattr(self.config, 'rotary_dim'):
            return 'rotary'
        if getattr(self.config, 'rotary_pct', None) is not None:
            return 'rotary'
        
        # Check for relative position bias (T5-style)
        if getattr(self.config, 'relative_attention_num_buckets', None) is not None:
            return 'relative_bias'
        
        # Check for sinusoidal
        if getattr(self.config, 'sinusoidal_pos_embds', False):
            return 'sinusoidal'
        
        # Default: learned absolute positions
        return 'absolute_learned'
    
    # =========================================================================
    # UTILITY METHODS
    # =========================================================================
    
    def _count_parameters(self) -> int:
        """Count total trainable parameters."""
        return sum(p.numel() for p in self.model.parameters() if p.requires_grad)
    
    def _get_hidden_activation(self) -> str:
        """Get the hidden activation function from config."""
        hidden_act = getattr(self.config, 'hidden_act',
                             getattr(self.config, 'activation_function', 'gelu'))
        
        # Normalize activation name
        if callable(hidden_act):
            return 'gelu'  # Default for function references
        
        return str(hidden_act).lower()
    
    def _has_tied_embeddings(self) -> bool:
        """Check if input/output embeddings are tied."""
        return getattr(self.config, 'tie_word_embeddings', True)
    
    def _get_activation_function(self, module: Any) -> Optional[str]:
        """Determine activation function for a layer."""
        import torch.nn as nn
        
        activation_map = {
            nn.ReLU: 'relu',
            nn.GELU: 'gelu',
            nn.SiLU: 'silu',
            nn.Tanh: 'tanh',
            nn.Sigmoid: 'sigmoid',
        }
        
        for act_class, act_name in activation_map.items():
            if isinstance(module, act_class):
                return act_name
        
        return None


# =========================================================================
# UTILITY FUNCTION
# =========================================================================

def extract_transformer_model(
    model_name_or_path: str,
    device: str = 'cpu'
) -> Dict[str, Any]:
    """
    Quick utility to extract HuggingFace transformer model.
    
    Args:
        model_name_or_path: HuggingFace model identifier or local path
        device: Device to use ('cpu' or 'cuda')
        
    Returns:
        Extraction dictionary compatible with UniversalConverter.
    """
    from transformers import AutoModel
    
    model = AutoModel.from_pretrained(model_name_or_path)
    extractor = TransformerExtractor(model=model, device=device)
    return extractor.extract()
