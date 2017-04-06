// @flow

import { createOrchestrator } from '../src'
import { createKV, type KV } from '../src/reducers/kv'

import { configurePersist } from 'redux-p/src/index'
const { persist } = configurePersist()

const orchestrator = createOrchestrator({ persistors: [], persist })
const kv = createKV(orchestrator)

// get maintains flow type of init value
let [_, getNum]: KV<number> = kv({
  key: 'getTest',
  init: 1
})
let aNum: number = getNum({})
// $ExpectError
let aString: string = getNum({})


let [setNum, __]: KV<number> = kv({
  key: 'setTest',
  init: 1
})
setNum(1)
// $ExpectError
setNum('a')
