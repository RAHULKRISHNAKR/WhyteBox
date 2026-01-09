
@app.route('/api/explainability', methods=['POST'])
def explainability():
    """
    Generate explainability heatmap (Grad-CAM or Saliency Map)
    
    Expected form data:
    - image: Image file
    - model_path: Path to model file (relative to UPLOAD_FOLDER)
    - framework: 'pytorch' or 'keras'
    - method: 'gradcam' or 'saliency'
    - target_class: Optional int (uses top prediction if not provided)
    - target_layer: Optional string (auto-detects if not provided)
    """
    try:
        # Validate request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        if 'model_path' not in request.form:
            return jsonify({'error': 'No model_path provided'}), 400
            
        if 'framework' not in request.form:
            return jsonify({'error': 'No framework specified'}), 400
            
        method = request.form.get('method', 'gradcam').lower()
        if method not in ['gradcam', 'saliency']:
            return jsonify({'error': f'Invalid method: {method}. Must be gradcam or saliency'}), 400
            
        framework = request.form['framework'].lower()
        model_path = request.form['model_path']
        image_file = request.files['image']
        
        logger.info(f"Generating {method} for {framework} model: {model_path}")
        
        # Construct full model path
        full_model_path = os.path.join(app.config['UPLOAD_FOLDER'], model_path)
        if not os.path.exists(full_model_path):
            return jsonify({'error': f'Model file not found: {model_path}'}), 404
            
        # Load model
        if framework == 'pytorch':
            import torch
            model = torch.load(full_model_path, map_location='cpu')
            model.eval()
        else:
            return jsonify({'error': f'Framework {framework} not yet supported for explainability'}), 400
            
        # Preprocess image
        preprocessor = ImagePreprocessor()
        input_shape = request.form.get('input_shape', '(224, 224)')
        try:
            input_shape = eval(input_shape)
        except:
            input_shape = (224, 224)
            
        processed_image, original_image = preprocessor.preprocess_image(
            image_file,
            target_size=input_shape,
            framework=framework
        )
        
        # Run inference to get predictions
        with torch.no_grad():
            output = model(processed_image)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            top5_prob, top5_indices = torch.topk(probabilities, 5)
            
        # Get target class
        target_class = request.form.get('target_class')
        if target_class is None:
            target_class = top5_indices[0].item()  # Use top prediction
        else:
            target_class = int(target_class)
            
        # Get predictions for context
        predictions = []
        for prob, idx in zip(top5_prob, top5_indices):
            predictions.append({
                'class_index': idx.item(),
                'confidence': float(prob.item())
            })
            
        # Generate explainability heatmap
        if method == 'gradcam':
            generator = GradCAMGenerator(model, framework=framework)
            target_layer_name = request.form.get('target_layer')
            
            # Get target layer object if name provided
            target_layer = None
            if target_layer_name:
                # Try to find layer by name
                for name, module in model.named_modules():
                    if name == target_layer_name:
                        target_layer = module
                        break
                        
            heatmap = generator.generate(
                processed_image,
                target_class=target_class,
                target_layer=target_layer
            )
            
            # Get actual target layer name
            if target_layer is None:
                target_layer = generator._find_last_conv_layer_pytorch()
                # Find name of this layer
                target_layer_name = None
                for name, module in model.named_modules():
                    if module is target_layer:
                        target_layer_name = name
                        break
                        
        elif method == 'saliency':
            generator = SaliencyMapGenerator(model, framework=framework)
            heatmap = generator.generate(
                processed_image,
                target_class=target_class
            )
            target_layer_name = None  # Not applicable for saliency
            
        # Serialize heatmap
        original_h, original_w = original_image.shape[:2]
        heatmap_data = serialize_heatmap(heatmap, (original_h, original_w))
        
        # Build response
        response = {
            'success': True,
            'method': method,
            'framework': framework,
            'heatmap': heatmap_data,
            'target_class': target_class,
            'target_layer': target_layer_name,
            'predictions': predictions
        }
        
        logger.info(f"Generated {method} heatmap for class {target_class}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error generating explainability: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


