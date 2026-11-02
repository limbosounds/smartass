import { createBrowserHistory } from "history"

class RoutingStore {
	history
		= createBrowserHistory({
			basename: "/",
		})

	patterns
		= {
			home: "/",
			lobby: {
				index: "/lobby/:lobbyId",
			},
		}
}

export default
new RoutingStore