import React from "react"
import { observer } from "mobx-react"
import { Route, RouteComponentProps, Switch } from "react-router-dom"

import "styles/fonts"
import "styles/main"
import "styles/uni"
import Routing from "stores/Routing"
import Home from "views/Home"
import LobbyView from "views/Lobby"

export interface AppProps
extends RouteComponentProps<any> {

}

export interface AppState {

}

@observer
export default
class App
extends React.Component<AppProps, AppState> {
	render() {
		return <>
			<Switch>
				<Route
					path={Routing.patterns.home}
					exact
					component={Home}
				/>
				<Route
					path={Routing.patterns.lobby.index}
					exact
					component={LobbyView}
				/>
			</Switch>
		</>
	}
}