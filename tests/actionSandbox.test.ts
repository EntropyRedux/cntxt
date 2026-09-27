import { describe, it, expect } from 'vitest';
import { executeInSandbox } from '../src/services/actionSandbox';

describe('executeInSandbox Security Hardening', () => {
  const mockApi = {
    getText: () => 'Hello World',
    setText: () => {},
    toast: () => {}
  };

  it('executes safe arithmetic and string manipulations successfully', async () => {
    const result = await executeInSandbox('return 2 + 2;', mockApi);
    expect(result).toBe(4);
  });

  it('provides safe api access to document text', async () => {
    const result = await executeInSandbox('return api.getText().toUpperCase();', mockApi);
    expect(result).toBe('HELLO WORLD');
  });

  it('rejects prototype constructor escape attempts via dot notation', async () => {
    await expect(
      executeInSandbox('return ({}).constructor.constructor("return this")();', mockApi)
    ).rejects.toThrow(/Security Error/);
  });

  it('rejects prototype constructor escape attempts via bracket notation', async () => {
    await expect(
      executeInSandbox('return ({})["constructor"]["constructor"]("return this")();', mockApi)
    ).rejects.toThrow(/Security Error/);
  });

  it('rejects __proto__ access attempts', async () => {
    await expect(
      executeInSandbox('return Object.__proto__;', mockApi)
    ).rejects.toThrow(/Security Error/);
  });

  it('shadows dangerous host globals as undefined', async () => {
    const checkGlobal = await executeInSandbox('return typeof window;', mockApi);
    expect(checkGlobal).toBe('undefined');

    const checkFetch = await executeInSandbox('return typeof fetch;', mockApi);
    expect(checkFetch).toBe('undefined');

    const checkProcess = await executeInSandbox('return typeof process;', mockApi);
    expect(checkProcess).toBe('undefined');
  });

  it('rejects dynamic import(...) attempts', async () => {
    await expect(
      executeInSandbox('return import("/src/store/settingsStore");', mockApi)
    ).rejects.toThrow(/Security Error: Prototype, constructor, and dynamic import access/);
  });

  it('rejects import statements or expressions', async () => {
    await expect(
      executeInSandbox('import("data:text/javascript,console.log(1)");', mockApi)
    ).rejects.toThrow(/Security Error/);
  });

  it('supports base64Encode and base64Decode correctly with UTF-8', async () => {
    const encoded = await executeInSandbox('return api.utils.base64Encode("Hello 🌍");', mockApi);
    expect(encoded).toBe('SGVsbG8g8J+MjQ==');

    const decoded = await executeInSandbox(`return api.utils.base64Decode("${encoded}");`, mockApi);
    expect(decoded).toBe('Hello 🌍');
  });

  it('provides working utilities: slugify, formatJSON, countWords', async () => {
    const slug = await executeInSandbox('return api.utils.slugify("Hello World -- Test!");', mockApi);
    expect(slug).toBe('hello-world-test');

    const formatted = await executeInSandbox('return api.utils.formatJSON(\'{"a":1}\');', mockApi);
    expect(formatted).toBe('{\n  "a": 1\n}');

    const words = await executeInSandbox('return api.utils.countWords("three blind mice");', mockApi);
    expect(words).toBe(3);
  });

  it('evaluates formulas via evaluateFormula', async () => {
    const res = await executeInSandbox('return api.evaluateFormula("10 + 20");', mockApi);
    expect(res).toBe(30);
  });
});

