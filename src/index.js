// @flow

import { compose } from 'redux'

import { REHYDRATE } from 'redux-p/src/constants'
import type { PersistConfig } from 'redux-p/src/types'

type OrchestratorConfig = {
  persistors: Array<PersistConfig>,
  persist: any,
  preselect?: (Object) => Object,
};

type Reducer = (Object, Object) => Object;

export type Orchestrator = {
  register: (string, persistKey?: string, Reducer) => void,
  preselect?: (Object) => Object,
  stateKeys: Set<string>,
  reducers: { [key: string]: Reducer },
  persistors: Array<Function>,
};

export function createOrchestrator(config: OrchestratorConfig) {
  let persistorConfigs = {}
  let reducers = {}
  let stateKeys = new Set()

  config.persistors.forEach(p => {
    if (p.whitelist || p.blacklist)
      console.error(
        'redux-reduce: invalid persistor config: cannot contain whitelist or blacklist'
      )
    persistorConfigs[p.key] = { ...p, whitelist: [], noAutoRehydrate: true }
  })

  const register = (
    stateKey: string,
    persistKey?: string,
    reducer: Reducer
  ) => {
    stateKeys.add(stateKey)
    reducers[stateKey] = reducer
    if (persistKey) {
      if (!persistorConfigs[persistKey])
        throw new Error(
          'redux-reduce: key specified persistor which does not exist'
        )
      persistorConfigs[persistKey].whitelist.push(stateKey)
    }
  }

  return {
    register,
    preselect: config.preselect,
    stateKeys,
    reducers,
    persistors: makePersists(config.persist, persistorConfigs),
  }
}

export function createReducer(orchestrator: Orchestrator) {
  const { stateKeys, reducers, persistors } = orchestrator
  const reducer = (state, action) => {
    if (action.scope === 'redux-reduce') {
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
    } else {
      return state
    }
  }
  compose(persistors)(reducer)
}

function makePersists(persist, persistors) {
  return persistors.map(persistConfig => {
    persist(persistConfig, null)
  })
}
