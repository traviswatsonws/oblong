import { createSelector, Selector } from 'reselect'
import {
  Query,
  QueryDependencies,
  isQueryable,
  Queryable,
  OblongState,
} from './coreTypes'

export interface QueryBuilder<TDep> {
  with: <TNewDep>(
    dependencies: QueryDependencies<TNewDep>
  ) => QueryBuilder<TNewDep>
  as: <TOut>(inner: (dependencies: TDep) => TOut) => Query<TDep, TOut>
}

const createSelectorFromDependencies = <TDep, TOut>(
  inner: (dependencies: TDep) => TOut,
  dependencies: QueryDependencies<TDep>
): Selector<OblongState, TOut> => {
  const dependencyKeys = Object.keys(dependencies)
  const dependentSelectors = dependencyKeys.map((i) => {
    const dependency = dependencies[i] as Queryable<any>
    if (!dependency[isQueryable]) {
      throw new Error(`Invalid dependency. ${i} is not Queryable.`)
    }

    return dependency.selector
  })
  const remappedInner = (...args) =>
    inner(
      dependencyKeys.reduce(
        (out, i, index) => ({ ...out, [i]: args[index] }),
        {}
      ) as any
    )

  return createSelector(dependentSelectors, remappedInner)
}

export const createQuery = <TDep>() => {
  let deps = {} as QueryDependencies<TDep>

  const instance: QueryBuilder<TDep> = {
    with: <TNewDep>(dependencies: QueryDependencies<TNewDep>) => {
      deps = dependencies as any
      return (instance as unknown) as QueryBuilder<TNewDep>
    },
    as: <TOut>(inner: (dependencies: TDep) => TOut): Query<TDep, TOut> => {
      const selector = createSelectorFromDependencies(inner, deps)

      return {
        [isQueryable]: true,
        resolve: (store) => ({
          get: () => selector(store.getState()),
          set: () => {
            throw new Error(`Cannot assign to query.`)
          },
        }),
        selector,
        inner,
      }
    },
  }

  return instance
}
