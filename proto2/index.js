import program from 'commander';
import { lex } from './lexer';
import { parse } from './parser';
import { executeWithContext } from './vm';

const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout,
});

const variableContext = [];

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
