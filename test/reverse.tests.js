import {strictEqual as equal} from "assert"
import {reverse} from "../src/commands/reverse.js";

const p = (src) => {
	const {ok, err} = reverse(src)
	return err ? err : ok.trim()
}

describe("Reverse tests", () => {
	it('Simple' , () => {
		equal(p(`<b>Text</b>`), `b > "Text"`)
		equal(p(`<b><div>Text</div>Text</b>`), `b {\n\tdiv > "Text"\n\t"Text"\n}`)
	});
	it('Compressed' , () => {
		equal(p(`<b></b>`), `b`)
	});
})
