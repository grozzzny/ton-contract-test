import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
chai.use(chaiBN(BN));

import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {buildCodeCell} from "../helpers/compillers"

describe("Other tests", () => {

  it("Balance", async () => {
    const source = `
() main() {
    ;; noop
}
int my_balance() method_id {
  [int res, cell a] = get_balance();
  return res;
}
`
    const contract = await SmartContract.fromCell(await buildCodeCell(source), new Cell(), {debug: true})
    contract.setC7Config({
      balance: 500,
    })

    let res = await contract.invokeGetMethod('my_balance', [])
    expect(res.result[0]).to.bignumber.equal(new BN(500))
  })

})