export class Error {
	constructor(desc, file, ln, col) {
		this.desc = desc
		this.file = file
		this.ln = ln
		this.col = col
	}

	toString() {
		return `${this.desc} ${this.file} ${this.ln}:${this.col}`
	}
}
