export default class SubripText {
	constructor(input = ""){
		this.entries = [];
		if(input = String(input).trim())
			this.parse(input);
	}
	
	parse(input){
		for(let subtitle of input.replace(/\r\n?/g, "\n").split(/\n{2,}/)){
			subtitle = new SubripText.Subtitle(subtitle);
			this.entries[subtitle.index - 1] = subtitle;
		}
	}
	
	toString(eol = "\r\n", insertBOM = true){
		const sep = eol + eol;
		return (insertBOM ? "\uFEFF" : "")
			+ this.entries.join(sep).replace(/\r?\n/g, eol)
			+ sep;
	}
	
	offset(amount){
		for(const subtitle of this.entries){
			subtitle.start += amount;
			subtitle.end   += amount;
		}
	}
}

const HOUR = 3600000;
const MIN  = 60000;
const SEC  = 1000;

SubripText.Subtitle = class {
	
	constructor(input = ""){
		input = String(input).trim().replace(/\r\n?/g, "\n").split("\n");
		const time = input[1].split(/\s*-->\s*/);
		this.index = +input[0];
		this.start = this.parseTime(time[0]);
		this.end   = this.parseTime(time[1]);
		this.text  = input.slice(2).join("\n");
	}
	
	
	toString(){
		return [
			this.index,
			`${this.formatTime(this.start)} --> ${this.formatTime(this.end)}`,
			this.text,
		].join("\n");
	}
	
	
	/**
	 * Parse a timecode string of the form `HH:MM:SS,000`.
	 * @param {String} input
	 * @return {Number} Time expressed in milliseconds.
	 */
	parseTime(input = ""){
		input = String(input).trim();
		if(/^(\d{2}:)?(\d{2}):(\d{2}),(\d{3})$/.test(input)){
			const hours   = parseInt(RegExp.$1);
			const minutes = +RegExp.$2;
			const seconds = +RegExp.$3;
			const ms      = +RegExp.$4;
			return (hours * HOUR) + (minutes * MIN) + (seconds * SEC) + ms;
		}
		else throw SyntaxError(`Invalid timecode: ${input}`);
	}
	
	
	/**
	 * Format a number of milliseconds using the form `HH:MM:SS,000`.
	 * @param {Number} input
	 * @return {String}
	 */
	formatTime(input = 0){
		if((input = +input || 0) <= 0)
			return "00:00:00,000";
		
		let hours   = "00";
		let minutes = "00";
		let seconds = "00";
		let ms      = "000";
		
		if(input >= HOUR) { hours   = Math.floor(input / HOUR); input %= HOUR; }
		if(input >= MIN)  { minutes = Math.floor(input / MIN);  input %= MIN;  }
		if(input >= SEC)  { seconds = Math.floor(input / SEC);  input %= SEC;  }
		ms = input;
		
		return (String(hours).padStart(2, "0") + ":"
			+ String(minutes).padStart(2, "0") + ":"
			+ String(seconds).padStart(2, "0") + ","
			+ String(ms).padStart(3, "0"));
	}
};
