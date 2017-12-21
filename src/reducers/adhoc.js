// @flow

import type { Orchestrator } from '../createOrchestrator'

type AdhocConfig<R> = {
  key: string,
  reducer: R,
  expiresIn?: number,
  persist?: string,
  hydrate?: Function,
}

type Adhoc = Function

export function createAdhoc(orchestrator: Orchestrator) {
  const { register } = orchestrator

  return function<R>(config: AdhocConfig<R>): Adhoc {
    register(config.key, config.persist, config.reducer)
    return state => {
      return state._reduce[config.key]
    }
  }
}
