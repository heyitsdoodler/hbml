/**
 * Utility functions for the {@link Parser parser}
 */

/**
 * Return the next character in the input string
 * @param self {Parser} Parser instance
 * @return {string}
 */
export const next = (self) => { return self.src[self.index] }

/**
 * Return `true` if there are remaining characters in the input string
 * @param self {Parser} Parser instance
 * @return {boolean}
 */
export const remaining = (self) => { return self.index < self.src.length }

/**
 * Move over spaces and tabs; then update the source string
 * @param self {Parser} Parser instance
 */
export const st = (self) => {
	while (self.remaining()) {
		if (self.next() === " " || self.next() === "\t") {
			self.col++
			self.index++
		} else {
			self.update_src()
			break
		}
	}
	if (!self.remaining()) self.update_src()
}

/**
 * Move over spaces, tabs, and newlines; then update the source string
 * @param self {Parser} Parser instance
 */
export const stn = (self) => {
	while (self.remaining()) {
		if (self.next() === " " || self.next() === "\t") {
			self.col++
			self.index++
		} else if (self.next() === "\n") {
			self.col = 1
			self.index++
			self.ln++
		} else {
			self.update_src()
			break
		}
	}
	if (!self.remaining()) self.update_src()
}

/**
 * Slices {@link Parser.src source} and resets {@link Parser.index index}
 * @param self {Parser} Parser instance
 */
export const update_src = (self) => {
	self.src = self.src.slice(self.index)
	self.index = 0
}
