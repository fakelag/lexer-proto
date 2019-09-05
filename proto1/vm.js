const execRecursive = (node, variableContext, resolveNames = false) => {
    switch (node.nodeType) {
        case 'simple':
        {
            switch (node.type) {
                default:
                case 'NAME':
                {
                    if (resolveNames) {
                        const variable = variableContext.find((varr) => varr.name === node.value);

                        if (variable)
                            return variable.value;
                        else
                            throw Error(`Unknown name: ${node.value}`);
                    }
                }
                case 'CONST':
                    return node.value;
            }
        }
        case 'complex':
        {
            switch (node.type) {
                case '+': return execRecursive(node.lhs, variableContext, true) + execRecursive(node.rhs, variableContext, true);
                case '-': return execRecursive(node.lhs, variableContext, true) - execRecursive(node.rhs, variableContext, true);
                case '/': return execRecursive(node.lhs, variableContext, true) / execRecursive(node.rhs, variableContext, true);
                case '*': return execRecursive(node.lhs, variableContext, true) * execRecursive(node.rhs, variableContext, true);
                case 'ASSIGN':
				{
					// rhs contains the expression, lhs is var name
                    const variableName = execRecursive(node.lhs, variableContext);
                    const newValue = execRecursive(node.rhs, variableContext);
                    const variable = variableContext.find((varr) => varr.name === variableName);

                    if (variable === undefined) throw new Error(`No variable found with name ${variableName}`);
                    variable.value = newValue;

                    return `Assigned ${newValue} to variable ${variable.name}`;
                }
                case 'var':
				{
                    const varName = execRecursive(node.rhs, variableContext);
                    variableContext.push({ name: varName, value: null });
                    return `Created new variable named ${varName}`;
                }
                default:
                    console.log('Unknown case: ', node.type);
                    return execRecursive(node.rhs, variableContext);
            }
        }
    }
};

const executor = (syntaxTree) => {
    console.log('Executing...');

    const variableContext = [];
    for (const node of syntaxTree) {
        const res = execRecursive(node, variableContext, true);
        console.log(res);
    }
};
