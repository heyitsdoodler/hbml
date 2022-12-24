import {strictEqual as equal} from "assert"
import {reverse} from "../src/commands/reverse.js";

const p = (src) => {
	const {ok, err} = reverse(src)
	return err ? err : ok.trim()
}

describe("Reverse tests", () => {
	describe('Passing' , () => {
		it('Simple', function () {
			equal(p(`<b></b>`), `b { }`)
		});
	});
})
