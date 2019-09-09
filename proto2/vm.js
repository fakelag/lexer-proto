export const uninitValue = Symbol('uninitialized');

const execRecursive = (node, context, resolveNames) => {
    switch (node.nodeType) {
        case 'simple':
        {
            switch (node.type) {
                case 'NAME':
                {
                    if (resolveNames) {
                        const variable = context.findVariable(node.value, false); // context.find((varr) => varr.name === node.value && varr.value !== uninitValue);

                        if (variable)
                            return variable.value;
                        else
                            throw Error(`unknown_name_error: ${node.value}`);
					}
					
					return node.value;
				}
				case 'var':
				{
					const varName = execRecursive(node.value, context, false);

					// Check that it doesn't already exist in the current scope.
					// We don't check outer scopes, so shadowing variables is possible.
					if (context.scope[context.scope.length - 1].variables.find((variable) => variable.name === varName))
						throw new Error(`variable_already_exists: ${varName}`);

					context.scope[context.scope.length - 1].variables.push({ name: varName, value: uninitValue });
					return varName;
				}
				case 'SCOPE':
				{
					context.scope.push({
						isGlobal: false,
						variables: [],
					});

					const results = node.value.map((scopedNode) => execRecursive(scopedNode, context, true));

					context.scope.pop();
					return results;
				}
                case 'INTCONST':
				case 'DOUBLECONST':
					return node.value;
				case '+':
					return execRecursive(node.value, context, true);
				case '-':
					return -execRecursive(node.value, context, true);
				default:
					throw new Error(`Unhandled node type: ${node.type}`);
            }
        }
        case 'complex':
        {
            switch (node.type) {
                case '+': return execRecursive(node.lhs, context, true) + execRecursive(node.rhs, context, true);
                case '-': return execRecursive(node.lhs, context, true) - execRecursive(node.rhs, context, true);
                case '/': return execRecursive(node.lhs, context, true) / execRecursive(node.rhs, context, true);
				case '*': return execRecursive(node.lhs, context, true) * execRecursive(node.rhs, context, true);
				case '**': return execRecursive(node.lhs, context, true) ** execRecursive(node.rhs, context, true);
				case '==': return execRecursive(node.lhs, context, true) === execRecursive(node.rhs, context, true);
				case '!=': return execRecursive(node.lhs, context, true) !== execRecursive(node.rhs, context, true);
				case '>=': return execRecursive(node.lhs, context, true) >= execRecursive(node.rhs, context, true);
				case '<=': return execRecursive(node.lhs, context, true) <= execRecursive(node.rhs, context, true);
				case '>': return execRecursive(node.lhs, context, true) > execRecursive(node.rhs, context, true);
				case '<': return execRecursive(node.lhs, context, true) < execRecursive(node.rhs, context, true);
				case '/=':
				case '*=':
				case '+=':
				case '-=':
                case '=':
				{
					// rhs contains the expression, lhs is var name
					let isNew = false;
					let isAdditive = (node.type.length === 2);

					if (node.lhs.type === 'var')
						isNew = true;

					if (isAdditive && isNew) // attempting to += to a new variable
						throw new Error(`additive_assign_to_undefined_variable: (line ${node._dbgInfo.line} col ${node._dbgInfo.col})`);

					const variableName = execRecursive(node.lhs, context, false);
                    const newValue = execRecursive(node.rhs, context, true);
                    const variable = context.findVariable(variableName, true);

					if (variable === undefined)
						throw new Error(`unknown_name_error: ${variableName}`); // variable was not found

					if (isAdditive) {
						switch (node.type[0]) {
							case '*': variable.value = variable.value * newValue; break;
							case '/': variable.value = variable.value / newValue; break;
							case '-': variable.value = variable.value - newValue; break;
							case '+': variable.value = variable.value + newValue; break;
							default:
								throw new Error(`unknown_assignment_operator_error: ${node.type}`);
						}
					} else {
						variable.value = newValue;
					}

					return isNew 
						? `ASSIGN (new) ${variable.name}=${variable.value}`
						: `ASSIGN ${variable.name}=${variable.value}`;
				}
				case 'CALL':
				{
					if (node.lhs.type !== 'NAME')
						throw new Error(`invalid_call_name_node: ${node.lhs}`);

					if (!Array.isArray(node.rhs))
						throw new Error(`invalid_call_args_node: ${node.rhs}`);

					switch (node.lhs.value) {
						case 'print':
							// print uses the first arg and prints it. The rest are ignored.
							if (node.rhs.length < 1)
								throw new Error(`insufficient_print_args: ${node.rhs}`);

							const result = execRecursive(node.rhs[0], context, true);
							console.log('PRINT: ', result);
							return result;
						default:
							throw new Error(`unknown_call_name: ${node.lhs}`);
					}
				}
				case 'IF':
				{
					const exprResult = execRecursive(node.lhs, context, true);

					if (!!exprResult)
						return execRecursive(node.rhs, context, true);

					return null;
				}
				case 'WHILE':
				{
					while (execRecursive(node.lhs, context, true))
						execRecursive(node.rhs, context, true);

					return null;
				}
                default:
					throw new Error(`unknown_node_error: ${node.type}`);
            }
        }
    }
};

export const createInitialContext = () => {
	return {
		scope: [{
			isGlobal: true, // global scope
			variables: [], // variables array for this scope
		}],
		findVariable: function (name, includeUninitialized) {
			for (let i = this.scope.length - 1; i >= 0; --i) {
				const variable = this.scope[i].variables.find((variable) => variable.name === name && (includeUninitialized || variable.value !== uninitValue));

				if (variable)
					return variable;
			}

			return undefined;
		},
	};
};

export const execute = (syntaxTree) => {
	const results = [];
	const context = createInitialContext();

    for (const node of syntaxTree) {
        const res = execRecursive(node, context, true);
        results.push(res);
	}

	return results;
};

export const executeWithContext = (syntaxTree, context = createInitialContext()) => {
	const results = [];

    for (const node of syntaxTree) {
        const res = execRecursive(node, context, true);
        results.push(res);
	}

	return {
		results,
		context,
	};
};
