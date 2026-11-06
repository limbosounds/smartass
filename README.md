# smartass
Smartass

## Lobby & P2P messaging

Players connect directly to each other over WebRTC, there is no game server.

- **Signaling** is done by [Trystero](https://github.com/dmotz/trystero) via public Nostr relays.
  The lobby key is the Trystero room id and also its password, so session descriptions
  are encrypted on the relays and only key holders can connect.
- **Topology** is a star on the protocol level: guests talk to the host only,
  the host stamps the real sender and relays messages (to everyone or to a single peer).
  Trystero itself still connects every peer with every other one, so a lobby is meant for ~8–10 players.

Flow: *Create lobby* → share the key or the link `/lobby/<key>` → players *Join* → everyone can send
technical messages from the lobby console (plain text or JSON).

### Code

| Path | What |
| --- | --- |
| `src/net/config.ts` | app id, timeouts, optional custom relays (`RELAY_URLS`) and TURN servers |
| `src/net/protocol.ts` | wire types (`hello`, `roster`, `msg`, `kick`) and validators |
| `src/net/LobbySession.ts` | one participant's connection: host/guest logic over Trystero |
| `src/stores/Lobby.ts` | MobX store for the UI; `Lobby.onApp(listener)` and `Lobby.send(payload, to?)` are the entry points for game logic |
| `src/views/Lobby` | lobby page: players, console |

### Limitations

- No TURN by default: two players both behind symmetric NAT (some mobile / corporate networks) won't connect.
  Add TURN servers to `TURN_SERVERS` in `src/net/config.ts`.
- Depends on public Nostr relays. If they misbehave, set `RELAY_URLS` or switch the import in
  `LobbySession.ts` to `trystero/torrent` / `trystero/mqtt`.
- Reloading the page drops the connection; if the host leaves, the lobby is closed (no host migration).
- Requires a secure context (https or localhost).
