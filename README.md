# TON Contract test TypeScript

Sources:
 - https://github.com/the-ton-tech/ton-compiler
 - https://github.com/Naltox/ton-contract-executor/blob/8b352d0cf96553e9ded19a102a890e17c973d017/src/smartContract/SmartContract.spec.ts

```json
{
  "name": "",
  "description": "",
  "version": "0.0.0",
  "scripts": {
    "test": "mocha --exit test/**/*.spec.ts"
  },
  "devDependencies": {
    "@types/bn.js": "^5.1.0",
    "@types/chai": "^4.3.0",
    "@types/mocha": "^9.0.0",
    "@types/node": "^16.11.10",
    "chai": "^4.3.4",
    "chai-bn": "^0.3.1",
    "mocha": "^9.1.3",
    "ton": "^9.6.3",
    "ton-contract-executor": "^0.4.8",
    "ton-crypto": "^3.1.0",
    "tonweb": "^0.0.54",
    "ts-node": "^10.7.0",
    "typescript": "^4.5.2",
    "ton-compiler": "https://github.com/the-ton-tech/ton-compiler"
  },
  "mocha": {
    "require": [
      "chai",
      "ts-node/register"
    ],
    "timeout": 20000
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

```
npm run build --prefix node_modules/ton-compiler
npm test
```

### Example test code
```js
describe("SmartContract", () => {
  it("should run basic contract", async () => {
    const source = `
        () main() {
            ;; noop
        }
        int test() method_id {
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

### Example compile function
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
