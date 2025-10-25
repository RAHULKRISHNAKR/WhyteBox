import torch
import torch.nn as nn
import torchvision
import torchvision.models as models
import torchvision.transforms as transforms

import os
import json
import operator
import numpy as np
from PIL import Image

from inference.model import *
from inference.graph import *

current_directory = os.path.dirname(__file__)
file_path = os.path.join(current_directory, 'relative/path/to/your/file')

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

def get_layer_info(node):
    layer_info = {
        'layer_type': node.layer_type,
        'class': str(type(node))
    }

    keys = ["input", "output", "input_index", "output_index", "softmax_output", "identity", "top5", "metadata"]
    for k in keys:
        if k in dir(node):
            layer_info[k] = node.__getattribute__(k)
    return layer_info

def get_transformed(data_dir, processor, is_transformers):
    img = Image.open(data_dir)
    if is_transformers:
        data = processor(img, return_tensors="pt")
    else:
        data = processor(img)
    #img.save(os.path.join(log_dir, 'image.png'))
    #img.getchannel("R").save(os.path.join(log_dir, f'image_r.png'))
    #img.getchannel("G").save(os.path.join(log_dir, f'image_g.png'))
    #img.getchannel("B").save(os.path.join(log_dir, f'image_b.png'))
    return data, img

def inference(log_dir, data_dir, model_name, save_to_file=False):
    model, processor, is_transformers = load_model(model_name)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    os.makedirs(log_dir, exist_ok=True)
    inputs, img = get_transformed(data_dir, processor, is_transformers)
    if save_to_file:
        img.save(os.path.join(log_dir, 'image.png'))

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
            outputs = model(**inputs).logits
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
                
            bn_node = next_type_if_exist(node, "bn", global_graph)
            act_node = next_type_if_exist(bn_node, "relu", global_graph)
            
            activation = act_node.output

            if isinstance(activation, np.ndarray):
                avg_activation = np.mean(np.abs(activation), axis=(1,2))
            else:
                avg_activation = torch.mean(torch.abs(activation), axis=(1, 2))
            node.output_index = (-avg_activation).argsort()[:oisize]
            #node.output_index = range(oisize)


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


    # create module node list
    prev_node = None
    module_list = []
    node_list = []
    for node in global_graph.nodes:
        if node.op in ["placeholder", "output"]: continue
        if prev_node is not None and prev_node.module != node.module:
            print(prev_node.module, node_list)
            module_list.append(node_list)
            node_list = []
        node_list.append(node)
        prev_node = node
    module_list.append(node_list)
    set_ignore(global_graph)

    # create info json
    # branch condition: must be splitted from last layer of previous module, must be aggregated with add(residual) or cat(inception)
    info = []
    prev_module_node_list = None
    for node_list in module_list:
        module_info = {"name": node_list[0].module, "type": node_list[0].module.split("_")[0], "branches": [], "layers":[]}
        
        branch_starters = [0]
        branch_aggregater = 0
        if module_info["type"] in ["residual", "inception"]:
            branch_starters = [node_list.index(n) for n in prev_module_node_list[-1].users.keys()]
            branch_aggregater = [node_list.index(n) for n in node_list if n.layer_type in ["add", "cat"]][0]

        branch_index = branch_starters + [branch_aggregater]
        print(branch_index)
        for i in range(len(branch_index)-1):
            branch_info = []
            for node in node_list[branch_index[i]:branch_index[i+1]]:
                if node.op in ["placeholder", "output"] or node.module in ["ignore"]: continue
                branch_info.append(get_layer_info(node))
            #if len(branch_info) > 0:
            module_info["branches"].append(branch_info)
        
        for node in node_list[branch_aggregater:]:
            if node.op in ["placeholder", "output"] or node.module in ["ignore"]: continue
            module_info["layers"].append(get_layer_info(node))

        prev_module_node_list = node_list
        info.append(module_info)

    # np to list
    for module in info:
        for branch_list in module["branches"]:
            for branch in branch_list:
                for k in branch:
                    if isinstance(branch[k], np.ndarray):
                        branch[k] = branch[k].tolist()
        for layer in module["layers"]:
            for k in layer:
                if isinstance(layer[k], np.ndarray):
                    layer[k] = layer[k].tolist()

    # remove empty module
    info = [m for m in info if sum([len(b) for b in m["branches"]]) + len(m["layers"]) > 0]

    # print for test
    for module in info:
        for branch_list in module["branches"]:
            for branch in branch_list:
                print(branch['layer_type'])
                if 'input_index' in branch: print(branch['input_index'][:5])
                if 'output_index' in branch: print(branch['output_index'][:5])
        for layer in module["layers"]:
            print(layer['layer_type'])
            if 'input_index' in layer: print(layer['input_index'][:5])
            if 'output_index' in layer: print(layer['output_index'][:5])
        print("--")

    if save_to_file:
        with open(os.path.join(log_dir, model_name.replace("/","__")+'_info.json'), "w") as f:
            json.dump(info, f)
    else:
        return info, img

def get_imagenet_data():
    images = []
    path = "./imagenet-sample-images"
    for fname in sorted(os.listdir(path)):
        if fname.endswith(".JPEG"):
            images.append(os.path.join(path, fname))
    return images


if __name__ == "__main__":
    from tqdm import tqdm
    imagenet_data = get_imagenet_data()[:1] # [경로0, 경로1]

    # torchvision
    # model must be able to be traced
    # alexnet, vgg, inception, resnet18
    tv_models = ["alexnet", "vgg16", "googlenet", "resnet18"]

    # transformers
    # resnet-18, resnet-50
    tf_models = ["microsoft/resnet-18", "microsoft/resnet-50"]

    # timm 
    # model must be able to be traced
    # resnet
    timm_models = ["timm/resnet18.a1_in1k"] # working

    # models to work on 
    inceptions = ["timm/inception_v3.tf_in1k", "timm/inception_v3.tv_in1k", "timm/inception_v4.tf_in1k"]
    
    # models that doesn't work
    # timm/vgg 

    test = ["alexnet", "vgg16"]
    test_v = ["vgg16", "timm/vgg11.tv_in1k"]
    test_r = ["resnet18", "microsoft/resnet-18", "timm/resnet18.a1_in1k"]
    test_g = ["googlenet", "timm/inception_v3.tf_in1k"]
    

    model_list = tv_models + tf_models + timm_models

    # for model in ["timm/inception_v3.tv_in1k"]:
    # for model in ["timm/vgg11.tv_in1k"]:
    # for model in ["resnet18"]:
    # for model in tv_models:
    for model in ["microsoft/resnet-18"]:
        for index, data in tqdm(enumerate(imagenet_data)):
            #label = IMAGENET_CLASSES[index]
            info, img = inference(f"../output/{index}/", data, model, save_to_file=False)
            print(len(info), img)
        print()
