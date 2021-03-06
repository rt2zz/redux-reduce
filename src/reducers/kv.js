// @flow

import { REHYDRATE } from 'redux-p/src/constants'
import type { Orchestrator } from '../'

type KVConfig<I> = {
  key: string,
  init: I,
  expiresIn?: number,
  persist?: string,
};

type KVAction<I> = {
  type: 'SET_KV',
  payload: I,
};

type Node = {
  v: any,
  e?: number,
};

export type KV<I> = [(I) => KVAction<I>, (state: Object) => I];

export function createKV(orchestrator: Orchestrator) {
  const { register, preselect } = orchestrator

  return function<I>(config: KVConfig<I>): KV<I> {
    const reducer = createReducer(config)
    register(config.key, config.persist, reducer)
    return [
      (value: I) => kvAction(config.key, value),
      state =>
        (preselect ? preselect(state)._reduce : state._reduce)[config.key],
    ]
  }
}

const createReducer = config =>
  (state = {}, action) => {
    if (action.type === 'SET_KV' && action.key === config.key) {
      return createValueNode(action, config)
    }
    if (action.type === REHYDRATE && action.persistorKey === config.persist) {
      if (!action.payload) return state
      let now = Date.now()
      let incomingState = action.payload[config.key]
      return incomingState && (!incomingState.e || incomingState.e > now)
        ? incomingState
        : state
    }
    return state
  }

function createValueNode(action: Object, config: *) {
  let node: Node = {
    v: action.payload,
  }
  if (config.expiresIn) node.e = Date.now() + config.expiresIn
  return node
}

function kvAction(key, payload: any) {
  return {
    key,
    type: 'SET_KV',
    payload,
  }
}
