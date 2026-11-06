import { joinRoom, selfId, type JsonValue, type MessageAction, type Room } from "trystero"
import { v4 as uuid } from "uuid"

import { APP_ID, HOST_SEARCH_TIMEOUT, RELAY_URLS, TURN_SERVERS } from "net/config"
import {
	ACTIONS,
	Envelope,
	HelloPacket,
	KickPacket,
	LobbyRole,
	PeerInfo,
	PROTOCOL_VERSION,
	RosterPacket,
	isEnvelope,
	isHelloPacket,
	isKickPacket,
	isRosterPacket,
} from "net/protocol"

export type LobbyStatus =
	| "connecting"
	| "ready"
	| "not-found"
	| "closed"
	| "kicked"
	| "error"

export interface LobbySessionHandlers {
	onStatus: (
		status: LobbyStatus,
		reason?: string,
	) => void
	onRoster: (
		peers: PeerInfo[],
	) => void
	onPeerJoined: (
		peer: PeerInfo,
	) => void
	onPeerLeft: (
		peer: PeerInfo,
	) => void
	onMessage: (
		envelope: Envelope,
	) => void
}

export interface LobbySessionParams {
	role: LobbyRole
	lobbyId: string
	name: string
}

/**
 * One participant's connection to a lobby.
 *
 * Signaling and the WebRTC transport are handled by Trystero (Nostr relays),
 * which connects every peer in the room with every other peer.
 * On top of that this class enforces a star topology:
 * guests talk to the host only, the host validates and relays.
 */
export default
class LobbySession {
	readonly selfId = selfId
	readonly role: LobbyRole
	readonly lobbyId: string
	readonly name: string

	private readonly room: Room
	private readonly helloAction: MessageAction<HelloPacket>
	private readonly rosterAction: MessageAction<RosterPacket>
	private readonly msgAction: MessageAction<Envelope>
	private readonly kickAction: MessageAction<KickPacket>

	private readonly peers = new Map<string, PeerInfo>()
	/** Host only: peers that were kicked and must be ignored */
	private readonly kicked = new Set<string>()

	private hostId: string | null = null
	private status: LobbyStatus = "connecting"
	private searchTimer: ReturnType<typeof setTimeout> | null = null
	private disposed = false

	constructor(
		params: LobbySessionParams,
		private readonly handlers: LobbySessionHandlers,
	) {
		this.role = params.role
		this.lobbyId = params.lobbyId
		this.name = params.name

		this.room = joinRoom(
			{
				appId: APP_ID,
				// encrypts SDP on the public relays: only key holders can connect
				password: this.lobbyId,
				...(TURN_SERVERS.length ? { turnConfig: TURN_SERVERS } : {}),
				...(RELAY_URLS ? { relayConfig: { urls: RELAY_URLS } } : {}),
			},
			this.lobbyId,
			{
				onJoinError: details => this.finish("error", details.error),
			},
		)

		this.helloAction = this.room.makeAction<HelloPacket>(ACTIONS.hello)
		this.rosterAction = this.room.makeAction<RosterPacket>(ACTIONS.roster)
		this.msgAction = this.room.makeAction<Envelope>(ACTIONS.msg)
		this.kickAction = this.room.makeAction<KickPacket>(ACTIONS.kick)

		this.helloAction.onMessage = (data, { peerId }) => this.handleHello(data, peerId)
		this.rosterAction.onMessage = (data, { peerId }) => this.handleRoster(data, peerId)
		this.msgAction.onMessage = (data, { peerId }) => this.handleMessage(data, peerId)
		this.kickAction.onMessage = (data, { peerId }) => this.handleKick(data, peerId)

		this.room.onPeerJoin = peerId => this.handlePeerJoin(peerId)
		this.room.onPeerLeave = peerId => this.handlePeerLeave(peerId)

		if (this.role === "host") {
			this.hostId = this.selfId
			this.peers.set(this.selfId, this.selfInfo)
			// defer, so handlers can be used right after construction
			queueMicrotask(() => {
				this.setStatus("ready")
				this.emitRoster()
			})
		} else {
			this.searchTimer = setTimeout(() => {
				if (!this.hostId)
					this.finish("not-found", "Host did not respond")
			}, HOST_SEARCH_TIMEOUT)
		}
	}

	get currentStatus(): LobbyStatus {
		return this.status
	}

	get isHost(): boolean {
		return this.role === "host"
	}

	get roster(): PeerInfo[] {
		return [...this.peers.values()]
	}

	private get selfInfo(): PeerInfo {
		return {
			id: this.selfId,
			name: this.name,
			role: this.role,
		}
	}

	private get guestIds(): string[] {
		return [...this.peers.keys()].filter(id => id !== this.selfId)
	}

	/**
	 * Sends an application message.
	 * `to === null` broadcasts to everyone in the lobby.
	 * Returns the envelope as other peers will see it,
	 * or null if the session can't send right now.
	 */
	send = (
		payload: JsonValue,
		to: string | null = null,
	): Envelope | null => {
		if (this.disposed || this.status !== "ready")
			return null

		if (to !== null && (to === this.selfId || !this.peers.has(to)))
			return null

		const envelope: Envelope = {
			v: PROTOCOL_VERSION,
			id: uuid(),
			from: this.selfId,
			to,
			ts: Date.now(),
			payload,
		}

		if (this.isHost) {
			const targets = to === null ? this.guestIds : [to]
			if (targets.length)
				this.safeSend(this.msgAction, envelope, targets)
		} else if (this.hostId) {
			this.safeSend(this.msgAction, envelope, this.hostId)
		}

		return envelope
	}

	/** Host only: disconnects a guest from the lobby */
	kick = (
		peerId: string,
		reason: string = "Kicked by host",
	) => {
		if (!this.isHost || peerId === this.selfId)
			return

		const peer = this.peers.get(peerId)
		if (!peer)
			return

		this.kicked.add(peerId)
		this.safeSend(this.kickAction, { reason }, peerId)
		this.removePeer(peerId)
	}

	leave = () => {
		this.finish("closed", "Left the lobby")
	}

	private handlePeerJoin = (
		peerId: string,
	) => {
		if (this.disposed)
			return

		this.safeSend(this.helloAction, {
			v: PROTOCOL_VERSION,
			name: this.name,
			role: this.role,
		}, peerId)
	}

	private handlePeerLeave = (
		peerId: string,
	) => {
		if (this.disposed)
			return

		if (this.isHost) {
			this.removePeer(peerId)
			return
		}

		if (peerId === this.hostId)
			this.finish("closed", "Host left the lobby")
		// other guests leaving are reported by the host's roster
	}

	private handleHello = (
		data: unknown,
		peerId: string,
	) => {
		if (this.disposed || !isHelloPacket(data))
			return

		if (!this.isHost)
			return // guests learn about the host from its roster

		if (data.role !== "guest" || this.kicked.has(peerId) || this.peers.has(peerId))
			return

		if (data.v !== PROTOCOL_VERSION) {
			this.safeSend(this.kickAction, { reason: "Protocol version mismatch, reload the page" }, peerId)
			return
		}

		const peer: PeerInfo = {
			id: peerId,
			name: data.name,
			role: "guest",
		}
		this.peers.set(peerId, peer)
		this.handlers.onPeerJoined(peer)
		this.broadcastRoster()
	}

	private handleRoster = (
		data: unknown,
		peerId: string,
	) => {
		if (this.disposed || this.isHost || !isRosterPacket(data))
			return

		if (data.lobbyId !== this.lobbyId)
			return

		if (this.hostId && this.hostId !== peerId)
			return

		// a roster is trusted only from the peer it lists as the host
		const isFromHost = data.peers.some(peer => peer.id === peerId && peer.role === "host")
		if (!isFromHost)
			return

		if (!this.hostId) {
			this.hostId = peerId
			this.clearSearchTimer()
		}

		this.applyRoster(data.peers)

		if (this.status === "connecting")
			this.setStatus("ready")
	}

	private handleMessage = (
		data: unknown,
		peerId: string,
	) => {
		if (this.disposed || !isEnvelope(data))
			return

		if (!this.isHost) {
			if (peerId === this.hostId)
				this.handlers.onMessage(data)
			return
		}

		if (!this.peers.has(peerId) || this.kicked.has(peerId))
			return

		// never trust the sender field coming from a guest
		const envelope: Envelope = {
			...data,
			from: peerId,
		}

		if (envelope.to === null) {
			const targets = this.guestIds.filter(id => id !== peerId)
			if (targets.length)
				this.safeSend(this.msgAction, envelope, targets)
			this.handlers.onMessage(envelope)
		} else if (envelope.to === this.selfId) {
			this.handlers.onMessage(envelope)
		} else if (this.peers.has(envelope.to) && envelope.to !== peerId) {
			this.safeSend(this.msgAction, envelope, envelope.to)
		}
	}

	private handleKick = (
		data: unknown,
		peerId: string,
	) => {
		if (this.disposed || this.isHost || peerId !== this.hostId || !isKickPacket(data))
			return

		this.finish("kicked", data.reason)
	}

	private removePeer = (
		peerId: string,
	) => {
		const peer = this.peers.get(peerId)
		if (!peer || peerId === this.selfId)
			return

		this.peers.delete(peerId)
		this.handlers.onPeerLeft(peer)
		this.broadcastRoster()
	}

	private broadcastRoster = () => {
		const targets = this.guestIds
		if (targets.length)
			this.safeSend(this.rosterAction, {
				lobbyId: this.lobbyId,
				peers: this.roster,
			}, targets)

		this.emitRoster()
	}

	/** Guest only: replaces the roster with the host's one, reporting the difference */
	private applyRoster = (
		peers: PeerInfo[],
	) => {
		const next = new Map(peers.map(peer => [peer.id, peer]))

		for (const [id, peer] of this.peers)
			if (!next.has(id))
				this.handlers.onPeerLeft(peer)

		const isInitial = this.peers.size === 0
		for (const [id, peer] of next)
			if (!this.peers.has(id) && !isInitial)
				this.handlers.onPeerJoined(peer)

		this.peers.clear()
		next.forEach((peer, id) => this.peers.set(id, peer))
		this.emitRoster()
	}

	private emitRoster = () => {
		this.handlers.onRoster(this.roster)
	}

	private setStatus = (
		status: LobbyStatus,
		reason?: string,
	) => {
		if (this.status === status)
			return

		this.status = status
		this.handlers.onStatus(status, reason)
	}

	private clearSearchTimer = () => {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
			this.searchTimer = null
		}
	}

	private finish = (
		status: LobbyStatus,
		reason?: string,
	) => {
		if (this.disposed)
			return

		this.disposed = true
		this.clearSearchTimer()
		this.room.onPeerJoin = null
		this.room.onPeerLeave = null
		this.room.leave().catch(() => {})
		this.setStatus(status, reason)
	}

	private safeSend = <T extends HelloPacket | RosterPacket | Envelope | KickPacket>(
		action: MessageAction<T>,
		data: T,
		target: string | string[],
	) => {
		action.send(data, { target }).catch(error => {
			console.warn("[lobby] send failed", error)
		})
	}
}
