import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
import * as compiler from 'ton-compiler';
chai.use(chaiBN(BN));
import * as fs from "fs";
import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {Buffer} from "buffer"

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