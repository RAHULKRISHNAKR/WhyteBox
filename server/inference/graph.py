import torch

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

# TODO: need to fix, there can be kwargs
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

def next_type_if_exist(target_node, layer_type, graph):
    next_node = get_next(target_node, graph)
    if next_node.layer_type in [layer_type]:
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

'''
def get_arg_nodes(node):
    arg_nodes = []
    for arg in node.args + node.kwargs:
        if isinstance(arg, torch.fx.node):
            arg_nodes.append(arg)
        if isinstance(arg, list) or isintance(arg, tuple):
            for a in arg:
                if isintance(a, torch.fx.node):
                    arg_nodes.append(arg)
'''

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
            node.module = module
        if start and node == end_node:
            break
    print(module, start_node, end_node)

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

def set_ignore(graph):
    for node in graph.nodes:
        if node.layer_type == "ignore":
            node.module = "ignore"

def fill_ignore(graph, set_ignore_layer_type=False):
    for node in graph.nodes:
        if "module" not in dir(node):
            node.module = "ignore"
    if set_ignore_layer_type:
        set_ignore(graph)

def add_missing_inout(graph):
    for node in graph.nodes:
        if node.layer_type in ["relu"] and "input" not in dir(node):
            set_input(node, graph)
            # run directly due to F.relu-cat sequence
            node.output = node.layer(torch.Tensor(node.input))

    for node in graph.nodes:
        if node.layer_type in ["add", "cat"]:
            set_output(node, graph)
        if node.layer_type in ["flatten"]:
            set_input(node, graph)
            set_output(node, graph)

def print_graph(graph):
    for node in graph.nodes:
        print(f"{node.module}\t{node.layer_type}\t{node.name}\t{node.layer}\t{node.args}")

