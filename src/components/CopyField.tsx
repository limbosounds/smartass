import React from "react"
import { observer } from "mobx-react"

import "styles/components/copy-field"

import { classNames } from "utils/react"

export interface CopyFieldProps {
	value: string
	label?: string
}

export interface CopyFieldState {
	copied: boolean
}

@observer
export default
class CopyField
extends React.Component<CopyFieldProps, CopyFieldState> {
	state
		: Readonly<CopyFieldState>
		= {
			copied: false,
		}

	private resetTimer: ReturnType<typeof setTimeout> | null = null

	componentWillUnmount() {
		if (this.resetTimer)
			clearTimeout(this.resetTimer)
	}

	copy = async () => {
		try {
			await navigator.clipboard.writeText(this.props.value)
		} catch {
			return
		}

		this.setState({
			copied: true,
		})

		if (this.resetTimer)
			clearTimeout(this.resetTimer)

		this.resetTimer = setTimeout(() => {
			this.setState({
				copied: false,
			})
		}, 1500)
	}

	selectAll = (
		event: React.FocusEvent<HTMLInputElement>,
	) => {
		event.currentTarget.select()
	}

	render() {
		return <>
			<div className="c-copy-field">
				{this.props.label &&
					<span className="cf-label">
						{this.props.label}
					</span>
				}
				<input
					className="u-input"
					value={this.props.value}
					readOnly
					onFocus={this.selectAll}
				/>
				<div
					className={classNames("u-button __type-outline __color-main", {
						"__color-positive": this.state.copied,
					})}
					onClick={this.copy}
				>
					{this.state.copied ? "Copied" : "Copy"}
				</div>
			</div>
		</>
	}
}
