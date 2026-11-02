import React from "react"
import { observer } from "mobx-react"
import { classNames } from "utils/react"
import SimpleInput from "components/Forms/Inputs/Simple"

export interface HomeJoinActionProps {

}

export interface HomeJoinActionState {
	expanded: boolean
	lobbyId: string
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
		}

	get isActionDisabled(): boolean {
		return !this.state.lobbyId.trim()
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

	join = () => {
		if (this.isActionDisabled)
			return

		alert(this.state.lobbyId)
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
							placeholder="Enter lobby ID here..."
							autofocus
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