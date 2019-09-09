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
	'(': 20, // high binding for function name
	')': 0,
	'{': 0,
	'}': 0,
	'var': -1,
	';': 0,
	',': 3,
	'if': 0,
	'while': 0,
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
				switch (symbol.token) {
					case 'true':
					case 'false':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple(symbol.token, symbol.token === 'true' ? true : false, symbol.dbg)};
					case 'while':
					case 'if':
					{
						return {
							_t: symbol.token,
							_dbg: symbol.dbg,
							lbp,
							value: () => {
								const condition = expression();
								const scope = expression();

								return complex(symbol.token.toUpperCase(), condition, scope, symbol.dbg);
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
								matchToken(')');
								return expr;
							},
							eval: (left) => {
								const right = expression();

								if (!Array.isArray(right) && right.type === 'ENDCALL') // function takes no arguments
									return complex('CALL', left, [], symbol.dbg);

								matchToken(')');
								return complex('CALL', left, Array.isArray(right) ? right : [right], symbol.dbg);
							},
						};
					}
					case ')':
						return { _t: symbol.token, _dbg: symbol.dbg, lbp, value: () => simple('ENDCALL', null) };
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
					case ',': return { _t: symbol.token, _dbg: symbol.dbg, lbp, eval: (left) => [left, expression()]  };
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
