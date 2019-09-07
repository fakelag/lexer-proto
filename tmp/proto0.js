const features = ['var'];

const lexer = (source) => {
	const symbolStack = [];
	let currentSymbol = '';
	let currentIndex = 0;
	let currentLine = 0;

	const createSymbol = (token) => {
		let type;

		if (token.match(/[0-9]/g)) {
			type = 'CONST';
		} else if (features.includes(token)) {
			type = 'FEATURE';
		} else {
			switch (token) {
				case '=':
					type = 'ASSIGN';
					break;
				case '+':
				case '-':
				case '/':
				case '*':
					type = 'ARIT';
					break;
				case ')':
				case '(':
				// case '{':
				// case '}':
					type = 'CTRL';
					break;
				case ';':
				case ',':
					type = 'EOE'; // end of expression
					break;
				default:
					type = 'NAME';
			}
		}

		return {
			type,
			token,
			dbg: {
				line: currentLine,
				col: currentIndex - token.length,
			}
		};
	};

	for (let i = 0; i < source.length; ++i) {
		if (source[i] === '\n') {
			currentIndex = 0;
			++currentLine;
			continue;
		}

		switch (source[i]) {
			case ')':
			case '(':
			case '{':
			case '}':
			case ';':
			case ',':
			case '=':
			case '+':
			case '-':
			case '/':
			case '*':
			{
				if (currentSymbol.length)
					symbolStack.push(createSymbol(currentSymbol));

				symbolStack.push(createSymbol(source[i]));

				currentSymbol = '';
				break;
			}
			case ' ':
			{
				if (currentSymbol.length)
					symbolStack.push(createSymbol(currentSymbol));

				currentSymbol = '';
				break;
			}
			default:
				currentSymbol += source[i];
				break;
		}

		++currentIndex;
	}

	return symbolStack.map((sym, index) => ({ ...sym, id: index }));
};

const parserRecursive = (index, stack) => {
	const node = (object, idx = index + 1) => [object, idx];

	const rhs = stack[index + 1] && stack[index + 1].token != ';'
		? stack[index + 1]
		: undefined;

	const lhs = stack[index - 1] && stack[index - 1].token != ';'
		? stack[index - 1]
		: undefined;

	const symbol = stack[index];
	switch (symbol.type) {
		case 'FEATURE':
		{
			switch (symbol.token) {
				case 'var':
				{
					const [_rhs, curIndex] = parserRecursive(index + 1, stack);
					return node({
						type: 'var',
						lhs: null,
						rhs: _rhs,
					}, curIndex);
				}
				default:
					throw new Error(`Unknown symbol: ${symbol.token} at line ${symbol.dbg.line}, ${symbol.dbg.col}`);
			}
		}
		case 'NAME':
		{
			return node({ type: symbol.type, lhs: null, rhs: symbol.token });
		}
		case 'CONST':
		{
			return node({ type: symbol.type, lhs: null, rhs: symbol.token });
		}
		case 'ASSIGN':
		{
			const [_lhs, rhsIndex] = parserRecursive(index - 1, stack);
			const [_rhs, curIndex] = parserRecursive(index + 1, stack);
			return node({ type: symbol.type, lhs: _lhs, rhs: _rhs }, curIndex);
		}
		case 'ARIT':
		{
			break;
		}
		case 'EOE':
		{
			return node({ type: symbol.type, lhs: null, rhs: null });
		}
		case 'CTRL':
		{
			switch (symbol.token) {
				case ')':
					return node({ type: 'ENDCALL', lhs: null, rhs: null });
				case '(':
				{
					const [_lhs, lhsIndex] = parserRecursive(index - 1, stack);

					if (!_lhs || _lhs.type !== 'NAME')
						throw new Error(`Unknown symbol: ${symbol.token} on line ${symbol.dbg.line}, ${symbol.dbg.col}`);

					let argList = [];
					let _rhs = null;
					let curIndex = index + 1;

					do {
						[_rhs, curIndex] = parserRecursive(curIndex, stack);
						if (_rhs.type !== 'ENDCALL')
							argList.push(_rhs);
					} while (_rhs && _rhs.type !== 'ENDCALL');
					return node({ type: 'CALL', lhs: _lhs, rhs: { type: 'ARGS', lhs: argList, rhs: null } }, curIndex);
				}
				default:
					throw new Error(`Unknown symbol: ${symbol.token} on line ${symbol.dbg.line}, ${symbol.dbg.col}`);
			}
		}
	}

	throw new Error(`Unknown symbol type: ${symbol.type}`);
};

const runParser = (symbolStack) => {
	const tree = [];

	let leftHand = 0;
	let cursor = 0;

	const hasLHS = (symbolType) => ['ASSIGN', 'ARIT', 'CTRL'].includes(symbolType);

	while (cursor < symbolStack.length) {
		if (symbolStack[cursor].type === 'EOE') {
			++cursor;
			continue;
		}

		if (!symbolStack[cursor + 1] || !hasLHS(symbolStack[cursor + 1].type)) {
			const [node, index] = parserRecursive(cursor, symbolStack);
			tree.push(node);

			// console.log(node);

			cursor = index;
			leftHand = 0;
		} else {
			++leftHand;
			++cursor;

			if (leftHand > 1) {
				const errorSymbol = symbolStack[cursor - leftHand + 1];
				throw new Error(`Syntax error at line ${errorSymbol.dbg.line}, ${errorSymbol.dbg.col}`);
			}
		}
	}

	return tree;
};

const symbolStack = lexer('var abc = 4; print( abc );var a;');

console.log(symbolStack);

const syntaxTree = runParser(symbolStack);

console.log(syntaxTree);
