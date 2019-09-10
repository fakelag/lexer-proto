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
				case 'break':
				{
					context.currentScope().isBreaking = true;
					return null;
				}
				case 'return':
				{
					const result = execRecursive(node.value, context, true);
					context.returnToCaller();

					return result;
				}
				case 'true':
				case 'false':
					return node.value;
				case 'var':
				{
					const varName = execRecursive(node.value, context, false);

					// Check that it doesn't already exist in the current scope.
					// We don't check outer scopes, so shadowing variables is possible.
					if (context.currentScope().variables.find((variable) => variable.name === varName))
						throw new Error(`variable_already_exists: ${varName}`);

					context.currentScope().variables.push({ name: varName, value: uninitValue });
					return varName;
				}
				case 'SCOPE':
				{
					context.pushScope();

					let result = null;
					for (const scopedNode of node.value) {
						result = execRecursive(scopedNode, context, true);

						if (context.currentScope().isBreaking)
							break;
					}

					context.popScope();
					return result;
				}
				case 'STRCONST':
                case 'INTCONST':
				case 'DOUBLECONST':
					return node.value;
				case '+':
					return execRecursive(node.value, context, true);
				case '-':
					return -execRecursive(node.value, context, true);
				case '!':
					return !execRecursive(node.value, context, true);
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
				case '&&': return execRecursive(node.lhs, context, true) && execRecursive(node.rhs, context, true);
				case '||': return execRecursive(node.lhs, context, true) || execRecursive(node.rhs, context, true);
				case '++':
				case '--':
				{
					const variableName = execRecursive(node.lhs, context, false);
					const variable = context.findVariable(variableName, true);

					if (variable === undefined)
						throw new Error(`unknown_name_error: ${variableName}`);

					const oldValue = variable.value;

					if (node.type === '++')
						++variable.value;
					else if (node.type === '--')
						--variable.value;

					return node.rhs === 'pre' ? variable.value : oldValue;
				}
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

					const functionName = node.lhs.value; // function names must be primitives
					switch (functionName) {
						case 'print':
						{
							// print uses the first arg and prints it. The rest are ignored.
							// in the final version, we'll have virtual stdin, stdout and stderr
							// that we'll use to direct IO
							if (node.rhs.length < 1)
								throw new Error(`insufficient_print_args: ${node.rhs}`);

							const result = execRecursive(node.rhs[0], context, true);
							console.log('PRINT: ', result);
							return result;
						}
						case '__die':
							// user triggered unsuccessful exit (debugging feature)
							throw new Error('error_exit_unsuccessful');
						case '__flag':
							// increment context flag (debugging feature)
							return ++context.__flag;
						default:
						{
							const func = context.findFunction(functionName);

							if (!func)
								throw new Error(`unknown_call_name: ${node.lhs}`);

							const callerArgs = node.rhs;

							if (func.args.length !== callerArgs.length)
								throw new Error(`invalid_fcall_args: ${callerArgs.length} expected ${func.args.length}`);

							// create a(n outer) scope for the function arguments.
							// this is where we'll handle calling by reference / calling by value
							context.pushScope(true);

							for (let i = 0; i < func.args.length; ++i) {
								const fnArg = func.args[i];
								const callArg = execRecursive(callerArgs[i], context, true);

								const varName = execRecursive({ nodeType: 'simple', type: 'var', value: fnArg }, context, true);
								const variable = context.findVariable(varName, true);
								variable.value = callArg;
							}

							const result = execRecursive(func.code, context, true);

							context.popScope();
							return result;
						}
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
				case 'FUNCTION':
				{
					const prototype = node.lhs;

					if (prototype.type !== 'FUNCDEF')
						throw new Error(`invalid_function_prototype: ${prototype}`);

					const functionName = execRecursive(prototype.lhs, context, false);
					if (context.scope[context.scope.length - 1].functions.find((func) => func.name === functionName))
						throw new Error(`function_already_exists: ${functionName}`);

					context.scope[context.scope.length - 1].functions.push({ name: functionName, args: prototype.rhs, code: node.rhs });
					return functionName;
				}
                default:
					throw new Error(`unknown_node_error: ${node.type}`);
            }
        }
    }
};

export const createInitialContext = () => {
	return {
		__flag: 0, // debug flag. Used by tests.
		scope: [{
			isGlobal: true, // global scope
			isBreaking: false, // currently in the process of breaking from the scope.
			isFunctionArgsScope: false, // is is the args scope of a function
			variables: [], // variables array for this scope. Type CVariable
			functions: [], // functions array. Type CFunction
		}],
		pushScope: function(isFunctionArgsScope = false) {
			this.scope.push({
				isGlobal: false,
				isBreaking: false,
				isFunctionArgsScope,
				variables: [],
				functions: [],
			})
		},
		popScope: function() {
			this.scope.pop();
		},
		currentScope: function () {
			return this.scope[this.scope.length - 1];
		},
		returnToCaller: function (returnValue) {
			for (let i = this.scope.length - 1; i >= 0; --i) {
				const scope = this.scope[i];

				if (scope.isGlobal)
					throw new Error(`unhandled_return_statement: scope=${i}`);

				scope.isBreaking = true; // Stop executing the current tree

				if (scope.isFunctionArgsScope)
					break;
			}
		},
		findVariable: function (name, includeUninitialized) {
			for (let i = this.scope.length - 1; i >= 0; --i) {
				const variable = this.scope[i].variables.find((variable) => variable.name === name && (includeUninitialized || variable.value !== uninitValue));

				if (variable)
					return variable;
			}

			return undefined;
		},
		findFunction: function(name) {
			for (let i = this.scope.length - 1; i >= 0; --i) {
				const func = this.scope[i].functions.find((fnc) => fnc.name === name);

				if (func)
					return func;
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
