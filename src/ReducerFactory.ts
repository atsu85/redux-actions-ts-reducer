import { Action, ActionFunction1, handleActions, Reducer, ReducerMap, ReducerMapValue } from 'redux-actions';

/**
 * @type S - State that all reducer functions (combined with this class) should use.
 * @type Payload - Payload for actions - type will be updated based on added reducer function action types on returned object type
 */
export class ReducerFactory<S, Payload = never> {
	private reducerMap: ReducerMap<S, Payload> = {};

	public constructor(private state: S) {
	}

	/**
	 * When using this method, then reducer action type is inferred in addition to reducer state type for state parameter and return type.
	 * @type P - action payload type (`void` by default that effectively prevents using reducer action payload unless payload type is mentioned with generic parameter type)
	 */
	public addReducer<P>(actionType: ActionFunction1<P, Action<P>>, reducer: Reducer<S, P>): ReducerFactory<S, Payload | P> {
		return this.addReducerInternal(actionType, reducer);
	}

	private addReducerInternal<P>(actionType: ActionFunction1<P, Action<P>> | string, reducer: ReducerMapValue<S, P>): ReducerFactory<S, Payload | P> {
		const reducerMap: ReducerMap<S, Payload | P> = this.reducerMap;
		reducerMap[actionType.toString()] = reducer;
		return this;
	}

	/**
	 * creates Redux reducer that can be used to create Redux store
	 */
	public toReducer(): Reducer<S, Payload> {
		return handleActions(this.reducerMap, this.state);
	}
}
