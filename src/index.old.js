// @flow

import { compose } from 'redux'

import { REHYDRATE } from 'redux-p/src/constants'
import type { PersistConfig } from 'redux-p/src/types'

type KV<C, S> = {
  set: ($Keys<S>, any, $Keys<C>) => void,
  get: ($Keys<S>) => any,
};

type KeyConfig = {
  persistKey?: string,
  expiresIn: number,
}

type Config = {
  keys: {
    [key: string]: KeyConfig
  },
  persistors: Array<PersistConfig>,
  persist: Function,
}

type Node = {
  v: any,
  e?: number,
}

const KV_SET = 'kv/SET'

export function createKV<C: Config, S: Object>(
  config: C,
  initialState: S
): KV<C, S> {
  let persistKeys = config.persistors.map(p => p.key)
  let persistorMap = {}
  config.persistors.forEach(p => {
    if (p.whitelist || p.blacklist) console.error('redux-kv: invalid persistor config: cannot contain whitelist or blacklist')
    persistorMap[p.key] = { ...p, whitelist: [] }
  })
  Object.keys(config.keys).forEach(key => {
    let keyConfig = config.keys[key]
    // $FlowFixMe: flow doesnt follow Object.keys?
    if (!persistorMap[keyConfig.persistKey]) console.error(`redux-kv: key ${key} points to a missing persistor ${keyConfig.persistKey}`)
    if (keyConfig.persistKey) persistorMap[keyConfig.persistKey].whitelist.push(key)
  })

  const kv = (state: S, action: Object) => {
    if (action.type === KV_SET) {
      if (!config.keys[action.key]) throw new Error(`no valid config exists for key '${action.key}'`)
      return { ...state, [action.key]: createValueNode(action, config.keys[action.key]) }
    }
    if (action.type === REHYDRATE) {
      let now = Date.now()
      if (persistKeys.indexOf(action.persistKey) !== -1) {
        let newState = {...state}
        Object.keys(action.payload).forEach(key => {
          if (persistorMap[action.persistKey].whitelist.indexOf(key) !== -1) {
            let value = action.payload[key]
            if (!value.e || value.e > now) newState[key] = value
          }
        })
        return {
          ...state,
          ...action.payload,
        }
      }
    }
    return state
  }

  return compose(...makePersists(config.persist, config.persistors))(kv)
}

function createValueNode (action: Object, keyConfig: KeyConfig) {
  let node: Node = {
    v: action.value,
  }
  if (keyConfig.expiresIn) node.e = Date.now() + keyConfig.expiresIn
  return node
}

function makePersists (persist, persistors) {
  return persistors.map(persistConfig => {
    persist(persistConfig, null)
  })
}
