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
});
