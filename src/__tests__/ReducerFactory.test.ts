import { Action, createAction, ReducerMap } from 'redux-actions';
import { createStore } from 'redux';
import { ReducerFactory } from '../ReducerFactory';

const negate = createAction('NEGATE'); // returns `ActionFunction0<Action<void>>` - action creator function that doesn't take any arguments, and returns `Action<void>`
const add = createAction<number>('ADD'); // returns `ActionFunction1<Payload, Action<Payload>>` - action creator function that takes `number` as only argument, and returns `Action<number>`
const substract = createAction<number>('SUBSTRACT');
const replace = createAction<SampleState>('REPLACE_STATE');

const SOME_LIB_NO_ARGS_ACTION_TYPE = '@@some-lib/NO_ARGS_ACTION_TYPE'; // could be useful when action type like this is defined by 3rd party library
const SOME_LIB_STRING_ACTION_TYPE = '@@some-lib/STRING_ACTION_TYPE'; // could be useful when action type like this is defined by 3rd party library

class SampleState {
	count = 0;
	message: string = null;
}

const sampleReducer = new ReducerFactory(new SampleState())
// state argument and return type is inferred based on `new ReducerFactory(initialState)`
// Type of `action.payload` is inferred based on first argument (action creator)
	.addReducer(add, (state, action): SampleState => {
		return {
			...state,
			count: state.count + action.payload,
		};
	})
	// If action creator doesn't specify payload type,
	// then there is no point to add second argument (action) to the reducer, as `action.payload` would have `void` type, making it pretty useless, as expected.
	// You can omit return type, but be careful that you don't mistype anything -
	// then TypeScript compiler won't emit error if you return object with additional properties
	// (but it would still emit error when you return less properties than required by state).
	.addReducer(negate, (state) /* : SampleState */ => {
		return {
			...state,
			count: state.count * -1,
			thisPropertyDoesNotExist: 'Oops! this problem would be detected by TypeScript compiler if return type were set on the arrow function',
			// ^^^ Error: TS2322: Type ... is not assignable to type 'SampleState'.
			// Object literal may only specify known properties, and 'thisPropertyDoesNotExist' does not exist in type 'SampleState'.
		};
	})
	// when adding reducer for action using string actionType (instead of redux-actions Action
	.addReducer<string>(SOME_LIB_STRING_ACTION_TYPE, (state, action): SampleState => {
		return {
			...state,
			message: action.payload,
		};
	})
	// action.payload type is `void` by default
	.addReducer(SOME_LIB_NO_ARGS_ACTION_TYPE, (state): SampleState => {
		return new SampleState();
	})
	.addReducers(createReducerMap()) // just silly example, but may be useful when you can generate some reducers (for example paging/sorting/filtering reducers for any view with table)
	.toReducer();

/**
 * This approach has much more boilerplate and much less type inference compared to `ReducerFactory.addReducer(action, reducer)`
 * @return object that could be passed to redux-actions `handleActions(reducerMap, initialState)` or `ReducerFactory.addReducers(reducerMap)`
 */
function createReducerMap(): ReducerMap<SampleState, number | SampleState> {
	return {
		// In this case only state argument is inferred, but you need to specify
		// type of action (that you may get wrong without TS compiler emitting error)
		// You can omit return type, but be careful that you don't mistype anything -
		// then TypeScript compiler won't emit error if you return object with additional properties
		// (but it would still emit error when you return less properties than required by state).
		[substract.toString()]: (state, action: Action<number>) /*: SampleState*/ => {
			return {
				...state,
				count: state.count - action.payload,
				thisPropertyDoesNotExist: 'Oops! this problem would be detected by TypeScript compiler if return type were set on the arrow function',
				// ^^^ Error: TS2322: Type ... is not assignable to type 'SampleState'.
				// Object literal may only specify known properties, and 'thisPropertyDoesNotExist' does not exist in type 'SampleState'.
			};
		},
		[replace.toString()]: (state, action: Action<SampleState>): SampleState => {
			return action.payload;
		},
	};
}

describe('Reducers created with ReducerFactory', () => {

	describe('can be used with redux `createStore(...):`', () => {
		function createReduxStore() {
			const store = createStore(sampleReducer);
			store.dispatch(replace(new SampleState()));
			return store;
		}

		it('Store state is initialized based on `new ReducerFactory(initialState)`', () => {
			const store = createStore(sampleReducer);
			expect(store.getState()).toEqual(new SampleState());
		});

		describe('Actions created using `redux-action` action creator functions, are reduced by `reducerFunction` that was added to reducer using', () => {
			it('addReducer(actionCreator: ActionFunction0<Action<void>>, reducerFunction)', () => {
				const store = createReduxStore();
				store.getState().count = 5;
				store.dispatch(negate());
				expect(store.getState().count).toEqual(-5);
			});
			it('addReducer(actionCreator: ActionFunction1<Payload, Action<Payload>>, reducerFunction)', () => {
				const store = createReduxStore();
				store.dispatch(add(2));
				expect(store.getState().count).toEqual(2);
			});
			it('addReducer(actionType: string, reducerFunction)', () => {
				const store = createReduxStore();
				const newMessage = 'some payload';
				store.dispatch({
					type: SOME_LIB_STRING_ACTION_TYPE,
					payload: newMessage,
				});
				expect(store.getState().message).toEqual(newMessage);
			});

			it('addReducers(reducerMap)', () => {
				const store = createReduxStore();
				store.dispatch(substract(10));
				expect(store.getState().count).toEqual(-10);
			});
		});

		it('Can dispatch any action having payload type compatible with action that was added to reducer', () => {
			const store = createReduxStore();
			const payloadCompatibleWithAddedAction = createAction<number>('UNKNOWN_ACTION');
			store.dispatch(payloadCompatibleWithAddedAction(1));
			expect(store.getState().count).toEqual(0);
		});

		/** XXX uncomment it manually to verify no regressions (needed to avoid compile-time errors)
		 // Could write these TypeScript compiler error related tests differently
		 // by compiling problematic source on fly during test
		 // and asserting error messages
		 // https://github.com/fictitious/tsc-simple
		 it(`TypeScript compiler emits error when trying to dispatch action that has has payload type incompatible with actions that are added to reducer`, () => {
			const store = createReduxStore();
			const actionWithoutReducer = createAction<boolean>('UNKNOWN');
			store.dispatch(actionWithoutReducer(true));
			// ---------------^ Error: TS2345: Argument of type 'Action<boolean>' is not assignable to parameter of type 'Action<string | number | void | SampleState>'.
			// Type 'boolean' is not assignable to type 'string | number | void | SampleState'.
		});
		 */
	});

	it('can be used without redux (tough using redux is more convenient)', () => {
		// Given
		const state0 = new SampleState();

		const state1 = sampleReducer(state0, add(2));
		expect(state1.count).toEqual(2);

		const state2 = sampleReducer(state1, negate());
		expect(state2.count).toEqual(state1.count * -1);

		const actionWithoutReducerThatDispatchesKnownPayloadType = createAction('UNKNOWN');
		const state3 = sampleReducer(state2, actionWithoutReducerThatDispatchesKnownPayloadType());
		expect(state3.count).toEqual(state2.count);
	});

});
