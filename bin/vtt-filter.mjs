#!/usr/bin/env node

import {readFileSync, writeFileSync} from "fs";
import getOpts    from "get-options";
import SubripText from "../lib/srt.mjs";

const {options, argv} = getOpts(process.argv.slice(2), {
	"-a, --actions":    "",
	"-b, --bom":        "",
	"-e, --expr":       "[pattern]",
	"-K, --encoding":   "[name]",
	"-l, --line-feeds": "",
	"-v, --verbose":    "",
}, {
	duplicates: "append",
	noAliasPropagation: "first-only",
	noUndefined: true,
	noMixedOrder: true,
	terminator: /^--$|^-\.?\d/,
});

const bom      = !!options.bom;
const eol      = options.lineFeeds ? "\n" : "\r\n";
const encoding = options.encoding || "utf8";

const arrayify = x => Array.isArray(x) ? x : [x];
const doFilter = v => {
	const gone = patterns.map(x => v.filter(x)).flat();
	if(options.verbose && gone.length)
		console.warn(`Removed ${gone.length} entries:`, gone);
};

// Resolve pattern list
const patterns = [];
options.actions && patterns.push(/^\[.+\]$|^\(.+\)$/s);
options.expr    && patterns.push(...arrayify(options.expr).map(expr => {
	if(expr instanceof RegExp) return expr;
	let flags = "";
	expr = expr
		.replace(/^\/(.*)\/([gimsuy]*)$/, (_, s, f) => (flags += f, s))
		.replace(/^\(\?([a-z]+)\)/, (_, f) => (flags += f, ""));
	return new RegExp(expr, flags);
}));


// Modify files in-place
if(argv.length)
	for(const file of argv){
		const input = readFileSync(file, {encoding});
		const vtt   = new SubripText(input);
		doFilter(vtt);
		
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
		doFilter(vtt);
		process.stdout.write(vtt.toString(eol, bom));
	});
