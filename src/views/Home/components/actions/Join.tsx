import React from "react"
import { observer } from "mobx-react"
import { generatePath } from "react-router-dom"

import { classNames } from "utils/react"
import Routing from "stores/Routing"
import Lobby from "stores/Lobby"
import SimpleInput from "components/Forms/Inputs/Simple"

export interface HomeJoinActionProps {

}

export interface HomeJoinActionState {
	expanded: boolean
	lobbyId: string
	name: string
}

/** Accepts a bare key as well as a pasted lobby link */
export const parseLobbyId = (
	value: string,
): string => {
	const trimmed = value.trim()
	const fromLink = trimmed.match(/\/lobby\/([^/?#\s]+)/)
	return fromLink ? decodeURIComponent(fromLink[1]) : trimmed
}

@observer
export default
class HomeJoinAction
extends React.Component<HomeJoinActionProps, HomeJoinActionState> {
	state
		: Readonly<HomeJoinActionState>
		= {
			expanded: false,
			lobbyId: "",
			name: "",
		}

	get lobbyId(): string {
		return parseLobbyId(this.state.lobbyId)
	}

	get isActionDisabled(): boolean {
		return !this.lobbyId || !this.state.name.trim()
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

	setLobbyId = (
		value: string,
	) => {
		this.setState({
			lobbyId: value,
		})
	}

	setName = (
		value: string,
	) => {
		this.setState({
			name: value,
		})
	}

	join = () => {
		if (this.isActionDisabled)
			return

		const lobbyId = this.lobbyId
		Lobby.join(lobbyId, this.state.name)
		Routing.history.push(generatePath(Routing.patterns.lobby.index, { lobbyId }))
	}

	render() {
		return <>
			<div
				className={classNames("hp-action join", {
					expanded: this.state.expanded,
				})}
				onClick={this.state.expanded ? undefined : this.expand}
			>
				<h2>
					Join lobby
				</h2>
				<div className="form">
					<div className="row">
						<SimpleInput
							value={this.state.lobbyId}
							onChange={this.setLobbyId}
							placeholder="Enter lobby ID or link here..."
							autofocus
						/>
					</div>
					<div className="row">
						<SimpleInput
							value={this.state.name}
							onChange={this.setName}
							placeholder="Your name"
						/>
					</div>
					<div className="row actions">
						<div
							className="u-button __type-outline __color-main"
							onClick={this.collapse}
						>
							Cancel
						</div>
						<div
							className={classNames("u-button __type-solid __color-main", { disabled: this.isActionDisabled })}
							onClick={this.join}
						>
							Join
						</div>
					</div>
				</div>
			</div>
		</>
	}
}
