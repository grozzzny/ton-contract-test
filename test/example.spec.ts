import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
chai.use(chaiBN(BN));
import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {buildCodeCell} from "../helpers/compillers"

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