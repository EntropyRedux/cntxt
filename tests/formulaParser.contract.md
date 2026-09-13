# TEST CONTRACT: FormulaEngine (`src/services/formulaParser.ts`)

- **Component / Module:** `FormulaEngine`
- **Status:** WORKING IN PRODUCTION
- **Pillar Alignment:** Pillar 1 (Universal Presenter Purity) & Pillar 7 (Zero Silent Failures)

## Expected Behavior
Evaluates spreadsheet-style formula strings (e.g. `=SUM(1, 2, 3)`, `=WORDS()`, `=UPPER("text")`) against active document metrics.

## Inputs
- `formula: string`: Formula string, with or without leading `=`.
- Context metrics: `lineCount: number`, `wordCount: number`, `charCount: number`.

## Outputs
- `FormulaResult`:
  - `value: any`: Computed result (number, string, boolean).
  - `success: boolean`: Whether evaluation succeeded without parse error.
  - `error?: string`: Descriptive error message when `success === false`.

## Supported Operations
- Math: `SUM`, `AVERAGE`, `MIN`, `MAX`, `ROUND`, `ABS`, basic arithmetic (`+`, `-`, `*`, `/`).
- String: `UPPER`, `LOWER`, `LEN`, `TRIM`, `CONCAT`.
- Document metrics: `WORDS()`, `CHARS()`, `LINES()`.

## Edge Cases
- Division by zero returns structured error `"#DIV/0!"` or `success: false`.
- Unterminated parentheses or syntax errors report parse failure without crashing runtime.
- Malicious formulas attempting code execution are rejected by parser AST token validation.

## Mock Dependencies
- None. Fully deterministic mathematical engine.
