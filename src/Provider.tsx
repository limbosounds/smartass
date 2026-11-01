import React from "react"
import { observer } from "mobx-react"
import { Route, Switch } from "react-router-dom"
import App from "App"

export interface ProviderProps {

}

export interface ProviderState {

}

@observer
export default
class Provider
extends React.Component<ProviderProps, ProviderState> {
	render() {
		return <>
			<Switch>
				<Route
					path="/"
					component={App}
				/>
			</Switch>
		</>
	}
}