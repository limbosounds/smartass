import type { JsonValue } from "trystero"

export const PROTOCOL_VERSION = 1

export type LobbyRole = "host" | "guest"

/**
 * Trystero action ids. Every peer must register the same set.
 */
export const ACTIONS = {
	hello: "hello",
	roster: "roster",
	msg: "msg",
	kick: "kick",
} as const

export type PeerInfo = {
	id: string
	name: string
	role: LobbyRole
}

/**
 * Sent by every peer to every newly connected peer.
 * Guests use it to find out who the host is,
 * the host uses it to register a guest.
 */
export type HelloPacket = {
	v: number
	name: string
	role: LobbyRole
}

/**
 * Host -> guests: authoritative list of lobby participants.
 * The first roster a guest receives acts as a welcome.
 */
export type RosterPacket = {
	lobbyId: string
	peers: PeerInfo[]
}

/**
 * Host -> guest: you are disconnected from the lobby
 */
export type KickPacket = {
	reason: string
}

/**
 * Application-level message. Guests send it to the host only,
 * the host stamps the real sender into `from` and relays it.
 * `to === null` means broadcast.
 */
export type Envelope = {
	v: number
	id: string
	from: string
	to: string | null
	ts: number
	payload: JsonValue
}

const isObject = (
	value: unknown,
): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const isHelloPacket = (
	value: unknown,
): value is HelloPacket => {
	return isObject(value)
		&& typeof value.v === "number"
		&& typeof value.name === "string"
		&& (value.role === "host" || value.role === "guest")
}

export const isRosterPacket = (
	value: unknown,
): value is RosterPacket => {
	return isObject(value)
		&& typeof value.lobbyId === "string"
		&& Array.isArray(value.peers)
		&& value.peers.every(peer => isObject(peer)
			&& typeof peer.id === "string"
			&& typeof peer.name === "string"
			&& (peer.role === "host" || peer.role === "guest")
		)
}

export const isKickPacket = (
	value: unknown,
): value is KickPacket => {
	return isObject(value)
		&& typeof value.reason === "string"
}

export const isEnvelope = (
	value: unknown,
): value is Envelope => {
	return isObject(value)
		&& typeof value.v === "number"
		&& typeof value.id === "string"
		&& typeof value.from === "string"
		&& (value.to === null || typeof value.to === "string")
		&& typeof value.ts === "number"
		&& "payload" in value
}

/** Trims user-provided names to something sane */
export const normalizeName = (
	name: string,
): string => {
	return name.trim().slice(0, 32) || "Anonymous"
}
