import {formatTime, parseTime} from "alhadis.utils";

/**
 * Class representing a WebVTT file.
 * @class
 */
export default class WebVTT {
	comments = new Set();
	regions  = new Set();
	styles   = new Set();
	cues     = new Set();
	
	/**
	 * Instantiate an empty WebVTT document.
	 * @param {String} [input=""]
	 * @constructor
	 */
	constructor(input = ""){
		if(input = String(input).trim())
			this.parse(input);
	}
	
	
	/**
	 * Sorted concatenation of each block-list property.
	 * @property {Block[]} blocks
	 * @readonly
	 */
	get blocks(){
		return [new Set([
			...this.comments,
			...this.regions,
			...this.styles,
			...this.cues,
		])].sort(compareBlocks);
	}
	
	
	/**
	 * Total number of blocks stored on the instance.
	 * @property {Number} length
	 * @readonly
	 */
	get length(){
		return new Set([
			...this.comments,
			...this.regions,
			...this.styles,
			...this.cues,
		]).size || 0;
	}
	
	
	/**
	 * Process a chunk of WebVTT source.
	 * @param {String} input
	 * @internal
	 */
	parse(input){
		String(input).trim()
			.replace(/\r?\n/g, "\n")
			.replace(/^WEBVTT(?:[ \t]([^\r\n]*))[ \t]*/, (_, $) => (this.header = $, ""))
			.split(/\n{2,}/)
			.filter(Boolean)
			.forEach((block, index) => {
				if(Comment.keyword.test(block))     this.comments.push(new Comment(block, index));
				else if(Style.keyword.test(block))  this.styles.push(new Style(block, index));
				else if(Region.keyword.test(block)) this.regions.push(new Region(block, index));
				else this.cues.push(new Cue(block, index));
			});
	}
}


/**
 * Base class for WebVTT data structures.
 * @abstract
 * @internal
 * @class
 */
class Block {
	/**
	 * Pattern matching the keyword that introduces the block.
	 * @property {String|RegExp} [header=/(?:)/]
	 * @static
	 */
	static keyword = /(?:)/;
	
	/**
	 * Order of appearance in processed WebVTT source.
	 * Used internally to preserve authored block order.
	 * @property {Number} [index=0]
	 * @internal
	 */
	index = 0;
	
	/**
	 * Content of block's body, used by {@link Block#toString}.
	 * @property {String} [text=""]
	 * @public
	 */
	text = "";
	
	
	/**
	 * Initialise a new block object.
	 * @param {String} [input=""]
	 * @param {Number} [index=0]
	 * @constructor
	 */
	constructor(input = "", index = 0){
		if((index = +index || 0) > 0)
			this.index = index;
		this.parse(String(input).trim().replace(/\r?\n/g, "\n"));
	}
	
	
	/**
	 * Parse a chunk of WebVTT source.
	 *
	 * This method is intended to be overridden by subclasses.
	 * Called automatically by {@link Block#constructor}.
	 * 
	 * @param {String} input
	 * @abstract
	 */
	parse(input){
		this.text = input;
	}
	
	
	/**
	 * Convert the block to WebVTT source.
	 * @return {String}
	 */
	toString(){
		return String(this.text);
	}
}


/**
 * A comment block, indicated by the "NOTE" keyword.
 * @internal
 * @class
 */
class Comment extends Block {
	static keyword = /^\s*NOTE([ \t]*(?:$|[\r\n]))/;
	
	/**
	 * Whitespace separating header from body.
	 * Used to preserve the original formatting.
	 * @property {String} [leadingBlanks=""]
	 */
	leadingBlanks = "";
	
	/**
	 * Extract the content of a comment block.
	 * @throws {SyntaxError} Breaks if input contains "-->".
	 * @param {String} input
	 * @internal
	 */
	parse(input){
		if(input = input.replace(Comment.keyword, "").trim()){
			this.leadingBlanks = RegExp.$1;
			if(/-->/.test(this.text = input))
				throw new SyntaxError('Comments cannot contain "-->"');
		}
	}
	
	/**
	 * Return the WebVTT source of the comment.
	 * @return {String}
	 */
	toString(){
		return "NOTE" + this.leadingBlanks + this.text;
	}
}


/**
 * A WebVTT region definition.
 * @internal
 * @class
 */
class Region extends Block {
	static keyword = /^REGION[ \t]*(?:\n|$)/;
}


/**
 * CSS style declarations.
 * @internal
 * @class
 */
class Style extends Block {
	static keyword = /^STYLE[ \t]*(?:\n|$)/;
}


/**
 * Actual subtitle/caption content of a WebVTT file.
 * @internal
 * @class
 */
class Cue extends Block {
	nodes  = [];
	start  = 0;
	end    = 0;
	
	/**
	 * Parse the contents of a WebVTT cue block.
	 * @param {String} input
	 * @internal
	 */
	parse(input){
		const lines = input.split("\n").filter(Boolean);
		const timingSeparator = /[ \t]+-->[ \t]+/g;
		
		// Optional cue identifier
		if(!timingSeparator.test(lines[0])){
			this.id = lines.shift();
			if(/-->/.test(this.id))
				throw new SyntaxError('Identifiers cannot contain "-->"');
		}
		
		// Cue timings
		if(1 !== (timingSeparator.match(lines[0]) || []).length)
			throw new SyntaxError(`Invalid cue timing: ${lines[0]}`);
		else{
			const [start, end] = lines.shift().split(timingSeparator);
			this.start = parseTime(start);
			this.end   = parseTime(end);
		}
		
		// Payload
		if(timingSeparator.test(lines))
			throw new SyntaxError('Payload cannot contain "-->"');
		else this.parsePayload(lines);
	}
	
	
	/**
	 * Parse the body of a cue block.
	 * @param {String[]} lines
	 * @internal
	 */
	parsePayload(lines){
		for(const line of lines){
			this.nodes.push(line);
		}
	}
	
	
	/**
	 * Convert the cue back to WebVTT source.
	 * @return {String}
	 */
	toString(eol = "\n"){
		const id    = this.id ? this.id + eol : "";
		const start = formatTime(this.start);
		const end   = formatTime(this.end);
		const body  = this.nodes.join(eol);
		return `${id}${start} --> ${end}${eol}${body}`;
	}
	
	
	/**
	 * Newline-delimited list of stringified nodes.
	 * @property {String} text
	 * @readonly
	 */
	get text(){
		return this.nodes.join("\n");
	}
}

// Expose internals as properties of WebVTT class
Object.assign(WebVTT, {
	Block,
	Comment,
	Region,
	Style,
	Cue,
	compareBlocks,
});


/**
 * Handler for sorting concatenated block lists.
 * @param {Block} a
 * @param {Block} b
 * @return {Number}
 * @internal
 */
function compareBlocks(a, b){
	
	// NOTE: Shouldn't happen; we expect objects only
	if(("object" !== typeof a) || ("object" !== typeof b)){
		if(a < b) return -1;
		if(a > b) return +1;
		return 0;
	}
	
	// Sort by explicit index
	let A = a.index;
	let B = b.index;
	if(A < B) return -1;
	if(A > B) return +1;
	
	// Sort conflicting indexes by class-name
	const types = Object.create(null, {Comment: 1, Region: 2, Style: 3});
	A = types[(a.constructor || {}).name] || 4;
	B = types[(b.constructor || {}).name] || 4;
	if(A < B) return -1;
	if(A > B) return +1;
	
	// Sort cues with conflicting indexes by start time
	if(4 === A && 4 === B){
		A = +A.start || 0;
		B = +B.start || 0;
		if(A < B) return -1;
		if(A > B) return +1;
	}
	
	// Last resort: compare stringified values
	A = String(a);
	B = String(b);
	if(A < B) return -1;
	if(A > B) return +1;
	return 0;
}
