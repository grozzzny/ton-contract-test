# TON Contract test TypeScript

Sources:
 - https://github.com/Naltox/ton-contract-executor/blob/8b352d0cf96553e9ded19a102a890e17c973d017/src/smartContract/SmartContract.spec.ts


### Example test code
```js
describe("SmartContract", () => {
  it("should run basic contract", async () => {
    const source = `
        () main() {
            ;; noop
        }
        int test() method_id {
            ~dump(12345);
            return 777;
        }
    `
    
    // Linux
    const contract = await SmartContract.fromCell(await buildCodeCell(source), new Cell(), {debug: true, getMethodsMutate: true})

    // Mac
    //const contract = await SmartContract.fromFuncSource(source, new Cell(), {debug: true, getMethodsMutate: true})

    let res = await contract.invokeGetMethod('test', [])
    expect(res.result[0]).to.be.bignumber.equal(new BN(777))
  })
})
```

### Example compile function by grozzzny
 - https://github.com/grozzzny/ton-compiler-groz

```js
const compiler = new TonCompiler({
  smartcontLibs: ['<ton directory>/crypto/smartcont/stdlib.fc'],
  fiftLib: '<ton directory>/crypto/fift/lib',
  fift: '/usr/bin/fift',
  func: '/usr/bin/func',
  tmpDir: '/tmp'
})
await compiler.getCell('..code func')
await compiler.compileCell(['contract.fc'], 'contract')
```

### Example compile function by the-ton-tech
 - https://github.com/the-ton-tech/ton-compiler
```
npm run build --prefix node_modules/ton-compiler
```
```js
async function buildCodeCell(source: string) {
  const pathToStdlib = 'node_modules/ton-compiler/test/contracts/stdlib.fc'

  const result = await compiler.funcCompile({
    optLevel: 2,
    sources: {
      "stdlib.fc": fs.readFileSync(pathToStdlib, { encoding: 'utf-8' }),
      "yourContract": source
    }
  })

  if (result.status === 'error') throw new Error(result.message)

  return Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0]
}
```

## Lessons
- https://society.ton.org/ton-hello-world-step-by-step-guide-for-writing-your-first-smart-contract-in-func
- https://society.ton.org/ton-hello-world-guide-for-writing-first-smart-contract-in-func-part-2
- https://github.com/romanovichim/TonFunClessons_ru
- https://github.com/romanovichim/TonFunClessons_Eng

## Documentation
- https://www.tonspace.co/
- https://ton.org/docs/#/