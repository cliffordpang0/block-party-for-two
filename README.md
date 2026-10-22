# 🧱 Block Party for Two

**Build a home. Get lost together. Blame the creeper.**

A Windows launcher for a self-hosted Minecraft 1.12.2 browser adventure, with a little minimap to answer the eternal question: *“Where did you go?”*

Your PC hosts the world. Your favorite human joins through a browser link. Your questionable architecture stays saved locally.

## What's in the party bag?

- 🗺️ **Upper-left minimap:** nearby terrain, coordinates, facing directions, and player markers. Gold is you; blue is your adventuring buddy.
- 🌍 **World picker:** keep multiple worlds in one installation and choose one at startup.
- 💾 **Local saves and combined backups:** Overworld, Nether, End, inventories, and world catalogue stay on the host PC.
- 🔗 **One-link invites:** type `share` to start a temporary HTTPS tunnel and get a browser invitation.
- 🐉 **Survival progression:** crafting, mobs, Nether, End, and dragon progression come from the upstream game and server.
- 🤝 **Co-op defaults:** two players, normal difficulty, PvP off. Friendship damage from stealing diamonds remains unpatched.

This is an **unofficial launcher and minimap integration** around an existing Eaglercraft browser client and Paper server. It is not a newly authored game engine or an official Mojang/Microsoft release. This repository contains the launcher, gateway, minimap source, and tests; game binaries and runtimes download separately at setup.

## Start your adventure

1. Download this repository using **Code → Download ZIP**, then extract it to a permanent folder on your Windows PC.
2. Install [Node.js 20 or newer](https://nodejs.org/).
3. Double-click **START.bat**. First launch downloads the pinned dependencies and a portable Java JDK if needed. Allow a few hundred MB for setup.
4. Read the [Minecraft EULA](https://www.minecraft.net/eula) and type `AGREE` only if you accept it.
5. Choose or create a world. Wait for **READY TO PLAY**, then use the complete browser link printed by the launcher.
6. Join **Our survival world**. Register with `/register YOUR_PASSWORD YOUR_PASSWORD`; later use `/login YOUR_PASSWORD`. Use a unique game-only password.

Use a current desktop Chrome or Edge with WebGL enabled. No `npm install` is needed: the launcher uses Node's standard library.

## Invite your player two

Type `share` in the launcher and send your friend the complete invitation link, including `/play/.../`. The same link is written to `INVITE.txt`. Keep it private, and keep your PC and launcher running while you play. The temporary tunnel hostname can change each session.

The invite uses Cloudflare's Quick Tunnel service. It is intended for temporary sessions and can have service limits. No router configuration is changed by this launcher.

## Can more than two players join?

Yes! Two is the default player limit, and you can raise it for a bigger block party.

1. Type `stop` in the launcher and wait for shutdown and the backup to finish.
2. Open `server/server.properties` in your extracted installation folder.
3. Change `max-players=2` to your desired limit, for example:

```properties
max-players=10
```

4. Save the file and restart `START.bat`. Invite the other players using the complete link from `share`.

The minimap supports multiple player markers. Capacity is not unlimited: smooth play depends on the host PC's CPU and RAM, internet upload speed, and tunnel performance. Raising the limit does not guarantee that many players will run smoothly; larger groups have not been load-tested.

## Find each other (finally)

After logging in, press **Esc** to release the mouse and choose your nickname in the map panel. Press **M** to hide or show it. Nearby terrain updates roughly every two seconds. Players in another dimension are labelled by dimension; unloaded terrain stays dark.

The included Bukkit plugin compiles against the matching **Spigot 1.12.2 API**. If the optional minimap cannot be prepared, the server starts with the map unavailable and retries map setup on a later launch.

## Save, switch, repeat

| Action | What to do |
| --- | --- |
| Finish a session | Type `stop`, then wait for **Backup saved**. |
| Switch worlds | Stop, reopen `START.bat`, and choose another world. |
| Export all worlds | With the launcher stopped, run `EXPORT-WORLDS.bat`. |
| Import an older world | Stop both installations and run `IMPORT-WORLD.bat`. |

Exports include local account records and settings: keep them private. Only one world's three dimensions run at a time. See [the setup and recovery guide](docs/SETUP.md) for save locations, restores, configuration, and troubleshooting.

## Under the blocks

- `launch.mjs` coordinates setup, world selection, Java, sharing, and shutdown.
- `gateway.mjs` serves the browser client and proxies game WebSockets behind the invitation URL.
- `worlds.mjs` and `backup.mjs` manage local worlds and exports.
- `plugin/src/home/map/OurMinimap.java` samples terrain and authenticated player positions.
- `web/minimap.js` draws the browser HUD; `map-state.mjs` validates telemetry.
- `downloads.json` pins upstream artifact versions, expected sizes, and hashes.

The game server and gateway bind to loopback by default. Private saves, account databases, local keys, and downloaded binaries are excluded from version control.

## Checks and current limits

Run `npm test` (or `node --test tests/*.test.mjs`). The 20 automated tests cover setup, download verification, world management, map math, telemetry checks, and gateway routing. They do not verify live Java compilation, two-browser multiplayer, or complete Nether/dragon gameplay. Those still need testing on the host PC.

## Credit where the blocks are due

- [Eaglercraft server template](https://github.com/Eaglercraft-Templates/Eaglercraft-Server-Paper), pinned at `aa9feab237068076786f8b6268d537c83491ca3c`.
- [Browser client distribution](https://github.com/JessePinkman27/eaglercraft-1.12.2), pinned at `d9e759ec21fdb807742201b11de8835e34ccd48a`.
- [EaglerXServer](https://github.com/lax1dude/eaglerxserver), [Spigot API](https://www.spigotmc.org/), [Eclipse Adoptium](https://adoptium.net/), and [Cloudflare Tunnel](https://github.com/cloudflare/cloudflared).

Downloaded components retain their own licenses and applicable terms. Minecraft belongs to its respective rights holders; this project is not affiliated with or endorsed by Mojang or Microsoft.

*The minimap can find your teammate. It cannot explain why they brought twelve stacks of dirt to the End.*
