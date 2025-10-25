import torch
import torch.nn as nn
import torchvision
import torchvision.models as models
import torchvision.transforms as transforms

import timm
from transformers import AutoImageProcessor, AutoModelForImageClassification
from transformers.utils.fx import symbolic_trace

import inspect
from PIL import Image


#
# Load models
#

def ReLU_inplace_to_False(module):
    # https://stackoverflow.com/questions/74124725/setting-relu-inplace-to-false
    for layer in module._modules.values():
        if isinstance(layer, nn.ReLU):
            layer.inplace = False
        ReLU_inplace_to_False(layer)
    #for layer in module._modules.values():
    #    if hasattr(layer, "inplace"):
    #        layer.inplace = False
    #    ReLU_inplace_to_False(layer)

def load_torchvision_model(model_name, numbering):
    if model_name == "googlenet":
        model = models.googlenet(weights=None, aux_logits=False)
    elif model_name == "resnet18":
        model = models.resnet18(weights=None)
    elif model_name == "alexnet":
        model = models.alexnet(weights=None)
    elif model_name == "vgg16":
        model = models.vgg16(weights=None)
    else:
        print("Unsupported model name!")
        return None

    weight_file = f"weights/{model_name}_{numbering}_weights.pth"
    model.load_state_dict(torch.load(weight_file))
    model.eval()

    data_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    return model, data_transforms

def load_model(model_name):
    if model_name in dir(models):
        model, processor = load_torchvision_model(model_name, 0)
        model.eval()
        ReLU_inplace_to_False(model)
        return model, processor, False

    is_transformers = True
    try:
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModelForImageClassification.from_pretrained(model_name)
    except Exception as e:
        print(e)
        print("Not supported by transformers, try timm")

        if model_name.startswith("timm/"):
            model = timm.create_model(model_name, pretrained=True)
            data_config = timm.data.resolve_model_data_config(model)
            processor = timm.data.create_transform(**data_config, is_training=False)
            is_transformers = False
        else:
            raise Exception("model must be supported by transformers or timm")

    model.eval()
    ReLU_inplace_to_False(model)
    return model, processor, is_transformers

#
# Trace models
#
def trace_model(model, is_transformers):
    if is_transformers:
        input_names = [inspect.getfullargspec(model.forward)[0][1]]
        traced = symbolic_trace(model, input_names=input_names, disable_check=True)
    else:
        traced = torch.fx.symbolic_trace(model)
    graph = traced.graph
    return graph

def prune_graph(graph):
    seen = []
    def add_args_flow(node, flow):
        if node in seen:
            return []

        if isinstance(node, torch.fx.node.Node) and node not in flow:
            flow = flow + [node]

        if isinstance(node, list) or isinstance(node, tuple):
            for n in node:
                flow = flow + add_args_flow(n, [])
        elif isinstance(node, dict):
            for k in node:
                flow = flow + add_args_flow(node[k], [])
        elif isinstance(node, torch.fx.node.Node):
            for n in node.args:
                flow = flow + add_args_flow(n, [])
            for n in node.kwargs:
                if isinstance(node.kwargs[n], torch.fx.node.Node):
                    flow = flow + add_args_flow(node.kwargs[n], [])
        seen.append(node)
        return flow

    for last_node in reversed(graph.nodes):
        flow = add_args_flow(last_node, [])
        break

    for node in reversed(graph.nodes):
        if node not in flow:
            graph.erase_node(node)
    return graph





