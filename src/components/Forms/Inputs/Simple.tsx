import React from "react"
import { observer } from "mobx-react"

export interface SimpleInputProps {
	value: string
	disabled?: boolean
	placeholder?: string
	autofocus?: boolean
	onChange: (
		value: string
	) => void
}

export interface SimpleInputState {

}

@observer
export default
class SimpleInput
extends React.Component<SimpleInputProps, SimpleInputState> {
	handleChange = (
		event: React.FormEvent<HTMLInputElement>,
	) => {
		if (this.props.disabled)
			return

		this.props.onChange(event.currentTarget.value)
	}

	render() {
		return <>
			<div className="c-simple-input-control">
				<input
					className="u-input"
					value={this.props.value}
					disabled={this.props.disabled}
					placeholder={this.props.placeholder}
					onChange={this.handleChange}
					autoFocus={this.props.autofocus}
				/>
			</div>
		</>
	}
}