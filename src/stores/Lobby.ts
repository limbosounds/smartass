import { makeAutoObservable } from "mobx"
import type { JsonValue } from "trystero"
import { v4 as uuid } from "uuid"

import { LOBBY_ID_LENGTH, LOG_LIMIT } from "net/config"
import LobbySession, { LobbyStatus } from "net/LobbySession"
import { Envelope, LobbyRole, PeerInfo, normalizeName } from "net/protocol"

export type LobbyStoreStatus = LobbyStatus | "idle"

export interface LogEntry {
	id: string
	ts: number
	kind: "system" | "app"
	text?: string
	from?: string
	to?: string | null
	/** names resolved when the entry was logged, peers may leave later */
	fromName?: string
	toName?: string
	payload?: JsonValue
	outgoing?: boolean
}

export type AppMessageListener = (
	envelope: Envelope,
) => void

const STATUS_TEXT: Record<LobbyStatus, string> = {
	"connecting": "Looking for the host...",
	"ready": "Connected",
	"not-found": "Lobby not found",
	"closed": "Lobby closed",
	"kicked": "You were kicked",
	"error": "Connection error",
}

export const generateLobbyId = (): string => {
	return uuid().replace(/-/g, "").slice(0, LOBBY_ID_LENGTH)
}

class LobbyStore {
	role: LobbyRole | null = null
	lobbyId: string | null = null
	selfId: string | null = null
	selfName: string = ""
	status: LobbyStoreStatus = "idle"
	statusReason: string | null = null
	peers: PeerInfo[] = []
	log: LogEntry[] = []

	private session: LobbySession | null = null
	private sessionToken: object | null = null
	private readonly appListeners = new Set<AppMessageListener>()

	constructor() {
		makeAutoObservable<this, "session" | "sessionToken" | "appListeners">(this, {
			session: false,
			sessionToken: false,
			appListeners: false,
		}, {
			autoBind: true,
		})

		// let peers know right away instead of waiting for the connection to time out
		window.addEventListener("pagehide", () => this.leave())
	}

	get isHost(): boolean {
		return this.role === "host"
	}

	get isActive(): boolean {
		return this.status === "connecting" || this.status === "ready"
	}

	get isReady(): boolean {
		return this.status === "ready"
	}

	get statusText(): string {
		if (this.status === "idle")
			return "Not connected"

		return STATUS_TEXT[this.status]
	}

	get otherPeers(): PeerInfo[] {
		return this.peers.filter(peer => peer.id !== this.selfId)
	}

	peerName(
		peerId: string | null | undefined,
	): string {
		if (!peerId)
			return "everyone"

		if (peerId === this.selfId)
			return "you"

		return this.peers.find(peer => peer.id === peerId)?.name
			?? peerId.slice(0, 6)
	}

	/** Creates a new lobby as its host, returns the lobby key */
	host(
		name: string = "Host",
	): string {
		const lobbyId = generateLobbyId()
		this.start("host", lobbyId, name)
		return lobbyId
	}

	join(
		lobbyId: string,
		name: string,
	) {
		this.start("guest", lobbyId.trim(), name)
	}

	/** Sends an app message to everyone (`to === null`) or a single peer */
	send(
		payload: JsonValue,
		to: string | null = null,
	): boolean {
		const envelope = this.session?.send(payload, to)
		if (!envelope)
			return false

		this.pushLog({
			id: envelope.id,
			ts: envelope.ts,
			kind: "app",
			from: envelope.from,
			to: envelope.to,
			payload: envelope.payload,
			outgoing: true,
		})
		return true
	}

	/** Console helper: sends valid JSON as is, anything else as a string */
	sendRaw(
		raw: string,
		to: string | null = null,
	): boolean {
		const text = raw.trim()
		if (!text)
			return false

		let payload: JsonValue = text
		try {
			payload = JSON.parse(text)
		} catch {
			// plain text
		}

		return this.send(payload, to)
	}

	kick(
		peerId: string,
	) {
		this.session?.kick(peerId)
	}

	leave() {
		const session = this.session
		this.session = null
		this.sessionToken = null
		session?.leave()

		this.role = null
		this.lobbyId = null
		this.selfId = null
		this.status = "idle"
		this.statusReason = null
		this.peers = []
	}

	/**
	 * Subscribes to incoming application messages.
	 * The entry point for game logic. Returns an unsubscribe function.
	 */
	onApp(
		listener: AppMessageListener,
	): () => void {
		this.appListeners.add(listener)
		return () => {
			this.appListeners.delete(listener)
		}
	}

	private start(
		role: LobbyRole,
		lobbyId: string,
		name: string,
	) {
		this.leave()

		const token = {}
		const isCurrent = () => this.sessionToken === token

		this.sessionToken = token
		this.role = role
		this.lobbyId = lobbyId
		this.selfName = normalizeName(name)
		this.status = "connecting"
		this.statusReason = null
		this.peers = []
		this.log = []

		const session = new LobbySession({
			role,
			lobbyId,
			name: this.selfName,
		}, {
			onStatus: (status, reason) => isCurrent() && this.handleStatus(status, reason),
			onRoster: peers => isCurrent() && this.handleRoster(peers),
			onPeerJoined: peer => isCurrent() && this.addSystemLog(`${peer.name} joined`),
			onPeerLeft: peer => isCurrent() && this.addSystemLog(`${peer.name} left`),
			onMessage: envelope => isCurrent() && this.handleMessage(envelope),
		})

		if (!isCurrent())
			return // failed synchronously

		this.session = session
		this.selfId = session.selfId
		this.addSystemLog(role === "host"
			? `Lobby ${lobbyId} created`
			: `Joining lobby ${lobbyId}...`
		)
	}

	private handleStatus(
		status: LobbyStatus,
		reason?: string,
	) {
		this.status = status
		this.statusReason = reason ?? null
		this.addSystemLog(reason ? `${STATUS_TEXT[status]}: ${reason}` : STATUS_TEXT[status])

		if (status !== "connecting" && status !== "ready") {
			this.session = null
			this.sessionToken = null
		}
	}

	private handleRoster(
		peers: PeerInfo[],
	) {
		this.peers = peers
	}

	private handleMessage(
		envelope: Envelope,
	) {
		this.pushLog({
			id: envelope.id,
			ts: envelope.ts,
			kind: "app",
			from: envelope.from,
			to: envelope.to,
			payload: envelope.payload,
		})

		this.appListeners.forEach(listener => {
			try {
				listener(envelope)
			} catch (error) {
				console.error("[lobby] app listener failed", error)
			}
		})
	}

	private addSystemLog(
		text: string,
	) {
		this.pushLog({
			id: uuid(),
			ts: Date.now(),
			kind: "system",
			text,
		})
	}

	private pushLog(
		entry: LogEntry,
	) {
		if (entry.kind === "app") {
			entry.fromName = this.peerName(entry.from)
			entry.toName = this.peerName(entry.to)
		}

		this.log.push(entry)
		if (this.log.length > LOG_LIMIT)
			this.log.splice(0, this.log.length - LOG_LIMIT)
	}
}

export default
new LobbyStore
