import React from "react"
import { createRoot } from "react-dom/client"
import { Route, Router, Switch } from "react-router-dom"

import Routing from "stores/Routing"

import Provider from "Provider"

const root = createRoot(document.getElementById("__root")!)

root.render(
	<Router
		history={Routing.history}
	>
		<Switch>
			<Route component={Provider} />
		</Switch>
	</Router>
)