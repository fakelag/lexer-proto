import { lex } from './lexer';
import { parse } from './parser';
import { executeWithContext, createInitialContext } from './vm';

const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout,
});

const variableContext = createInitialContext();

const interpret = () => {
	readline.question('> ', (line) => {
		try {
			const symbols = lex(line);
			const syntaxTree = parse(symbols);
			console.log(executeWithContext(syntaxTree, variableContext).results);
		} catch (err) {
			console.error(err);
		}

		interpret();
	});
};

interpret();
