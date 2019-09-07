let tokenString = '-4 + (8 * (1 ** (2 * 4))) * 5 + -4';

const lexer = (source) => {
	const tokens = [];
	let symbol = '';

	for (let i = 0; i < source.length; ++i) {
		switch (source.charAt(i)) {
			case '(':
			case ')':
				if (symbol.length)
					tokens.push(symbol);

				tokens.push(source.charAt(i));
				symbol = '';
				break;
			case ' ':
				if (symbol.length)
					tokens.push(symbol);
				symbol = '';
				break;
			default:
				symbol += source.charAt(i);
				break;
		}
	}

	if (symbol.length)
		tokens.push(symbol);

	return tokens;
};

const parser = (symbols) => {
	const tokens = symbols.map((token) => {
		switch (token) {
			case '+': return { _t: token, lbp: 10, eval: (left) => left + expression(10), value: () => expression(-1) };
			case '-': return { _t: token, lbp: 10, eval: (left) => left - expression(10), value: () => -expression(-1) };
			case '*': return { _t: token, lbp: 20, eval: (left) => left * expression(20) };
			case '**': return { _t: token, lbp: 20, eval: (left) => Math.pow(left, expression(20)) };
			case '/': return { _t: token, lbp: 20, eval: (left) => left / expression(20) };
			case '(': return { _t: token, lbp: 0.1, value: () => { expr = expression(); matchToken(')'); return expr; } };
			case ')': return { _t: token, lbp: 0 };
			default: return { _t: token, lbp: 0, value: () => Number.parseInt(token, 10) };
		}
	});
	
	tokens.push({ lbp: 0 });

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
			throw new Error(`Expected: ${token}`);
		
		parserState.nextToken();
	};

	const expression = (rbp = 0) => {
		let oldToken = parserState.nextToken();

		let left = oldToken.value();
	
		if (rbp === -1)
			return left;

		while (rbp < parserState.currentToken().lbp) {
			t = parserState.currentToken();
			parserState.nextToken();

			left = t.eval(left);
		}
	
		return left;
	};

	return expression();
};

console.log(parser(lexer(tokenString)));
