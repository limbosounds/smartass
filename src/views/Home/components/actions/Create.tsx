import React from "react"
import { observer } from "mobx-react"
import { generatePath } from "react-router-dom"

import { classNames } from "utils/react"
import Routing from "stores/Routing"
import Lobby from "stores/Lobby"
import SimpleInput from "components/Forms/Inputs/Simple"

export interface HomeCreateActionProps {

}

export interface HomeCreateActionState {
	expanded: boolean
	name: string
}

@observer
export default
class HomeCreateAction
extends React.Component<HomeCreateActionProps, HomeCreateActionState> {
	state
		: Readonly<HomeCreateActionState>
		= {
			expanded: false,
			name: "",
		}

	expand = () => {
		this.setState({
			expanded: true,
		})
	}

	collapse = () => {
		this.setState({
			expanded: false,
		})
	}

	setName = (
		value: string,
	) => {
		this.setState({
			name: value,
		})
	}

	create = () => {
		const lobbyId = Lobby.host(this.state.name || "Host")
		Routing.history.push(generatePath(Routing.patterns.lobby.index, { lobbyId }))
	}

	render() {
		return <>
			<div
				className={classNames("hp-action create", {
					expanded: this.state.expanded,
				})}
				onClick={this.state.expanded ? undefined : this.expand}
			>
				<h2>
					Create lobby
				</h2>

				<div className="form">
					<div className="row">
						<p>
							Host new game and play with your friends <br />
							<i>Link to gamepack template</i>
						</p>
					</div>
					<div className="row">
						<SimpleInput
							value={this.state.name}
							onChange={this.setName}
							placeholder="Your name (optional)"
						/>
					</div>
					<div className="row actions center">
						<div
							className="u-button __type-outline __color-main"
							onClick={this.collapse}
						>
							Cancel
						</div>

						<div
							className="u-button __type-solid __color-main"
							onClick={this.create}
						>
							Create
						</div>
					</div>
				</div>
			</div>
		</>
	}
}
