import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import BN from "bn.js";
import { Cell, Address, InternalMessage, CommonMessageInfo, CellMessage, beginCell } from "ton";
import { SmartContract } from "ton-contract-executor";
import {buildCodeCell, buildCodeCell2} from "../helpers/compillers"

chai.use(chaiBN(BN))

const zeroAddress = Address.parseRaw("0:0000000000000000000000000000000000000000000000000000000000000000")

describe("Romanovichim", () => {

  it("Simple FunC Smart Contract", async () => {
    const source = `
() recv_internal(slice in_msg_body) impure {
	throw_if(35,in_msg_body.slice_bits() < 32);

	int n = in_msg_body~load_uint(32);

	slice ds = get_data().begin_parse();
	int total = ds~load_uint(64);

	total += n;

	set_data(begin_cell().store_uint(total, 64).end_cell());
}
 
int get_total() method_id {
	slice ds = get_data().begin_parse();
 	int total = ds~load_uint(64);
	
	return total;
}
`
    const dataCell = beginCell()
      .storeUint(1, 64)
      .endCell()

    const contract = await SmartContract.fromCell(await buildCodeCell(source), dataCell, {debug: true, getMethodsMutate: true})

    const message = beginCell()
      .storeUint(10, 32)
      .endCell()

    const send = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 1, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    )
    expect(send.type).to.equal("success")

    const call = await contract.invokeGetMethod("get_total", [])
    expect(call.type).to.equal("success")
    expect(call.result[0]).to.be.bignumber.equal(new BN(11))
  })


  it("Messages, let's write a proxy contract", async () => {
    const source = `
int equal_slices (slice a, slice b) asm "SDEQ";

slice load_data () inline {
  var ds = get_data().begin_parse();
  return ds~load_msg_addr();
}

slice parse_sender_address (cell in_msg_full) inline {
  var cs = in_msg_full.begin_parse();
  var flags = cs~load_uint(4);
  slice sender_address = cs~load_msg_addr();
  return sender_address;
}

() recv_internal (int balance, int msg_value, cell in_msg_full, slice in_msg_body) {
  slice sender_address = parse_sender_address(in_msg_full);
  slice owner_address = load_data();

  if ~ equal_slices(sender_address, owner_address) {
	cell msg_body_cell = begin_cell().store_slice(in_msg_body).end_cell();

	var msg = begin_cell()
		  .store_uint(0x10, 6)
		  .store_slice(owner_address)
		  .store_grams(0)
		  .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
		  .store_slice(sender_address)
		  .store_ref(msg_body_cell)
		  .end_cell();
	 send_raw_message(msg, 64);
   }
}
`
    const dataCell = beginCell()
      .storeAddress(Address.parse('UQDfcXdP1DtS1w1aQRvjC8sl1qduhMADWafk6TpZE1Eo0AOL'))
      .endCell()

    const contract = await SmartContract.fromCell(await buildCodeCell(source), dataCell, {debug: true, getMethodsMutate: true})

    const message = beginCell()
      .storeAddress(Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'))
      .endCell()

    const send = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 1, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    )

    expect(send.type).to.equal("success")
  })


  it("Flags and data storage in a contract", async () => {
    const source = `
int equal_slices (slice a, slice b) asm "SDEQ";

(slice, slice) load_data () inline {
  var ds = get_data().begin_parse();
  return (ds~load_msg_addr(), ds~load_msg_addr());
}

() save_data (slice manager_address, slice memorized_address) impure inline {
	 set_data(begin_cell().store_slice(manager_address).store_slice(memorized_address).end_cell());
}

slice parse_sender_address (cell in_msg_full) inline {
  var cs = in_msg_full.begin_parse();
  var flags = cs~load_uint(4);
  slice sender_address = cs~load_msg_addr();
  return sender_address;
}

() recv_internal (int balance, int msg_value, cell in_msg_full, slice in_msg_body) {
	int op = in_msg_body~load_int(32);
  int query_id = in_msg_body~load_uint(64);
  var sender_address = parse_sender_address(in_msg_full);
      
  if (op == 1) {
    (slice manager_address, slice memorized_address) = load_data();
    throw_if(1001, ~ equal_slices(manager_address, sender_address));
    slice new_memorized_address = in_msg_body~load_msg_addr();
    save_data(manager_address, new_memorized_address);
  } else {
    if (op == 2) {
      (slice manager_address, slice memorized_address) = load_data();
      var msg = begin_cell()
          .store_uint(0x10, 6)
          .store_slice(sender_address)
          .store_grams(0)
          .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
          .store_uint(3, 32)
          .store_uint(query_id, 64)
          .store_slice(manager_address)
          .store_slice(memorized_address)
        .end_cell();
      send_raw_message(msg, 64);
    } else {
      throw(3); 
    }
  }
}
`
    const dataCell = beginCell()
      .storeAddress(Address.parse('UQDfcXdP1DtS1w1aQRvjC8sl1qduhMADWafk6TpZE1Eo0AOL'))
      .storeAddress(Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'))
      .endCell()

    const contract = await SmartContract.fromCell(await buildCodeCell(source), dataCell, {debug: true, getMethodsMutate: true})

    const message = beginCell()
      .storeUint(2, 32) // op
      .storeUint(12345, 64) // query_id
      .storeAddress(Address.parse('UQDfcXdP1DtS1w1aQRvjC8sl1qduhMADWafk6TpZE1Eo0AOL'))
      .endCell()

    const send = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 1, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    )

    expect(send.type).to.equal("success")
  })


  it("HashMap storage", async () => {
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
    const contract = await SmartContract.fromCell(await buildCodeCell(source), new Cell(), {debug: true, getMethodsMutate: true})

    const message = beginCell()
      .storeUint(1, 32) // op
      .storeUint(12345, 64) // query_id
      .storeUint(123, 256) // key
      .storeUint(1000, 64) // valid until
      .storeUint(55999, 128) // 128-bit value
      .endCell()

    const send = await contract.sendInternalMessage(
      new InternalMessage({
        from: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // address of the sender of the message
        to: zeroAddress, // ignored, this is assumed to be our contract instance
        value: 1, // are we sending any TON coins with this message
        bounce: true, // do we allow this message to bounce back on error
        body: new CommonMessageInfo({
          body: new CellMessage(message)
        })
      })
    )
    expect(send.type).to.equal("success")

    const call = await contract.invokeGetMethod("get_key", [{type: 'int', value: '123'}])
    expect(call.type).to.equal("success")
  })
})