[![CircleCI Build Status](https://circleci.com/gh/atsu85/redux-actions-ts-reducer.svg?style=svg)](https://circleci.com/gh/atsu85/redux-actions-ts-reducer)

# Helpers for writing type-safe and bloat-free reducers using redux-actions and TypeScript
Helps You to write reducers for `redux-actions` actions in TypeScript in type-safe manner 
and without needing to specify excessive type information - 
everything is inferred based on types of redux-action actions and initial state.

If you want to be super-safe, also add return type for reducer arrow functions, 
to prevent returning more properties than type of state has declared.
