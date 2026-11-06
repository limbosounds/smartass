import React from "react"
import { observer } from "mobx-react"
import { Link, RouteComponentProps, generatePath } from "react-router-dom"

import "styles/views/lobby"

import { classNames } from "utils/react"
import Routing from "stores/Routing"
import Lobby, { LogEntry } from "stores/Lobby"
import SimpleInput from "components/Forms/Inputs/Simple"
import CopyField from "components/CopyField"

export interface LobbyViewProps
extends RouteComponentProps<{ lobbyId: string }> {

}

export interface LobbyViewState {
	name: string
	message: string
	target: string
}

const formatTime = (
	ts: number,
): string => {
	return new Date(ts).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

const formatPayload = (
	payload: unknown,
): string => {
	return typeof payload === "string"
		? payload
		: JSON.stringify(payload)
}

@observer
export default
class LobbyView
extends React.Component<LobbyViewProps, LobbyViewState> {
	state
		: Readonly<LobbyViewState>
		= {
			name: "",
			message: "",
			target: "",
		}

	private logRef = React.createRef<HTMLDivElement>()
	private renderedLogSize = 0

	get lobbyId(): string {
		return this.props.match.params.lobbyId
	}

	get hasSession(): boolean {
		return Lobby.lobbyId === this.lobbyId && Lobby.status !== "idle"
	}

	get link(): string {
		return window.location.origin + generatePath(Routing.patterns.lobby.index, { lobbyId: this.lobbyId })
	}

	/** Falls back to broadcast if the selected peer is gone */
	get target(): string | null {
		const { target } = this.state
		return target && Lobby.otherPeers.some(peer => peer.id === target)
			? target
			: null
	}

	componentDidUpdate() {
		const element = this.logRef.current
		if (element && Lobby.log.length !== this.renderedLogSize) {
			this.renderedLogSize = Lobby.log.length
			element.scrollTop = element.scrollHeight
		}
	}

	componentWillUnmount() {
		Lobby.leave()
	}

	setName = (
		value: string,
	) => {
		this.setState({
			name: value,
		})
	}

	setMessage = (
		value: string,
	) => {
		this.setState({
			message: value,
		})
	}

	setTarget = (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		this.setState({
			target: event.currentTarget.value,
		})
	}

	join = () => {
		if (!this.state.name.trim())
			return

		Lobby.join(this.lobbyId, this.state.name)
	}

	retry = () => {
		Lobby.join(this.lobbyId, Lobby.selfName)
	}

	send = (
		event: React.FormEvent,
	) => {
		event.preventDefault()

		if (Lobby.sendRaw(this.state.message, this.target))
			this.setState({
				message: "",
			})
	}

	renderJoin() {
		return <>
			<main className="v-lobby __join">
				<h1>
					Join lobby
				</h1>
				<div className="lb-card">
					<p>
						You were invited to lobby <b>{this.lobbyId}</b>
					</p>
					<SimpleInput
						value={this.state.name}
						onChange={this.setName}
						placeholder="Your name"
						autofocus
					/>
					<div className="lb-actions">
						<Link
							to={Routing.patterns.home}
							className="u-button __type-outline __color-main"
						>
							Home
						</Link>
						<div
							className={classNames("u-button __type-solid __color-main", {
								disabled: !this.state.name.trim(),
							})}
							onClick={this.join}
						>
							Join
						</div>
					</div>
				</div>
			</main>
		</>
	}

	renderLogEntry = (
		entry: LogEntry,
	) => {
		if (entry.kind === "system")
			return <div key={entry.id} className="lb-log-entry __system">
				<span className="le-time">{formatTime(entry.ts)}</span>
				<span className="le-text">{entry.text}</span>
			</div>

		return <div
			key={entry.id}
			className={classNames("lb-log-entry __app", {
				"__outgoing": entry.outgoing,
				"__direct": !!entry.to,
			})}
		>
			<span className="le-time">{formatTime(entry.ts)}</span>
			<span className="le-route">
				{entry.fromName}
				{" → "}
				{entry.toName}
			</span>
			<span className="le-text">{formatPayload(entry.payload)}</span>
		</div>
	}

	render() {
		if (!this.hasSession)
			return this.renderJoin()

		const isFinished = !Lobby.isActive

		return <>
			<main className="v-lobby">
				<header className="lb-header">
					<div className="lb-title">
						<h1>
							Lobby
						</h1>
						<span className={`lb-status __${Lobby.status}`}>
							{Lobby.statusText}
						</span>
						<span className="lb-role">
							{Lobby.isHost ? "host" : "guest"} · {Lobby.selfName}
						</span>
					</div>
					<div className="lb-keys">
						<CopyField
							label="Key"
							value={this.lobbyId}
						/>
						<CopyField
							label="Link"
							value={this.link}
						/>
					</div>
				</header>

				{isFinished &&
					<div className="lb-card __notice">
						<p>
							{Lobby.statusText}
							{Lobby.statusReason && <>: {Lobby.statusReason}</>}
						</p>
						<div className="lb-actions">
							<Link
								to={Routing.patterns.home}
								className="u-button __type-outline __color-main"
							>
								Home
							</Link>
							{!Lobby.isHost && Lobby.status !== "kicked" &&
								<div
									className="u-button __type-solid __color-main"
									onClick={this.retry}
								>
									Try again
								</div>
							}
						</div>
					</div>
				}

				<div className="lb-body">
					<aside className="lb-peers">
						<h2>
							Players ({Lobby.peers.length})
						</h2>
						<ul>
							{Lobby.peers.map(peer =>
								<li
									key={peer.id}
									className={classNames("lb-peer", {
										"__self": peer.id === Lobby.selfId,
										"__host": peer.role === "host",
									})}
								>
									<span className="lp-name">
										{peer.name}
										{peer.id === Lobby.selfId && " (you)"}
									</span>
									<span className="lp-role">
										{peer.role}
									</span>
									{Lobby.isHost && peer.id !== Lobby.selfId && Lobby.isReady &&
										<span
											className="lp-kick"
											onClick={() => Lobby.kick(peer.id)}
										>
											kick
										</span>
									}
								</li>
							)}
						</ul>
					</aside>

					<section className="lb-console">
						<div
							className="lb-log"
							ref={this.logRef}
						>
							{Lobby.log.map(this.renderLogEntry)}
						</div>
						<form
							className="lb-send"
							onSubmit={this.send}
						>
							<select
								className="u-input"
								value={this.target ?? ""}
								onChange={this.setTarget}
								disabled={!Lobby.isReady}
							>
								<option value="">
									Everyone
								</option>
								{Lobby.otherPeers.map(peer =>
									<option
										key={peer.id}
										value={peer.id}
									>
										{peer.name}
									</option>
								)}
							</select>
							<SimpleInput
								value={this.state.message}
								onChange={this.setMessage}
								placeholder={Lobby.isReady ? "Text or JSON, Enter to send" : "Not connected"}
								disabled={!Lobby.isReady}
							/>
							<button
								type="submit"
								className={classNames("u-button __type-solid __color-main", {
									disabled: !Lobby.isReady || !this.state.message.trim(),
								})}
							>
								Send
							</button>
						</form>
					</section>
				</div>
			</main>
		</>
	}
}
