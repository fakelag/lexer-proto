import util from 'util';
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

			if (process.env.NODE_ENV === 'debug')
				console.log(util.inspect(syntaxTree, false, null));
			else
				console.log(executeWithContext(syntaxTree, variableContext).results);
		} catch (err) {
			console.error(err);

			if (err.message === 'error_exit_unsuccessful')
				process.exit(0);
		}

		interpret();
	});
};

interpret();
