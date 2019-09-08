import * as lexer from './lexer';
import * as parser from './parser';
import * as vm from './vm';

describe('Variable and Assign tests', () => {
	test('Creating lexical tokens', () => {
		const tokens = lexer.lex('var abc = 40;');

		expect(tokens.length).toBe(5);

		expect(tokens[0].type).toBe('NAME');
		expect(tokens[1].type).toBe('NAME');
		expect(tokens[2].type).toBe('ASSIGN');
		expect(tokens[3].type).toBe('INTCONST');
		expect(tokens[4].type).toBe('EOE');

		expect(tokens[1].dbg.line).toBe(0);
		expect(tokens[1].dbg.col).toBe(4);

		expect(tokens[3].token).toBe(40);
	});

	test('Creating abstract syntax tree', () => {
		const tokens = lexer.lex('var abc = 40;');
		const syntaxTree = parser.parse(tokens);

		expect(syntaxTree.length).toBe(1);
		expect(syntaxTree[0].nodeType).toBe('complex');
		expect(syntaxTree[0].type).toBe('=');
		expect(syntaxTree[0].lhs.type).toBe('var');
		expect(syntaxTree[0].lhs.value.type).toBe('NAME');
		expect(syntaxTree[0].lhs.value.value).toBe('abc');
		expect(syntaxTree[0].rhs.type).toBe('INTCONST');
		expect(syntaxTree[0].rhs.value).toBe(40);
	});

	test('Running code', () => {
		const tokens = lexer.lex('var abc = 40;');
		const syntaxTree = parser.parse(tokens);
		const results = vm.execute(syntaxTree);

		expect(results.length).toBe(1);
		expect(results[0]).toBe('ASSIGN (new) abc=40');
	});
});

describe('Order of operations (Arithmetics)', () => {
	test('Running code', () => {
		const tokens = lexer.lex('																		\
			(18 - 3) * 10 + 2;																			\
			6 * 6 + 7 * 5;																				\
			146 + 7 * 14 - 31;																			\
			4 ** 2 + -(40 / 20) * 3;																	\
			-66 - 30 / 10 ** (4 / 2) + 5;																\
			-(3 * ((2 + -4) - 4) / -1 * (((-(3 - 2) + ((2) -2) - 4) ** 2)) * 2 + -(6 / (1 + 1 ) - 2 ** 2)); 	\
		');
		const syntaxTree = parser.parse(tokens);
		const results = vm.execute(syntaxTree);

		expect(results[0]).toBe((18 - 3) * 10 + 2);
		expect(results[1]).toBe(6 * 6 + 7 * 5);
		expect(results[2]).toBe(146 + 7 * 14 - 31);
		expect(results[3]).toBe(4 ** 2 + -(40 / 20) * 3);
		expect(results[4]).toBe(-66 - 30 / 10 ** (4 / 2) + 5);
		expect(results[5]).toBe(-(3 * ((2 + -4) - 4) / -1 * (((-(3 - 2) + ((2) -2) - 4) ** 2)) * 2 + -(6 / (1 + 1 ) - 2 ** 2)));
	});
});

describe('Return result for name', () => {
	test('Running code', () => {
		const tokens = lexer.lex('var abc = 40; abc;');
		const syntaxTree = parser.parse(tokens);
		const results = vm.execute(syntaxTree);

		expect(results.length).toBe(2);
		expect(results[0]).toBe('ASSIGN (new) abc=40');
		expect(results[1]).toBe(40);
	});
});

describe('Simple arithmetic operations', () => {
	test('Creating lexical tokens', () => {
		const tokens = lexer.lex('var abc = 40 + 2; abc = abc - 20; abc;');

		expect(tokens.length).toBe(15);

		expect(tokens[0].type).toBe('NAME');
		expect(tokens[4].type).toBe('ARIT');
		expect(tokens[11].type).toBe('INTCONST');
	});

	test('Creating abstract syntax tree', () => {
		const tokens = lexer.lex('var abc = 40 + 2; abc = abc - 20; abc;');
		const syntaxTree = parser.parse(tokens);

		expect(syntaxTree.length).toBe(3);
		expect(syntaxTree[0].type).toBe('=');
		expect(syntaxTree[0].rhs.nodeType).toBe('complex');
		expect(syntaxTree[0].rhs.type).toBe('+');

		expect(syntaxTree[1].type).toBe('=');
		expect(syntaxTree[1].rhs.nodeType).toBe('complex');
		expect(syntaxTree[1].rhs.type).toBe('-');
		expect(syntaxTree[1].rhs.lhs.type).toBe('NAME');

		expect(syntaxTree[2].type).toBe('NAME');
	});

	test('Running code', () => {
		const tokens = lexer.lex('var abc = 40 + 2; abc = abc - 20; abc;');
		const syntaxTree = parser.parse(tokens);
		const results = vm.execute(syntaxTree);

		expect(results.length).toBe(3);
		expect(results[0]).toBe('ASSIGN (new) abc=42');
		expect(results[1]).toBe('ASSIGN abc=22');
		expect(results[2]).toBe(22);
	});
});

describe('Variable references', () => {
	test('Running code (Known references)', () => {
		const tokens = lexer.lex('var xyz=2; var abc = 40 + xyz;');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).not.toThrow();
	});

	test('Running code (Unknown variable reference)', () => {
		const tokens = lexer.lex('var abc = 40 + xyz;');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).toThrow();
	});

	test('Running code (Reference current variable)', () => {
		const tokens = lexer.lex('var abc = 40 + abc;');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).toThrow();
	});
});

describe('Double constants', () => {
	test('Running code', () => {
		const tokens = lexer.lex('var x = 0.5; 20 + x;');
		const syntaxTree = parser.parse(tokens);

		const results = vm.execute(syntaxTree);
		expect(results.length).toBe(2);
		expect(results[1]).toBe(20 + 0.5);
	});
});

describe('Scope & Variables', () => {
	test('Running code (Creating a scope)', () => {
		const tokens = lexer.lex('	\
			{						\
				var a = 4;			\
				var b = a + 4;		\
			}						\
		');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).not.toThrow();

		const results = vm.execute(syntaxTree);
		expect(results.length).toBe(1);
	});

	test('Running code (Access to upper scope)', () => {
		const tokens = lexer.lex('	\
			{						\
				var a = 4;			\
				var b = a + 4;		\
				{					\
					var c = a + b; 	\
				}					\
			}						\
		');

		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).not.toThrow();
	});

	test('Running code (Throw on cross scope access)', () => {
		const tokens = lexer.lex('	\
			{						\
				var a = 4;			\
				var b = a + 4;		\
				{					\
					var c = a + b; 	\
				}					\
				{					\
					var d = c + b; 	\
				}					\
			}						\
		');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).toThrow();
	});
});
