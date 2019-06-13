import {formatTime, parseTime} from "alhadis.utils";

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


SubripText.Subtitle = class Subtitle {
	constructor(input = ""){
		input = String(input).trim().replace(/\r\n?/g, "\n").split("\n");
		const time = input[1].split(/\s*-->\s*/);
		this.index = +input[0];
		this.start = parseTime(time[0]);
		this.end   = parseTime(time[1]);
		this.text  = input.slice(2).join("\n");
	}
	
	
	toString(){
		const start = formatTime(this.start);
		const end   = formatTime(this.end);
		return [
			this.index,
			`${start} --> ${end}`.replace(/\./g, ","),
			this.text,
		].join("\n");
	}
};
