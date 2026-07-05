// The `js-interpreter` npm package (a maintained packaging of Neil Fraser's
// JS-Interpreter, the same sandboxed/steppable interpreter Google's Blockly
// Games uses) ships no TypeScript types. This ambient declaration covers the
// subset of its API this project uses.
declare module 'js-interpreter' {
  type InitFunc = (interpreter: Interpreter, globalObject: unknown) => void;

  class Interpreter {
    constructor(code: string, initFunc?: InitFunc);
    step(): boolean;
    run(): boolean;
    value: unknown;
    setProperty(obj: unknown, name: string, value: unknown): void;
    createNativeFunction(fn: (...args: never[]) => unknown): unknown;
    globalObject: unknown;
  }

  export default Interpreter;
}
