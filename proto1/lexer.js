const lexer = (source) => {
    console.log('Lexing source: ', source);
	const symbolStack = [];
	let currentSymbol = '';
	let currentIndex = 0;
	let currentLine = 0;

	const createSymbol = (text) => {
        let type;
        let token = text;

		if (token.match(/[0-9]/g)) {
			type = 'CONST';

            try {
                token = Number.parseInt(text, 10);
            } catch (err) {
                throw new Error('Number parsing error: ' + err);
            }
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
