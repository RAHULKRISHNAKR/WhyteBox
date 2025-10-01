import { relu, sigmoid, randomArray } from './utils.js';

export class Network {
  constructor({ inputSize, hiddenSize, outputSize }) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    // Random weights: input->hidden (hiddenSize x inputSize)
    this.w1 = Array.from({ length: hiddenSize }, () => randomArray(inputSize));
    this.b1 = randomArray(hiddenSize);
    // hidden->output (outputSize x hiddenSize)
    this.w2 = Array.from({ length: outputSize }, () => randomArray(hiddenSize));
    this.b2 = randomArray(outputSize);
  }

  forward(inputVec) {
    // Hidden pre-activation z1[j] = sum_i w1[j][i]*x[i] + b1[j]
    const z1 = this.w1.map((weights, j) => {
      let sum = this.b1[j];
      for (let i = 0; i < weights.length; i++) sum += weights[i] * inputVec[i];
      return sum;
    });
    const h = z1.map(relu);
    // Output layer
    const z2 = this.w2.map((weights, k) => {
      let sum = this.b2[k];
      for (let j = 0; j < weights.length; j++) sum += weights[j] * h[j];
      return sum;
    });
    const o = z2.map(sigmoid);
    return { input: inputVec, hidden: h, output: o };
  }

  randomInput() { return randomArray(this.inputSize); }
}
