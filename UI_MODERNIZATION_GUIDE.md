# WhyteBox UI Modernization Implementation Guide

## 🎯 Overview

This guide provides step-by-step instructions for implementing the modernized WhyteBox UI with Tailwind CSS, WebSocket support, and advanced features.

## 📋 Prerequisites

1. **Backend Dependencies:**
   ```bash
   pip install flask-socketio python-socketio
   ```

2. **Frontend Dependencies:**
   - Tailwind CSS (CDN - no installation needed)
   - BabylonJS (already included)

## 🚀 Quick Start

### Step 1: Install WebSocket Support

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `flask-socketio>=5.3.0`
- `python-socketio>=5.9.0`

### Step 2: Enable WebSocket in Backend

Add to `backend/api/app.py`:

```python
from backend.api.websocket_handler import init_socketio

# After creating Flask app
app = Flask(__name__)
CORS(app)

# Initialize WebSocket
socketio = init_socketio(app)

# Change app.run() to socketio.run()
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=False)
```

### Step 3: Use the Modernized UI

The new UI is available at:
```
http://localhost:8000/frontend/examples/visualize-model-v2.html
```

Or continue using the original:
```
http://localhost:8000/frontend/examples/visualize-model.html
```

## 🎨 Key Features Implemented

### 1. Toast Notification System

**Usage in JavaScript:**
```javascript
showToast('Model loaded successfully!', 'success');
showToast('Failed to load model', 'error');
showToast('Processing...', 'info');
showToast('Check your input', 'warning');
```

**Types:**
- `success` - Green with ✅
- `error` - Red with ❌
- `warning` - Yellow with ⚠️
- `info` - Blue with ℹ️

### 2. Enhanced Loading Indicators

**Show loading with progress:**
```javascript
showLoading('Loading model...', 10);
updateProgress(50, 'Processing layers...');
updateProgress(100, 'Complete!');
hideLoading();
```

**Features:**
- Animated spinner
- Progress bar (0-100%)
- Dynamic status messages
- Smooth transitions

### 3. Tabbed Interface

**Three main tabs:**

1. **Models Tab**
   - Browse available models
   - View model information
   - Toggle visualization options

2. **XAI Tab**
   - Upload images
   - Run explainability methods
   - Select colormaps
   - Compare methods

3. **Advanced Tab**
   - WebSocket controls
   - Video inference
   - Export options
   - Performance settings

### 4. WebSocket Real-Time Updates

**Frontend Connection:**
```javascript
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:5001/ws');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWSMessage(data);
    };
}
```

**Backend Usage:**
```python
from backend.api.websocket_handler import send_progress, send_result

# Send progress updates
send_progress(25, 'Loading model...')
send_progress(50, 'Processing...')
send_progress(100, 'Complete!')

# Send results
send_result('inference', {'predictions': [...]})
```

**Message Types:**
- `progress` - Progress updates (0-100%)
- `result` - Task results
- `error` - Error messages
- `model_update` - Model information updates
- `frame_result` - Video frame results

### 5. Modal System

**XAI Results Modal:**
- Side-by-side image comparison
- Prediction confidence bars
- Method information
- Close on ESC or background click

**Settings Modal:**
- Backend URL configuration
- Theme selection
- Preference management

### 6. Export & Session Management

**Export Visualization:**
```javascript
exportVisualization(); // Saves as PNG
```

**Save/Load Session:**
```javascript
saveSession();  // Exports JSON with model + settings
loadSession();  // Restores previous session
```

**Session Format:**
```json
{
    "model": {
        "modelPath": "vgg16",
        "framework": "pytorch",
        "name": "vgg16"
    },
    "timestamp": "2026-02-24T18:00:00.000Z",
    "settings": {
        "showLabels": true,
        "showConnections": true,
        "colormap": "jet",
        "lazyLoad": true,
        "gpuAcceleration": true
    }
}
```

## 🔧 Backend Integration Examples

### Example 1: Long-Running Task with Progress

```python
from backend.api.websocket_handler import ProgressTracker

@app.route('/api/train', methods=['POST'])
def train_model():
    with ProgressTracker('Model Training', total_steps=5) as tracker:
        tracker.update('Loading data...')
        # Load data
        
        tracker.update('Preprocessing...')
        # Preprocess
        
        tracker.update('Training...')
        # Train model
        
        tracker.update('Evaluating...')
        # Evaluate
        
        tracker.update('Saving...')
        # Save results
    
    return jsonify({'status': 'success'})
```

### Example 2: Video Frame Processing

```python
from backend.api.websocket_handler import send_frame_result

@app.route('/api/video/inference', methods=['POST'])
def video_inference():
    video = request.files['video']
    total_frames = get_frame_count(video)
    
    for frame_num in range(total_frames):
        frame = extract_frame(video, frame_num)
        result = model.predict(frame)
        
        send_frame_result(
            frame_number=frame_num + 1,
            total_frames=total_frames,
            result_data=result
        )
    
    return jsonify({'status': 'complete'})
```

### Example 3: Real-Time Model Updates

```python
from backend.api.websocket_handler import send_model_update

@app.route('/api/models/<model_name>/load', methods=['POST'])
def load_model(model_name):
    model = load_pytorch_model(model_name)
    
    send_model_update({
        'name': model_name,
        'layers': len(model.layers),
        'parameters': count_parameters(model),
        'framework': 'pytorch'
    })
    
    return jsonify({'status': 'loaded'})
```

## 🎨 Styling Guide

### Color Palette

```css
primary: #667eea     /* Purple-blue */
secondary: #764ba2   /* Deep purple */
accent: #48c6ef      /* Cyan */
success: #4ade80     /* Green */
error: #ef4444       /* Red */
warning: #fbbf24     /* Yellow */
info: #3b82f6        /* Blue */
```

### Tailwind Classes

**Buttons:**
```html
<button class="px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition transform hover:-translate-y-0.5">
    Click Me
</button>
```

**Cards:**
```html
<div class="bg-white rounded-2xl shadow-2xl p-6">
    Card content
</div>
```

**Glass Effect:**
```html
<div class="glass-effect text-white px-4 py-3 rounded-lg">
    Glass morphism
</div>
```

## 🧪 Testing

### Test WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:5001/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
```

### Test Toast Notifications

```javascript
// In browser console
showToast('Test success', 'success');
showToast('Test error', 'error');
showToast('Test warning', 'warning');
showToast('Test info', 'info');
```

### Test Progress Updates

```javascript
// In browser console
showLoading('Testing...', 0);
setTimeout(() => updateProgress(50, 'Halfway...'), 1000);
setTimeout(() => updateProgress(100, 'Done!'), 2000);
setTimeout(() => hideLoading(), 3000);
```

## 📊 Performance Considerations

### Lazy Loading

Enable in Advanced tab to load large models progressively:
```javascript
document.getElementById('toggleLazyLoad').checked = true;
```

### GPU Acceleration

Enable WebGL-based rendering:
```javascript
document.getElementById('toggleGPU').checked = true;
```

### Model Caching

Backend automatically caches loaded models in memory to avoid reloading.

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Problem:** Cannot connect to WebSocket  
**Solution:**
1. Ensure `flask-socketio` is installed
2. Check backend is running with `socketio.run()` not `app.run()`
3. Verify port 5001 is not blocked by firewall

### Toast Notifications Not Showing

**Problem:** Toasts don't appear  
**Solution:**
1. Check `toastContainer` div exists in HTML
2. Verify Tailwind CSS is loaded
3. Check browser console for JavaScript errors

### Progress Bar Not Updating

**Problem:** Progress bar stuck at 0%  
**Solution:**
1. Ensure `updateProgress()` is called with correct values
2. Check CSS transitions are not disabled
3. Verify `loadingProgress` element exists

### Modal Won't Close

**Problem:** Modal stays open  
**Solution:**
1. Check ESC key handler is registered
2. Verify background click handler is attached
3. Ensure modal close functions are defined

## 🔄 Migration from Old UI

### Gradual Migration

1. **Keep both versions:** Old UI at `visualize-model.html`, new at `visualize-model-v2.html`
2. **Test features:** Verify all functionality works in new UI
3. **Update links:** Change default link in `start.sh` when ready
4. **Remove old:** Delete old UI file after migration complete

### Feature Parity Checklist

- [ ] Model loading works
- [ ] 3D visualization renders correctly
- [ ] XAI methods produce results
- [ ] Image upload functions
- [ ] Export works
- [ ] Settings persist
- [ ] WebSocket connects
- [ ] All buttons functional

## 📚 Additional Resources

- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **Flask-SocketIO Docs:** https://flask-socketio.readthedocs.io/
- **BabylonJS Docs:** https://doc.babylonjs.com/

## 🎯 Next Steps

1. **Test WebSocket:** Verify real-time updates work
2. **Add Attention Viz:** Implement Transformer attention visualization
3. **Video Support:** Complete video inference pipeline
4. **Mobile Optimize:** Make UI responsive for tablets/phones
5. **Dark Mode:** Add theme switching capability

---

**Last Updated:** 2026-02-24  
**Version:** 2.0  
**Status:** Ready for implementation