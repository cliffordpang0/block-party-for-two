package home.map;

import org.bukkit.World;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

public final class OurMinimap extends JavaPlugin {
    private String endpoint, key;
    private final AtomicBoolean sending = new AtomicBoolean(false);
    public void onEnable() {
        try {
            Properties p = new Properties();
            try (InputStream in = new FileInputStream(new File(getDataFolder(), "bridge.properties"))) { p.load(in); }
            endpoint = p.getProperty("endpoint"); key = p.getProperty("key");
            URI uri = URI.create(endpoint);
            if (!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()) || key == null) throw new Exception("Invalid local map bridge configuration");
            getServer().getScheduler().runTaskTimer(this, new Runnable() { public void run() { publish(); } }, 40L, 40L);
            getLogger().info("Local minimap bridge enabled (terrain + players, every 2 seconds).");
        } catch (Exception e) { getLogger().severe("Minimap disabled: " + e.getMessage()); }
    }
    private static String q(String s) { return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ") + "\""; }
    private boolean loggedIn(Player p) {
        org.bukkit.plugin.Plugin auth = getServer().getPluginManager().getPlugin("AuthMe");
        if (auth == null) return true;
        try {
            Class<?> api = Class.forName("fr.xephi.authme.api.v3.AuthMeApi", true, auth.getClass().getClassLoader());
            Object instance = api.getMethod("getInstance").invoke(null);
            return Boolean.TRUE.equals(api.getMethod("isAuthenticated", Player.class).invoke(instance, p));
        } catch (Exception e) { return false; }
    }
    private void publish() {
        if (!sending.compareAndSet(false, true)) return;
        final String payload;
        try {
            StringBuilder b = new StringBuilder("{\"players\":["); boolean first = true;
            for (Player p : getServer().getOnlinePlayers()) {
                if (!loggedIn(p)) continue;
                if (!first) b.append(','); first = false;
                Location l = p.getLocation(); World w = p.getWorld(); int cx = l.getBlockX(), cz = l.getBlockZ();
                b.append("{\"name\":").append(q(p.getName())).append(",\"world\":").append(q(w.getName())).append(",\"dimension\":").append(q(w.getEnvironment().name()));
                b.append(",\"x\":").append(l.getX()).append(",\"y\":").append(l.getY()).append(",\"z\":").append(l.getZ()).append(",\"yaw\":").append(l.getYaw());
                b.append(",\"cx\":").append(cx).append(",\"cz\":").append(cz).append(",\"size\":33,\"step\":2,\"tiles\":[");
                boolean tileFirst = true;
                for (int z = -16; z <= 16; z++) for (int x = -16; x <= 16; x++) {
                    if (!tileFirst) b.append(','); tileFirst = false;
                    b.append(sample(w, cx + x * 2, cz + z * 2, l.getBlockY()));
                }
                b.append("]}");
            }
            b.append("]}"); payload = b.toString();
        } catch (Exception e) { sending.set(false); return; }
        // Every Bukkit world/player call above is on the main server thread.
        // Only the immutable JSON payload is sent on the asynchronous worker.
        getServer().getScheduler().runTaskAsynchronously(this, new Runnable() { public void run() {
            HttpURLConnection c = null;
            try {
                byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
                c = (HttpURLConnection) new URL(endpoint).openConnection();
                c.setConnectTimeout(1500); c.setReadTimeout(1500); c.setRequestMethod("POST"); c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json"); c.setRequestProperty("X-Map-Key", key);
                c.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = c.getOutputStream()) { out.write(bytes); }
                c.getResponseCode();
            } catch (Exception ignored) { } finally { if (c != null) c.disconnect(); sending.set(false); }
        }});
    }
    private int sample(World w, int x, int z, int playerY) {
        if (!w.isChunkLoaded(x >> 4, z >> 4)) return 0;
        int top = Math.min(255, w.getHighestBlockYAt(x, z));
        boolean underground = w.getEnvironment() == World.Environment.NETHER || playerY < top - 10;
        int y = underground ? Math.min(254, playerY - 1) : top;
        int min = underground ? Math.max(1, y - 18) : Math.max(1, y - 12);
        for (; y >= min; y--) {
            String n = w.getBlockAt(x, y, z).getType().name();
            if (n.equals("AIR") || n.equals("LONG_GRASS") || n.equals("TORCH") || n.equals("SNOW")) continue;
            return color(n);
        }
        return 0x273033;
    }
    private int color(String n) {
        if (n.contains("WATER") || n.equals("ICE")) return 0x417bc6;
        if (n.contains("LAVA") || n.equals("MAGMA")) return 0xe47d32;
        if (n.equals("GRASS") || n.equals("MYCEL")) return 0x76a54e;
        if (n.contains("LEAVES") || n.equals("CACTUS")) return 0x3c793e;
        if (n.equals("SAND") || n.contains("SANDSTONE") || n.equals("ENDER_STONE")) return 0xd5c995;
        if (n.contains("SNOW") || n.equals("QUARTZ_BLOCK")) return 0xe0e8e4;
        if (n.equals("NETHERRACK") || n.equals("NETHER_BRICK")) return 0x814d48;
        if (n.equals("SOUL_SAND")) return 0x665042;
        if (n.equals("OBSIDIAN") || n.equals("BEDROCK")) return 0x343343;
        if (n.equals("GLOWSTONE")) return 0xe2c278;
        if (n.contains("WOOD") || n.contains("LOG") || n.equals("CHEST")) return 0x9f8051;
        if (n.contains("DIRT") || n.equals("GRAVEL")) return 0x967c59;
        if (n.contains("DIAMOND")) return 0x66d4d0;
        if (n.contains("GOLD")) return 0xd9b754;
        return 0x8b9290;
    }
}
