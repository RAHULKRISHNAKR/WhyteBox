import torch
import torchvision
from torchvision.models import (alexnet, vgg16, googlenet, resnet50, resnet101, densenet121,
                                mobilenet_v2, efficientnet_b1, resnet18, 
                                # vit_base_patch16_224, 
                                AlexNet_Weights, VGG16_BN_Weights, VGG16_Weights,
                                GoogLeNet_Weights, ResNet101_Weights, ResNet50_Weights,
                                DenseNet121_Weights, MobileNet_V2_Weights, EfficientNet_B1_Weights,
                                ResNet18_Weights,
                                ViT_B_16_Weights)

# Create a dictionary of available models and their weights
model_dict = {
    'alexnet': (alexnet, [AlexNet_Weights.IMAGENET1K_V1]),
    'vgg16': (vgg16, [VGG16_Weights.IMAGENET1K_V1, VGG16_BN_Weights.IMAGENET1K_V1]),
    'googlenet': (googlenet, [GoogLeNet_Weights.IMAGENET1K_V1]),
    'resnet50': (resnet50, [ResNet50_Weights.IMAGENET1K_V1, ResNet50_Weights.IMAGENET1K_V2]),
    'resnet101': (resnet101, [ResNet101_Weights.IMAGENET1K_V1, ResNet101_Weights.IMAGENET1K_V2]),
    'densenet': (densenet121, [DenseNet121_Weights.IMAGENET1K_V1]),
    'mobilenet': (mobilenet_v2, [MobileNet_V2_Weights.IMAGENET1K_V1, MobileNet_V2_Weights.IMAGENET1K_V2]),
    'efficientnet': (efficientnet_b1, [EfficientNet_B1_Weights.IMAGENET1K_V1, EfficientNet_B1_Weights.IMAGENET1K_V2]),
    'resnet18': (resnet18, [ResNet18_Weights.IMAGENET1K_V1])
    # 'vit': (vit_base_patch16_224, [ViT_B_16_Weights.IMAGENET1K_V1])
}

# Function to get a model
def get_model(model_name, weight_version):
    if model_name in model_dict:
        # Initialize the model with the requested pre-trained weights
        model_func, weight_options = model_dict[model_name]
        model = model_func(weights=weight_options[weight_version])
        return model
    else:
        print(f"The model {model_name} is not available. Please check the model name.")
        return None

# Function to save model weights
def save_model_weights(model, model_name):
    # Save the model weights in the current directory
    torch.save(model.state_dict(), f"weights/{model_name}_weights.pth")

# Get user input
# model_name = input("Enter the model name: ")
# weight_version = int(input("Enter the weight version number (starting from 0): "))

# get all models
models = ["alexnet", "vgg16", "googlenet", "resnet18"]

for model_name in models:
    weight_version = 0
    # Get the model
    model = get_model(model_name, weight_version)
    if model:
        print(model)
        # Save the model weights
        save_model_weights(model, model_name+'_'+str(weight_version))
