export const lex = (source) => {
	const symbolStack = [];
	let currentSymbol = '';
	let currentIndex = 0;
	let currentLine = 0;

	const createSymbol = (text) => {
        let type;
		let token = text;

		const isInteger = token.match(/^[0-9]+$/g) !== null;
		const isDouble = token.match(/^[0-9]+[\.][0-9]+$/g) !== null;

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
		} else if (text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
			type = 'STRCONST';
			token = text.substring(1, text.length - 1);
		} else {
			switch (token) {
				case '&&':
				case '||':
					type = 'LOGICAL';
					break;
				case '==':
				case '!=':
				case '>=':
				case '<=':
				case '<':
				case '>':
					type = 'EQUALITY';
					break;
				case '=':
				case '+=':
				case '-=':
				case '*=':
				case '/=':
					type = 'ASSIGN';
					break;
				case '!':
				case '+':
				case '-':
				case '/':
				case '*':
				case '**':
				case '++':
				case '--':
					type = 'ARIT';
					break;
				case '[':
				case ']':
				case ')':
				case '(':
				case '{':
				case '}':
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
		switch (source[i]) {
			case '\n':
			case '\t':
				currentIndex = 0;
				++currentLine;
				continue;
			case '|':
			case '&':
			case '!':
			case '/':
			case '*':
			case '+':
			case '-':
			case '<':
			case '>':
			case '=':
			{
				if (currentSymbol.length)
					symbolStack.push(createSymbol(currentSymbol));

				let isDoubleOperand = false;

				switch (source[i + 1]) {
					case '*':
						if (source[i] !== '*')
							break;

						isDoubleOperand = true;
						break;
					case '+':
						if (source[i] !== '+')
							break;

						isDoubleOperand = true;
						break;
					case '-':
						if (source[i] !== '-')
							break;

						isDoubleOperand = true;
						break;
					case '&':
						if (source[i] !== '&')
							break;

						isDoubleOperand = true;
						break;
					case '|':
						if (source[i] !== '|')
							break;

						isDoubleOperand = true;
						break;
					case '=':
						isDoubleOperand = true;
						break;
					default:
						break;
				}

				if (isDoubleOperand) {
					symbolStack.push(createSymbol(source[i] + source[++i]));
					currentSymbol = '';
					continue;
				}

				symbolStack.push(createSymbol(source[i]));
				currentSymbol = '';
				break;
			}
			case '[':
			case ']':
			case ')':
			case '(':
			case '{':
			case '}':
			case ';':
			case ',':
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

	if (currentSymbol.length)
		symbolStack.push(createSymbol(currentSymbol));

	return symbolStack.map((sym, index) => ({ ...sym, id: index }));
};
