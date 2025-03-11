function formatData(data) {
    // Function to format data for visualization
    return data.map(item => ({
        id: item.id,
        value: item.value.toFixed(2),
        label: item.label || 'No Label'
    }));
}

function createElement(tag, className, textContent) {
    // Function to create a DOM element with specified tag, class, and text
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
}

function appendChildren(parent, children) {
    // Function to append multiple children to a parent element
    children.forEach(child => parent.appendChild(child));
}

export { formatData, createElement, appendChildren };