import * as fs from "fs"
import {Buffer} from "buffer"
import {Cell} from "ton/dist"
import * as compiler from 'ton-compiler';
import TonCompiler from "ton-compiler-groz"

/**
 * Ton compiler by the-ton-tech
 */
export async function buildCodeCell2(source: string) {
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

/**
 * Ton Compiler Groz
 */
export async function buildCodeCell(source: string) {
  return await new TonCompiler({
    smartcontLibs: ['/home/dmitrij/ton/crypto/smartcont/stdlib.fc'],
    fiftLib: '/home/dmitrij/ton/crypto/fift/lib',
  }).getCell(source)
}