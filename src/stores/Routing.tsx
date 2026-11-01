import { createBrowserHistory } from "history"

class RoutingStore {
	history
		= createBrowserHistory({
			basename: "/",
		})
}

export default
new RoutingStore