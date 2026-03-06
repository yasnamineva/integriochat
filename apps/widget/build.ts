import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

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

void (async () => {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes…");
  } else {
    await esbuild.build(buildOptions);
    console.log("Widget built → dist/widget.js");
  }
})();
