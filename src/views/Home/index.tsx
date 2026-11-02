import React from "react"
import { observer } from "mobx-react"

import "styles/views/home"

import HomeJoinAction from "./components/actions/Join"
import HomeCreateAction from "./components/actions/Create"

export interface HomeProps {

}

export interface HomeState {

}

@observer
export default
class Home
extends React.Component<HomeProps, HomeState> {
	render() {
		return <>
			<main className="v-home">
				<h1>
					Smartass
				</h1>
				<div className="hp-actions">
					<HomeJoinAction />
					<HomeCreateAction />
				</div>
			</main>
		</>
	}
}