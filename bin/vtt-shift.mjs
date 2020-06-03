#!/usr/bin/env node

import {parseDuration} from "alhadis.utils";
import {readFileSync, writeFileSync} from "fs";
import {dirname, resolve, basename} from "path";
import {fileURLToPath} from "url";
import getOpts    from "get-options";
import SubripText from "../lib/srt.mjs";

const {options, argv} = getOpts(process.argv.slice(2), {
	"-b, --bom":        "",
	"-h, --help":       "",
	"-K, --encoding":   "[string]",
	"-l, --line-feeds": "",
	"--version":        "",
}, {
	noUndefined: true,
	noMixedOrder: true,
	terminator: /^--$|^-\.?\d/,
});

// Print the program's version, then exit
if(options.version){
	const pkgFile = resolve(dirname(fileURLToPath(import.meta.url)), "../package.json");
	process.stdout.write(JSON.parse(readFileSync(pkgFile, "utf8")).version + "\n");
	process.exit(0);
}

const bom      = !!options.bom;
const eol      = options.lineFeeds ? "\n" : "\r\n";
const encoding = options.encoding || "utf8";
const amount   = parseDuration(argv.pop());

// Invalid offset amount, or not enough arguments (or --help was passed)
if(options.help || Number.isNaN(amount) || !argv.length && process.stdin.isTTY){
	const $0 = basename(process.argv[1]);
	process.stderr.write(`Usage: ${$0} [-bl] [-K encoding] files ... offset\n`);
	process.exit(+!options.help);
}

// Modify files in-place
if(argv.length)
	for(const file of argv){
		const input  = readFileSync(file, {encoding});
		const vtt    = new SubripText(input);
		vtt.offset(amount);
		
		// Only write back if contents differ
		const result = vtt.toString(eol, bom);
		if(result !== input)
			writeFileSync(file, result);
	}

// Read from standard input
else if(!process.stdin.isTTY)
	new Promise(resolve => {
		let input = "";
		process.stdin.setEncoding(encoding);
		process.stdin.on("readable", () => {
			const chunk = process.stdin.read();
			null !== chunk ? input += chunk : resolve(input);
		});
	}).then(input => {
		const vtt = new SubripText(input);
		vtt.offset(amount);
		process.stdout.write(vtt.toString(eol, bom));
	});
