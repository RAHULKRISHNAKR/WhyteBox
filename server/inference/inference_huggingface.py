import torch
import torch.nn as nn
import torchvision
import torchvision.models as models
import torchvision.transforms as transforms

import timm
from transformers import AutoConfig, AutoImageProcessor, AutoModelForImageClassification
from transformers.utils.fx import symbolic_trace

import os
import json
import inspect
import operator
import numpy as np
from PIL import Image

#
# model, graph, and hook functions
#
def load_model(model_name):
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
    return model, processor, is_transformers

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

def get_layer_from_str(model, string):
    keys = string.split('.')
    layer = model
    for key in keys:
        layer = layer.__getattr__(key)
    return layer

def hook_fn(m, i, o):
    for node in global_graph.nodes:
        if node.layer == m:
            node.input = i[0].squeeze(0).detach().clone().cpu().numpy()
            node.output = o[0].detach().clone().cpu().numpy()

def check_hook(module):
    if not hasattr(module, "_modules"):
        return True
    if isinstance(module, nn.Sequential):
        return False
    for node in global_graph.nodes:
        if node.layer == module:
            return True
    return False


def hook_all_layers(net, name=""):
    for lname, layer in net._modules.items():
        if not check_hook(layer):
            hook_all_layers(layer)
        else:
            layer.handle = layer.register_forward_hook(hook_fn)

def ReLU_inplace_to_False(module):
    for layer in module._modules.values():
        if hasattr(layer, "inplace"):
            layer.inplace = False
        ReLU_inplace_to_False(layer)

#
# layer class dictionary and functions
#
layer_dict = {
        "conv": [nn.Conv2d],
        "bn": [nn.BatchNorm2d],
        "relu": [nn.ReLU, nn.functional.relu],
        "maxpool": [nn.MaxPool2d],
        "avgpool": [nn.AdaptiveAvgPool2d],
        "flatten": [nn.Flatten, torch.flatten],
        "cat": [torch.cat],
        "linear": [nn.Linear],
        "add": [operator.add],
        "ignore": [nn.Dropout, nn.Identity]
        }

def check_layer(layer):
    layer_class = type(layer)
    for k in layer_dict:
        if layer in layer_dict[k] or layer_class in layer_dict[k]:
            return k

#
# graph node traversal and property functions
#
def get_prev(target_node, graph):
    prev_node = None
    for node in graph.nodes:
        if node == target_node:
            return prev_node
        prev_node = node

def get_next(target_node, graph):
    prev_node = None
    for node in graph.nodes:
        if prev_node == target_node:
            return node 
        prev_node = node
    return None

def get_first(nodes, graph):
    for node in graph.nodes:
        if node in nodes:
            return node

def get_last(nodes, graph):
    for node in reversed(graph.nodes):
        if node in nodes:
            return node

def get_first_arg(target_node, graph):
    return get_first(target_node.args)

def get_args_meet(target_node, graph):
    if target_node.layer_type == "cat":
        arg_pointers = [arg for arg in target_node.args[0]]
    else:
        arg_pointers = [arg for arg in target_node.args]
    
    initial_len = len(set(arg_pointers))
    while len(set(arg_pointers)) != 1:
        last_node = get_last(arg_pointers, graph)
        for arg in last_node.args:
            arg_pointers.append(arg)
        arg_pointers.remove(last_node)
    return arg_pointers[0]

def get_last_conv_before(target_node, graph):
    start = False
    for node in reversed(graph.nodes):
        if node == target_node:
            start = True
        if start and node.layer_type == "conv":
            return node

def next_relu_or_maxpool_if_exist(target_node, graph):
    next_node = get_next(target_node, graph)
    if next_node.layer_type in ["relu", "maxpool"]:
        return next_node
    else:
        return target_node

def next_type(target_node, graph, layer_type):
    start = False
    for node in graph.nodes:
        if node == target_node:
            start = True
        if start and node.layer_type == layer_type:
            return node

def next_flatten_if_exist(target_node, graph):
    next_node = get_next(target_node, graph)
    if next_node.layer_type in ["flatten"]:
        return next_node
    else:
        return target_node

def next_until_fc_or_relu(target_node, graph):
    start = False
    prev_node = None
    for node in graph.nodes:
        if node == target_node:
            start = True
        if start and node.layer_type not in ["linear", "relu", "ignore"]:
            return prev_node
        prev_node = node

def check_last_linear(target_node, graph):
    for i, node in enumerate(reversed(graph.nodes)):
        if i > 2: break
        if node == target_node and node.layer_type == "linear":
            return node

def set_module(start_node, end_node, module, graph):
    start = False
    for node in graph.nodes:
        if node == start_node:
            start = True
        if start:
            if "module" in dir(node):
                print(f"node {node.name} already has module set to {node.module} but trying to assign {module}")
                fill_ignore(graph)
                print_graph(graph)
                quit()
            if node.layer_type not in ["ignore"]:
                node.module = module
        if start and node == end_node:
            break

def set_input(target_node, graph):
    prev_node = None
    for node in graph.nodes:
        if node == target_node and "output" in dir(prev_node):
            node.input = prev_node.output 
        prev_node = node

def set_output(target_node, graph):
    next_node = None
    for node in reversed(graph.nodes):
        if node == target_node:
            node.output = next_node.input
        next_node = node

def fill_ignore(graph):
    for node in graph.nodes:
        if "module" not in dir(node):
            node.module = "ignore"

#
# module functions
#
def check_module(graph):
    conv_i = 0
    residual_i = 0
    inception_i = 0
    avgpool_i = 0
    linear_i = 0
    for node in graph.nodes:
        if node.layer_type == "add":
            start = get_next(get_args_meet(node, graph), graph)
            end = next_relu_or_maxpool_if_exist(node, graph)
            set_module(start, end, f"residual_{residual_i}", graph)
            residual_i += 1
        if node.layer_type == "cat":
            start = get_next(get_args_meet(node, graph), graph)
            end = next_relu_or_maxpool_if_exist(node, graph)
            set_module(start, end, f"inception_{inception_i}", graph)
            inception_i += 1
        if node.layer_type == "avgpool":
            start = node
            end = next_flatten_if_exist(node, graph)
            set_module(start, end, f"avgpool_{avgpool_i}", graph)
            avgpool_i += 1
        if node.layer_type == "linear" and "module" not in dir(node):
            start = node
            end = next_until_fc_or_relu(node, graph)
            set_module(start, end, f"linear_{linear_i}", graph)
            linear_i += 1

    for node in graph.nodes:
        if node.layer_type == "conv" and "module" not in dir(node): 
            start = node
            end = next_type(node, graph, "maxpool")
            set_module(start, end, f"conv_{conv_i}", graph)
            conv_i += 1

    fill_ignore(graph)

def add_missing_inout(graph):
    for node in global_graph.nodes:
        if node.layer_type in ["relu"] and "input" not in dir(node):
            set_input(node, global_graph)
            # run directly due to F.relu-cat sequence
            node.output = node.layer(torch.Tensor(node.input))

    for node in global_graph.nodes:
        if node.layer_type in ["add", "cat"]:
            set_output(node, global_graph)
        if node.layer_type in ["flatten"]:
            set_input(node, global_graph)
            set_output(node, global_graph)
#
# utility functions
#
def print_graph(graph):
    for node in graph.nodes:
        print(f"{node.module}\t{node.layer_type}\t{node.name}\t{node.layer}\t{node.args}")

def get_transformed(data_dir, log_dir, processor):
    img = Image.open(data_dir)
    data = processor(img)#, return_tensors="pt")
    img.save(os.path.join(log_dir, 'image.png'))
    img.getchannel("R").save(os.path.join(log_dir, f'image_r.png'))
    img.getchannel("G").save(os.path.join(log_dir, f'image_g.png'))
    img.getchannel("B").save(os.path.join(log_dir, f'image_b.png'))
    return data


#
# main
#
def main(log_dir, data_dir, model_name):
    model, processor, is_transformers = load_model(model_name)
    ReLU_inplace_to_False(model)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    os.makedirs(log_dir, exist_ok=True)
    inputs = get_transformed(data_dir, log_dir, processor)
    
    global global_graph 
    global_graph = trace_model(model, is_transformers)
    global_graph.print_tabular()

    global_graph = prune_graph(global_graph)

    for node in global_graph.nodes:
        if node.op not in ["placeholder", "output"] and type(node.target) == str:
            layer = get_layer_from_str(model, node.target)
        else:
            layer = node.target
        node.layer = layer
        node.layer_type = check_layer(node.layer)

    check_module(global_graph)
    # print_graph(global_graph)

    hook_all_layers(model)
    
    model.to(device)
    with torch.no_grad():
        
        if is_transformers:
            for k in inputs:
                inputs[k] = inputs[k].to(device)
            outputs = model(**inputs)
        else:
            inputs = inputs.to(device)
            inputs = inputs.unsqueeze(0)
            outputs = model(inputs)

        predicted_label = outputs.argmax(-1).item()
        print(predicted_label)

    add_missing_inout(global_graph)

    # INDEXING
    for node in global_graph.nodes:
        if node.op in ["placeholder", "output"]: continue

        if node.layer_type == "linear":
            node.input_index = range(min(node.input.shape[0], 1024))
            node.output_index =range(min(node.output.shape[0], 1024))
            # last layer : add softmax prob and top-5 index
            if check_last_linear(node, global_graph):
                node.top5 = (-node.output).argsort()[:5]
                y = np.exp(node.output - np.max(node.output))
                softmax_output = y / np.sum(np.exp(node.output)) * np.exp(np.max(node.output))
                node.softmax_output = softmax_output.tolist()
        elif node.layer_type in ["relu", "bn", "maxpool", "avgpool", "flatten", "ignore"]:
            node.input_index = node.args[0].output_index
            node.output_index = node.input_index
        elif node.layer_type in ["add"]:
            node.output_index = node.args[0].output_index
        elif node.layer_type in ["cat"]:
            node.output_index = node.args[0][0].output_index
        elif node.layer_type in ["conv"]:
            # input index: first 8 or get previous output index
            prev_node = node.args[0]
            if "output_index" in dir(prev_node):
                node.input_index = prev_node.output_index
            else:
                node.input_index = range(min(node.input.shape[0], 8))

            # output index: sample max abs mean activation channel
            oisize = min(node.output.shape[0], 8)
                
            # activation layer type TODO: add models
            if model_name == "googlenet":
                activation_node = next_type(node, global_graph, "bn")
            else:
                activation_node = next_type(node, global_graph, "relu")
            
            if activation_node:
                activation = activation_node.output
                avg_activation = np.abs(np.mean(activation, axis=(1, 2)))
                node.output_index = (-avg_activation).argsort()[:oisize]
            else:
                node.output_index = range(oisize)


    # apply index for identity in residual
    for node in global_graph.nodes:
        if node.layer_type == "add":
            node.identity = node.args[1].output[node.output_index].tolist()

    # apply index
    for node in global_graph.nodes:
        if "input" in dir(node) and "input_index" in dir(node):
            node.input_index = np.array(node.input_index)
            node.input = node.input[node.input_index].tolist()
            node.input_index = node.input_index.tolist()
        if "output" in dir(node) and "output_index" in dir(node):
            node.output_index = np.array(node.output_index)
            node.output = node.output[node.output_index].tolist()
            node.output_index = node.output_index.tolist()

    # layer metadata
    for node in global_graph.nodes:
        if node.layer_type in ["conv", "bn", "maxpool", "avgpool"]:
            metadata = {k:node.layer.__dict__[k] for k in node.layer.__dict__ \
                if k not in ["_parameters", "_modules"] and "hook" not in k \
                and "handle" not in k and "buffer" not in k}
            node.metadata = metadata


    order_i = 0
    module_i = -1
    layer_i = 0
    prev_module = None
    module_list = []
    info = {}
    for node in global_graph.nodes:
        if node.op in ["placeholder", "output"] or node.module in ["ignore"]: continue

        if prev_module != node.module:
            module_list.append(node.module.split("_")[0])
            module_i += 1
            layer_i = 0

        info[node.name] = {
                'order_index': order_i,
                'module_name': node.module.split("_")[0], 
                'module_index': module_i, 
                'layer_index': layer_i,
                'layer_type': node.layer_type,
                'arguments': 0, #node.layer.argument...,
                'class': str(type(node))
                }
        
        keys = ["input", "output", "input_index", "output_index", "softmax_output", "identity", "top5", "metadata"]
        for k in keys:
            if k in dir(node):
                info[node.name][k] = node.__getattribute__(k)

        order_i += 1
        layer_i += 1
        prev_module = node.module

    #for k in info:
    #    print(f"{info[k]['module_index']} , {info[k]['layer_index']}, {k}, {info[k]['layer_type']} ,{info[k]['module_name']} ")
    #    if 'input_index' in info[k]: print(f"input index: {info[k]['input_index']}")
    #    if 'output_index' in info[k]: print(f"output index: {info[k]['output_index']}")

    info['structure'] = module_list

    for k in info:
        for kk in info[k]:
            if isinstance(info[k], dict) and isinstance(info[k][kk], np.ndarray):
                info[k][kk] = info[k][kk].tolist()

    with open(os.path.join(log_dir, model_name.replace("/","__")+'_info.json'), "w") as f:
        json.dump(info, f)
    print()

def get_imagenet_data():
    images = []
    path = "./imagenet-sample-images"
    for fname in sorted(os.listdir(path)):
        if fname.endswith(".JPEG"):
            images.append(os.path.join(path, fname))
    return images

if __name__ == "__main__":
    from tqdm import tqdm
    imagenet_data = get_imagenet_data()[:1]

    # torchvision
    # model must be able to be traced
    # alexnet, vgg, inception 
    models = ["alexnet", "vgg16", "googlenet"]

    # transformers
    # resnet
    resnets = ["microsoft/resnet-18", "microsoft/resnet-50"]

    # timm 
    # model must be able to be traced
    # resnet
    resnets_2 = ["timm/resnet18.a1_in1k"] # working

    vggs = ["timm/vgg11.tv_in1k", "timm/vgg11_bn.tv_in1k"] # not working
    inceptions = ["timm/inception_v3.tf_in1k", "timm/inception_v3.tv_in1k", "timm/inception_v4.tf_in1k"]

    for model in vggs:
        for index, data in tqdm(enumerate(imagenet_data)):
            #label = IMAGENET_CLASSES[index]
            main(f"./svelte-app/public/output/{index}/", data, model)

