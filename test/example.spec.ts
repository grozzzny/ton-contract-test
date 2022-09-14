import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
chai.use(chaiBN(BN));

import * as fs from "fs";
import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {cellToBoc} from "ton-contract-executor/dist/utils/cell"
import { Slice, toNano} from "ton/dist"
import {SendMsgAction} from "ton-contract-executor/dist"
import {Buffer} from "buffer"
const zeroAddress = Address.parseRaw("0:0000000000000000000000000000000000000000000000000000000000000000");


const util = require('util')
const path = require("path")
const exec = util.promisify(require('child_process').exec)

const getCell = async (source: string) => {
  fs.writeFileSync('runtime.fc', source)
  await compileCell('runtime.fc')
  const data = fs.readFileSync("runtime.cell")
  await exec(`rm -f runtime.fif runtime.cell runtime.fc runtime.merged.fc`)
  return Cell.fromBoc(data)[0]
}

const compileCell = async (pathToFc: string) => {
  const name = path.parse(pathToFc).name
  await exec(`cat stdlib.fc ${pathToFc} > ${name}.merged.fc`) // Add lib stdlib
  await exec(`func -APS -o ${name}.fif ${name}.merged.fc`) // Compile fif file
  await exec(`echo "boc>B \\"${name}.cell\\" B>file" >> ${name}.fif`)
  await exec(`fift ${name}.fif`) // Run and compile cell file
  await exec(`rm -f ${name}.fif ${name}.merged.fc`) // Delete files fif and .merged.fc
}

describe("Counter tests", () => {
  let contract: SmartContract;

  // beforeEach(async () => {
  //   const initDataCell = beginCell().storeUint(17, 64).endCell(); // the function we've implemented just now
  //   await compileCell('ctr.fc')
  //   const initCodeCell = Cell.fromBoc(fs.readFileSync("ctr.cell"))[0]; // compilation output from part 1 step 5
  //   contract = await SmartContract.fromCell(initCodeCell, initDataCell, {
  //     debug: true
  //   })
  // });

  it("Dynamic test", async () => {
    const source = `
cell load_data() {
	cell data = get_data();
	slice ds = data.begin_parse();
	if (ds.slice_bits() == 0) {
		return new_dict();
	} else {
		return data;
	}
}

() recv_internal(int balance, int msg_value, cell in_msg_full, slice in_msg_body) {
	int op = in_msg_body~load_uint(32);
	int query_id = in_msg_body~load_uint(64);
	
	cell data = get_data();
	slice ds = data.begin_parse();
	cell dic = ds.slice_bits() == 0 ? new_dict() : data;
	
	if (op == 1) {
	  int key = in_msg_body~load_uint(256);
	  dic~udict_set(256, key, in_msg_body);
	  set_data(dic);
	  return ();
	}
	if (op == 2) {
	  int key = -1;
    do {
      (key, slice cs, int f) = dic.udict_get_next?(256, key);
      if (f) {
        int valid_until = cs~load_uint(64);
        if (valid_until < now()) {
          dic~udict_delete?(256, key);
        }
      }
    } until (~ f);
  
    if (dic.dict_empty?()) {
      set_data(begin_cell().end_cell());
    } else {
      set_data(dic);
    }
  
    return ();
	}
	throw (1001);
 }
 
(int, slice) get_key(int key) method_id {
	cell dic = load_data();
	(slice payload, int success) = dic.udict_get?(256, key);
	throw_unless(98, success);

	int valid_until = payload~load_uint(64);
	return (valid_until, payload);
}
`
    let contract = await SmartContract.fromCell(await getCell(source), new Cell(), {debug: true, getMethodsMutate: true})
    contract.setC7Config({
      balance: 500,
    })

    const res2 = await contract.invokeGetMethod("get_key", [{type: 'int', value: '123'}]);
    console.log('res2.result', res2.result)


    const message = beginCell()
      .storeUint(1, 32) // op
      .storeUint(12345, 64) // query_id
      .storeUint(123, 256) // key
      .storeUint(1000, 64) // valid until
      //.storeUint(666, 128) // valid until
      .storeBuffer(Buffer.from('Привет'))
      .endCell();

    const res = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 1, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    );

    const res3 = await contract.invokeGetMethod("get_key", [{type: 'int', value: '123'}]);
    console.log('res3.result', res3.result)
    const [int3, slice3] = res3.result as [number, Slice]


    console.log('value', slice3.toCell().bits.buffer.toString('utf8'))
    //console.log('slice3', parseInt(slice3.toCell().bits.toString(), 2))

    // console.log('res', res)

  })


//   it("Balance", async () => {
//     const source = `
// () main() {
//     ;; noop
// }
// int my_balance() method_id {
//   [int res, cell a] = get_balance();
//   return res;
// }
// `
//     let contract = await SmartContract.fromCell(await getCell(source), new Cell(), {debug: true})
//     contract.setC7Config({
//       balance: 500,
//     })
//     let res = await contract.invokeGetMethod('my_balance', [])
//     console.log('res', res.result[0]?.toString())
//     expect(res.result[0]).to.bignumber.equal(new BN(500))
//   });

  // it("Dynamic test", async () => {
  //   const source = `
  //       () main() {
  //           ;; noop
  //       }
  //       int test() method_id {
  //           ~dump(8888);
  //           return 777;
  //       }
  //   `
  //   const cell = await getCell(source)
  //   let contract = await SmartContract.fromCell(cell, new Cell(), {debug: true})
  //   let res = await contract.invokeGetMethod('test', [])
  //   console.log('res.log', res.logs)
  //   console.log('result', res.result[0]?.toString())
  // });

  // it("should run the first test", async () => {
  //   const call = await contract.invokeGetMethod("counter", []);
  //   const result = call.result[0]
  //   console.log('result parse', result?.toString())
  //   expect(call.result[0]).to.be.bignumber.equal(new BN(17));
  // });

  // it("should increment the counter value", async () => {
  //   const message = beginCell().storeUint(1, 32).storeUint(0, 64).endCell()
  //   const send = await contract.sendInternalMessage(
  //     new InternalMessage({
  //       from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
  //       to: zeroAddress, // ignored, this is assumed to be our contract instance
  //       value: 0, // are we sending any TON coins with this message
  //       bounce: true, // do we allow this message to bounce back on error
  //       body: new CommonMessageInfo({
  //         body: new CellMessage(message)
  //       })
  //     })
  //   );
  //   expect(send.type).to.equal("success");
  //   console.log('~dump',send.logs);
  //
  //   const call = await contract.invokeGetMethod("counter", []);
  //   const result = call.result[0]
  //   console.log('result parse', result?.toString())
  //   expect(call.result[0]).to.be.bignumber.equal(new BN(18));
  // });
});