// sample for now 

/** @type {Record<string, Record<string, string[]>>} */
const CHALLENGES = {
    python: {
        EASY: [
            'print("Hello, World!")',
            "x = 10",
            'name = input("Name: ")',
            "numbers = [1, 2, 3]",
        ],
        MEDIUM: [
            "for i in range(5): print(i)",
            "squares = [n * n for n in range(10)]",
            "def add(a, b): return a + b",
            'if x > 0 and y > 0: print("positive")',
        ],
        HARD: [
            "evens = list(filter(lambda n: n % 2 == 0, numbers))",
            'with open("file.txt") as f: lines = f.readlines()',
            "print(sum(len(w) for w in words if w.isalpha()))",
            "value = int(text) if text.isdigit() else 0",
        ],
    },
    javascript: {
        EASY: [
            'console.log("Hello, World!");',
            "let count = 0;",
            "const items = [1, 2, 3];",
            'let name = "Ana";',
        ],
        MEDIUM: [
            "const add = (a, b) => a + b;",
            "for (let i = 0; i < 5; i++) console.log(i);",
            "const doubled = nums.map(n => n * 2);",
            'if (score >= 50) { console.log("Pass"); }',
        ],
        HARD: [
            "const evens = nums.filter(n => n % 2 === 0);",
            "const total = prices.reduce((sum, p) => sum + p, 0);",
            "fetch(url).then(res => res.json()).then(data => console.log(data));",
            'setTimeout(() => console.log("done"), 1000);',
        ],
    },
    java: {
        EASY: [
            "int x = 10;",
            'String name = "Ana";',
            'System.out.println("Hello, World!");',
            "boolean done = false;",
        ],    
        MEDIUM: [
            "int[] nums = {1, 2, 3};",
            "for (int i = 0; i < 5; i++) System.out.println(i);",
            'if (x > 0 && y > 0) System.out.println("positive");',
            "public static int add(int a, int b) { return a + b; }",
        ],    
        HARD: [
            "List<String> names = new ArrayList<>();",
            "Map<String, Integer> ages = new HashMap<>();",
            'public static void main(String[] args) { System.out.println("Hi"); }',
            "int total = Arrays.stream(nums).sum();",
        ],
    },
};

const LANGUAGES  = Object.keys(CHALLENGES);
const DIFFICULTY = Object.keys(CHALLENGES.python);

module.exports = { CHALLENGES, LANGUAGES, DIFFICULTY };
