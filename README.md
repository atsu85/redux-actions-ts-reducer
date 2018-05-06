[![CircleCI Build Status](https://circleci.com/gh/atsu85/redux-actions-ts-reducer.svg?style=svg)](https://circleci.com/gh/atsu85/redux-actions-ts-reducer)
[![npm](https://img.shields.io/npm/v/redux-actions-ts-reducer.svg)](https://www.npmjs.com/package/redux-actions-ts-reducer)

# redux-actions-ts-reducer

Helper for writing type-safe and bloat-free reducers using redux-actions and TypeScript
> Helps You to write reducers for `redux-actions` actions in TypeScript in type-safe manner 
and without needing to specify excessive type information - 
everything is inferred based on initial state and types of `redux-action` action creators.

## Table of Contents

* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
  * [No boilerblate, type-safe](#no-boilerblate-type-safe)
  * [Type-safety to the limits](#type-safety-to-the-limits)
  * [Code style](#code-style)
* [More information](#more-information)

## Getting Started

### Prerequisites
Assuming that you have already installed
1) `redux-actions`
(since this library uses internally `handleActions(previouslyAddedReducersAsMap)` from `redux-actions`
and can infer reducer `action.payload` type based on action creator type that is created with `createAction<actionPayloadType>(...)`) 
2) TypeScript type declarations `@types/redux-actions`
(since using this libary makes most sense with TypeScript that can detect problems at compile-time)


### Installation
```bash
$ npm install redux-actions-ts-reducer --save
```
or
```bash
$ yarn add redux-actions-ts-reducer
```

## Usage
### No boilerblate, type-safe
See comments in the example code bellow:
```TypeScript
import { ReducerFactory } from 'redux-actions-ts-reducer';
import { createAction } from 'redux-actions';

// Sample action creators(redux-actions) and action type constants that reducer can handle
const negate = createAction('NEGATE'); // action without payload
const add = createAction<number>('ADD'); // action with payload type `number`
const SOME_LIB_NO_ARGS_ACTION_TYPE = '@@some-lib/NO_ARGS_ACTION_TYPE'; // could be useful when action type like this is defined by 3rd party library
const SOME_LIB_STRING_ACTION_TYPE = '@@some-lib/STRING_ACTION_TYPE'; // could be useful when action type like this is defined by 3rd party library

// type of the state
class SampleState {
	count = 0;
	message: string = null;
}

// creating reducer that combines several reducers
const reducer = new ReducerFactory(new SampleState())
	// `state` argument and return type is inferred based on `new ReducerFactory(initialState)`.
	// Type of `action.payload` is inferred based on first argument (action creator)
	.addReducer(add, (state, action) => {
		return {
			...state,
			count: state.count + action.payload,
		};
	})
	// no point to add `action` argument to reducer in this case, as `action.payload` type would be `void` (and effectively useless)
	.addReducer(negate, (state) => {
		return {
			...state,
			count: state.count * -1,
		};
	})
	// when adding reducer for action using string actionType
	// (using `addReducer(actionType: string, reducerFunction)` instead of `redux-actions` actionCreator, that can be created with `createAction(...)`)
	// You should tell what is the action payload type using generic argument (if You plan to use `action.payload`)
	.addReducer<string>(SOME_LIB_STRING_ACTION_TYPE, (state, action) => {
		return {
			...state,
			message: action.payload,
		};
	})
	// action.payload type is `void` by default when adding reducer function using `addReducer(actionType: string, reducerFunction)`
	.addReducer(SOME_LIB_NO_ARGS_ACTION_TYPE, (state) => {
		return new SampleState();
	})
	// creates reducer (implementation delegates to `handleActions(previouslyAddedReducersAsMap)` in `redux-actions` package)
	.toReducer();

export default reducer;
```

As You can see, You don't need to specify types of reducer function `state` and `action` parameters or reducer function return type - 
State types for reducer functions (reducer function `state` argument and return type)
are inferred based on initial state (`new ReducerFactory(initialState)`).
Type of `action` (and `action.payload`) are inferred based on either

a) first argument type when passing in action creator as first argument
(using `ReducerFactory.addReducer(actionCreator: ActionFunctions, reducerFunction)`)

b) (optional) generic type of `addReducer` that defaults to `void`
(using `ReducerFactory.addReducer<ActionPayloadType>(actionType: string, reducerFunction)`)

So You don't need to specify any TypeScript type annotations 
for any parameters or return types.
This even works with
(`noImplicitAny` [TypeScript compiler option](https://www.typescriptlang.org/docs/handbook/compiler-options.html)) - how cool is that?

But if You want to add reducer function by action type (instead of `redux-actions` action creator),
and You want to use `action.payload`,
then it isn't possible for TypeScript compiler to figure out what the payload type should be,
so You must provide its type via generic type parameter of `addReducer<ActionPayloadType>(...)`.

### Type-safety to the limits
Note, that while TypeScript compiler prevents You from returning less properties than present on state type,
it allows You to return more properties than present on state type **if state type is inferred**.
That would be highly unlikely a problem if You don't 
use [object spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
on `state` object to create new state:
```TypeScript
		return {
			message: state.message,
			count: state.count + action.payload,
			thisPropertyDoesNotExist: 'Oops! this problem is detected by TypeScript compiler if return type is explicitly set on the reducer arrow function',
		};
```
(as you probably wouldn't mistype the property that didn't exist on state type),
but it could become a problem if You do
use [object spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
on `state` object to create new state:

```TypeScript
		return {
			...state,
			typoInPropertyName: state.count + action.payload, // unintended assignment to wrong property
			thisPropertyDoesNotExist: 'Oops! this problem is detected by TypeScript compiler if return type is explicitly set on the reducer arrow function',
		};
```
as You may mistype property name You want to assign,
resulting in incorrect code without TypeScript error.

So if You want to be super-safe and catch this kind of errors with TypeScript compiler, 
You should explicitly add return type for added reducer functions:

```TypeScript
     // .addReducer(add, (state, action) => { // wouldn't detect following problem
	.addReducer(add, (state, action): SampleState => { // would detect following problem
		return {
			...state,
			count: state.count + action.payload,
			thisPropertyDoesNotExist: 'Oops! this problem is detected by TypeScript compiler if return type is explicitly set on the reducer arrow function',
			// ^^^ Error: TS2322: Type ... is not assignable to type 'SampleState'.
			// Object literal may only specify known properties, and 'thisPropertyDoesNotExist' does not exist in type 'SampleState'.
		};
	})
```
> It is up to You to decide if You want to add return type explicitly to gain maximum type safety
or leave it out (and perhaps catch these potential issues with automated or manual tests)
and still get fairly good type safety.

### Code style
You don't need to define class for state type, even tough this is my personal perference:
```TypeScript
class SampleState {
	count = 0;
	message: string = null;
}
const reducer = new ReducerFactory(new SampleState())
```
Alternatively You could write: 
```TypeScript
const initialState = {
	count: 0,
	message: null as string,
};
const sampleReducer = new ReducerFactory(initialState)
```
But it is a matter of code style and totally up to You.

## More information
* [tests](src/__tests__/ReducerFactory.test.ts) cover all use-cases
* [API documentation](https://unpkg.com/redux-actions-ts-reducer@latest/dist/ReducerFactory.d.ts)
(generated TypeScript type definitions file based on source code and comments)
