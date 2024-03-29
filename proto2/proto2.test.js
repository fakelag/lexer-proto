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

	test('Running code (Assigning a value to variable)', () => {
		const tokens = lexer.lex('var abc = 40;');
		const syntaxTree = parser.parse(tokens);
		const results = vm.execute(syntaxTree);

		expect(results.length).toBe(1);
		expect(results[0]).toBe('ASSIGN (new) abc=40');
	});

	test('Running code (Throw on recreating same variable)', () => {
		const tokens = lexer.lex('var abc = 40; var abc = 42;');
		const syntaxTree = parser.parse(tokens);

		expect(() => vm.execute(syntaxTree)).toThrow();
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

describe('String constants', () => {
	test('Running code', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = "abcdefg"; 											\
			var b = a + "hijklmn";										\
			a;															\
			b;															\
			if (b == "abcdefghijklmn") __flag();						\
			if (b == "qwerty") __die();									\
		')), context);

		expect(results[2]).toBe('abcdefg');
		expect(results[3]).toBe('abcdefghijklmn');
		expect(context.__flag).toBe(1);
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

describe('Advanced operators', () => {
	test('Equality operators (==, !=, >, >=, <=)', () => {
		const results = vm.execute(parser.parse(lexer.lex('		\
			10 == 10;											\
			10 == 20;											\
			10 != 20;											\
			10 != 10;											\
			10 >= 10;											\
			10 >= 20;											\
			10 <= 10;											\
			20 <= 10;											\
			10 < 20;											\
			20 < 10;											\
			20 > 10;											\
			20 < 10;											\
			var a = 10 == 10;									\
			var b = 10 != 10;									\
			var c = 10 > 10;									\
			var d = 10 <= 10;									\
			a;													\
			b;													\
			c;													\
			d;													\
		')));

		expect(results.length).toBe(20);

		expect(results[0]).toBe(true);
		expect(results[1]).toBe(false);
		expect(results[2]).toBe(true);
		expect(results[3]).toBe(false);
		expect(results[4]).toBe(true);
		expect(results[5]).toBe(false);
		expect(results[6]).toBe(true);
		expect(results[7]).toBe(false);
		expect(results[8]).toBe(true);
		expect(results[9]).toBe(false);
		expect(results[10]).toBe(true);
		expect(results[11]).toBe(false);

		expect(results[16]).toBe(true);
		expect(results[17]).toBe(false);
		expect(results[18]).toBe(false);
		expect(results[19]).toBe(true);
	});

	test('Assignment operators (+=, -=, *=, /=)', () => {
		const results = vm.execute(parser.parse(lexer.lex('		\
			var a = 0;											\
			a += 10;											\
			a;													\
			a -= 5;												\
			a;													\
			a *= 2;												\
			a;													\
			a /= 2;												\
			a;													\
		')));

		expect(results[2]).toBe(10);
		expect(results[4]).toBe(5);
		expect(results[6]).toBe(10);
		expect(results[8]).toBe(5);
	});

	test('Increment & Decrement operators (++, --)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = 0;														\
			++a;															\
			a;																\
			a++;															\
			a;																\
			--a;															\
			a;																\
			a = 0;															\
			if (++a == 1) {													\
				__flag(); 													\
			}																\
			if (a++ == 1) {													\
				__flag();													\
			}																\
			4 + ++a * 5 -(4 * a--) + a;										\
		')), context);

		expect(results[1]).toBe(1);
		expect(results[2]).toBe(1);
		expect(results[3]).toBe(1);
		expect(results[4]).toBe(2);
		expect(results[5]).toBe(1);
		expect(results[6]).toBe(1);

		expect(results[10]).toBe(9);

		expect(context.__flag).toBe(2);
	});

	test('Negation operator (!)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = false;												\
			if (!a) {													\
				__flag();												\
			}															\
			a = true;													\
			if (!a == false) {											\
				__flag();												\
			}															\
			if (!!a == false) {											\
				__die();												\
			}															\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('Logical operators (&&, ||)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = 1;														\
			var b = 2;														\
			if (a == 1 && b == 2) __flag();									\
			if (a == 1 && b == 1) __die();									\
			if (a == 1 || b == 1) __flag();									\
			if (a == 3 || b == 3) __die();									\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('Access operator ([]))', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var string = "abcdefg";											\
			if (string[0] == "a") __flag();									\
			if (string[2] == "c") __flag();									\
		')), context);

		expect(context.__flag).toBe(2);
	});
});

describe('True & False keywords', () => {
	test('Running code', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = true;													\
			if (a) {														\
				__flag();													\
			}																\
			if (a == false) {												\
				__die();													\
			}																\
			if (a == true) {												\
				__flag();													\
			}																\
		')), context);

		expect(context.__flag).toBe(2);
	});
});

describe('Conditional blocks', () => {
	test('if conditional block', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = 10;														\
			var b = 5;														\
			if (a == 10) {													\
				__flag();													\
			}																\
			if (a != 10) {													\
				__flag();													\
			}																\
			if (a + b > 14)													\
			{																\
				__flag();													\
			}																\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('while block', () => {
		const results = vm.execute(parser.parse(lexer.lex('		\
			var a = 10;											\
			var b = 0;											\
			while (a > 5)										\
			{													\
				b += 2;											\
				a -= 1;											\
			}													\
			b;													\
		')));

		expect(results.length).toBe(4);
		expect(results[3]).toBe(10);
	});

	test('while block (break keyword)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var a = 0;														\
			while (a < 500)													\
			{																\
				a = a + 1;													\
				if (a == 324)												\
					break;													\
			}																\
			if (a == 324) __flag();											\
		')), context);

		expect(context.__flag).toBe(1);
	});
});

describe('Functions', () => {
	test('Function declarations', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			function helloWorld()						\
			{											\
				print("Hello");							\
			}											\
		')), context);

		expect(context.__flag).toBe(0);
	});

	test('Function call', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			function addFlag()							\
			{											\
				__flag();								\
			}											\
			addFlag();									\
			addFlag();									\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('Function call (with arguments)', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			function addFlag(addDouble, setThisTo3)		\
			{											\
				if (addDouble)							\
					__flag();							\
				__flag();								\
				if (setThisTo3 != 3)					\
					__die();							\
			}											\
			addFlag(false, 3);							\
			addFlag(true, 3);							\
		')), context);

		expect(context.__flag).toBe(3);
	});

	test('Return keyword', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			function square(number)						\
			{											\
				return number * number;					\
			}											\
			if (square(2) == 4) __flag();				\
			if (square(4) == 16) __flag();				\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('Recursion', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			function fibonacci(number)					\
			{											\
				if (number <= 1)						\
					return 1;							\
														\
				return fibonacci(number - 1)			\
					+ fibonacci(number -2); 			\
			}											\
			if (fibonacci(5) == 8) __flag();			\
			if (fibonacci(10) == 89) __flag();			\
			if (fibonacci(15) == 987) __flag();			\
		')), context);

		expect(context.__flag).toBe(3);
	});

	test('Scope access (Global)', () => {
		const context = vm.createInitialContext();
		vm.executeWithContext(parser.parse(lexer.lex('	\
			var globalVariable = 42;					\
			function func()								\
			{											\
				if (globalVariable == 42) __flag();		\
			}											\
			func();										\
		')), context);

		expect(context.__flag).toBe(1);
	});

	test('Scope access (Invalid access)', () => {
		const syntaxTree = parser.parse(lexer.lex('		\
			function func()								\
			{											\
				localVariable += 1;						\
			}											\
			{											\
				var localVariable = 33;					\
				func();									\
			}											\
		'));

		expect(() => vm.execute(syntaxTree)).toThrow();
	});
});

describe('Arrays', () => {
	test('Running code (Simple arrays)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var arr = [1, 2, 3, 4];											\
			if (arr[0] == 1) __flag();										\
			if (arr[1 + 2] == 4) __flag();									\
		')), context);

		expect(context.__flag).toBe(2);
	});

	test('Running code (2D arrays)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var arr = 	[[1, 1],											\
						[0, 0],												\
						[0, 1],												\
						[1, 1]];											\
			var i = 0;														\
			var j = 0;														\
			while(i < 4) {													\
				while(j < 2) {												\
					if (arr[i][j] == 1) __flag();							\
					++j;													\
				}															\
				j = 0;														\
				++i;														\
			}																\
		')), context);

		expect(context.__flag).toBe(5);
	});

	test('Running code (3D arrays)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var arr = 	[[[1, 1], [0, 1]], [[1, 1], [0, 0]],				\
						[[1, 1], [0, 0]], [[0, 1], [1, 0]]];				\
			var a = 0;														\
			var b = 0;														\
			var c = 0;														\
			while(a < 4) {													\
				while(b < 2) {												\
					while(c < 2) {											\
						if (arr[a][b][c] == 1) __flag();					\
						++c;												\
					}														\
					c = 0;													\
					++b;													\
				}															\
				b = 0;														\
				++a;														\
			}																\
		')), context);

		expect(context.__flag).toBe(9);
	});

	test('Running code (Array setter)', () => {
		const context = vm.createInitialContext();
		const { results } = vm.executeWithContext(parser.parse(lexer.lex('	\
			var arr = [1, 2, 3, 4];											\
			arr[1] = "abcdefg";												\
			if (arr[1] == "abcdefg") __flag();								\
		')), context);

		expect(context.__flag).toBe(1);
	});
});
