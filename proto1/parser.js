const parserRecursive = (index, stack, depthSearch = true) => {
    // console.log('parserRecursive: ', index, stack[index], depthSearch);
    const simple = (type, value, idx = index + 1) => [{ nodeType: 'simple', type, value }, idx];
    const complex = (type, lhs, rhs, idx = index + 1) => [{ nodeType: 'complex', type, rhs, lhs }, idx];

    const symbol = stack[index];

    if (index + 1 < stack.length && symbol.type !== 'EOE') { // we have a following symbol (any)
        if (depthSearch && !hasLHS(symbol) && !hasRHSOnly(symbol)) {
            if (hasLHS(stack[index + 1]))
                return parserRecursive(index + 1, stack);
            else if (stack[index + 1].type !== 'EOE')
                throw new Error(`Syntax error: ${symbol.token} at line ${symbol.dbg.line}, ${symbol.dbg.col} (too many left hand arguments)`);
        }
    }

    switch (symbol.type) {
        case 'EOE':
            return [null, index + 1];
        case 'NAME':
        case 'CONST':
            return simple(symbol.type, symbol.token);
        case 'FEATURE':
        {
            switch (symbol.token) {
                case 'var':
                {
                    return complex('var', null, simple('NAME', stack[index + 1].token, index + 1)[0]);
                }
                default:
                    throw new Error(`Unknown symbol: ${symbol.token} at line ${symbol.dbg.line}, ${symbol.dbg.col}`);
            }
        }
        case 'ARIT':
        case 'ASSIGN':
        {
            const [lhs, _] = parserRecursive(index - 1, stack, false);
            const [rhs, curIndex] = parserRecursive(index + 1, stack);

            return complex(
                symbol.type === 'ARIT'
                    ? symbol.token
                    : symbol.type,
                lhs,
                rhs,
                curIndex,
            );
        }
        case 'CTRL':
        {
            return null;
        }
        default:
            throw new Error(`Unknown symbol: ${symbol.token} on line ${symbol.dbg.line}, ${symbol.dbg.col}`);
    }
};

const runParser = (symbolStack) => {
	const tree = [];

	let cursor = 0;

	while (cursor < symbolStack.length) {
        const [node, index] = parserRecursive(cursor, symbolStack);

        if (node)
            tree.push(node);

        cursor = index;
	}

	return tree;
};
