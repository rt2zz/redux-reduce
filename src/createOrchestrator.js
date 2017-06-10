// @flow

import { compose } from 'redux'

import { persistReducer } from 'redux-p2/es/persistReducer'
import type { PersistConfig } from 'redux-p2/src/types'

type OrchestratorConfig = {
  defaultPersistKey?: string,
  persists?: Array<PersistConfig>, // @TODO type the curried persistReducer function
}

export type Orchestrator = {
  register: Function,
  createReducer: Function,
}

type Reducer = (Object, Object) => Object

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  // orchestrator is _sealed after first reducer execution
  // tihs may not be necessary but is a safety measure until we have full tests
  let _sealed = false
  let stateKeys = new Set()
  let reducers = {}
  let persistMap = {}
  let persists: Array<PersistConfig> = config.persists || []
  let defaultPersistKey = config.defaultPersistKey

  if (process.env.NODE_ENV !== 'production')
    validatePersists(persists, defaultPersistKey)

  // initialize the persist whitelists and attach to persistMap for later reference
  persists.forEach(p => {
    p.whitelist = []
    persistMap[p.key] = p
  })

  const register = (
    stateKey: string,
    persistKey: ?string = defaultPersistKey,
    reducer: Reducer,
  ) => {
    if (_sealed)
      throw new Error(
        'redux-reduce: cannot register after orchestrator is sealed',
      ) // @NOTE there could be possible in the future, need to think through consequences
    if (process.env.NODE_ENV !== 'production' && stateKeys.has(stateKey))
      throw new Error(
        `redux-reduce: key "${stateKey}" has already been registered`,
      )
    if (
      process.env.NODE_ENV !== 'production' &&
      persistKey &&
      !persistMap[persistKey]
    ) {
      throw new Error(
        'redux-reduce: key specified persistor which does not exist',
      )
    }

    stateKeys.add(stateKey)
    reducers[stateKey] = reducer
    persistKey && persistMap[persistKey].whitelist.push(stateKey)
  }

  // redux/combineReducers logic
  const rReducer = (state = {}, action) => {
    let hasChanged = false
    const nextState = {}
    for (let key of stateKeys) {
      const reducer = reducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }

  // persist combined reducer
  let prReducer = persists.reduce((r, persistConfig) => {
    return persistReducer(persistConfig, {}, r)
  }, rReducer)

  const createReducer = baseReducer => {
    return (state: Object, action: Object) => {
      _sealed = true
      let { _reduce, ...restState } = state || {}
      let newRestState = baseReducer(restState, action)
      let newPrState = prReducer(_reduce, action)
      if (newRestState === restState && newPrState === _reduce) return state
      else
        return {
          ...newRestState,
          _reduce: newPrState,
        }
    }
  }

  return {
    createReducer,
    register,
  }
}

function validatePersists(persists, defaultPersistKey) {
  if (!persists.some(p => p.key === defaultPersistKey))
    throw new Error(
      'redux-reduce: defaultPersistKey does not match any of the provided reducers',
    )
  persists.forEach(p => {
    if (p.whitelist || p.blacklsit)
      throw new Error(
        'redux-reduce: persist config cannot contain whitelist or blacklist',
      )
  })
}
