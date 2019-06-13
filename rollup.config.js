"use strict";

// TODO: Nuke this mess once Node drops its --experimental-modules flag,
// crank the minimum required version, and make this codebase 100% pure ESM.

import fs            from "fs";
import babel         from "rollup-plugin-babel";
import hashbang      from "rollup-plugin-hashbang";
import resolve       from "rollup-plugin-node-resolve";
import {terser}      from "rollup-plugin-terser";

// Modules to exclude from bundling
const {dependencies} = JSON.parse(fs.readFileSync("package.json", "utf8"));
const external       = [...dependencies, "fs", "path"];

// Default Rollup plugins
const basePlugins = [
	resolve({preferBuiltins: true}),
	babel({
		babelrc: false,
		exclude: "node_modules/**",
		plugins: ["@babel/plugin-proposal-class-properties"],
	}),
];


export default [{
	// Bundled and compressed UMD version of ESM source
	input: "lib/index.mjs",
	output: {
		format:        "umd",
		name:          "VTT",
		file:          "lib/index.js",
		sourcemapFile: "lib/index.js.map",
		preferConst:   true,
		external,
	},
	plugins: basePlugins.concat([
		terser({
			keep_classnames: true,
			mangle:   true,
			compress: true,
		}),
	]),
},

// CommonJS versions of MJS executables; needed because
// Node's --experimental-modules flag hasn't dropped yet.
...fs.readdirSync("./bin")
	.filter(n => /\.mjs$/i.test(n))
	.map(name => ({
		input: `bin/${name}`,
		output: {
			format:     "cjs",
			file:       `bin/${name.replace(/\.mjs$/i, "")}`,
			preferConst: true,
			interop:     false,
			external,
		},
		plugins: basePlugins.concat([
			hashbang(),
		]),
	}))];
