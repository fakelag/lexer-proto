export const lex = (source) => {
	const symbolStack = [];
	let currentSymbol = '';
	let currentIndex = 0;
	let currentLine = 0;

	const createSymbol = (text) => {
        let type;
		let token = text;
		
		const isInteger = token.match(/[0-9]/g);
		const isDouble = token.match(/[0-9]\./g);
		
		if (isInteger && !isDouble) {
			type = 'INTCONST';

            try {
                token = Number.parseInt(text, 10);
            } catch (err) {
                throw new Error('Int parsing error: ' + err);
			}
		} else if (isDouble) {
			type = 'DOUBLECONST';

			try {
				token = Number.parseFloat(text);
			} catch (err) {
				throw new Error('Double parsing error: ' + err);
			}
		} else {
			switch (token) {
				case '=':
					type = 'ASSIGN';
					break;
				case '+':
				case '-':
				case '/':
				case '*':
				case '**':
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
				col: currentIndex - text.length,
			},
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
				let sym = source[i];
				if (source[i + 1] && source[i + 1] === '*') {
					sym += '*';
					++i;
				}

				if (currentSymbol.length)
					symbolStack.push(createSymbol(currentSymbol));

				symbolStack.push(createSymbol(sym));

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

	if (currentSymbol.length)
		symbolStack.push(createSymbol(currentSymbol));

	return symbolStack.map((sym, index) => ({ ...sym, id: index }));
};
