import type { TurnServerConfig } from "trystero"

/**
 * Trystero namespace: peers find each other only within the same appId.
 * Bump the suffix when the wire protocol changes incompatibly.
 */
export const APP_ID = "smartass-v1"

/** How long a guest waits for the host to respond before giving up */
export const HOST_SEARCH_TIMEOUT = 15_000

/** Length of generated lobby keys */
export const LOBBY_ID_LENGTH = 8

/** How many log entries the lobby keeps in memory */
export const LOG_LIMIT = 200

/**
 * Nostr relays used for signaling. All peers must use the same list.
 *
 * Trystero's built-in list has ~40 small community relays and picks 5 of them
 * based on APP_ID; some of those are often down, which makes the browser log
 * "WebSocket connection failed" on every reconnect attempt.
 * Large, long-running public relays are pinned here instead.
 * Set to null to fall back to Trystero's defaults.
 */
export const RELAY_URLS: string[] | null = [
	"wss://nos.lol",
	"wss://relay.damus.io",
	"wss://relay.primal.net",
	"wss://nostr.mom",
	"wss://relay.nostr.net",
]

/**
 * Optional TURN servers for peers behind symmetric NAT.
 * Trystero's default public STUN servers are used in any case.
 */
export const TURN_SERVERS: TurnServerConfig[] = []
