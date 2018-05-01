import { createAction } from 'redux-actions';
import { createStore } from 'redux';
import { ReducerFactory } from '../ReducerFactory';

const negate = createAction('NEGATE');
const add = createAction<number>('ADD');

class SampleState {
	count = 0;
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
	.toReducer();

describe('Reducers created with ReducerFactory', () => {

	describe('can be used with redux `createStore(...):`', () => {

		it('Store state is initialized based on `new ReducerFactory(initialState)`', () => {
			const store = createStore(sampleReducer);
			expect(store.getState()).toEqual(new SampleState());
		});
		describe('Can dispatch action that was added to reducer using', () => {
			it('addReducer(actionCreator, reducerFunction)', () => {
				const store = createStore(sampleReducer);
				store.dispatch(add(2));
				expect(store.getState().count).toEqual(2);
			});

		});

		it('Can dispatch any action having payload type compatible with action that was added to reducer', () => {
			const store = createStore(sampleReducer);
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
			const store = createStore(sampleReducer);
			const actionWithoutReducer = createAction<boolean>('UNKNOWN');
			store.dispatch(actionWithoutReducer(true));
			// ---------------^ Error: TS2345: Argument of type 'Action<boolean>' is not assignable to parameter of type 'Action<number | void>'.
			// Type 'boolean' is not assignable to type 'number | void'.
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