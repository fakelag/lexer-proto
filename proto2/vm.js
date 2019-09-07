export const uninitValue = Symbol('uninitialized');

const execRecursive = (node, variableContext, resolveNames = false) => {
    switch (node.nodeType) {
        case 'simple':
        {
            switch (node.type) {
                case 'NAME':
                {
                    if (resolveNames) {
                        const variable = variableContext.find((varr) => varr.name === node.value && varr.value !== uninitValue);

                        if (variable)
                            return variable.value;
                        else
                            throw Error(`unknown_name_error: ${node.value}`);
					}
					
					return node.value;
				}
				case 'var':
				{
					const varName = execRecursive(node.value, variableContext);
					variableContext.push({ name: varName, value: uninitValue });
					return varName;
				}
                case 'INTCONST':
				case 'DOUBLECONST':
					return node.value;
				case '+':
					return node.value.value;
				case '-':
					return -node.value.value;
				default:
					throw new Error(`Unhandled node type: ${node.type}`);
            }
        }
        case 'complex':
        {
            switch (node.type) {
                case '+': return execRecursive(node.lhs, variableContext, true) + execRecursive(node.rhs, variableContext, true);
                case '-': return execRecursive(node.lhs, variableContext, true) - execRecursive(node.rhs, variableContext, true);
                case '/': return execRecursive(node.lhs, variableContext, true) / execRecursive(node.rhs, variableContext, true);
				case '*': return execRecursive(node.lhs, variableContext, true) * execRecursive(node.rhs, variableContext, true);
				case '**': return execRecursive(node.lhs, variableContext, true) ** execRecursive(node.rhs, variableContext, true);
                case 'ASSIGN':
				{
					// rhs contains the expression, lhs is var name
					let isNew = false;
					if (node.lhs.type === 'var') {
						// new variable
						execRecursive(node.lhs, variableContext);
						isNew = true;
					}
                    const variableName = execRecursive(node.lhs, variableContext);
                    const newValue = execRecursive(node.rhs, variableContext);
                    const variable = variableContext.find((varr) => varr.name === variableName);

					if (variable === undefined)
						throw new Error(`unknown_name_error: ${variableName}`);

                    variable.value = newValue;

					return isNew 
						? `ASSIGN (new) ${variable.name}=${newValue}`
						: `ASSIGN ${variable.name}=${newValue}`;
                }
                default:
					throw new Error(`unknown_node_error: ${node.type}`);
                    // return execRecursive(node.rhs, variableContext);
            }
        }
    }
};

export const execute = (syntaxTree) => {
	const results = [];
	const variableContext = [];

    for (const node of syntaxTree) {
        const res = execRecursive(node, variableContext, true);
        results.push(res);
	}

	return results;
};

export const executeWithContext = (syntaxTree, variableContext = []) => {
	const results = [];

    for (const node of syntaxTree) {
        const res = execRecursive(node, variableContext, true);
        results.push(res);
	}

	return {
		results,
		variableContext,
	};
};
