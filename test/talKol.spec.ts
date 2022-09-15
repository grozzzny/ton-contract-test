import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {buildCodeCell} from "../helpers/compillers"

chai.use(chaiBN(BN))

const zeroAddress = Address.parseRaw("0:0000000000000000000000000000000000000000000000000000000000000000")

describe("Tal Kol", () => {

  it("Counter contract", async () => {
    const source = `
(int) load_data() inline {                 ;; read function declaration - returns int as result
  var ds = get_data().begin_parse();       ;; load the storage cell and start parsing as a slice
  return (ds~load_uint(64));               ;; read a 64 bit unsigned int from the slice and return it
}

() save_data(int counter) impure inline {  ;; write function declaration - takes an int as arg
  set_data(begin_cell()                    ;; store the storage cell and create it with a builder 
    .store_uint(counter, 64)               ;; write a 64 bit unsigned int to the builder
    .end_cell());                          ;; convert the builder to a cell
}

() recv_internal(int msg_value, cell in_msg, slice in_msg_body) impure {  ;; well known function signature
  ~dump(12345);
  int op = in_msg_body~load_uint(32);                                     ;; parse the operation type encoded in the beginning of msg body
  var (counter) = load_data();                                            ;; call our read utility function to load values from storage
  if (op == 1) {                                                          ;; handle op #1 = increment
    save_data(counter + 1);                                               ;; call our write utility function to persist values to storage
  }
}

int counter() method_id {        ;; getter declaration - returns int as result
  var (counter) = load_data();   ;; call our read utility function to load value
  return counter;
}
`
    const dataCell = beginCell()
      .storeUint(17, 64)
      .endCell();

    let contract = await SmartContract.fromCell(await buildCodeCell(source), dataCell, {debug: true})

    const call = await contract.invokeGetMethod("counter", [])
    expect(call.result[0]).to.be.bignumber.equal(new BN(17))

    const message = beginCell()
      .storeUint(1, 32) // op params
      .endCell()

    const send = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 0, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    )
    expect(send.type).to.equal("success");

    const call2 = await contract.invokeGetMethod("counter", [])
    expect(call2.result[0]).to.be.bignumber.equal(new BN(18))
  })
})