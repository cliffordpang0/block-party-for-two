# Our Minecraft World �X browser client + local 1.12.2 server

## Version 1.1.1: minimap compilation fix

The minimap now downloads Spigot's matching 1.12.2 shaded API (about 4.3 MB, verified against the publisher's SHA-1 and byte count) and compiles against that API. The Paperclip launcher JAR does not contain Bukkit classes and is not a valid compile classpath. If map setup fails, the world server starts with the map marked unavailable; a later restart retries map setup. No world folders, account databases or existing settings are reset by this update. This build logic is regression-tested; live Java compilation still requires a machine with access to the Spigot download.

## Version 1.1: world collection and upper-left minimap

**Updating your existing installation:** type `stop` in the old launcher and wait for its backup. Copy the contents of this new setup ZIP into your existing setup folder and replace the code files. This ZIP contains no `server` saves, account database, local configuration or downloaded runtime, so those stay in place. Then run START.bat. The first start builds the included minimap plugin and may download a portable JDK 17 (roughly 200 MB); no system-wide installation is made. Network downloads, Java compilation and live gameplay could not be verified in the authoring environment, so this feature still needs a run on your PC.

### Keep all worlds in one installation

START.bat now lists your saved worlds. Enter a number to load one, **N** to create a new world, or Enter to keep the last selection. Your original `server/world` is automatically recognised and remains in place. Additional worlds use separate named folders under `server`, with their own inventories, Overworld, Nether and End. Server registrations are shared, so both of you can keep your nicknames and login passwords when switching worlds.

Only the selected world's three dimensions run at a time. Type `stop`, restart START.bat and choose another world to switch. There is no need to duplicate the whole installation.

**One file containing all worlds:** after the server stops, double-click **EXPORT-WORLDS.bat**. It creates `backups/all-worlds-<date>.zip`, containing every registered world's dimensions, player data, the world catalogue, server settings and local account data. Clean shutdown also creates this combined ZIP automatically. The live game uses ordinary folders; the ZIP is for storage, transfer and backup and cannot be played directly. Keep exports private because they include account records.

**Bring worlds from your older duplicated folders:** stop both launchers, then run **IMPORT-WORLD.bat** in this updated installation and enter an old setup folder's path. It copies that folder's currently selected saved world, including its Nether, End and player data, into this installation under a new name. The old folder is not moved or deleted. Old registrations are not imported or merged; use the account registrations of this destination server. If the old folder itself contains multiple worlds, select each there before copying it, or ask for a bulk import.

**Restore a combined export:** with the server stopped, preserve a separate copy of the existing `server` folder. Extract the export elsewhere. Copy its named world folders and `world-catalog.json` into `server/`, its `AuthMe` and `SkinsRestorer` folders into `server/plugins/`, and configuration files into `server/`. Only overwrite after checking that you intend to restore that backup. Run START.bat to choose a restored world.

### Minimap

The upper-left panel draws nearby terrain (about 66 by 66 blocks), your position, your partner's position, coordinates and facing directions. **Gold is you; blue is your partner.** Distant players in the same dimension appear at the map edge with their distance. A player in another dimension is listed by dimension rather than drawn at misleading coordinates.

After logging in, press Esc to release the mouse, then select your nickname in the map panel. The browser remembers that choice. Press **M** to hide or show the map. The bridge updates about every two seconds and only publishes logged-in players when AuthMe is present. Unloaded chunks stay dark; terrain sampling does not generate distant chunks. Underground and Nether views sample the floor near your elevation instead of showing the Nether roof.

This is a browser HUD, not an upstream Eaglercraft client modification. It uses an included Bukkit plugin, `OurMinimap`, compiled locally against the matching Spigot API. If compilation fails, the launcher prints the error and starts the server without the map. Send the error for troubleshooting. A successful automated routing test does not verify the plugin in a live game.

This is a setup kit for an existing Eaglercraft 1.12.2 browser client and Paper 1.12.2 server. It is not a newly written Minecraft clone. Game/server/runtime downloads happen on your PC when you launch it. It has not been gameplay-tested in this environment because binary downloads and local browser connections are unavailable here.

## Start on your Windows PC

1. Extract this entire folder somewhere you want to keep your world permanently. Avoid running directly inside the ZIP or placing it in a temporary folder.
2. Double-click **START.bat**. Node.js 20+ is required. If needed, install the LTS version from https://nodejs.org/.
3. The first start downloads the pinned client, server and plugins, verifies their file hashes, and downloads portable Java 17 from Eclipse Adoptium if a suitable Java runtime is absent. No system-wide Java installation is made. Expect a few hundred MB of initial downloads, including the compiler needed for the minimap. A retry reuses successfully verified files.
4. Read the Minecraft EULA at https://www.minecraft.net/eula. The launcher asks you to type **AGREE** if you accept it. It will not accept the EULA on your behalf. Type anything else to stop.
5. Choose a world in the launcher and wait until you see **READY TO PLAY**. The first world generation may take several minutes. The launcher opens the full local game link in your browser automatically. If it does not, copy that complete link from the window.
6. Pick your nickname and join **Our survival world**. If auto-connect does not occur, choose Multiplayer and select that server.
7. The included server template uses AuthMe account registration. On your first visit, press T and enter `/register YOUR_PASSWORD YOUR_PASSWORD`. On later visits use `/login YOUR_PASSWORD`. Choose a unique game-only password and keep it private; do not use your Microsoft or email password. Use the same nickname to retain your player inventory.

The browser client is the upstream WebAssembly GC build. Use a current desktop Chrome or Edge with WebGL/hardware acceleration enabled. It loads about 18 MB on the first visit. Browser compatibility and the complete game connection still need checking on your PC.

## Send your girlfriend a website link

Once READY TO PLAY appears, type **share** in the launcher window and press Enter.

The launcher downloads the pinned official Cloudflare `cloudflared` executable, verifies its SHA-256 checksum, and creates a temporary HTTPS tunnel. It prints **GIRLFRIEND INVITE LINK** and writes the same complete link to `INVITE.txt`. Send her that whole link, including the `/play/.../` part. She only needs a compatible browser. Both of you connect to the same local server.

The key in the link limits access to your gateway. Keep it private. She creates her own nickname and game password on her first visit. The HTTP gateway only serves the client and proxies its WebSocket connection; world saves and account files are never served over the website.

Keep the launcher and PC running while playing. The public hostname normally changes after the tunnel restarts, so use the new invite each session. A Cloudflare Quick Tunnel is a temporary testing service; it can have outages or limits. No tunnel is created until you type `share`. No firewall/router settings are modified by this package.

## Saving your world

Shared multiplayer progress lives on your PC, not in either player's browser:

- `server/<selected-world>/` �X Overworld, player inventories and progression.
- `server/<selected-world>_nether/` �X Nether.
- `server/<selected-world>_the_end/` �X End and dragon progression.
- `server/world-catalog.json` �X world display names and folder names.
- `server/plugins/AuthMe/` �X local server accounts.

The initial configuration requests an autosave every 60 seconds. To finish a session, type **stop** in the launcher. This tells Minecraft to save and stop cleanly, closes the public link, then makes a dated combined-world ZIP and checksum in `backups/`. Wait for **Backup saved** before closing the window.

Typing **backup** also safely stops the game before archiving. `BACKUP.bat` makes a backup when the launcher is already stopped; it refuses if this launcher's lock indicates it is running. It cannot detect unrelated Java processes started manually�Xdo not use another server launcher on the same world.

Do not force-close the server during saves. The launcher retains backups rather than automatically deleting old ones. Copy important backups to another disk. PowerShell's ZIP implementation has size limits; if a large-world backup fails, your live saved worlds remain intact�Xcopy the stopped `server` folder instead.

## Restore a backup

Stop the launcher first. Preserve a copy of the current `server` folder. Extract your chosen backup to a separate folder and copy `world`, `world_nether`, and `world_the_end` into `server/`; copy the extracted `AuthMe` folder into `server/plugins/AuthMe/`. Copy any backed-up configuration files to their matching locations in `server/`. Start the launcher again. Restore all three dimensions together from the same backup.

## Default game settings

- Java 1.12.2 survival, normal difficulty, normal death/inventory rules.
- Nether and End enabled; normal structures, mobs, food, tools, crafting and dragon progression provided by the game/server.
- Two simultaneous players; PvP disabled.
- View distance 6; maximum Java heap 2 GB.
- Minecraft server listens only on `127.0.0.1:25565`.
- Browser gateway listens only on `127.0.0.1:3001`, avoiding your old Hold the Fort server on port 3000.
- Browser connections use the upstream template's offline nickname mode plus AuthMe passwords. These are local server accounts, not Microsoft sign-in. No Microsoft authentication settings are changed.

Change gameplay in `server/server.properties` after setup, with the server stopped. `local-config.json` contains the invite key and memory setting. Keep `gamePort` and the Minecraft `server-port` consistent if you change them; retain loopback binding. The launcher preserves existing configurations and worlds on subsequent runs.

## Troubleshooting

- **Download failed:** keep the error text and run START.bat again. Working internet access to GitHub and Adoptium is required. No administrator privileges should be needed.
- **Port in use:** stop the other copy of this launcher. Port 3001 is intentionally separate from the earlier game on 3000.
- **Could not connect to server:** wait for READY TO PLAY; check `server/logs/latest.log` for plugin errors. Paste the last error lines for help.
- **Wrong website or 404:** use the full new `/play/.../` link. Neither the bare localhost address nor your earlier Hold the Fort URL opens this game.
- **Browser bootstrap/WebAssembly error:** try a current Chrome or Edge. This package does not include a JavaScript fallback build.
- **Two people cannot register:** the upstream AuthMe configuration controls registration/login limits. Preserve the exact error message so it can be adjusted if necessary.
- **Missing inventory:** use your original nickname and join the same multiplayer server. The Singleplayer menu is a separate browser-local world.

## Provenance and validation

- Server template: https://github.com/Eaglercraft-Templates/Eaglercraft-Server-Paper at `aa9feab237068076786f8b6268d537c83491ca3c`.
- Browser client: https://github.com/JessePinkman27/eaglercraft-1.12.2 at `d9e759ec21fdb807742201b11de8835e34ccd48a`.
- Server developer: https://github.com/lax1dude/eaglerxserver.
- Java: https://adoptium.net/ (portable Java 17, publisher checksum checked).
- Tunnel: https://github.com/cloudflare/cloudflared/releases/tag/2026.10.3 (publisher SHA-256 checked).

Client and server/plugin files are verified against pinned Git blob IDs and expected sizes in `downloads.json`. The upstream template's `run.bat` is deliberately not used because it pre-accepts the EULA. No Minecraft/game binaries are bundled with this setup kit. Retain the upstream projects' notices and applicable terms when using their downloaded software. Eaglercraft is an unofficial port; exact behavior and compatibility are not guaranteed to match the original client.

Run `node --test tests/*.test.mjs` for launcher/gateway tests. These validate setup logic and routing; they do not constitute a multiplayer, Nether, or dragon gameplay test.
