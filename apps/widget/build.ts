import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const watch = process.argv.includes("--watch");

// Also copy to apps/web/public so Next.js serves it at /widget.js
const webPublicDir = path.resolve(__dirname, "../../apps/web/public");
const webPublicOut = path.join(webPublicDir, "widget.js");

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/widget.js",
  platform: "browser",
  target: ["es2020", "chrome80", "firefox78", "safari13"],
  format: "iife",
  // No external deps — widget must be fully self-contained
  minify: process.env["NODE_ENV"] === "production",
  sourcemap: process.env["NODE_ENV"] !== "production",
  logLevel: "info",
};

function copyToWebPublic() {
  if (!fs.existsSync(webPublicDir)) {
    fs.mkdirSync(webPublicDir, { recursive: true });
  }
  fs.copyFileSync("dist/widget.js", webPublicOut);
  console.log(`Widget copied → ${webPublicOut}`);
}

void (async () => {
  if (watch) {
    const plugin: esbuild.Plugin = {
      name: "copy-to-web-public",
      setup(build) {
        build.onEnd(() => { copyToWebPublic(); });
      },
    };
    const ctx = await esbuild.context({
      ...buildOptions,
      plugins: [plugin],
    });
    await ctx.watch();
    console.log("Watching for changes…");
  } else {
    await esbuild.build(buildOptions);
    console.log("Widget built → dist/widget.js");
    copyToWebPublic();
  }
})();
