import * as tf from '@tensorflow/tfjs';

export async function loadModel() {
    const modelUrl = '/models/pretrainedModel.json';
    const model = await tf.loadLayersModel(modelUrl);
    return model;
}

export function prepareModelForVisualization(model) {
    const layers = model.layers.map(layer => ({
        name: layer.name,
        type: layer.constructor.name,
        outputShape: layer.outputShape,
        params: layer.countParams(),
    }));
    return layers;
}