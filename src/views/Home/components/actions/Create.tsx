import React from "react"
import { observer } from "mobx-react"
import { v4 as uuid } from "uuid"

import { classNames } from "utils/react"

export interface HomeCreateActionProps {

}

export interface HomeCreateActionState {
	expanded: boolean
}

@observer
export default
class HomeCreateAction
extends React.Component<HomeCreateActionProps, HomeCreateActionState> {
	state
		: Readonly<HomeCreateActionState>
		= {
			expanded: false,
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

	create = () => {
		const id = uuid()
		alert(id)
		// TODO loading state
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