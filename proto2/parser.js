// import util from 'util';

// infix binding powers
const leftBindingPow = {
	'=': 1,
	'-=': 1,
	'+=': 1,
	'*=': 1,
	'/=': 1,
	'&&': 1,
	'||': 1,
	'==': 2,
	'!=': 2,
	'>=': 2,
	'<=': 2,
	'>': 2,
	'<': 2,
	'!': 0,
	'+': 4,
	'-': 4,
	'*': 5,
	'/': 5,
	'**': 6,
	'++': 10,
	'--': 10,
	'[': 20,
	']': 0,
	'(': 20,
	')': 0,
	'{': 0,
	'}': 0,
	'var': -1,
	';': 0,
	',': 3,
	'if': 0,
	'while': 0,
	'function': 0,
	'return': 0,
	'break': 0,
	'true': 0,
	'false': 0,
};

export const parse = (symbols) => {
	const simple = (type, value, _dbgInfo) => ({ nodeType: 'simple', type, value, _dbgInfo });
	const complex = (type, lhs, rhs, _dbgInfo) => ({ nodeType: 'complex', type, rhs, lhs, _dbgInfo });

	const tokens = symbols.map((symbol) => {
		const lbp = leftBindingPow[symbol.token]
			? leftBindingPow[symbol.token]
			: 0;

		switch (symbol.type) {
			case 'NAME':
			{
				switch (symbol.token) {
					case 'break':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, null, symbol.dbg) };
					case 'return':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, expression(), symbol.dbg) };
					case 'true':
					case 'false':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, symbol.token === 'true' ? true : false, symbol.dbg) };
					case 'while':
					case 'if':
					{
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								const condition = expression();
								const body = expression(); // body can be either a scope or any other expression

								if (Array.isArray(condition))
									throw new Error(`Invalid condition at line ${symbol.dbg.line} col ${symbol.dbg.col}`);

								return complex(symbol.token.toUpperCase(), condition, body, symbol.dbg);
							},
						};
					}
					case 'function':
					{
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								const name = expression(-1);
								const args = expression();
								const body = expression();

								const argsArray = args
									? Array.isArray(args) ? args : [args]
									: [];

								return complex(symbol.token.toUpperCase(),
									complex('FUNCDEF', name, argsArray, name.dbg), body, symbol.dbg);
							},
						};
					}
					default:
					{
						switch (lbp) {
							case -1:
								return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, expression(lbp), symbol.dbg)};
							default:
								return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.type, symbol.token, symbol.dbg)};
						}
					}
				}
			}
			case 'STRCONST':
			case 'DOUBLECONST':
			case 'INTCONST':
				return { _t: symbol.token, _dbg: symbol.dbg, lbp: 0, value: () => simple(symbol.type, symbol.token, symbol.dbg)};
			case 'LOGICAL':
			case 'EQUALITY':
			case 'ASSIGN':
				return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => complex(symbol.token, left, expression(lbp), symbol.dbg) };
			case 'ARIT':
			{
				switch (symbol.token) {
					case '!':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, expression(), symbol.dbg) };
					case '++':
					case '--':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => complex(symbol.token, left, 'post', symbol.dbg),
							value: () => complex(symbol.token, expression(lbp), 'pre', symbol.dbg) };
					case '+':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => complex(symbol.token, left, expression(lbp), symbol.dbg),
							value: () => simple(symbol.token, expression(-1), symbol.dbg) };
					case '-':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => complex(symbol.token, left, expression(lbp), symbol.dbg),
							value: () => simple(symbol.token, expression(-1), symbol.dbg) };
					case '*':
					case '/':
					case '**':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => complex(symbol.token, left, expression(lbp), symbol.dbg) };
					default:
						throw new Error(`Unknown ARIT operator: ${symbol.token}`);
				}
			}
			case 'CTRL':
			{
				switch (symbol.token) {
					case '(':
					{
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								const expr = expression();

								if (expr.type === ')')
									return null;

								matchToken(')');
								return expr;
							},
							eval: (left) => {
								const right = expression();

								if (!Array.isArray(right) && right.type === ')') // function takes no arguments
									return complex('CALL', left, [], symbol.dbg);

								matchToken(')');
								return complex('CALL', left, Array.isArray(right) ? right : [right], symbol.dbg);
							},
						};
					}
					case '[':
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								const expr = expression();

								if (!Array.isArray(expr) && expr.type === ']')
									return simple('ARRAY', [], symbol.dbg);

								matchToken(']');
								return simple('ARRAY', expr, symbol.dbg);
							},
							eval: (left) => {
								const right = expression();

								matchToken(']');
								return complex('ACCESS', left, right, symbol.dbg);
							},
						};
					case ']':
					case ')':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, null) };
					case '{':
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								let exprList = [];
								while (parserState.currentToken()._t !== '}') {
									exprList.push(expression());
									parserState.nextToken();
								}
								return simple('SCOPE', exprList, symbol.dbg);
							},
						};
					case '}':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp };
					default:
						throw new Error(`Unknown CTRL operator: ${symbol.token}`);
				}
			}
			case 'EOE':
				switch (symbol.token) {
					case ';': return { _t: symbol.token, _dbg: symbol.dbg, lbp };
					case ',': return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => {
						const right = expression();
						const leftArray = Array.isArray(left) ? left : [left];
						const rightArray = Array.isArray(right) ? right : [right];

						return leftArray.concat(rightArray);
					}};
					default: throw new Error(`Unknown EOE operator: ${symbol.token}`);
				}
			default:
				throw new Error(`Unknown operation: ${symbol.type} ${symbol.token}`);
		}
	});

	const parserState = {
		tokenIndex: 0,
		currentToken: function () { return tokens[this.tokenIndex] },
		nextToken: function () {
			const oldToken = tokens[this.tokenIndex];
			++this.tokenIndex;

			return oldToken;
		},
	};

	const matchToken = (token) => {
		if (parserState.currentToken()._t !== token)
			throw new Error(`Expected: ${token} got ${parserState.currentToken()._t}`);

		parserState.nextToken();
	};

	const expression = (rbp = 0) => {
		let oldToken = parserState.nextToken();
		let left = oldToken.value();

		if (rbp === -1)
			return left;

		if (parserState.currentToken() === undefined)
			throw new Error(`Expected: ; at line ${oldToken._dbg.line} col ${oldToken._dbg.col + 1}`);

		while (rbp < parserState.currentToken().lbp) {
			const t = parserState.currentToken();
			parserState.nextToken();

			left = t.eval(left);
		}

		return left;
	};

	const topLevel = [];

	while (parserState.tokenIndex < tokens.length) {
		topLevel.push(expression());
		parserState.nextToken();
	}

	// console.log(topLevel.map((node) => node.type));
	// console.log(util.inspect(topLevel, false, null));

	return topLevel;
};
